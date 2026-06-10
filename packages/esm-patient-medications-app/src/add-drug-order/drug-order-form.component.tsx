import React, {
  type ChangeEvent,
  type ComponentProps,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import {
  Button,
  ButtonSet,
  Checkbox,
  Column,
  ComboBox,
  ContentSwitcher,
  Form,
  FormGroup,
  FormLabel,
  Grid,
  IconButton,
  InlineNotification,
  NumberInput,
  Switch,
  TextArea,
  TextInput,
  Toggle,
} from '@carbon/react';
import { Subtract } from '@carbon/react/icons';
import capitalize from 'lodash-es/capitalize';
import { type Control, Controller, type FieldErrors, useController } from 'react-hook-form';
import type {
  CommonMedicationValueCoded,
  DosingUnit,
  Drug,
  DrugOrderBasketItem,
  DurationUnit,
  MedicationFrequency,
  MedicationRoute,
  QuantityUnit,
} from '@openmrs/esm-patient-common-lib';
import {
  AddIcon,
  age,
  ExtensionSlot,
  formatDate,
  getPatientName,
  OpenmrsDatePicker,
  parseDate,
  useConfig,
  useLayoutType,
  Workspace2,
  type Visit,
} from '@openmrs/esm-framework';
import { useActivePatientOrders, useRequireOutpatientQuantity } from '../api';
import { useOrderConfig } from '../api/order-config';
import { type ConfigObject } from '../config-schema';
import {
  createEmptyHybridPhase,
  createEmptyTaperingPhase,
  createInitialHybridState,
  createInitialTaperingState,
  createInitialVariableState,
  DOSING_TYPES,
  type DosingType,
  type HybridDosingState,
  type TaperingDosingState,
  type VariableDosingState,
} from './complex-dosing.types';
import {
  calculateTaperingQuantity,
  calculateTaperingTotalDurationDays,
  calculateHybridQuantity,
  calculateVariableQuantity,
  serializeHybridDosage,
  serializeTaperingDosage,
  serializeVariableDosage,
  validateHybridDosing,
  validateTaperingDosing,
  validateVariableDosing,
} from './complex-dosing.utils';
import { InputWrapper } from './complex-dosing-form.utils';
import { durationToDays, type MedicationOrderFormData, useDrugOrderForm } from './drug-order-form.resource';
import { getTemplateDoseUnits } from './drug-search/drug-search.resource';
import { TaperingDoseForm } from './tapering-dose-form.component';
import taperingStyles from './tapering-dose-form.scss';
import { VariableDoseForm } from './variable-dose-form.component';
import { HybridDoseForm } from './hybrid-dose-form.component';
import styles from './drug-order-form.scss';

export interface DrugOrderFormProps {
  /**
   * This is either an order pending in the order basket, or an existing order saved to the backend for editing.
   */
  initialOrderBasketItem: DrugOrderBasketItem | null;
  patient: fhir.Patient;
  visitContext: Visit;
  onSave: (finalizedOrder: DrugOrderBasketItem) => Promise<void>;
  saveButtonText: string;
  onCancel: () => void;
  workspaceTitle: string;
}

function MedicationInfoHeader({
  drug,
  routeValue,
  unitValue,
  dosage,
}: {
  drug: Drug;
  routeValue: string;
  unitValue: string;
  dosage: number | null;
}) {
  const { t } = useTranslation();

  return (
    <div className={styles.medicationInfo} id="medicationInfo">
      <div className={styles.medicationInfoText}>
        <strong className={styles.productiveHeading02}>
          {drug?.display} {drug?.strength && `(${drug?.strength})`}
        </strong>{' '}
        <span className={styles.bodyLong01}>
          {routeValue && <>&mdash; {routeValue}</>}{' '}
          {drug?.dosageForm?.display && <>&mdash; {drug?.dosageForm?.display}</>}{' '}
        </span>
        {dosage && unitValue ? (
          <>
            &mdash; <span className={styles.caption01}>{t('dose', 'Dose').toUpperCase()}</span>{' '}
            <strong>
              <span className={styles.productiveHeading02}>
                {dosage} {unitValue.toLowerCase()}
              </span>
            </strong>
          </>
        ) : null}
      </div>
      <ExtensionSlot
        name="medication-info-slot"
        state={{
          drug,
          orderItem: { dosage, unit: { value: unitValue }, route: { value: routeValue } },
        }}
      />
    </div>
  );
}

export function DrugOrderForm({
  initialOrderBasketItem,
  patient,
  onSave,
  saveButtonText,
  onCancel,
  visitContext,
  workspaceTitle,
}: DrugOrderFormProps) {
  const { t } = useTranslation();
  const { daysDurationUnit, durationUnitsDaysMap } = useConfig<ConfigObject>();
  const isTablet = useLayoutType() === 'tablet';
  const { orderConfigObject, error: errorFetchingOrderConfig } = useOrderConfig();
  const { requireOutpatientQuantity } = useRequireOutpatientQuantity();

  const drugOrderForm = useDrugOrderForm(initialOrderBasketItem);
  const {
    control,
    formState: { isDirty, isSubmitting },
    getValues,
    handleSubmit,
    setValue,
    setError,
    clearErrors,
    watch,
  } = drugOrderForm;

  // reset the dosage information if set to free text dosage
  const handleIsFreeTextDosageAfterChange = useCallback(
    (newValue: MedicationOrderFormData['isFreeTextDosage']) => {
      if (newValue) {
        setValue('dosage', null, { shouldValidate: true });
        setValue('unit', null, { shouldValidate: true });
        setValue('route', null, { shouldValidate: true });
        setValue('frequency', null, { shouldValidate: true });
        setValue('patientInstructions', null, { shouldValidate: true });
      } else {
        setValue('freeTextDosage', null, { shouldValidate: true });
      }
    },
    [setValue],
  );

  const handleUnitAfterChange = useCallback(
    (newValue: MedicationOrderFormData['unit'], prevValue: MedicationOrderFormData['unit']) => {
      if (prevValue?.valueCoded === getValues('quantityUnits')?.valueCoded) {
        setValue('quantityUnits', newValue, { shouldValidate: true });
      }
    },
    [setValue, getValues],
  );

  const drug = watch('drug') as Drug;
  const routeValue = watch('route')?.value;
  const watchedUnit = watch('unit');
  const watchedUnitValue = watchedUnit?.value;
  const watchedDosage = watch('dosage');
  const watchedFrequency = watch('frequency');
  const watchedDuration = watch('duration');
  const watchedDurationUnit = watch('durationUnit');
  const watchedIsFreeText = watch('isFreeTextDosage');
  const watchedAsNeeded = watch('asNeeded');
  const watchedQuantityUnits = watch('quantityUnits');
  const watchedPillsDispensed = watch('pillsDispensed');

  const isExistingOrder = initialOrderBasketItem?.action === 'REVISE' || initialOrderBasketItem?.action === 'RENEW';
  const [isManualOverride, setIsManualOverride] = useState(
    initialOrderBasketItem?.isQuantityManual ?? (isExistingOrder && initialOrderBasketItem?.pillsDispensed != null),
  );
  const [dosingType, setDosingType] = useState<DosingType>('standard');
  const [taperingState, setTaperingState] = useState<TaperingDosingState>(() => createInitialTaperingState());
  const [variableState, setVariableState] = useState<VariableDosingState>(() => createInitialVariableState());
  const [hybridState, setHybridState] = useState<HybridDosingState>(() => createInitialHybridState());
  const [showTaperingValidationErrors, setShowTaperingValidationErrors] = useState(false);
  const [showVariableValidationErrors, setShowVariableValidationErrors] = useState(false);
  const [showHybridValidationErrors, setShowHybridValidationErrors] = useState(false);

  // Complex dosing route/unit/phases are drug-specific, so clear them when the form is opened
  // for a different drug. The ref keeps the reset from running on the initial mount.
  const previousDrugUuidRef = useRef(initialOrderBasketItem?.drug?.uuid);
  useEffect(() => {
    if (previousDrugUuidRef.current === initialOrderBasketItem?.drug?.uuid) {
      return;
    }
    previousDrugUuidRef.current = initialOrderBasketItem?.drug?.uuid;
    setDosingType('standard');
    setTaperingState(createInitialTaperingState());
    setVariableState(createInitialVariableState());
    setHybridState(createInitialHybridState());
    setShowTaperingValidationErrors(false);
    setShowVariableValidationErrors(false);
    setShowHybridValidationErrors(false);
  }, [initialOrderBasketItem?.drug?.uuid]);

  const dosingTypeSelectedIndex = DOSING_TYPES.indexOf(dosingType);

  const calculatedQuantity = useMemo(() => {
    if (watchedIsFreeText || watchedAsNeeded) {
      return null;
    }

    if (dosingType === 'tapering') {
      if (watchedQuantityUnits && watchedQuantityUnits.valueCoded !== taperingState.unit?.valueCoded) {
        return null;
      }

      return calculateTaperingQuantity(taperingState, durationUnitsDaysMap);
    }

    if (dosingType === 'variable') {
      if (watchedQuantityUnits && watchedQuantityUnits.valueCoded !== variableState.unit?.valueCoded) {
        return null;
      }

      return calculateVariableQuantity(
        variableState,
        watchedDuration,
        watchedDurationUnit?.valueCoded,
        durationUnitsDaysMap,
      );
    }

    if (dosingType === 'hybrid') {
      if (watchedQuantityUnits && watchedQuantityUnits.valueCoded !== hybridState.unit?.valueCoded) {
        return null;
      }

      return calculateHybridQuantity(hybridState, durationUnitsDaysMap);
    }

    if (
      watchedDosage == null ||
      watchedDosage <= 0 ||
      watchedFrequency?.frequencyPerDay == null ||
      watchedFrequency.frequencyPerDay <= 0 ||
      watchedDuration == null ||
      watchedDuration <= 0
    ) {
      return null;
    }
    if (watchedQuantityUnits && watchedQuantityUnits.valueCoded !== watchedUnit?.valueCoded) {
      return null;
    }
    const durationDays = durationToDays(watchedDuration, watchedDurationUnit?.valueCoded, durationUnitsDaysMap);
    if (durationDays == null) {
      return null;
    }
    const result = Math.ceil(watchedDosage * watchedFrequency.frequencyPerDay * durationDays);
    return result > 0 && isFinite(result) ? result : null;
  }, [
    watchedIsFreeText,
    watchedAsNeeded,
    dosingType,
    taperingState,
    variableState,
    hybridState,
    watchedDosage,
    watchedFrequency?.frequencyPerDay,
    watchedDuration,
    watchedDurationUnit?.valueCoded,
    watchedUnit?.valueCoded,
    watchedQuantityUnits,
    durationUnitsDaysMap,
  ]);

  const doseUnitForQuantity =
    dosingType === 'tapering'
      ? taperingState.unit
      : dosingType === 'variable'
      ? variableState.unit
      : dosingType === 'hybrid'
      ? hybridState.unit
      : watchedUnit;

  useEffect(() => {
    if (!requireOutpatientQuantity || isManualOverride) {
      return;
    }

    if (calculatedQuantity != null) {
      setValue('pillsDispensed', calculatedQuantity, { shouldValidate: true });
      if (!watchedQuantityUnits && doseUnitForQuantity) {
        setValue('quantityUnits', doseUnitForQuantity, { shouldValidate: true });
      }
    } else if (getValues('pillsDispensed') != null) {
      setValue('pillsDispensed', null);
    }
  }, [
    requireOutpatientQuantity,
    isManualOverride,
    calculatedQuantity,
    doseUnitForQuantity,
    watchedQuantityUnits,
    getValues,
    setValue,
  ]);

  const handleQuantityAfterChange = useCallback(() => {
    setIsManualOverride(true);
  }, []);

  const handleRecalculate = useCallback(() => {
    setValue('pillsDispensed', calculatedQuantity, { shouldValidate: true });
    if (!watchedQuantityUnits && doseUnitForQuantity) {
      setValue('quantityUnits', doseUnitForQuantity, { shouldValidate: true });
    }
    setIsManualOverride(false);
  }, [calculatedQuantity, doseUnitForQuantity, setValue, watchedQuantityUnits]);

  const handleFormSubmission = useCallback(
    async (data: MedicationOrderFormData) => {
      const newBasketItem = {
        ...initialOrderBasketItem,
        drug: data.drug,
        isFreeTextDosage: data.isFreeTextDosage,
        freeTextDosage: data.freeTextDosage,
        dosage: data.dosage,
        unit: data.unit,
        route: data.route,
        patientInstructions: data.patientInstructions,
        asNeeded: data.asNeeded,
        asNeededCondition: data.asNeededCondition,
        duration: data.duration,
        durationUnit: data.durationUnit,
        pillsDispensed: data.pillsDispensed,
        isQuantityManual: isManualOverride,
        quantityUnits: data.quantityUnits,
        numRefills: 0,
        indication: data.indication,
        frequency: data.frequency,
        startDate: data.startDate,
        action: initialOrderBasketItem?.action ?? 'NEW',
        commonMedicationName: data.drug.display,
        display: data.drug.display,
        visit: initialOrderBasketItem?.visit ?? visitContext, // TODO: they really should be the same
      } as DrugOrderBasketItem;

      await onSave(newBasketItem);
    },
    [initialOrderBasketItem, isManualOverride, onSave, visitContext],
  );

  const handleFormSubmissionError = useCallback((errors: FieldErrors<MedicationOrderFormData>) => {
    if (errors) {
      console.error('Error in drug order form', errors);
    }
  }, []);

  // Toggles the validation banner for one complex dosing type and hides the others.
  const setActiveComplexValidation = useCallback((activeType: DosingType | null) => {
    setShowTaperingValidationErrors(activeType === 'tapering');
    setShowVariableValidationErrors(activeType === 'variable');
    setShowHybridValidationErrors(activeType === 'hybrid');
  }, []);

  // Shared save path for complex dosing types: serialize the regimen into freeTextDosage,
  // clear the standard dosage fields, and submit. duration/durationUnit are only set for
  // types that span a known number of days (tapering, hybrid).
  const applyComplexDosingAndSubmit = useCallback(
    async ({
      serializedDosage,
      route,
      unit,
      durationDays,
      durationUnit,
    }: {
      serializedDosage: string | null;
      route: MedicationRoute | null;
      unit: DosingUnit | null;
      durationDays?: number | null;
      durationUnit?: DurationUnit | null;
    }) => {
      setValue('isFreeTextDosage', true);
      setValue('freeTextDosage', serializedDosage ?? '');
      setValue('dosage', null);
      setValue('unit', null);
      setValue('frequency', null);
      setValue('route', route, { shouldValidate: true });
      if (durationDays != null) {
        setValue('duration', durationDays, { shouldValidate: true });
      }
      if (durationUnit) {
        setValue('durationUnit', durationUnit, { shouldValidate: true });
      }
      if (!getValues('quantityUnits') && unit) {
        setValue('quantityUnits', unit, { shouldValidate: true });
      }

      await handleSubmit(handleFormSubmission, handleFormSubmissionError)();
    },
    [getValues, handleFormSubmission, handleFormSubmissionError, handleSubmit, setValue],
  );

  const templateDosingUnits = useMemo(
    () => getTemplateDoseUnits(initialOrderBasketItem?.template?.dosingInstructions) ?? null,
    [initialOrderBasketItem?.template],
  );

  const templateQuantityUnits = useMemo(() => {
    const quantityUnits = initialOrderBasketItem?.template?.dosingInstructions?.quantityUnits;
    return quantityUnits?.length ? quantityUnits : null;
  }, [initialOrderBasketItem?.template]);

  const drugDosingUnits: Array<DosingUnit> = useMemo(
    () => templateDosingUnits ?? orderConfigObject?.drugDosingUnits ?? [],
    [templateDosingUnits, orderConfigObject?.drugDosingUnits],
  );

  useEffect(() => {
    if (!watchedUnit?.valueCoded) {
      return;
    }

    // Template-defined units are already constrained by the combobox items list.
    if (templateDosingUnits?.length) {
      return;
    }

    if (!orderConfigObject?.drugDosingUnits) {
      return;
    }

    const isValidDoseUnit = drugDosingUnits.some((dosingUnit) => dosingUnit.valueCoded === watchedUnit.valueCoded);
    if (!isValidDoseUnit) {
      setValue('unit', null, { shouldValidate: false });
    }
  }, [drugDosingUnits, orderConfigObject?.drugDosingUnits, setValue, templateDosingUnits, watchedUnit?.valueCoded]);

  const drugRoutes: Array<MedicationRoute> = useMemo(() => orderConfigObject?.drugRoutes ?? [], [orderConfigObject]);

  const drugDispensingUnits: Array<QuantityUnit> = useMemo(
    () =>
      orderConfigObject?.drugDispensingUnits ?? [
        {
          valueCoded: initialOrderBasketItem?.drug?.dosageForm?.uuid,
          value: initialOrderBasketItem?.drug?.dosageForm?.display,
        },
      ],
    [orderConfigObject, initialOrderBasketItem?.drug?.dosageForm],
  );

  useEffect(() => {
    if (!watchedQuantityUnits?.valueCoded) {
      return;
    }

    if (templateQuantityUnits?.length) {
      return;
    }

    if (templateDosingUnits?.length && watchedQuantityUnits.valueCoded === watchedUnit?.valueCoded) {
      return;
    }

    if (!orderConfigObject?.drugDispensingUnits) {
      return;
    }

    const isValidQuantityUnit = drugDispensingUnits.some(
      (dispensingUnit) => dispensingUnit.valueCoded === watchedQuantityUnits.valueCoded,
    );
    if (!isValidQuantityUnit) {
      setValue('quantityUnits', null, { shouldValidate: false });
    }
  }, [
    drugDispensingUnits,
    orderConfigObject?.drugDispensingUnits,
    setValue,
    templateDosingUnits,
    templateQuantityUnits,
    watchedQuantityUnits?.valueCoded,
    watchedUnit?.valueCoded,
  ]);

  const durationUnits: Array<DurationUnit> = useMemo(
    () =>
      orderConfigObject?.durationUnits ?? [
        {
          valueCoded: daysDurationUnit?.uuid,
          value: daysDurationUnit?.display,
        },
      ],
    [orderConfigObject, daysDurationUnit],
  );

  const defaultDaysDurationUnit = useMemo(
    () => durationUnits.find((unit) => unit.valueCoded === daysDurationUnit?.uuid) ?? durationUnits[0] ?? null,
    [durationUnits, daysDurationUnit?.uuid],
  );

  const taperingTotalDurationDays = useMemo(
    () => calculateTaperingTotalDurationDays(taperingState.phases, durationUnitsDaysMap),
    [taperingState.phases, durationUnitsDaysMap],
  );

  const hybridTotalDurationDays = useMemo(
    () => calculateTaperingTotalDurationDays(hybridState.phases, durationUnitsDaysMap),
    [hybridState.phases, durationUnitsDaysMap],
  );

  const taperingDosagePreview = useMemo(
    () => (dosingType === 'tapering' && !watchedIsFreeText ? serializeTaperingDosage(taperingState) : null),
    [dosingType, watchedIsFreeText, taperingState],
  );

  const variableDosagePreview = useMemo(
    () => (dosingType === 'variable' && !watchedIsFreeText ? serializeVariableDosage(variableState) : null),
    [dosingType, watchedIsFreeText, variableState],
  );

  const hybridDosagePreview = useMemo(
    () => (dosingType === 'hybrid' && !watchedIsFreeText ? serializeHybridDosage(hybridState) : null),
    [dosingType, watchedIsFreeText, hybridState],
  );

  const taperingValidationMessages = useMemo(
    () => ({
      routeRequired: t('selectRouteErrorMessage', 'Route is required'),
      unitRequired: t('selectUnitErrorMessage', 'Dose unit is required'),
      doseRequired: t('dosageRequiredErrorMessage', 'Dosage is required'),
      doseGreaterThanZero: t('dosageGreaterThanZeroErrorMessage', 'Dose must be greater than 0'),
      frequencyRequired: t('selectFrequencyErrorMessage', 'Frequency is required'),
      durationRequired: t('durationRequiredErrorMessage', 'Duration is required'),
      durationGreaterThanZero: t('durationGreaterThanZeroErrorMessage', 'Duration must be greater than 0'),
      durationUnitRequired: t('durationUnitRequiredErrorMessage', 'Duration unit is required'),
    }),
    [t],
  );

  const taperingValidationResult = useMemo(
    () => validateTaperingDosing(taperingState, taperingValidationMessages),
    [taperingState, taperingValidationMessages],
  );

  const variableValidationMessages = useMemo(
    () => ({
      routeRequired: t('selectRouteErrorMessage', 'Route is required'),
      unitRequired: t('selectUnitErrorMessage', 'Dose unit is required'),
      doseRequired: t('dosageRequiredErrorMessage', 'Dosage is required'),
      doseGreaterThanZero: t('dosageGreaterThanZeroErrorMessage', 'Dose must be greater than 0'),
      durationRequired: t('durationRequiredErrorMessage', 'Duration is required'),
      durationGreaterThanZero: t('durationGreaterThanZeroErrorMessage', 'Duration must be greater than 0'),
      durationUnitRequired: t('durationUnitRequiredErrorMessage', 'Duration unit is required'),
    }),
    [t],
  );

  const variableValidationResult = useMemo(
    () => validateVariableDosing(variableState, watchedDuration, watchedDurationUnit, variableValidationMessages),
    [variableState, watchedDuration, watchedDurationUnit, variableValidationMessages],
  );

  const hybridValidationResult = useMemo(
    () => validateHybridDosing(hybridState, variableValidationMessages),
    [hybridState, variableValidationMessages],
  );

  const handleFormSave = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (dosingType === 'tapering' && !watchedIsFreeText) {
        setActiveComplexValidation('tapering');
        if (!taperingValidationResult.isValid) {
          return;
        }

        await applyComplexDosingAndSubmit({
          serializedDosage: serializeTaperingDosage(taperingState),
          route: taperingState.route,
          unit: taperingState.unit,
          durationDays: taperingTotalDurationDays,
          durationUnit: defaultDaysDurationUnit,
        });
        return;
      }

      if (dosingType === 'variable' && !watchedIsFreeText) {
        setActiveComplexValidation('variable');

        // Variable mode reuses the shared "Prescription duration" react-hook-form fields, so their
        // errors must be pushed into react-hook-form here. Route, unit, and dose slots live in
        // variableState and surface through the validationErrors prop instead (as in tapering/hybrid).
        if (variableValidationResult.errors.duration) {
          setError('duration', { type: 'manual', message: variableValidationResult.errors.duration });
        } else {
          clearErrors('duration');
        }

        if (variableValidationResult.errors.durationUnit) {
          setError('durationUnit', { type: 'manual', message: variableValidationResult.errors.durationUnit });
        } else {
          clearErrors('durationUnit');
        }

        if (!variableValidationResult.isValid) {
          return;
        }

        await applyComplexDosingAndSubmit({
          serializedDosage: serializeVariableDosage(variableState),
          route: variableState.route,
          unit: variableState.unit,
        });
        return;
      }

      if (dosingType === 'hybrid' && !watchedIsFreeText) {
        setActiveComplexValidation('hybrid');
        if (!hybridValidationResult.isValid) {
          return;
        }

        await applyComplexDosingAndSubmit({
          serializedDosage: serializeHybridDosage(hybridState),
          route: hybridState.route,
          unit: hybridState.unit,
          durationDays: hybridTotalDurationDays,
          durationUnit: defaultDaysDurationUnit,
        });
        return;
      }

      setActiveComplexValidation(null);
      await handleSubmit(handleFormSubmission, handleFormSubmissionError)(event);
    },
    [
      applyComplexDosingAndSubmit,
      clearErrors,
      defaultDaysDurationUnit,
      dosingType,
      handleFormSubmission,
      handleFormSubmissionError,
      handleSubmit,
      hybridState,
      hybridTotalDurationDays,
      hybridValidationResult.isValid,
      setActiveComplexValidation,
      setError,
      taperingState,
      taperingTotalDurationDays,
      taperingValidationResult.isValid,
      variableState,
      variableValidationResult.errors.duration,
      variableValidationResult.errors.durationUnit,
      variableValidationResult.isValid,
      watchedIsFreeText,
    ],
  );

  const handleDosingTypeChange = useCallback(
    ({ index }: { index: number }) => {
      const newType = DOSING_TYPES[index] ?? 'standard';
      setDosingType(newType);
      setShowTaperingValidationErrors(false);
      setShowVariableValidationErrors(false);
      setShowHybridValidationErrors(false);

      if (newType === 'tapering') {
        setTaperingState((prev) => ({
          ...prev,
          route: prev.route ?? (getValues('route') as TaperingDosingState['route']) ?? null,
          unit: prev.unit ?? (getValues('unit') as TaperingDosingState['unit']) ?? null,
          phases: prev.phases.length > 0 ? prev.phases : [createEmptyTaperingPhase(defaultDaysDurationUnit)],
        }));
      }

      if (newType === 'variable') {
        setVariableState((prev) => ({
          ...prev,
          route: prev.route ?? (getValues('route') as VariableDosingState['route']) ?? null,
          unit: prev.unit ?? (getValues('unit') as VariableDosingState['unit']) ?? null,
        }));
      }

      if (newType === 'hybrid') {
        setHybridState((prev) => ({
          ...prev,
          route: prev.route ?? (getValues('route') as HybridDosingState['route']) ?? null,
          unit: prev.unit ?? (getValues('unit') as HybridDosingState['unit']) ?? null,
          phases: prev.phases.length > 0 ? prev.phases : [createEmptyHybridPhase(defaultDaysDurationUnit)],
        }));
      }
    },
    [defaultDaysDurationUnit, getValues],
  );

  const orderFrequencies: Array<MedicationFrequency> = useMemo(() => {
    return orderConfigObject?.orderFrequencies ?? [];
  }, [orderConfigObject]);

  const filterItemsByName = useCallback((menu) => {
    return menu?.item?.value?.toLowerCase().includes(menu?.inputValue?.toLowerCase());
  }, []);

  const filterItemsBySynonymNames = useCallback((menu) => {
    if (menu?.inputValue?.length) {
      return menu.item?.names?.some((abbr: string) => abbr.toLowerCase().includes(menu.inputValue.toLowerCase()));
    }
    return menu?.item?.names ?? [];
  }, []);

  const [showStickyMedicationHeader, setShowMedicationHeader] = useState(false);
  const patientName = patient ? getPatientName(patient) : '';

  const observer = useRef(null);
  const medicationInfoHeaderRef = useCallback(
    (node: HTMLElement) => {
      if (observer.current) {
        observer.current.disconnect();
      }

      observer.current = new IntersectionObserver(
        ([e]) => {
          setShowMedicationHeader(e.intersectionRatio < 1);
        },
        {
          threshold: 1,
        },
      );

      if (node) {
        observer.current.observe(node);
      }
    },
    [setShowMedicationHeader],
  );
  const {
    fieldState: { error: drugFieldError },
  } = useController<MedicationOrderFormData>({ name: 'drug', control });

  // TODO: use the backend instead of this to determine whether the drug formulation can be ordered
  // See: https://openmrs.atlassian.net/browse/RESTWS-1003
  const { data: activeOrders } = useActivePatientOrders(patient.id);
  const drugAlreadyPrescribedForNewOrder = useMemo(
    () =>
      (initialOrderBasketItem == null || initialOrderBasketItem?.action == 'NEW') &&
      activeOrders?.some((order) => order?.drug?.uuid === drug?.uuid),
    [activeOrders, drug, initialOrderBasketItem],
  );

  return (
    <Workspace2 title={workspaceTitle} hasUnsavedChanges={isDirty}>
      <div className={styles.container}>
        {showStickyMedicationHeader && (
          <div className={styles.stickyMedicationInfo}>
            <MedicationInfoHeader
              dosage={watchedDosage}
              drug={drug}
              routeValue={routeValue}
              unitValue={watchedUnitValue}
            />
          </div>
        )}
        <div className={styles.patientHeader}>
          <span className={styles.bodyShort02}>{patientName}</span>
          <span className={classNames(styles.text02, styles.bodyShort01)}>
            {capitalize(patient?.gender)} &middot; {age(patient?.birthDate)} &middot;{' '}
            <span>{formatDate(parseDate(patient?.birthDate), { mode: 'wide', time: false })}</span>
          </span>
        </div>
        <ExtensionSlot name="allergy-list-pills-slot" state={{ patientUuid: patient?.id }} />
        <Form className={styles.orderForm} onSubmit={handleFormSave} id="drugOrderForm">
          <div>
            {errorFetchingOrderConfig && (
              <InlineNotification
                kind="error"
                lowContrast
                className={styles.inlineNotification}
                title={t('errorFetchingOrderConfig', 'Error occurred when fetching Order config')}
                subtitle={t('tryReopeningTheForm', 'Please try launching the form again')}
              />
            )}
            <h1 className={styles.orderFormHeading}>{t('orderForm', 'Order Form')}</h1>
            <div ref={medicationInfoHeaderRef}>
              <MedicationInfoHeader
                dosage={watchedDosage}
                drug={drug}
                routeValue={routeValue}
                unitValue={watchedUnitValue}
              />
            </div>
            <section className={styles.formSection}>
              <Grid className={styles.gridRow}>
                <Column lg={12} md={6} sm={4}>
                  <h3 className={styles.sectionHeader}>{t('dosageInstructions', 'Dosage instructions')}</h3>
                </Column>
                <Column className={styles.freeTextDosageToggle} lg={4} md={2} sm={4}>
                  <ControlledFieldInput
                    name="isFreeTextDosage"
                    type="toggle"
                    control={control}
                    size="sm"
                    id="freeTextDosageToggle"
                    aria-label={t('freeTextDosage', 'Free text dosage')}
                    labelText={t('freeTextDosage', 'Free text dosage')}
                    handleAfterChange={handleIsFreeTextDosageAfterChange}
                  />
                </Column>
              </Grid>
              {watch('isFreeTextDosage') ? (
                <Grid className={styles.gridRow}>
                  <Column md={8}>
                    <ControlledFieldInput
                      control={control}
                      name="freeTextDosage"
                      type="textArea"
                      labelText={t('freeTextDosage', 'Free text dosage')}
                      placeholder={t('freeTextDosage', 'Free text dosage')}
                      maxLength={65535}
                    />
                  </Column>
                </Grid>
              ) : (
                <>
                  <Grid className={styles.gridRow}>
                    <Column lg={16} md={8} sm={4}>
                      <div className={styles.dosingTypeSelector}>
                        <span className={styles.dosingTypeLabel}>{t('dosingType', 'Dosing type')}</span>
                        <ContentSwitcher
                          size={isTablet ? 'md' : 'sm'}
                          selectedIndex={dosingTypeSelectedIndex}
                          onChange={handleDosingTypeChange}>
                          <Switch name="standard" text={t('dosingTypeStandard', 'Standard')} />
                          <Switch name="tapering" text={t('dosingTypeTapering', 'Tapering')} />
                          <Switch name="variable" text={t('dosingTypeVariable', 'Variable')} />
                          <Switch name="hybrid" text={t('dosingTypeHybrid', 'Hybrid')} />
                        </ContentSwitcher>
                      </div>
                    </Column>
                  </Grid>
                  {dosingType === 'standard' ? (
                    <>
                      <Grid className={styles.gridRow}>
                        <Column lg={8} md={4} sm={4} className={styles.linkedInput}>
                          <InputWrapper>
                            <div className={styles.numberInput}>
                              <ControlledFieldInput
                                control={control}
                                type="number"
                                name="dosage"
                                id="doseSelection"
                                placeholder={t('editDoseComboBoxPlaceholder', 'Dose')}
                                label={t('editDoseComboBoxTitle', 'Dose')}
                                min={0.01}
                                hideSteppers={true}
                                step={0.01}
                              />
                            </div>
                          </InputWrapper>
                        </Column>
                        <Column lg={8} md={4} sm={4}>
                          <InputWrapper>
                            <ControlledFieldInput
                              control={control}
                              name="unit"
                              type="comboBox"
                              getValues={getValues}
                              id="dosingUnits"
                              shouldFilterItem={filterItemsByName}
                              placeholder={t('editDosageUnitsPlaceholder', 'Unit')}
                              titleText={t('editDosageUnitsTitle', 'Dose unit')}
                              items={drugDosingUnits}
                              itemToString={(item: CommonMedicationValueCoded) => item?.value}
                              handleAfterChange={handleUnitAfterChange}
                            />
                          </InputWrapper>
                        </Column>
                      </Grid>
                      <Grid className={styles.gridRow}>
                        <Column lg={16} md={4} sm={4}>
                          <InputWrapper>
                            <ControlledFieldInput
                              control={control}
                              id="editRoute"
                              items={drugRoutes}
                              itemToString={(item: CommonMedicationValueCoded) => item?.value}
                              name="route"
                              placeholder={t('editRouteComboBoxTitle', 'Route')}
                              shouldFilterItem={filterItemsByName}
                              titleText={t('editRouteComboBoxTitle', 'Route')}
                              type="comboBox"
                            />
                          </InputWrapper>
                        </Column>
                        <Column lg={16} md={4} sm={4}>
                          <InputWrapper>
                            <ControlledFieldInput
                              control={control}
                              name="frequency"
                              type="comboBox"
                              id="editFrequency"
                              items={orderFrequencies}
                              shouldFilterItem={filterItemsBySynonymNames}
                              placeholder={t('editFrequencyComboBoxTitle', 'Frequency')}
                              titleText={t('editFrequencyComboBoxTitle', 'Frequency')}
                              itemToString={(item: CommonMedicationValueCoded) => item?.value}
                            />
                          </InputWrapper>
                        </Column>
                      </Grid>

                      <Grid className={styles.gridRow}>
                        <Column lg={16} md={4} sm={4}>
                          <InputWrapper>
                            <ControlledFieldInput
                              control={control}
                              name="patientInstructions"
                              type="textArea"
                              labelText={t('patientInstructions', 'Patient instructions')}
                              placeholder={t(
                                'patientInstructionsPlaceholder',
                                'Additional dosing instructions (e.g. "Take after eating")',
                              )}
                              maxLength={65535}
                              rows={isTablet ? 6 : 4}
                            />
                          </InputWrapper>
                        </Column>
                        <Column className={styles.prn} lg={16} md={4} sm={4}>
                          <Grid className={styles.gridRow}>
                            <Column lg={6} md={8} sm={4}>
                              <InputWrapper>
                                <FormGroup legendText={t('prn', 'P.R.N.')}>
                                  <ControlledFieldInput
                                    control={control}
                                    name="asNeeded"
                                    type="checkbox"
                                    id="prn"
                                    labelText={t('takeAsNeeded', 'Take as needed')}
                                  />
                                </FormGroup>
                              </InputWrapper>
                            </Column>

                            <Column lg={10} md={8} sm={4}>
                              <InputWrapper>
                                <ControlledFieldInput
                                  control={control}
                                  name="asNeededCondition"
                                  type="textArea"
                                  labelText={t('prnReason', 'P.R.N. reason')}
                                  placeholder={t('prnReasonPlaceholder', 'Reason to take medicine')}
                                  rows={3}
                                  maxLength={255}
                                  disabled={!watch('asNeeded')}
                                />
                              </InputWrapper>
                            </Column>
                          </Grid>
                        </Column>
                      </Grid>
                    </>
                  ) : dosingType === 'tapering' ? (
                    <>
                      {showTaperingValidationErrors && !taperingValidationResult.isValid && (
                        <InlineNotification
                          kind="error"
                          lowContrast
                          className={styles.inlineNotification}
                          subtitle={t(
                            'taperingValidationError',
                            'Complete all tapering fields in every phase before saving.',
                          )}
                          title={t('taperingValidationErrorTitle', 'Incomplete tapering regimen')}
                        />
                      )}
                      <TaperingDoseForm
                        state={taperingState}
                        drugRoutes={drugRoutes}
                        drugDosingUnits={drugDosingUnits}
                        orderFrequencies={orderFrequencies}
                        durationUnits={durationUnits}
                        defaultDurationUnit={defaultDaysDurationUnit}
                        onStateChange={setTaperingState}
                        validationErrors={showTaperingValidationErrors ? taperingValidationResult.errors : null}
                        filterItemsByName={filterItemsByName}
                        filterItemsBySynonymNames={filterItemsBySynonymNames}
                      />
                      {taperingDosagePreview && (
                        <div className={taperingStyles.dosagePreview}>
                          <span className={taperingStyles.dosagePreviewLabel}>
                            {t('dosageSummary', 'Dosage summary')}
                          </span>
                          <span className={taperingStyles.dosagePreviewValue}>{taperingDosagePreview}</span>
                        </div>
                      )}
                    </>
                  ) : dosingType === 'variable' ? (
                    <>
                      {showVariableValidationErrors && !variableValidationResult.isValid && (
                        <InlineNotification
                          kind="error"
                          lowContrast
                          className={styles.inlineNotification}
                          subtitle={t(
                            'variableValidationError',
                            'Complete route, dose unit, all dose slots, and prescription duration before saving.',
                          )}
                          title={t('variableValidationErrorTitle', 'Incomplete variable regimen')}
                        />
                      )}
                      <VariableDoseForm
                        state={variableState}
                        drugRoutes={drugRoutes}
                        drugDosingUnits={drugDosingUnits}
                        onStateChange={setVariableState}
                        validationErrors={showVariableValidationErrors ? variableValidationResult.errors : null}
                        filterItemsByName={filterItemsByName}
                      />
                      {variableDosagePreview && (
                        <div className={taperingStyles.dosagePreview}>
                          <span className={taperingStyles.dosagePreviewLabel}>
                            {t('dosageSummary', 'Dosage summary')}
                          </span>
                          <span className={taperingStyles.dosagePreviewValue}>{variableDosagePreview}</span>
                        </div>
                      )}
                    </>
                  ) : dosingType === 'hybrid' ? (
                    <>
                      {showHybridValidationErrors && !hybridValidationResult.isValid && (
                        <InlineNotification
                          kind="error"
                          lowContrast
                          className={styles.inlineNotification}
                          subtitle={t(
                            'hybridValidationError',
                            'Complete route, dose unit, and each phase’s duration and dose slots before saving.',
                          )}
                          title={t('hybridValidationErrorTitle', 'Incomplete phased regimen')}
                        />
                      )}
                      <HybridDoseForm
                        state={hybridState}
                        drugRoutes={drugRoutes}
                        drugDosingUnits={drugDosingUnits}
                        durationUnits={durationUnits}
                        defaultDurationUnit={defaultDaysDurationUnit}
                        onStateChange={setHybridState}
                        validationErrors={showHybridValidationErrors ? hybridValidationResult.errors : null}
                        filterItemsByName={filterItemsByName}
                      />
                      {hybridDosagePreview && (
                        <div className={taperingStyles.dosagePreview}>
                          <span className={taperingStyles.dosagePreviewLabel}>
                            {t('dosageSummary', 'Dosage summary')}
                          </span>
                          <span className={taperingStyles.dosagePreviewValue}>{hybridDosagePreview}</span>
                        </div>
                      )}
                    </>
                  ) : null}
                </>
              )}
            </section>
            <section className={styles.formSection}>
              <h3 className={styles.sectionHeader}>{t('prescriptionDuration', 'Prescription duration')}</h3>
              <Grid className={classNames(styles.gridRow, styles.topAlignedGridRow)}>
                {/* TODO: This input does nothing */}
                <Column lg={16} md={4} sm={4}>
                  <div className={styles.fullWidthDatePickerContainer}>
                    <InputWrapper>
                      <Controller
                        name="startDate"
                        control={control}
                        render={({ field, fieldState }) => (
                          <OpenmrsDatePicker
                            {...field}
                            maxDate={new Date()}
                            id="startDatePicker"
                            labelText={t('startDate', 'Start date')}
                            size={isTablet ? 'lg' : 'sm'}
                            invalid={Boolean(fieldState?.error?.message)}
                            invalidText={fieldState?.error?.message}
                          />
                        )}
                      />
                    </InputWrapper>
                  </div>
                </Column>
                {(dosingType === 'tapering' || dosingType === 'hybrid') && !watchedIsFreeText ? (
                  <Column lg={16} md={4} sm={4}>
                    <div className={taperingStyles.totalDuration}>
                      <span className={taperingStyles.totalDurationLabel}>{t('totalDuration', 'Total duration')}</span>
                      <span className={taperingStyles.totalDurationValue}>
                        {(dosingType === 'tapering' ? taperingTotalDurationDays : hybridTotalDurationDays) != null
                          ? t('totalDurationDays', '{{count}} Days', {
                              count: dosingType === 'tapering' ? taperingTotalDurationDays : hybridTotalDurationDays,
                            })
                          : t('totalDurationIncomplete', '—')}
                      </span>
                    </div>
                  </Column>
                ) : (
                  <>
                    <Column lg={8} md={2} sm={4} className={styles.linkedInput}>
                      <InputWrapper>
                        {!isTablet ? (
                          <ControlledFieldInput
                            control={control}
                            name="duration"
                            type="number"
                            id="durationInput"
                            label={t('duration', 'Duration')}
                            min={0}
                            step={1}
                            allowEmpty
                          />
                        ) : (
                          <CustomNumberInput
                            control={control}
                            isTablet={isTablet}
                            setValue={setValue}
                            name="duration"
                            labelText={t('duration', 'Duration')}
                          />
                        )}
                      </InputWrapper>
                    </Column>
                    <Column className={styles.durationUnit} lg={8} md={2} sm={4}>
                      <InputWrapper>
                        <ControlledFieldInput
                          control={control}
                          name="durationUnit"
                          type="comboBox"
                          id="durationUnitPlaceholder"
                          titleText={t('durationUnit', 'Duration unit')}
                          items={durationUnits}
                          itemToString={(item: CommonMedicationValueCoded) => item?.value}
                          placeholder={t('durationUnitPlaceholder', 'Duration Unit')}
                          shouldFilterItem={filterItemsByName}
                        />
                      </InputWrapper>
                    </Column>
                  </>
                )}
              </Grid>
            </section>
            <section className={styles.formSection}>
              <h3 className={styles.sectionHeader}>{t('dispensingInformation', 'Dispensing instructions')}</h3>
              <Grid className={classNames(styles.gridRow, styles.topAlignedGridRow)}>
                <Column lg={8} md={3} sm={4}>
                  <InputWrapper>
                    <ControlledFieldInput
                      control={control}
                      name="pillsDispensed"
                      type="number"
                      id="quantityDispensed"
                      label={t('quantityToDispense', 'Quantity to dispense')}
                      min={0}
                      hideSteppers
                      allowEmpty
                      getValues={getValues}
                      handleAfterChange={handleQuantityAfterChange}
                    />
                    {requireOutpatientQuantity &&
                      (isManualOverride
                        ? calculatedQuantity != null && (
                            <button type="button" className={styles.recalculateLink} onClick={handleRecalculate}>
                              {t('applyCalculatedQuantity', 'Apply calculated quantity ({{quantity}})', {
                                quantity: calculatedQuantity,
                              })}
                            </button>
                          )
                        : watchedPillsDispensed != null && (
                            <span className={styles.autoCalcHelper}>
                              {t('quantityAutoCalculated', 'Auto-calculated')}
                            </span>
                          ))}
                  </InputWrapper>
                </Column>
                <Column lg={8} md={3} sm={4}>
                  <InputWrapper>
                    <ControlledFieldInput
                      control={control}
                      id="dispensingUnits"
                      items={drugDispensingUnits}
                      itemToString={(item: CommonMedicationValueCoded) => item?.value}
                      name="quantityUnits"
                      placeholder={t('editDispensingUnit', 'Quantity unit')}
                      shouldFilterItem={filterItemsByName}
                      titleText={t('editDispensingUnit', 'Quantity unit')}
                      type="comboBox"
                    />
                  </InputWrapper>
                </Column>
              </Grid>
              <Grid className={styles.gridRow}>
                <Column lg={16} md={6} sm={4}>
                  <InputWrapper>
                    <ControlledFieldInput
                      control={control}
                      name="indication"
                      type="textInput"
                      id="indication"
                      labelText={t('indication', 'Indication')}
                      placeholder={t('indicationPlaceholder', 'e.g. "Hypertension"')}
                      maxLength={150}
                    />
                  </InputWrapper>
                </Column>
              </Grid>
            </section>
          </div>

          <ExtensionSlot
            name="drug-order-form-actions-slot"
            state={{
              drug,
              orderItem: {
                dosage: watchedDosage,
                unit: watchedUnit,
                route: watch('route'),
                frequency: watchedFrequency,
              },
            }}
          />
          <ButtonSet className={styles.buttonSet}>
            <Button className={styles.button} kind="secondary" onClick={onCancel} size="xl">
              {t('discard', 'Discard')}
            </Button>
            <Button
              className={styles.button}
              kind="primary"
              type="submit"
              size="xl"
              disabled={!!errorFetchingOrderConfig || isSubmitting || drugAlreadyPrescribedForNewOrder}>
              {saveButtonText}
            </Button>
          </ButtonSet>
        </Form>
      </div>
    </Workspace2>
  );
}

interface CustomNumberInputProps {
  setValue: (name: keyof MedicationOrderFormData, value: number) => void;
  control: Control<MedicationOrderFormData>;
  name: keyof MedicationOrderFormData;
  labelText: string;
  isTablet: boolean;
  inputProps?: Partial<ComponentProps<typeof TextInput>>;
}

const CustomNumberInput = ({ setValue, control, name, labelText, isTablet, ...inputProps }: CustomNumberInputProps) => {
  const { t } = useTranslation();
  const responsiveSize = isTablet ? 'md' : 'sm';

  const {
    field: { onBlur, onChange, value, ref },
  } = useController<MedicationOrderFormData>({ name, control });

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const number = parseFloat(String(e.target.value));
      onChange(isNaN(number) ? null : number);
    },
    [onChange],
  );

  const increment = () => {
    setValue(name, Number(value) + 1);
  };

  const decrement = () => {
    setValue(name, Math.max(Number(value) - 1, 0));
  };

  return (
    <div className={styles.customElement}>
      <span className="cds--label" id={`${name}-label`}>
        {labelText}
      </span>
      <div className={styles.customNumberInput}>
        <IconButton onClick={decrement} label={t('decrement', 'Decrement')} size={responsiveSize}>
          <Subtract size={16} />
        </IconButton>
        <TextInput
          onChange={handleChange}
          className={styles.customInput}
          onBlur={onBlur}
          ref={ref}
          value={typeof value === 'string' || typeof value === 'number' ? value : '--'}
          size={responsiveSize}
          id={name}
          labelText=""
          aria-labelledby={`${name}-label`}
          {...inputProps}
        />
        <IconButton onClick={increment} label={t('increment', 'Increment')} size={responsiveSize}>
          <AddIcon size={16} />
        </IconButton>
      </div>
    </div>
  );
};

interface BaseControlledFieldInputProps {
  control: Control<MedicationOrderFormData>;
  name: keyof MedicationOrderFormData;
  type: 'number' | 'toggle' | 'checkbox' | 'textArea' | 'textInput' | 'comboBox';
  getValues?: (name: keyof MedicationOrderFormData) => any;
  handleAfterChange?: (newValue: any, prevValue: any) => void;
}

type ControlledFieldInputProps = BaseControlledFieldInputProps &
  (
    | ({ type: 'number' } & Omit<ComponentProps<typeof NumberInput>, 'onChange' | 'onBlur' | 'value' | 'ref'>)
    | ({ type: 'toggle' } & Omit<ComponentProps<typeof Toggle>, 'onChange' | 'onBlur' | 'toggled' | 'ref'>)
    | ({ type: 'checkbox' } & Omit<ComponentProps<typeof Checkbox>, 'onChange' | 'onBlur' | 'checked' | 'ref'> & {
          labelText: string;
        })
    | ({ type: 'textArea' } & Omit<ComponentProps<typeof TextArea>, 'onChange' | 'onBlur' | 'value' | 'ref'>)
    | ({ type: 'textInput' } & Omit<ComponentProps<typeof TextInput>, 'onChange' | 'onBlur' | 'value' | 'ref'>)
    | ({ type: 'comboBox' } & Omit<ComponentProps<typeof ComboBox>, 'onChange' | 'onBlur' | 'selectedItem' | 'ref'>)
  );

const ControlledFieldInput = ({
  control,
  name,
  type,
  getValues,
  handleAfterChange,
  ...restProps
}: ControlledFieldInputProps) => {
  const { t } = useTranslation();
  const {
    field: { onBlur, onChange, value, ref },
    fieldState: { error, isTouched },
    formState: { isSubmitted },
  } = useController<MedicationOrderFormData>({ name, control });
  const isTablet = useLayoutType() === 'tablet';
  const shouldShowError = Boolean(error?.message && (isTouched || isSubmitted));

  const fieldErrorStyles = classNames({
    [styles.fieldError]: shouldShowError,
  });

  const handleChange = useCallback(
    (newValue: any) => {
      const prevValue = getValues?.(name);
      onChange(newValue);
      handleAfterChange?.(newValue, prevValue);
    },
    [getValues, onChange, handleAfterChange, name],
  );

  const component = useMemo(() => {
    if (type === 'toggle') {
      return (
        <Toggle
          toggled={Boolean(value)}
          onToggle={handleChange}
          ref={ref}
          // @ts-ignore
          size={isTablet ? 'md' : 'sm'}
          labelA={t('on', 'On')}
          labelB={t('off', 'Off')}
          {...restProps}
        />
      );
    }

    if (type === 'checkbox') {
      const checkboxProps = restProps as ComponentProps<typeof Checkbox>;
      return (
        <Checkbox
          checked={Boolean(value)}
          labelText={checkboxProps.labelText}
          onChange={(_, { checked }) => handleChange(checked)}
          ref={ref}
          {...checkboxProps}
        />
      );
    }

    if (type === 'number') {
      const numberInputProps = restProps as ComponentProps<typeof NumberInput>;
      return (
        <NumberInput
          allowEmpty
          className={fieldErrorStyles}
          disableWheel
          onBlur={onBlur}
          onChange={(_, { value }) => {
            const number = parseFloat(String(value));
            handleChange(isNaN(number) ? null : number);
          }}
          ref={ref}
          size={isTablet ? 'md' : 'sm'}
          value={typeof value === 'number' ? value : ''}
          {...numberInputProps}
        />
      );
    }

    if (type === 'textArea') {
      const textAreaProps = restProps as ComponentProps<typeof TextArea>;
      return (
        <TextArea
          className={fieldErrorStyles}
          onBlur={onBlur}
          onChange={(e) => handleChange(e.target.value)}
          ref={ref}
          value={typeof value === 'string' ? value : ''}
          {...textAreaProps}
        />
      );
    }

    if (type === 'textInput') {
      const textInputProps = restProps as ComponentProps<typeof TextInput>;
      return (
        <TextInput
          className={fieldErrorStyles}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={onBlur}
          ref={ref}
          size={isTablet ? 'md' : 'sm'}
          value={typeof value === 'string' ? value : ''}
          {...textInputProps}
        />
      );
    }

    if (type === 'comboBox') {
      const comboBoxProps = restProps as ComponentProps<typeof ComboBox>;
      return (
        <ComboBox
          className={fieldErrorStyles}
          onBlur={onBlur}
          onChange={({ selectedItem }) => handleChange(selectedItem)}
          ref={ref}
          size={isTablet ? 'md' : 'sm'}
          selectedItem={value}
          {...comboBoxProps}
        />
      );
    }

    return null;
  }, [type, value, restProps, handleChange, fieldErrorStyles, onBlur, ref, isTablet, t]);

  return (
    <>
      {component}
      {shouldShowError && <FormLabel className={styles.errorLabel}>{error.message}</FormLabel>}
    </>
  );
};

export default DrugOrderForm;
