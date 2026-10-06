import React from 'react';
import { UserHasAccess } from '@openmrs/esm-framework';
import { RADIOLOGY_PRIVILEGES } from '../constants/radiology-privileges';

interface UserHasTemplateCatalogAccessProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/** View or manage privilege. UserHasAccess treats an array as requiring every privilege. */
const UserHasTemplateCatalogAccess: React.FC<UserHasTemplateCatalogAccessProps> = ({ children, fallback = null }) => (
  <UserHasAccess
    privilege={RADIOLOGY_PRIVILEGES.VIEW_REPORT_TEMPLATES}
    fallback={
      <UserHasAccess privilege={RADIOLOGY_PRIVILEGES.MANAGE_REPORT_TEMPLATES} fallback={fallback}>
        {children}
      </UserHasAccess>
    }>
    {children}
  </UserHasAccess>
);

export default UserHasTemplateCatalogAccess;
