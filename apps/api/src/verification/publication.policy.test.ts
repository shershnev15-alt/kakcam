import { describe, expect, it } from 'vitest';
import { missingPublicEligibilitySignals } from './publication.policy';

describe('verified-only public player policy', () => {
  it('allows publication only when all five independent signals are present', () => {
    expect(
      missingPublicEligibilitySignals({
        approvedSelfClaim: true,
        approvedPhoto: true,
        verifiedSteam: true,
        verifiedFaceit: true,
        identityApproved: true,
      }),
    ).toEqual([]);
  });

  it('reports every missing gate instead of partially publishing a player', () => {
    expect(
      missingPublicEligibilitySignals({
        approvedSelfClaim: true,
        approvedPhoto: true,
        verifiedSteam: false,
        verifiedFaceit: false,
        identityApproved: false,
      }),
    ).toEqual(['STEAM', 'FACEIT', 'IDENTITY']);
  });
});
