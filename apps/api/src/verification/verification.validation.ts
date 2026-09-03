import { BadRequestException } from '@nestjs/common';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CLAIM_METHODS = [
  'GAME_ACCOUNT',
  'SOCIAL_CHALLENGE',
  'TEAM_CONFIRMATION',
  'ORGANIZER_CONFIRMATION',
] as const;

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('Тело запроса должно быть объектом');
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, field: string, min = 2, max = 500): string {
  if (typeof value !== 'string') throw new BadRequestException(`Поле ${field} обязательно`);
  const normalized = value.trim();
  if (normalized.length < min || normalized.length > max) {
    throw new BadRequestException(`Поле ${field}: допустимо от ${min} до ${max} символов`);
  }
  return normalized;
}

function playerSlug(value: unknown): string {
  const normalized = text(value, 'playerSlug', 2, 80).toLocaleLowerCase('en-US');
  if (!SLUG.test(normalized)) throw new BadRequestException('Некорректный playerSlug');
  return normalized;
}

export type ClaimEvidenceInput = { kind: string; reference: string };

export function parseClaimEvidence(value: unknown): ClaimEvidenceInput {
  const evidence = object(value);
  return {
    kind: text(evidence.kind, 'evidence.kind', 2, 40).toUpperCase(),
    reference: text(evidence.reference, 'evidence.reference', 4, 500),
  };
}

export type SubmitClaimInput = {
  playerSlug: string;
  method: (typeof CLAIM_METHODS)[number];
  statement?: string;
  evidence?: ClaimEvidenceInput;
};

export function parseSubmitClaim(value: unknown): SubmitClaimInput {
  const body = object(value);
  const method = text(body.method, 'method', 4, 40).toUpperCase();
  if (!CLAIM_METHODS.includes(method as (typeof CLAIM_METHODS)[number])) {
    throw new BadRequestException('Некорректный метод подтверждения');
  }
  return {
    playerSlug: playerSlug(body.playerSlug),
    method: method as (typeof CLAIM_METHODS)[number],
    ...(body.statement ? { statement: text(body.statement, 'statement', 4, 1000) } : {}),
    ...(body.evidence ? { evidence: parseClaimEvidence(body.evidence) } : {}),
  };
}

export type ClaimDecisionInput = {
  decision: 'EVIDENCE_REQUESTED' | 'APPROVED' | 'REJECTED';
  reason: string;
};

export function parseClaimDecision(value: unknown): ClaimDecisionInput {
  const body = object(value);
  const decision = text(body.decision, 'decision', 8, 30).toUpperCase();
  if (!['EVIDENCE_REQUESTED', 'APPROVED', 'REJECTED'].includes(decision)) {
    throw new BadRequestException('Некорректное решение');
  }
  return {
    decision: decision as ClaimDecisionInput['decision'],
    reason: text(body.reason, 'reason', 4, 500),
  };
}

export function parseModerationQuery(value: Record<string, string | undefined>) {
  const status = value.status?.toUpperCase() ?? 'OPEN';
  if (!['OPEN', 'WAITING_EVIDENCE', 'RESOLVED'].includes(status)) {
    throw new BadRequestException('Некорректный статус moderation case');
  }
  return { status };
}

export type PublicationDecisionInput =
  | {
      decision: 'PUBLISH';
      selfClaimId: string;
      federationId: string;
      photoEvidenceId: string;
      publicPhotoUrl?: string;
      reason: string;
    }
  | { decision: 'REVOKE'; reason: string };

function uuid(value: unknown, field: string): string {
  const result = text(value, field, 36, 36);
  if (!UUID.test(result)) throw new BadRequestException(`Некорректный ${field}`);
  return result;
}

function publicPhotoUrl(value: unknown): string {
  const result = text(value, 'publicPhotoUrl', 2, 500);
  if (/^\/media\/players\/[a-zA-Z0-9/_-]+\.(?:avif|jpe?g|png|webp)$/i.test(result)) return result;
  throw new BadRequestException('publicPhotoUrl должен указывать на обработанное локальное фото');
}

export function parsePublicationDecision(value: unknown): PublicationDecisionInput {
  const body = object(value);
  const decision = text(body.decision, 'decision', 6, 10).toUpperCase();
  const reason = text(body.reason, 'reason', 10, 500);
  if (decision === 'REVOKE') return { decision, reason };
  if (decision !== 'PUBLISH') throw new BadRequestException('Некорректное решение публикации');
  return {
    decision,
    selfClaimId: uuid(body.selfClaimId, 'selfClaimId'),
    federationId: uuid(body.federationId, 'federationId'),
    photoEvidenceId: uuid(body.photoEvidenceId, 'photoEvidenceId'),
    ...(body.publicPhotoUrl ? { publicPhotoUrl: publicPhotoUrl(body.publicPhotoUrl) } : {}),
    reason,
  };
}
