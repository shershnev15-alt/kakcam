import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import sharp from 'sharp';
import { PrismaService } from '../prisma.service';

export type UploadedEvidenceFile = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
};

type DetectedType = { contentType: string; extension: 'jpg' | 'png' | 'webp' | 'pdf' };

const ACTIVE_CLAIM_STATUSES = ['SUBMITTED', 'EVIDENCE_REQUESTED', 'IN_REVIEW'];
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = 15 * 1024 * 1024;

@Injectable()
export class EvidenceStorageService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async storeClaimEvidence(
    claimId: string,
    kind: string,
    file: UploadedEvidenceFile | undefined,
    userId: string,
  ) {
    if (!file?.buffer.length) throw new BadRequestException('Файл обязателен');
    const normalizedKind = kind.trim().toUpperCase();
    if (!['PROFILE_PHOTO', 'IDENTITY_DOCUMENT'].includes(normalizedKind)) {
      throw new BadRequestException('Разрешены PROFILE_PHOTO и IDENTITY_DOCUMENT');
    }
    const maxBytes = normalizedKind === 'PROFILE_PHOTO' ? MAX_PHOTO_BYTES : MAX_DOCUMENT_BYTES;
    if (file.size > maxBytes) throw new BadRequestException('Файл превышает допустимый размер');

    const claim = await this.prisma.profileClaim.findUnique({ where: { id: claimId } });
    if (!claim) throw new NotFoundException('Заявка не найдена');
    if (claim.userId !== userId) throw new ForbiddenException('Это не ваша заявка');
    if (!ACTIVE_CLAIM_STATUSES.includes(claim.status)) {
      throw new BadRequestException('Заявка закрыта для добавления файлов');
    }

    const detected = this.detect(file.buffer);
    if (normalizedKind === 'PROFILE_PHOTO' && detected.extension === 'pdf') {
      throw new BadRequestException('Фото профиля должно быть изображением');
    }
    this.rejectKnownMalware(file.buffer);
    const sanitized = await this.sanitize(file.buffer, detected);
    const scanStatus = await this.scan(sanitized, detected.contentType);
    const checksum = createHash('sha256').update(sanitized).digest('hex');
    const evidenceId = randomUUID();
    const blobId = randomUUID();
    const storageKey = `${userId}/${blobId}.enc`;
    const storagePath = join(this.privateRoot(), storageKey);
    await mkdir(dirname(storagePath), { recursive: true, mode: 0o700 });
    await writeFile(storagePath, this.encrypt(sanitized), { mode: 0o600, flag: 'wx' });

    try {
      const evidence = await this.prisma.$transaction(async (tx) => {
        const created = await tx.verificationEvidence.create({
          data: {
            id: evidenceId,
            claimId,
            submittedById: userId,
            kind: normalizedKind,
            reference: `private-blob:${blobId}`,
            checksum,
            visibility: 'RESTRICTED',
            blob: {
              create: {
                id: blobId,
                storageKey,
                originalName: basename(file.originalname).slice(0, 180),
                contentType: detected.contentType,
                byteSize: sanitized.length,
                scanStatus,
                sanitizedAt: detected.extension === 'pdf' ? null : new Date(),
              },
            },
          },
          include: { blob: true },
        });
        await tx.profileClaim.update({
          where: { id: claimId },
          data: {
            status: 'SUBMITTED',
            evidenceSummary: { uploaded: true, kind: normalizedKind, checksum },
          },
        });
        await tx.moderationCase.update({
          where: { claimId },
          data: { status: 'OPEN', resolution: null, resolvedAt: null },
        });
        await tx.auditLog.create({
          data: {
            actorId: userId,
            action: 'profile_claim.evidence.upload',
            targetType: 'VerificationEvidence',
            targetId: created.id,
            diff: {
              kind: normalizedKind,
              contentType: detected.contentType,
              byteSize: sanitized.length,
              checksum,
              scanStatus,
            },
          },
        });
        return created;
      });
      return this.dto(evidence);
    } catch (error) {
      await unlink(storagePath).catch(() => undefined);
      throw error;
    }
  }

  async content(evidenceId: string) {
    const evidence = await this.prisma.verificationEvidence.findUnique({
      where: { id: evidenceId },
      include: { blob: true },
    });
    if (!evidence?.blob) throw new NotFoundException('Файл доказательства не найден');
    const encrypted = await readFile(join(this.privateRoot(), evidence.blob.storageKey)).catch(
      () => {
        throw new NotFoundException('Файл доказательства недоступен');
      },
    );
    return {
      buffer: this.decrypt(encrypted),
      contentType: evidence.blob.contentType,
      originalName: evidence.blob.originalName,
    };
  }

  async publishProfilePhoto(evidenceId: string, playerSlug: string): Promise<string> {
    const evidence = await this.prisma.verificationEvidence.findUnique({
      where: { id: evidenceId },
      include: { blob: true },
    });
    if (!evidence?.blob || evidence.kind !== 'PROFILE_PHOTO') {
      throw new BadRequestException('Нужно загруженное фото профиля');
    }
    if (!['PASSED', 'SANITIZED_IMAGE', 'DEVELOPMENT_BYPASS'].includes(evidence.blob.scanStatus)) {
      throw new BadRequestException('Фото не прошло проверку безопасности');
    }
    const { buffer } = await this.content(evidenceId);
    const publicBuffer = await sharp(buffer)
      .rotate()
      .resize(960, 960, { fit: 'cover', position: 'attention', withoutEnlargement: true })
      .webp({ quality: 86 })
      .toBuffer();
    const filename = `${playerSlug}-${evidence.checksum.slice(0, 12)}.webp`;
    await mkdir(this.publicRoot(), { recursive: true, mode: 0o755 });
    await writeFile(join(this.publicRoot(), filename), publicBuffer, { mode: 0o644 });
    return `${this.publicApiOrigin()}/api/v1/media/players/${filename}`;
  }

  async publicProfilePhoto(filename: string) {
    if (!/^[a-z0-9-]+-[a-f0-9]{12}\.webp$/i.test(filename)) {
      throw new NotFoundException('Фото игрока не найдено');
    }
    const buffer = await readFile(join(this.publicRoot(), filename)).catch(() => {
      throw new NotFoundException('Фото игрока не найдено');
    });
    return { buffer, contentType: 'image/webp' };
  }

  private dto(evidence: {
    id: string;
    kind: string;
    checksum: string;
    visibility: string;
    createdAt: Date;
    blob: {
      contentType: string;
      byteSize: number;
      scanStatus: string;
      originalName: string;
    } | null;
  }) {
    return {
      id: evidence.id,
      kind: evidence.kind,
      checksum: evidence.checksum,
      visibility: evidence.visibility,
      createdAt: evidence.createdAt,
      file: evidence.blob
        ? {
            originalName: evidence.blob.originalName,
            contentType: evidence.blob.contentType,
            byteSize: evidence.blob.byteSize,
            scanStatus: evidence.blob.scanStatus,
          }
        : null,
    };
  }

  private detect(buffer: Buffer): DetectedType {
    if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) {
      return { contentType: 'image/jpeg', extension: 'jpg' };
    }
    if (
      buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    ) {
      return { contentType: 'image/png', extension: 'png' };
    }
    if (
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    ) {
      return { contentType: 'image/webp', extension: 'webp' };
    }
    if (buffer.subarray(0, 5).toString('ascii') === '%PDF-') {
      return { contentType: 'application/pdf', extension: 'pdf' };
    }
    throw new BadRequestException('Разрешены JPEG, PNG, WebP и PDF');
  }

  private async sanitize(buffer: Buffer, type: DetectedType): Promise<Buffer> {
    if (type.extension === 'pdf') return buffer;
    try {
      const image = sharp(buffer, { failOn: 'warning', limitInputPixels: 40_000_000 })
        .rotate()
        .resize({
          width: 4096,
          height: 4096,
          fit: 'inside',
          withoutEnlargement: true,
        });
      if (type.extension === 'png') return await image.png({ compressionLevel: 9 }).toBuffer();
      if (type.extension === 'webp') return await image.webp({ quality: 90 }).toBuffer();
      return await image.jpeg({ quality: 90, mozjpeg: true }).toBuffer();
    } catch {
      throw new BadRequestException('Изображение повреждено или небезопасно');
    }
  }

  private rejectKnownMalware(buffer: Buffer): void {
    if (buffer.includes('EICAR-STANDARD-ANTIVIRUS-TEST-FILE')) {
      throw new BadRequestException('Файл не прошёл антивирусную проверку');
    }
  }

  private async scan(buffer: Buffer, contentType: string): Promise<string> {
    const endpoint = process.env.MALWARE_SCAN_ENDPOINT?.trim();
    if (!endpoint) {
      if (process.env.NODE_ENV === 'production') {
        throw new ServiceUnavailableException('Антивирусный сканер файлов не настроен');
      }
      return contentType.startsWith('image/') ? 'SANITIZED_IMAGE' : 'DEVELOPMENT_BYPASS';
    }
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        ...(process.env.MALWARE_SCAN_TOKEN
          ? { Authorization: `Bearer ${process.env.MALWARE_SCAN_TOKEN}` }
          : {}),
      },
      body: new Blob([new Uint8Array(buffer)]),
      signal: AbortSignal.timeout(20_000),
    });
    const result = (await response.json().catch(() => null)) as { clean?: boolean } | null;
    if (!response.ok || result?.clean !== true) {
      throw new BadRequestException('Файл не прошёл антивирусную проверку');
    }
    return 'PASSED';
  }

  private encrypt(buffer: Buffer): Buffer {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey(), iv);
    const ciphertext = Buffer.concat([cipher.update(buffer), cipher.final()]);
    return Buffer.concat([Buffer.from([1]), iv, cipher.getAuthTag(), ciphertext]);
  }

  private decrypt(buffer: Buffer): Buffer {
    if (buffer[0] !== 1 || buffer.length < 30) {
      throw new ServiceUnavailableException('Формат зашифрованного evidence не поддерживается');
    }
    const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey(), buffer.subarray(1, 13));
    decipher.setAuthTag(buffer.subarray(13, 29));
    return Buffer.concat([decipher.update(buffer.subarray(29)), decipher.final()]);
  }

  private encryptionKey(): Buffer {
    const configured = process.env.EVIDENCE_ENCRYPTION_KEY?.trim();
    if (configured) {
      const key = /^[0-9a-f]{64}$/i.test(configured)
        ? Buffer.from(configured, 'hex')
        : Buffer.from(configured, 'base64');
      if (key.length === 32) return key;
      throw new Error('EVIDENCE_ENCRYPTION_KEY должен содержать 32 байта');
    }
    if (process.env.NODE_ENV === 'production') {
      throw new ServiceUnavailableException('Ключ шифрования evidence не настроен');
    }
    return createHash('sha256').update('cyberid-local-evidence-key-change-me').digest();
  }

  private privateRoot(): string {
    return resolve(process.env.PRIVATE_UPLOAD_ROOT ?? '../../.data/private-evidence');
  }

  private publicRoot(): string {
    return resolve(process.env.PUBLIC_MEDIA_ROOT ?? '../../.data/public-media/players');
  }

  private publicApiOrigin(): string {
    const configured = process.env.API_PUBLIC_URL?.trim().replace(/\/$/, '');
    if (configured) return configured;
    if (process.env.NODE_ENV === 'production') {
      throw new ServiceUnavailableException('API_PUBLIC_URL не настроен');
    }
    return `http://localhost:${process.env.PORT ?? '4000'}`;
  }
}
