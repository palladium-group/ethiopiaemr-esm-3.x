import React from 'react';
import { attach, getSyncLifecycle, registerExtension } from '@openmrs/esm-framework';
import type { ClinicalWorkflowConfig } from '../config-schema';
import { getTriageRoutePath } from './triage-config';
import TriageHpDashboardLinkExtension, { type TriageHpDashboardLinkProps } from './triage-hp-dashboard-link.extension';
import UnifiedTriageDashboardPage from './unified-triage-landing.page';

type TriageHpLinkMeta = NonNullable<TriageHpDashboardLinkProps['_meta']>;

/**
 * Each homepage link must use a distinct React component type so parcels reconcile correctly.
 * Some mounts (e.g. tooling previews) omit `_meta`; fall back to registration-time meta.
 */
function createTriageHpLinkLifecycle(decoratorOptions: TriageExtensionDecoratorOptions, linkMeta: TriageHpLinkMeta) {
  function TriageHpDashboardLinkRoot(props: TriageHpDashboardLinkProps) {
    const meta = props._meta?.triageId != null ? props._meta : linkMeta;
    return React.createElement(TriageHpDashboardLinkExtension, { ...props, _meta: meta });
  }
  TriageHpDashboardLinkRoot.displayName = `TriageHpDashboardLinkRoot(${linkMeta.triageId})`;
  return getSyncLifecycle(TriageHpDashboardLinkRoot, decoratorOptions);
}

const REGISTRY_KEY = '__palladiumEthiopiaClinicalWorkflowTriageExtensionsRegistered';

export type TriageExtensionDecoratorOptions = {
  moduleName: string;
  featureName: string;
};

export function triageHpLinkExtensionName(triageId: string) {
  return `clinical-workflow-triage-hp-link-${triageId}`;
}

export function triageDashboardExtensionName(triageId: string) {
  return `clinical-workflow-triage-dashboard-${triageId}`;
}

/**
 * Registers one homepage link and one dashboard extension per `triageDefinitions` row,
 * mirroring what used to be declared in routes.json + index exports.
 */
export function registerTriageDashboardExtensionsFromConfig(
  decoratorOptions: TriageExtensionDecoratorOptions,
  config: ClinicalWorkflowConfig,
): void {
  const g = globalThis as typeof globalThis & { [k: string]: boolean | undefined };
  if (g[REGISTRY_KEY]) {
    return;
  }
  g[REGISTRY_KEY] = true;

  const defs = config.triageDefinitions ?? [];

  for (const def of defs) {
    const path = getTriageRoutePath(def);
    const dashboardSlot = `${path}-dashboard-slot`;
    const linkMeta = {
      triageId: def.id,
      name: path,
      title: def.displayName,
      path,
      slot: dashboardSlot,
    };

    const linkName = triageHpLinkExtensionName(def.id);
    registerExtension({
      name: linkName,
      moduleName: decoratorOptions.moduleName,
      load: createTriageHpLinkLifecycle(decoratorOptions, linkMeta),
      meta: linkMeta,
      order: def.order,
    });
    attach('homepage-dashboard-slot', linkName);

    const dashName = triageDashboardExtensionName(def.id);
    registerExtension({
      name: dashName,
      moduleName: decoratorOptions.moduleName,
      load: getSyncLifecycle(UnifiedTriageDashboardPage, decoratorOptions),
      meta: {},
      order: 0,
      online: true,
      offline: false,
    });
    attach(dashboardSlot, dashName);
  }
}
