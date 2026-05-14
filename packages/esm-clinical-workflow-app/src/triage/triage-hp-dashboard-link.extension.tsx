import React, { useMemo } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { DashboardExtension, useConfig, useSession } from '@openmrs/esm-framework';
import type { ClinicalWorkflowConfig } from '../config-schema';
import { spaBasePath } from '../constants';
import { findTriageDefinition, getTriageRoutePath } from './triage-config';

function sessionHasPrivilege(session: ReturnType<typeof useSession>, privilege: string): boolean {
  const privilegesRaw = session?.user?.privileges;
  if (!Array.isArray(privilegesRaw)) {
    return false;
  }
  return privilegesRaw.some(
    (p: { name?: string; display?: string }) => p?.name === privilege || p?.display === privilege,
  );
}

export type TriageHpDashboardLinkProps = {
  _meta?: {
    triageId: string;
    path: string;
    title: string;
    slot: string;
    name?: string;
  };
};

/**
 * Homepage sidebar link for one triage row; `meta` is supplied when the extension is registered from config.
 */
export default function TriageHpDashboardLinkExtension(props: TriageHpDashboardLinkProps) {
  const triageId = props._meta?.triageId;
  const { triageDefinitions, enforceTriagePrivileges } = useConfig<ClinicalWorkflowConfig>();
  const session = useSession();

  const def = useMemo(
    () => (triageId ? findTriageDefinition(triageDefinitions, triageId) : undefined),
    [triageDefinitions, triageId],
  );

  if (!def?.enabled) {
    return null;
  }

  if (enforceTriagePrivileges && def.privilege && !sessionHasPrivilege(session, def.privilege)) {
    return null;
  }

  const path = getTriageRoutePath(def);
  const title = def.displayName;

  return (
    <BrowserRouter>
      <DashboardExtension path={path} title={title} basePath={spaBasePath} />
    </BrowserRouter>
  );
}
