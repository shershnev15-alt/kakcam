import { describe, expect, it } from 'vitest';
import {
  parsePublicationDecision,
  parseClaimDecision,
  parseClaimEvidence,
  parseModerationQuery,
  parseSubmitClaim,
} from './verification.validation';

describe('verification validation', () => {
  it('normalizes a profile claim', () => {
    expect(
      parseSubmitClaim({
        playerSlug: 'FrostByte',
        method: 'social_challenge',
        statement: 'This is my public profile',
        evidence: { kind: 'url', reference: 'https://example.test/proof' },
      }),
    ).toMatchObject({ playerSlug: 'frostbyte', method: 'SOCIAL_CHALLENGE' });
  });

  it('rejects unsupported methods', () => {
    expect(() =>
      parseSubmitClaim({
        playerSlug: 'frostbyte',
        method: 'passport_upload',
        evidence: { kind: 'url', reference: 'https://example.test/proof' },
      }),
    ).toThrow('метод');
  });

  it('requires a reason for moderation decisions', () => {
    expect(() => parseClaimDecision({ decision: 'APPROVED', reason: '' })).toThrow('reason');
  });

  it('validates evidence and queue status', () => {
    expect(parseClaimEvidence({ kind: 'game_id', reference: 'steam:12345' })).toMatchObject({
      kind: 'GAME_ID',
    });
    expect(parseModerationQuery({ status: 'resolved' })).toEqual({ status: 'RESOLVED' });
  });

  it('requires complete publication evidence and a safe photo URL', () => {
    expect(
      parsePublicationDecision({
        decision: 'PUBLISH',
        selfClaimId: '00000000-0000-4000-8000-000000000001',
        federationId: '00000000-0000-4000-8000-000000000002',
        photoEvidenceId: '00000000-0000-4000-8000-000000000003',
        publicPhotoUrl: '/media/players/frostbyte.webp',
        reason: 'Публикация подтверждена внутренней проверкой',
      }),
    ).toMatchObject({ decision: 'PUBLISH', publicPhotoUrl: '/media/players/frostbyte.webp' });

    expect(() =>
      parsePublicationDecision({
        decision: 'PUBLISH',
        selfClaimId: '00000000-0000-4000-8000-000000000001',
        federationId: '00000000-0000-4000-8000-000000000002',
        photoEvidenceId: '00000000-0000-4000-8000-000000000003',
        publicPhotoUrl: 'http://insecure.example/photo.jpg',
        reason: 'Публикация подтверждена внутренней проверкой',
      }),
    ).toThrow('publicPhotoUrl');
  });
});
