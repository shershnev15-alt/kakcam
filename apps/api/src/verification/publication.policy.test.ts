import { describe, expect, it } from 'vitest';
import { missingPublicEligibilitySignals } from './publication.policy';

describe('verified-only public player policy', () => {
  it('allows publication only when all five independent signals are present', () => {
    expect(
      missingPublicEligibilitySignals({
        approvedSelfClaim: true,
        federationApproval: true,
        approvedPhoto: true,
        verifiedSteam: true,
        verifiedFaceit: true,
      }),
    ).toEqual([]);
  });

  it('reports every missing gate instead of partially publishing a player', () => {
    expect(
      missingPublicEligibilitySignals({
        approvedSelfClaim: true,
        federationApproval: false,
        approvedPhoto: true,
        verifiedSteam: false,
        verifiedFaceit: false,
      }),
    ).toEqual(['FEDERATION', 'STEAM', 'FACEIT']);
  });
});
