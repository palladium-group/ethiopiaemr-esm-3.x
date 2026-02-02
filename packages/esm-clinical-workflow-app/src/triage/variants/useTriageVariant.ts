import { useMatch } from 'react-router-dom';
import { useConfig } from '@openmrs/esm-framework';

import { spaBasePath } from '../../constants';
import type { ClinicalWorkflowConfig } from '../../config-schema';

export const useTriageVariant = (fallbackVariant: string) => {
  const match = useMatch({ path: `${spaBasePath}/:segment`, end: true });
  const { triageVariants } = useConfig<ClinicalWorkflowConfig>();

  const pathSegment = match?.params?.segment ?? '';
  // Abstracting the "triage-" prefix logic
  const variantKey = pathSegment?.startsWith('triage-')
    ? pathSegment.replace('triage-', '')
    : pathSegment || fallbackVariant;

  const variantConfig = triageVariants[variantKey];

  return {
    variantKey,
    variantConfig,
    isValid: !!variantConfig?.formUuid,
    pathSegment,
  };
};
