import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { IdentityVerificationService } from './identity-verification.service';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Sumsub webhook verification', () => {
  it('accepts an authentic signed payload and safely ignores an unknown applicant', async () => {
    vi.stubEnv('SUMSUB_WEBHOOK_SECRET', 'webhook-secret');
    const body = Buffer.from(
      JSON.stringify({ type: 'applicantReviewed', externalUserId: 'unknown', applicantId: 'a1' }),
    );
    const digest = createHmac('sha256', 'webhook-secret').update(body).digest('hex');
    const prisma = { identityCheck: { findUnique: vi.fn().mockResolvedValue(null) } };
    const service = new IdentityVerificationService(prisma as never);

    await expect(
      service.handleSumsubWebhook(body, {
        'x-payload-digest': digest,
        'x-payload-digest-alg': 'HMAC_SHA256_HEX',
      }),
    ).resolves.toEqual({ accepted: true, ignored: true });
  });

  it('rejects a webhook with an invalid signature before querying the database', async () => {
    vi.stubEnv('SUMSUB_WEBHOOK_SECRET', 'webhook-secret');
    const prisma = { identityCheck: { findUnique: vi.fn() } };
    const service = new IdentityVerificationService(prisma as never);

    await expect(
      service.handleSumsubWebhook(Buffer.from('{}'), {
        'x-payload-digest': '00'.repeat(32),
        'x-payload-digest-alg': 'HMAC_SHA256_HEX',
      }),
    ).rejects.toThrow('Подпись webhook недействительна');
    expect(prisma.identityCheck.findUnique).not.toHaveBeenCalled();
  });
});
