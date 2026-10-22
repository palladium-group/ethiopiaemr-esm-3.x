import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, SkeletonText } from '@carbon/react';
import { ArrowRight } from '@carbon/react/icons';
import { useLayoutType, useConfig, isDesktop, UserHasAccess } from '@openmrs/esm-framework';
import { usePatientRegistrationContext } from '../../patient-registration-context';
import { useResourcesContext } from '../../../resources-context';
import type {
  FormValues,
  IdentifierSource,
  PatientIdentifierType,
  PatientIdentifierValue,
} from '../../patient-registration.types';
import IdentifierInput from '../../input/custom-input/identifier/identifier-input.component';
import IdentifierSelectionOverlay from './identifier-selection-overlay.component';
import { HealthIdSearch } from '../../health-id/health-id-search.component';
import { isHealthIdIdentifierAttached } from '../../health-id/health-id.resource';
import { type RegistrationConfig } from '../../../config-schema';
import styles from '../field.scss';

export function setIdentifierSource(
  identifierSource: IdentifierSource,
  identifierValue: string,
  initialValue: string,
): {
  identifierValue: string;
  autoGeneration: boolean;
  selectedSource: IdentifierSource;
} {
  const autoGeneration = identifierSource?.autoGenerationOption?.automaticGenerationEnabled;
  const manualEntryEnabled = identifierSource?.autoGenerationOption?.manualEntryEnabled;
  return {
    selectedSource: identifierSource,
    autoGeneration,
    identifierValue:
      autoGeneration && !manualEntryEnabled
        ? 'auto-generated'
        : identifierValue !== 'auto-generated'
        ? identifierValue
        : initialValue,
  };
}

export function initializeIdentifier(identifierType: PatientIdentifierType, identifierProps): PatientIdentifierValue {
  return {
    identifierTypeUuid: identifierType.uuid,
    identifierName: identifierType.name,
    preferred: identifierType.isPrimary,
    initialValue: '',
    required: identifierType.isPrimary || identifierType.required,
    ...identifierProps,
    ...setIdentifierSource(
      identifierProps?.selectedSource ?? identifierType.identifierSources?.[0],
      identifierProps?.identifierValue,
      identifierProps?.initialValue ?? '',
    ),
  };
}

export function deleteIdentifierType(identifiers: FormValues['identifiers'], identifierFieldName) {
  return Object.fromEntries(Object.entries(identifiers).filter(([fieldName]) => fieldName !== identifierFieldName));
}

export const Identifiers: React.FC = () => {
  const { identifierTypes } = useResourcesContext();
  const isLoading = !identifierTypes?.length;
  const {
    values,
    setFieldValue,
    initialFormValues,
    isOffline,
    inEditMode,
    onHealthIdOverwrite,
    isHealthIdOverwritten,
    linkedHealthId,
    phoneAttributeTypeUuid,
    emailAttributeTypeUuid,
  } = usePatientRegistrationContext();
  const { t } = useTranslation();
  const layout = useLayoutType();
  const [showIdentifierOverlay, setShowIdentifierOverlay] = useState(false);
  const config = useConfig<RegistrationConfig>();
  const { defaultPatientIdentifierTypes, healthIdIdentifierTypeUuid, healthIdLookupUrl } = config;

  const hasHealthIdAttached = useMemo(() => {
    return (
      isHealthIdIdentifierAttached(values?.identifiers, healthIdIdentifierTypeUuid) ||
      isHealthIdIdentifierAttached(initialFormValues?.identifiers, healthIdIdentifierTypeUuid) ||
      Boolean(isHealthIdOverwritten)
    );
  }, [values?.identifiers, initialFormValues?.identifiers, healthIdIdentifierTypeUuid, isHealthIdOverwritten]);

  const showHealthIdSearch = inEditMode && !hasHealthIdAttached && !isOffline && Boolean(onHealthIdOverwrite);

  useEffect(() => {
    if (identifierTypes) {
      const identifiers = {};
      identifierTypes
        .filter(
          (type) =>
            type.isPrimary ||
            type.required ||
            !!defaultPatientIdentifierTypes?.find(
              (defaultIdentifierTypeUuid) => defaultIdentifierTypeUuid === type.uuid,
            ),
        )
        .filter((type) => !values.identifiers[type.fieldName])
        .forEach((type) => {
          identifiers[type.fieldName] = initializeIdentifier(
            type,
            values.identifiers[type.uuid] ?? initialFormValues.identifiers[type.uuid] ?? {},
          );
        });
      /*
        Identifier value should only be updated if there is any update in the
        identifier values, otherwise, if the below 'if' clause is removed, it will
        fall into an infinite run.
      */
      if (Object.keys(identifiers).length) {
        setFieldValue('identifiers', {
          ...values.identifiers,
          ...identifiers,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identifierTypes, setFieldValue, defaultPatientIdentifierTypes, values.identifiers, initializeIdentifier]);

  const closeIdentifierSelectionOverlay = useCallback(
    () => setShowIdentifierOverlay(false),
    [setShowIdentifierOverlay],
  );

  if (isLoading && !isOffline) {
    return (
      <div className={styles.halfWidthInDesktopView}>
        <div className={styles.identifierLabelText}>
          <h4 className={styles.productiveHeading02Light}>{t('idFieldLabelText', 'Identifiers')}</h4>
        </div>
        <div role="progressbar" aria-label={t('loading', 'Loading')}>
          <SkeletonText />
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      <UserHasAccess privilege={['Get Identifier Types', 'Add Patient Identifiers']}>
        <div className={styles.identifierLabelText}>
          <h4 className={styles.productiveHeading02Light}>{t('idFieldLabelText', 'Identifiers')}</h4>
        </div>
      </UserHasAccess>
      {showHealthIdSearch && (
        <HealthIdSearch
          lookupUrl={healthIdLookupUrl || 'openmrs/ws/rest/v1/ethiopiaemrcustommodule/mpi/patient'}
          currentFormValues={values}
          isHealthIdOverwritten={Boolean(isHealthIdOverwritten)}
          linkedHealthId={linkedHealthId}
          phoneAttributeTypeUuid={phoneAttributeTypeUuid}
          emailAttributeTypeUuid={emailAttributeTypeUuid}
          onOverwriteConfirm={onHealthIdOverwrite}
        />
      )}
      <div className={styles.halfWidthInDesktopView}>
        {Object.entries(values.identifiers).map(([fieldName, identifier]) => (
          <IdentifierInput key={fieldName} fieldName={fieldName} patientIdentifier={identifier} />
        ))}
        {showIdentifierOverlay && (
          <IdentifierSelectionOverlay setFieldValue={setFieldValue} closeOverlay={closeIdentifierSelectionOverlay} />
        )}
      </div>
    </div>
  );
};
