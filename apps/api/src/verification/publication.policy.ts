import type { Prisma } from '../../generated/prisma/client';

export const publicPhotoEvidenceKinds = ['PROFILE_PHOTO', 'PHOTO_IDENTITY'] as const;

export const publicPlayerEligibilityWhere = {
  status: 'ACTIVE',
  publication: {
    is: {
      status: 'PUBLISHED',
      publishedAt: { not: null },
      publicPhotoUrl: { not: '' },
      selfClaim: { is: { status: 'APPROVED', identityChecks: { some: { status: 'APPROVED' } } } },
      federation: { is: { isFederation: true } },
      verification: { is: { status: 'APPROVED' } },
      photoEvidence: {
        is: { kind: { in: [...publicPhotoEvidenceKinds] }, visibility: 'RESTRICTED' },
      },
    },
  },
  AND: [
    {
      accounts: {
        some: {
          provider: 'STEAM',
          verifiedAt: { not: null },
          game: { is: { slug: 'cs2' } },
        },
      },
    },
    {
      accounts: {
        some: {
          provider: 'FACEIT',
          verifiedAt: { not: null },
          game: { is: { slug: 'cs2' } },
        },
      },
    },
  ],
} satisfies Prisma.PlayerWhereInput;

export type PublicEligibilitySignals = {
  approvedSelfClaim: boolean;
  federationApproval: boolean;
  approvedPhoto: boolean;
  verifiedSteam: boolean;
  verifiedFaceit: boolean;
  identityApproved: boolean;
};

export function missingPublicEligibilitySignals(signals: PublicEligibilitySignals): string[] {
  return [
    !signals.approvedSelfClaim ? 'SELF_CLAIM' : null,
    !signals.federationApproval ? 'FEDERATION' : null,
    !signals.approvedPhoto ? 'PHOTO' : null,
    !signals.verifiedSteam ? 'STEAM' : null,
    !signals.verifiedFaceit ? 'FACEIT' : null,
    !signals.identityApproved ? 'IDENTITY' : null,
  ].filter((item): item is string => item !== null);
}
