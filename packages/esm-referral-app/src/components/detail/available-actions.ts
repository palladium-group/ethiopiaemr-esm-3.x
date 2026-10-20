import type { ReferralDetail } from '../../api/types';

export type ReferralActionKind =
  | 'submit'
  | 'send'
  | 'cancel'
  | 'accept'
  | 'reject'
  | 'refer-back'
  | 'feedback'
  | 're-refer';

/**
 * Buttons offered for a referral, mirroring the module's status machine
 * (ReferralServiceImpl.allowed) split by which side of the referral this facility is on.
 * The server is still the authority — it answers 409 if the screen is out of date.
 */
export function availableActions(referral: ReferralDetail): Array<ReferralActionKind> {
  const { direction, status } = referral;
  if (direction === 'OUTGOING') {
    switch (status) {
      case 'DRAFT':
        return ['submit', 'cancel'];
      case 'PENDING_LIAISON':
        return ['send', 'cancel'];
      case 'REFERRED':
        return ['cancel'];
      default:
        return [];
    }
  }
  switch (status) {
    case 'REFERRED':
      return ['accept', 'reject', 're-refer'];
    case 'ACCEPTED':
      return ['feedback', 'refer-back', 're-refer'];
    case 'REFERRED_BACK':
      return ['feedback'];
    default:
      return [];
  }
}
