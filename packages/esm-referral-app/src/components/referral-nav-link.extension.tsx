import React from 'react';
import { useTranslation } from 'react-i18next';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { ConfigurableLink, useSession, userHasAccess } from '@openmrs/esm-framework';
import { useReferralEnabled } from '../api/use-referral-enabled';
import { ReferralPermissions } from '../permissions.constants';

function ReferralNavLinkInner() {
  const { t } = useTranslation();
  const location = useLocation();
  const session = useSession();
  const { isReferralEnabled, isLoading } = useReferralEnabled();
  const canOpen =
    !isLoading &&
    isReferralEnabled &&
    Boolean(session?.authenticated) &&
    userHasAccess(ReferralPermissions.ManageReferrals, session?.user);

  if (!canOpen) {
    return null;
  }

  const isActive = (location.pathname ?? '').includes('/referral');

  return (
    <ConfigurableLink
      className={`cds--side-nav__link${isActive ? ' active-left-nav-link' : ''}`}
      to={`${window.getOpenmrsSpaBase()}referral`}>
      {t('liaisonReferrals', 'Liaison referrals')}
    </ConfigurableLink>
  );
}

/** Left-nav entry. The existing "Referrals" item is a different dashboard. */
export default function ReferralNavLink() {
  return (
    <BrowserRouter>
      <ReferralNavLinkInner />
    </BrowserRouter>
  );
}
