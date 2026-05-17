import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import classnames from 'classnames';
import dayjs from 'dayjs';
import debounce from 'lodash-es/debounce';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useSWRConfig } from 'swr';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, type Control } from 'react-hook-form';
import {
  Button,
  ButtonSet,
  Column,
  Dropdown,
  Form,
  FormGroup,
  InlineLoading,
  InlineNotification,
  Row,
  Search,
  SkeletonText,
  Stack,
  Tag,
  TextArea,
  Tile,
} from '@carbon/react';
import { Add, CloseFilled, WarningFilled, CheckmarkFilled, Help } from '@carbon/react/icons';
import {
  createAttachment,
  createErrorHandler,
  ExtensionSlot,
  OpenmrsDatePicker,
  ResponsiveWrapper,
  restBaseUrl,
  showModal,
  showSnackbar,
  useConfig,
  useLayoutType,
  useSession,
  Workspace2,
  type Encounter,
  type UploadedFile,
} from '@openmrs/esm-framework';
import {
  invalidateVisitAndEncounterData,
  type PatientWorkspace2DefinitionProps,
  useAllowedFileExtensions,
} from '@openmrs/esm-patient-common-lib';
import type { VisitNoteConfig } from '../config-schema';
import type { Concept, Diagnosis, DiagnosisPayload, VisitNotePayload } from './types';
import { diagnosisHasMainAttribute } from './diagnosis-main.utils';
import {
  resolveMainDiagnosisCandidatesForPrimaries,
  type MainDiagnosisCandidate,
} from './main-diagnosis-candidate.utils';
import {
  collectVisitPrimaryConceptUuids,
  useActiveVisitWithEncounters,
  visitHasMainDiagnosisOnOtherEncounter,
} from './visit-main-diagnosis.resource';
import {
  deletePatientDiagnosis,
  fetchDiagnosisConceptsByName,
  savePatientDiagnosis,
  saveVisitNote,
  updateVisitNote,
  useVisitNotes,
} from './visit-notes.resource';
import { useActiveVisit } from '../patient-chart/visit/visits-widget/visit.resource';
import styles from './visit-notes-form.scss';

type VisitNotesFormData = Omit<z.infer<ReturnType<typeof createSchema>>, 'images'> & {
  images?: UploadedFile[];
};

interface DiagnosesDisplayProps {
  fieldName: string;
  isDiagnosisNotSelected: (diagnosis: Concept) => boolean;
  isLoading: boolean;
  isSearching: boolean;
  onAddDiagnosis: (diagnosis: Concept, certainty: string, searchInputField: string) => void;
  searchResults: Array<Concept>;
  t: TFunction;
  value: string;
  skipCertaintyChooser?: boolean;
  disableAdd?: boolean;
}

interface DiagnosisSearchProps {
  control: Control<VisitNotesFormData>;
  error?: Object;
  handleSearch: (fieldName) => void;
  labelText: string;
  name: 'noteDate' | 'primaryDiagnosisSearch' | 'secondaryDiagnosisSearch' | 'mainDiagnosisSearch' | 'clinicalNote';
  placeholder: string;
  setIsSearching: (isSearching: boolean) => void;
  disabled?: boolean;
}

const createSchema = (t: TFunction) => {
  return z.object({
    noteDate: z.date(),
    primaryDiagnosisSearch: z.string(),
    secondaryDiagnosisSearch: z.string().optional(),
    mainDiagnosisSearch: z.string().optional(),
    clinicalNote: z.string().optional(),
    images: z.array(z.any()).optional(),
  });
};

/** Encounter diagnosis row as returned by REST (chart / diagnoses dashboard) */
interface EncounterDiagnosisLoadRow {
  voided?: boolean;
  display: string;
  certainty?: string;
  rank?: number;
  diagnosis?: { coded?: { uuid?: string } };
  attributes?: ReadonlyArray<{
    uuid?: string;
    attributeType?: { uuid?: string; display?: string } | string;
    value?: unknown;
  }>;
}

function diagnosisAttributeValueIsTrue(value: unknown): boolean {
  return value === true || value === 'true';
}

function resolveDiagnosisAttributeTypeUuid(attributeType: unknown): string | undefined {
  if (typeof attributeType === 'string') {
    return attributeType;
  }
  if (attributeType && typeof attributeType === 'object' && 'uuid' in attributeType) {
    return (attributeType as { uuid?: string }).uuid;
  }
  return undefined;
}

function encounterDiagnosisHasMainAttribute(
  row: EncounterDiagnosisLoadRow,
  mainDiagnosisAttributeTypeUuid: string,
): boolean {
  return diagnosisHasMainAttribute(row.attributes, mainDiagnosisAttributeTypeUuid);
}

function mapEncounterAttributesToDiagnosisAttributes(
  attributes: EncounterDiagnosisLoadRow['attributes'],
): Diagnosis['attributes'] | undefined {
  if (!attributes?.length) {
    return undefined;
  }
  const out: NonNullable<Diagnosis['attributes']> = [];
  for (const a of attributes) {
    const typeUuid = resolveDiagnosisAttributeTypeUuid(a.attributeType);
    if (!typeUuid) {
      continue;
    }
    out.push({
      uuid: a.uuid,
      attributeType: typeUuid,
      value: a.value as boolean | string,
    });
  }
  return out.length ? out : undefined;
}

/** POST after DELETE creates new attribute rows; do not reuse server attribute uuids. */
function attributesForPatientDiagnosisPost(
  attributes: NonNullable<Diagnosis['attributes']>,
): DiagnosisPayload['attributes'] {
  return attributes.map(({ attributeType, value }) => ({ attributeType, value }));
}

export interface VisitNotesFormProps {
  encounter?: Encounter;
  formContext: 'creating' | 'editing';
}

const VisitNotesForm: React.FC<PatientWorkspace2DefinitionProps<VisitNotesFormProps, {}>> = ({
  closeWorkspace,
  workspaceProps: { formContext, encounter },
  groupProps: { patientUuid },
}) => {
  const isEditing: boolean = Boolean(formContext === 'editing' && encounter?.id);
  const searchTimeoutInMs = 500;
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';
  const session = useSession();
  const config = useConfig<VisitNoteConfig>();
  const { isPrimaryDiagnosisRequired, visitNoteConfig } = config;
  const memoizedState = useMemo(() => ({ patientUuid }), [patientUuid]);
  const {
    clinicianEncounterRole,
    encounterNoteTextConceptUuid,
    encounterTypeUuid,
    mainDiagnosisAttributeTypeUuid,
    icd11WhoConceptSourceUuid,
    esvIcd11ConceptSourceUuid,
  } = visitNoteConfig;

  const [isLoadingPrimaryDiagnoses, setIsLoadingPrimaryDiagnoses] = useState(false);
  const [isLoadingSecondaryDiagnoses, setIsLoadingSecondaryDiagnoses] = useState(false);
  const [isLoadingMainDiagnosisCandidates, setIsLoadingMainDiagnosisCandidates] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPrimaryDiagnoses, setSelectedPrimaryDiagnoses] = useState<Array<Diagnosis>>([]);
  const [selectedSecondaryDiagnoses, setSelectedSecondaryDiagnoses] = useState<Array<Diagnosis>>([]);
  const [selectedMainDiagnosis, setSelectedMainDiagnosis] = useState<Diagnosis | null>(null);
  const [searchPrimaryResults, setSearchPrimaryResults] = useState<Array<Concept>>(null);
  const [searchSecondaryResults, setSearchSecondaryResults] = useState<Array<Concept>>(null);
  const [mainDiagnosisCandidates, setMainDiagnosisCandidates] = useState<Array<MainDiagnosisCandidate>>([]);
  const [combinedDiagnoses, setCombinedDiagnoses] = useState<Array<Diagnosis>>([]);
  const [rows, setRows] = useState<number>();
  const [error, setError] = useState<Error>(null);
  const { allowedFileExtensions } = useAllowedFileExtensions();
  const [isSubmittingLocal, setIsSubmittingLocal] = useState(false);

  const visitNoteFormSchema = useMemo(() => createSchema(t), [t]);

  const customResolver = useCallback(
    async (data, context, options) => {
      const zodResult = await zodResolver(visitNoteFormSchema)(data, context, options);

      if (isPrimaryDiagnosisRequired && selectedPrimaryDiagnoses.length === 0 && !selectedMainDiagnosis) {
        return {
          ...zodResult,
          errors: {
            ...zodResult.errors,
            primaryDiagnosisSearch: {
              type: 'custom',
              message: t('primaryDiagnosisRequired', 'Choose at least one primary diagnosis or a main diagnosis'),
            },
          },
        };
      }

      return zodResult;
    },
    [visitNoteFormSchema, isPrimaryDiagnosisRequired, selectedPrimaryDiagnoses, selectedMainDiagnosis, t],
  );

  const {
    clearErrors,
    control,
    formState: { errors, isDirty, isSubmitting },
    handleSubmit,
    setValue,
    watch,
  } = useForm<VisitNotesFormData>({
    mode: 'onSubmit',
    resolver: customResolver,
    defaultValues: {
      primaryDiagnosisSearch: '',
      secondaryDiagnosisSearch: '',
      mainDiagnosisSearch: '',
      noteDate: isEditing ? new Date(encounter.encounterDatetime) : new Date(),
      clinicalNote: isEditing
        ? String(encounter?.obs?.find((obs) => obs.concept.uuid === encounterNoteTextConceptUuid)?.value || '')
        : '',
    },
  });

  useEffect(() => {
    if (!isEditing || !encounter?.id) {
      return;
    }

    const rows = (encounter.diagnoses ?? []).filter((d) => !(d as EncounterDiagnosisLoadRow).voided);

    if (!rows.length) {
      setSelectedPrimaryDiagnoses([]);
      setSelectedSecondaryDiagnoses([]);
      setSelectedMainDiagnosis(null);
      setCombinedDiagnoses([]);
      return;
    }

    try {
      const mainEncounterRow = (rows as EncounterDiagnosisLoadRow[]).find((d) =>
        encounterDiagnosisHasMainAttribute(d, mainDiagnosisAttributeTypeUuid),
      );
      const mainCodedUuid = mainEncounterRow?.diagnosis?.coded?.uuid;

      const transformedDiagnoses: Diagnosis[] = (rows as EncounterDiagnosisLoadRow[]).map((d) => {
        const codedUuid = d.diagnosis?.coded?.uuid;
        const mappedAttributes = mapEncounterAttributesToDiagnosisAttributes(d.attributes);

        return {
          patient: patientUuid,
          diagnosis: {
            coded: codedUuid,
          },
          certainty: d.certainty,
          rank: d.rank,
          display: d.display,
          ...(mappedAttributes?.length ? { attributes: mappedAttributes } : {}),
        };
      });

      const mainDiagnosis =
        mainCodedUuid !== undefined
          ? transformedDiagnoses.find((t) => t.diagnosis.coded === mainCodedUuid) ?? null
          : null;

      const primaryDiagnoses = transformedDiagnoses.filter(
        (d) => d.rank === 1 && (!mainDiagnosis || d.diagnosis.coded !== mainDiagnosis.diagnosis.coded),
      );
      const secondaryDiagnoses = transformedDiagnoses.filter(
        (d) => d.rank === 2 && (!mainDiagnosis || d.diagnosis.coded !== mainDiagnosis.diagnosis.coded),
      );

      setSelectedPrimaryDiagnoses(primaryDiagnoses);
      setSelectedSecondaryDiagnoses(secondaryDiagnoses);
      setSelectedMainDiagnosis(mainDiagnosis);
      setCombinedDiagnoses([...primaryDiagnoses, ...secondaryDiagnoses, ...(mainDiagnosis ? [mainDiagnosis] : [])]);
    } catch (err) {
      setError(new Error(t('errorTransformingDiagnoses', 'Error transforming diagnoses')));
      createErrorHandler();
    }
  }, [encounter, isEditing, patientUuid, t, mainDiagnosisAttributeTypeUuid]);

  const currentImages = watch('images');

  const { mutateVisitNotes } = useVisitNotes(patientUuid);
  const { activeVisit } = useActiveVisit(patientUuid);
  const { visitWithEncounters, isLoading: isLoadingVisitForMain } = useActiveVisitWithEncounters(
    patientUuid,
    activeVisit?.uuid,
  );
  const { mutate: globalMutate } = useSWRConfig();

  const mutateAttachments = useCallback(
    () => globalMutate((key) => typeof key === 'string' && key.startsWith(`${restBaseUrl}/attachment`)),
    [globalMutate],
  );

  const locationUuid = session?.sessionLocation?.uuid;
  const providerUuid = session?.currentProvider?.uuid;

  const visitHasMainOnOtherEncounter = useMemo(
    () =>
      activeVisit?.uuid
        ? visitHasMainDiagnosisOnOtherEncounter(visitWithEncounters, encounter?.id, mainDiagnosisAttributeTypeUuid)
        : false,
    [activeVisit?.uuid, visitWithEncounters, encounter?.id, mainDiagnosisAttributeTypeUuid],
  );

  const primaryConceptUuidsForMainCandidates = useMemo(() => {
    if (!activeVisit?.uuid) {
      return selectedPrimaryDiagnoses.map((diagnosis) => diagnosis.diagnosis.coded).filter(Boolean);
    }
    const uuids = new Set(collectVisitPrimaryConceptUuids(visitWithEncounters));
    selectedPrimaryDiagnoses.forEach((diagnosis) => {
      if (diagnosis.diagnosis.coded) {
        uuids.add(diagnosis.diagnosis.coded);
      }
    });
    return Array.from(uuids);
  }, [activeVisit?.uuid, visitWithEncounters, selectedPrimaryDiagnoses]);

  const mainDiagnosisDropdownItems = useMemo(
    () => mainDiagnosisCandidates.map((candidate) => ({ id: candidate.uuid, label: candidate.display })),
    [mainDiagnosisCandidates],
  );

  useEffect(() => {
    if (activeVisit?.uuid && isLoadingVisitForMain) {
      return;
    }

    if (!primaryConceptUuidsForMainCandidates.length) {
      setMainDiagnosisCandidates([]);
      return;
    }

    let cancelled = false;
    setIsLoadingMainDiagnosisCandidates(true);

    resolveMainDiagnosisCandidatesForPrimaries(primaryConceptUuidsForMainCandidates, {
      esvIcd11ConceptSourceUuid,
      diagnosisConceptClassUuid: config.diagnosisConceptClass,
    })
      .then((candidates) => {
        if (!cancelled) {
          setMainDiagnosisCandidates(candidates);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
          createErrorHandler();
          setMainDiagnosisCandidates([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingMainDiagnosisCandidates(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    activeVisit?.uuid,
    isLoadingVisitForMain,
    primaryConceptUuidsForMainCandidates,
    esvIcd11ConceptSourceUuid,
    config.diagnosisConceptClass,
  ]);

  const debouncedSearch = useMemo(
    () =>
      debounce((fieldQuery, fieldName) => {
        clearErrors('primaryDiagnosisSearch');
        if (fieldQuery) {
          if (fieldName === 'primaryDiagnosisSearch') {
            setIsLoadingPrimaryDiagnoses(true);
          } else if (fieldName === 'secondaryDiagnosisSearch') {
            setIsLoadingSecondaryDiagnoses(true);
          }

          const restrictToIcd11Who = fieldName === 'primaryDiagnosisSearch' || fieldName === 'secondaryDiagnosisSearch';
          fetchDiagnosisConceptsByName(
            fieldQuery,
            config.diagnosisConceptClass,
            restrictToIcd11Who ? icd11WhoConceptSourceUuid : undefined,
          )
            .then((matchingConceptDiagnoses: Array<Concept>) => {
              if (fieldName === 'primaryDiagnosisSearch') {
                setSearchPrimaryResults(matchingConceptDiagnoses);
                setIsLoadingPrimaryDiagnoses(false);
              } else if (fieldName === 'secondaryDiagnosisSearch') {
                setSearchSecondaryResults(matchingConceptDiagnoses);
                setIsLoadingSecondaryDiagnoses(false);
              }
            })
            .catch((e) => {
              setError(e);
              createErrorHandler();
            });
        }
      }, searchTimeoutInMs),
    [config.diagnosisConceptClass, icd11WhoConceptSourceUuid, clearErrors],
  );

  const handleSearch = useCallback(
    (fieldName) => {
      const fieldQuery = watch(fieldName);
      if (fieldQuery) {
        debouncedSearch(fieldQuery, fieldName);
      }
      setIsSearching(false);
    },
    [debouncedSearch, watch],
  );

  const createDiagnosis = useCallback(
    (concept: Concept, certainty: string = 'PROVISIONAL'): Diagnosis => ({
      certainty,
      display: concept.display,
      diagnosis: {
        coded: concept.uuid,
      },
      patient: patientUuid,
      rank: 2,
    }),
    [patientUuid],
  );

  const handleAddDiagnosis = useCallback(
    (conceptDiagnosisToAdd: Concept, certainty: string = 'PROVISIONAL', searchInputField: string) => {
      const newDiagnosis = createDiagnosis(conceptDiagnosisToAdd, certainty);
      if (searchInputField === 'primaryDiagnosisSearch') {
        newDiagnosis.rank = 1;
        setValue('primaryDiagnosisSearch', '');
        setSearchPrimaryResults([]);
        setSelectedPrimaryDiagnoses((selectedDiagnoses) => [...selectedDiagnoses, newDiagnosis]);
        clearErrors('primaryDiagnosisSearch');
      } else if (searchInputField === 'secondaryDiagnosisSearch') {
        setValue('secondaryDiagnosisSearch', '');
        setSearchSecondaryResults([]);
        setSelectedSecondaryDiagnoses((selectedDiagnoses) => [...selectedDiagnoses, newDiagnosis]);
      } else if (searchInputField === 'mainDiagnosisSearch') {
        if (visitHasMainOnOtherEncounter) {
          return;
        }
        // Main diagnosis is logically a primary (rank=1), always CONFIRMED, and flagged via the
        // isMainDiagnosis boolean diagnosis-attribute-type for reporting purposes.
        newDiagnosis.rank = 1;
        newDiagnosis.certainty = 'CONFIRMED';
        newDiagnosis.attributes = [{ attributeType: mainDiagnosisAttributeTypeUuid, value: true }];
        setSelectedMainDiagnosis(newDiagnosis);
        clearErrors('primaryDiagnosisSearch');
      }
      setCombinedDiagnoses((combinedDiagnoses) => [...combinedDiagnoses, newDiagnosis]);
    },
    [createDiagnosis, setValue, clearErrors, mainDiagnosisAttributeTypeUuid, visitHasMainOnOtherEncounter],
  );

  const handleSelectMainDiagnosisCandidate = useCallback(
    ({ selectedItem }: { selectedItem: { id: string; label: string } | null }) => {
      if (!selectedItem || selectedMainDiagnosis || visitHasMainOnOtherEncounter) {
        return;
      }
      handleAddDiagnosis({ uuid: selectedItem.id, display: selectedItem.label }, 'CONFIRMED', 'mainDiagnosisSearch');
    },
    [handleAddDiagnosis, selectedMainDiagnosis, visitHasMainOnOtherEncounter],
  );

  const handleRemoveDiagnosis = useCallback(
    (diagnosisToRemove: Diagnosis, searchInputField) => {
      if (searchInputField === 'primaryInputSearch') {
        setSelectedPrimaryDiagnoses(
          selectedPrimaryDiagnoses.filter(
            (diagnosis) => diagnosis.diagnosis.coded !== diagnosisToRemove.diagnosis.coded,
          ),
        );
      } else if (searchInputField === 'secondaryInputSearch') {
        setSelectedSecondaryDiagnoses(
          selectedSecondaryDiagnoses.filter(
            (diagnosis) => diagnosis.diagnosis.coded !== diagnosisToRemove.diagnosis.coded,
          ),
        );
      } else if (searchInputField === 'mainInputSearch') {
        setSelectedMainDiagnosis(null);
      }
      setCombinedDiagnoses(
        combinedDiagnoses.filter((diagnosis) => diagnosis.diagnosis.coded !== diagnosisToRemove.diagnosis.coded),
      );
    },
    [combinedDiagnoses, selectedPrimaryDiagnoses, selectedSecondaryDiagnoses],
  );

  const isDiagnosisNotSelected = (diagnosis: Concept) => {
    const isPrimaryDiagnosisSelected = selectedPrimaryDiagnoses.some(
      (selectedDiagnosis) => diagnosis.uuid === selectedDiagnosis.diagnosis.coded,
    );
    const isSecondaryDiagnosisSelected = selectedSecondaryDiagnoses.some(
      (selectedDiagnosis) => diagnosis.uuid === selectedDiagnosis.diagnosis.coded,
    );
    const isMainDiagnosisSelected = selectedMainDiagnosis?.diagnosis.coded === diagnosis.uuid;

    return !isPrimaryDiagnosisSelected && !isSecondaryDiagnosisSelected && !isMainDiagnosisSelected;
  };

  const showImageCaptureModal = useCallback(() => {
    const close = showModal('capture-photo-modal', {
      saveFile: (file: UploadedFile) => {
        if (file.capturedFromWebcam && !file.fileName.includes('.')) {
          file.fileName = `${file.fileName}.png`;
        }

        setValue('images', currentImages ? [...currentImages, file] : [file]);
        close();
        return Promise.resolve();
      },
      closeModal: () => {
        close();
      },
      allowedExtensions:
        allowedFileExtensions && Array.isArray(allowedFileExtensions)
          ? allowedFileExtensions.filter((ext) => !/pdf/i.test(ext))
          : [],
      collectDescription: true,
      multipleFiles: true,
    });
  }, [allowedFileExtensions, currentImages, setValue]);

  const handleRemoveImage = (index: number) => {
    const updatedImages = [...currentImages];
    updatedImages.splice(index, 1);
    setValue('images', updatedImages);

    showSnackbar({
      title: t('imageRemoved', 'Image removed'),
      kind: 'success',
      isLowContrast: true,
    });
  };

  const onSubmit = useCallback(
    async (data: VisitNotesFormData) => {
      if (isSubmittingLocal) {
        return;
      }
      setIsSubmittingLocal(true);

      try {
        const { noteDate, clinicalNote, images } = data;

        if (isPrimaryDiagnosisRequired && !selectedPrimaryDiagnoses.length && !selectedMainDiagnosis) {
          return;
        }

        if (selectedMainDiagnosis && visitHasMainOnOtherEncounter) {
          showSnackbar({
            title: t('visitMainDiagnosisAlreadyExists', 'Main diagnosis already recorded for this visit'),
            kind: 'error',
            isLowContrast: false,
          });
          return;
        }

        if (selectedMainDiagnosis && !isLoadingMainDiagnosisCandidates && !isLoadingVisitForMain) {
          const mainConceptUuid = selectedMainDiagnosis.diagnosis.coded;
          const mainStillValid = mainDiagnosisCandidates.some((candidate) => candidate.uuid === mainConceptUuid);
          if (!mainStillValid) {
            showSnackbar({
              title: t('mainDiagnosisNoLongerValid', 'Main diagnosis is no longer valid'),
              subtitle: t(
                'mainDiagnosisNoLongerValidSubtitle',
                'Remove the main diagnosis or update primary diagnoses, then choose a main diagnosis again.',
              ),
              kind: 'error',
              isLowContrast: false,
            });
            return;
          }
        }

        let finalNoteDate = dayjs(noteDate);
        const now = new Date();
        if (finalNoteDate.diff(now, 'minute') <= 30) {
          finalNoteDate = null;
        }

        const existingClinicalNoteObs = encounter?.obs?.find(
          (obs) => obs.concept.uuid === encounterNoteTextConceptUuid,
        );

        const visitNotePayload: VisitNotePayload = {
          encounterDatetime: finalNoteDate?.format(),
          patient: patientUuid,
          location: locationUuid,
          encounterProviders: [
            {
              encounterRole: clinicianEncounterRole,
              provider: providerUuid,
            },
          ],
          encounterType: encounterTypeUuid,
          obs: clinicalNote
            ? [
                {
                  concept: { uuid: encounterNoteTextConceptUuid, display: '' },
                  value: clinicalNote,
                  ...(existingClinicalNoteObs && { uuid: existingClinicalNoteObs.uuid }),
                },
              ]
            : [],
          visit: activeVisit?.uuid,
        };

        const abortController = new AbortController();

        const savePromise = isEditing
          ? updateVisitNote(abortController, encounter.id, visitNotePayload)
          : saveVisitNote(abortController, visitNotePayload);

        const response = await savePromise;
        if (response.status !== 201 && response.status !== 200) {
          throw new Error('Unexpected response status');
        }

        const encounterUuid = isEditing ? encounter.id : response.data.uuid;

        if (isEditing && encounter?.diagnoses?.length) {
          await Promise.all(
            encounter.diagnoses.map((diagnosis) => deletePatientDiagnosis(abortController, diagnosis.uuid)),
          );
        }

        await Promise.all(
          combinedDiagnoses.map((diagnosis) => {
            const diagnosesPayload: DiagnosisPayload = {
              encounter: encounterUuid,
              patient: patientUuid,
              condition: null,
              diagnosis: {
                coded: diagnosis.diagnosis.coded,
              },
              certainty: diagnosis.certainty,
              rank: diagnosis.rank,
              // Forward diagnosis attributes (used to flag the main diagnosis via isMainDiagnosis=true)
              // only when present. Omit attribute uuids on POST (edit flow deletes then recreates rows).
              ...(diagnosis.attributes?.length
                ? { attributes: attributesForPatientDiagnosisPost(diagnosis.attributes) }
                : {}),
            };
            return savePatientDiagnosis(abortController, diagnosesPayload);
          }),
        );

        if (images?.length) {
          await Promise.all(
            images.map((image) => {
              const imageToUpload: UploadedFile = {
                base64Content: image.base64Content,
                file: image.file,
                fileName: image.fileName,
                fileType: image.fileType,
                fileDescription: image.fileDescription || '',
              };
              return createAttachment(patientUuid, imageToUpload);
            }),
          );
        }

        invalidateVisitAndEncounterData(globalMutate, patientUuid);
        mutateVisitNotes();
        if (images?.length) {
          mutateAttachments();
        }
        closeWorkspace({ discardUnsavedChanges: true });

        showSnackbar({
          isLowContrast: true,
          subtitle: t('visitNoteNowVisible', 'It is now visible on the Visits page'),
          kind: 'success',
          title: t('visitNoteSaved', 'Visit note saved'),
        });
      } catch (err) {
        createErrorHandler();
        showSnackbar({
          title: t('visitNoteSaveError', 'Error saving visit note'),
          kind: 'error',
          isLowContrast: false,
          subtitle: err?.responseBody?.error?.message ?? err.message,
        });
      } finally {
        setIsSubmittingLocal(false);
      }
    },
    [
      isSubmittingLocal,
      isEditing,
      encounter,
      isPrimaryDiagnosisRequired,
      activeVisit,
      selectedPrimaryDiagnoses.length,
      selectedMainDiagnosis,
      mainDiagnosisCandidates,
      isLoadingMainDiagnosisCandidates,
      isLoadingVisitForMain,
      visitHasMainOnOtherEncounter,
      combinedDiagnoses,
      clinicianEncounterRole,
      providerUuid,
      locationUuid,
      encounterTypeUuid,
      encounterNoteTextConceptUuid,
      patientUuid,
      globalMutate,
      mutateVisitNotes,
      mutateAttachments,
      closeWorkspace,
      t,
    ],
  );

  const onError = (errors) => console.error(errors);

  return (
    <Workspace2 title={t('visitNoteWorkspaceTitle', 'Visit note')} hasUnsavedChanges={isDirty}>
      <Form className={styles.form} onSubmit={handleSubmit(onSubmit, onError)}>
        <ExtensionSlot name="visit-context-header-slot" state={{ patientUuid }} />

        {isTablet && (
          <Row className={styles.headerGridRow}>
            <ExtensionSlot name="visit-form-header-slot" className={styles.dataGridRow} state={memoizedState} />
          </Row>
        )}

        <div className={styles.formContainer}>
          <Stack gap={2}>
            {isTablet ? <h2 className={styles.heading}>{t('addVisitNote', 'Add a visit note')}</h2> : null}
            <Row className={styles.row}>
              <Column sm={1}>
                <span className={styles.columnLabel}>{t('date', 'Date')}</span>
              </Column>
              <Column sm={3}>
                <Controller
                  name="noteDate"
                  control={control}
                  render={({ field, fieldState }) => (
                    <ResponsiveWrapper>
                      <OpenmrsDatePicker
                        {...field}
                        data-testid="visitDateTimePicker"
                        id="visitDateTimePicker"
                        invalid={Boolean(fieldState?.error?.message)}
                        invalidText={fieldState?.error?.message}
                        isDisabled={isEditing}
                        labelText={t('visitDate', 'Visit date')}
                        maxDate={new Date()}
                      />
                    </ResponsiveWrapper>
                  )}
                />
              </Column>
            </Row>
            <div className={styles.diagnosesText}>
              {selectedPrimaryDiagnoses && selectedPrimaryDiagnoses.length ? (
                <>
                  {selectedPrimaryDiagnoses.map((diagnosis, index) => {
                    const displayText =
                      diagnosis.display.length > 30 ? `${diagnosis.display.substring(0, 30)}...` : diagnosis.display;
                    const certaintyText =
                      diagnosis.certainty === 'CONFIRMED' ? t('confirmed', 'Confirmed') : t('presumed', 'Presumed');

                    return (
                      <div key={index} className={styles.tagWrapper} title={`${diagnosis.display} (${certaintyText})`}>
                        <Tag
                          className={styles.tag}
                          filter
                          onClose={() => handleRemoveDiagnosis(diagnosis, 'primaryInputSearch')}
                          type="red">
                          <span className={styles.tagContent}>
                            {displayText}
                            {diagnosis.certainty === 'CONFIRMED' ? (
                              <CheckmarkFilled size={14} className={classnames(styles.tagIcon, styles.confirmedIcon)} />
                            ) : (
                              <Help size={14} className={classnames(styles.tagIcon, styles.presumedIcon)} />
                            )}
                          </span>
                        </Tag>
                      </div>
                    );
                  })}
                </>
              ) : null}
              {selectedSecondaryDiagnoses && selectedSecondaryDiagnoses.length ? (
                <>
                  {selectedSecondaryDiagnoses.map((diagnosis, index) => {
                    const displayText =
                      diagnosis.display.length > 30 ? `${diagnosis.display.substring(0, 30)}...` : diagnosis.display;
                    const certaintyText =
                      diagnosis.certainty === 'CONFIRMED' ? t('confirmed', 'Confirmed') : t('presumed', 'Presumed');

                    return (
                      <div key={index} className={styles.tagWrapper} title={`${diagnosis.display} (${certaintyText})`}>
                        <Tag
                          className={styles.tag}
                          filter
                          onClose={() => handleRemoveDiagnosis(diagnosis, 'secondaryInputSearch')}
                          type="blue">
                          <span className={styles.tagContent}>
                            {displayText}
                            {diagnosis.certainty === 'CONFIRMED' ? (
                              <CheckmarkFilled size={12} className={classnames(styles.tagIcon, styles.confirmedIcon)} />
                            ) : (
                              <Help size={12} className={classnames(styles.tagIcon, styles.presumedIcon)} />
                            )}
                          </span>
                        </Tag>
                      </div>
                    );
                  })}
                </>
              ) : null}
              {selectedMainDiagnosis ? (
                <div
                  className={styles.tagWrapper}
                  title={`${t('mainDiagnosis', 'Main diagnosis')}: ${selectedMainDiagnosis.display}`}>
                  <Tag
                    className={styles.tag}
                    filter
                    onClose={() => handleRemoveDiagnosis(selectedMainDiagnosis, 'mainInputSearch')}
                    type="green">
                    <span className={styles.tagContent}>
                      {selectedMainDiagnosis.display.length > 30
                        ? `${selectedMainDiagnosis.display.substring(0, 30)}...`
                        : selectedMainDiagnosis.display}
                      <CheckmarkFilled size={14} className={classnames(styles.tagIcon, styles.confirmedIcon)} />
                    </span>
                  </Tag>
                </div>
              ) : null}
              {selectedPrimaryDiagnoses &&
                !selectedPrimaryDiagnoses.length &&
                selectedSecondaryDiagnoses &&
                !selectedSecondaryDiagnoses.length &&
                !selectedMainDiagnosis && (
                  <span>{t('emptyDiagnosisText', 'No diagnosis selected — Enter a diagnosis below')}</span>
                )}
            </div>
            <Row className={styles.row}>
              <Column sm={1}>
                <span className={styles.columnLabel}>{t('primaryDiagnosis', 'Primary diagnosis')}</span>
              </Column>
              <Column sm={3}>
                <FormGroup legendText={t('searchForPrimaryDiagnosis', 'Search for a primary diagnosis')}>
                  <DiagnosisSearch
                    name="primaryDiagnosisSearch"
                    control={control}
                    labelText={t('enterPrimaryDiagnoses', 'Enter Primary diagnoses')}
                    placeholder={t('primaryDiagnosisInputPlaceholder', 'Choose a primary diagnosis')}
                    handleSearch={handleSearch}
                    error={errors?.primaryDiagnosisSearch}
                    setIsSearching={setIsSearching}
                  />
                  {error ? (
                    <InlineNotification
                      className={styles.errorNotification}
                      lowContrast
                      title={t('error', 'Error')}
                      subtitle={t('errorFetchingConcepts', 'There was a problem fetching concepts') + '.'}
                      onClose={() => setError(null)}
                    />
                  ) : null}
                  <DiagnosesDisplay
                    fieldName={'primaryDiagnosisSearch'}
                    isDiagnosisNotSelected={isDiagnosisNotSelected}
                    isLoading={isLoadingPrimaryDiagnoses}
                    isSearching={isSearching}
                    onAddDiagnosis={handleAddDiagnosis}
                    searchResults={searchPrimaryResults}
                    t={t}
                    value={watch('primaryDiagnosisSearch')}
                  />
                </FormGroup>
              </Column>
            </Row>
            <Row className={styles.row}>
              <Column sm={1}>
                <span className={styles.columnLabel}>{t('secondaryDiagnosis', 'Secondary diagnosis')}</span>
              </Column>
              <Column sm={3}>
                <FormGroup legendText={t('searchForSecondaryDiagnosis', 'Search for a secondary diagnosis')}>
                  <DiagnosisSearch
                    name="secondaryDiagnosisSearch"
                    control={control}
                    labelText={t('enterSecondaryDiagnoses', 'Enter Secondary diagnoses')}
                    placeholder={t('secondaryDiagnosisInputPlaceholder', 'Choose a secondary diagnosis')}
                    handleSearch={handleSearch}
                    setIsSearching={setIsSearching}
                  />
                  {error ? (
                    <InlineNotification
                      className={styles.errorNotification}
                      lowContrast
                      title={t('error', 'Error')}
                      subtitle={t('errorFetchingConcepts', 'There was a problem fetching concepts') + '.'}
                      onClose={() => setError(null)}
                    />
                  ) : null}
                  <DiagnosesDisplay
                    fieldName={'secondaryDiagnosisSearch'}
                    isDiagnosisNotSelected={isDiagnosisNotSelected}
                    isLoading={isLoadingSecondaryDiagnoses}
                    isSearching={isSearching}
                    onAddDiagnosis={handleAddDiagnosis}
                    searchResults={searchSecondaryResults}
                    t={t}
                    value={watch('secondaryDiagnosisSearch')}
                  />
                </FormGroup>
              </Column>
            </Row>
            <Row className={styles.row}>
              <Column sm={1}>
                <span className={styles.columnLabel}>{t('mainDiagnosis', 'Main diagnosis')}</span>
              </Column>
              <Column sm={3}>
                <FormGroup legendText={t('searchForMainDiagnosis', 'Choose the main diagnosis (used for reports)')}>
                  <ResponsiveWrapper>
                    <Dropdown
                      id="main-diagnosis-picker"
                      titleText={t('chooseMainDiagnosis', 'Choose main diagnosis')}
                      label={
                        selectedMainDiagnosis
                          ? t(
                              'mainDiagnosisAlreadySelected',
                              'Main diagnosis already selected — remove it to choose another',
                            )
                          : t('mainDiagnosisInputPlaceholder', 'Choose a main diagnosis')
                      }
                      items={mainDiagnosisDropdownItems}
                      itemToString={(item) => item?.label ?? ''}
                      selectedItem={null}
                      onChange={handleSelectMainDiagnosisCandidate}
                      disabled={
                        Boolean(selectedMainDiagnosis) ||
                        visitHasMainOnOtherEncounter ||
                        !primaryConceptUuidsForMainCandidates.length ||
                        isLoadingMainDiagnosisCandidates ||
                        isLoadingVisitForMain ||
                        mainDiagnosisDropdownItems.length === 0
                      }
                    />
                  </ResponsiveWrapper>
                  {isLoadingMainDiagnosisCandidates || isLoadingVisitForMain ? (
                    <InlineLoading description={t('loading', 'Loading')} />
                  ) : null}
                  {visitHasMainOnOtherEncounter && !selectedMainDiagnosis ? (
                    <p className={styles.mainDiagnosisHelperText}>
                      {t(
                        'visitMainDiagnosisAlreadyExists',
                        'A main diagnosis is already recorded on this visit. Only one main diagnosis is allowed per visit.',
                      )}
                    </p>
                  ) : null}
                  {!visitHasMainOnOtherEncounter &&
                  !primaryConceptUuidsForMainCandidates.length &&
                  !selectedMainDiagnosis ? (
                    <p className={styles.mainDiagnosisHelperText}>
                      {t(
                        'addPrimaryForMainDiagnosis',
                        'Add at least one primary diagnosis on this visit to choose a main diagnosis',
                      )}
                    </p>
                  ) : null}
                  {!visitHasMainOnOtherEncounter &&
                  primaryConceptUuidsForMainCandidates.length &&
                  !isLoadingMainDiagnosisCandidates &&
                  !isLoadingVisitForMain &&
                  !mainDiagnosisDropdownItems.length &&
                  !selectedMainDiagnosis ? (
                    <p className={styles.mainDiagnosisHelperText}>
                      {t(
                        'noMainDiagnosisCandidates',
                        'No main diagnosis is available for the selected primary diagnoses',
                      )}
                    </p>
                  ) : null}
                </FormGroup>
              </Column>
            </Row>
            <Row className={styles.row}>
              <Column sm={1}>
                <span className={styles.columnLabel}>{t('note', 'Note')}</span>
              </Column>
              <Column sm={3}>
                <Controller
                  name="clinicalNote"
                  control={control}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <ResponsiveWrapper>
                      <TextArea
                        id="additionalNote"
                        rows={rows}
                        labelText={t('clinicalNoteLabel', 'Write your notes')}
                        placeholder={t('clinicalNotePlaceholder', 'Write any notes here')}
                        value={value}
                        onBlur={onBlur}
                        onChange={(event) => {
                          onChange(event);
                          const textareaLineHeight = 24;
                          const newRows = Math.ceil(event.target.scrollHeight / textareaLineHeight);
                          setRows(newRows);
                        }}
                      />
                    </ResponsiveWrapper>
                  )}
                />
              </Column>
            </Row>
            <Row className={styles.row}>
              <Column sm={1}>
                <span className={styles.columnLabel}>{t('image', 'Image')}</span>
              </Column>
              <Column sm={3}>
                <FormGroup legendText="">
                  <p className={styles.imgUploadHelperText}>
                    {t('imageUploadHelperText', "Upload images or use this device's camera to capture images")}
                  </p>
                  <Button
                    className={styles.uploadButton}
                    kind={isTablet ? 'ghost' : 'tertiary'}
                    onClick={showImageCaptureModal}
                    renderIcon={(props) => <Add size={16} {...props} />}>
                    {t('addImage', 'Add image')}
                  </Button>
                  <div className={styles.imgThumbnailGrid}>
                    {currentImages?.map((image, index) => (
                      <div key={index} className={styles.imgThumbnailItem}>
                        <div className={styles.imgThumbnailContainer}>
                          <img
                            className={styles.imgThumbnail}
                            src={image.base64Content}
                            alt={image.fileDescription ?? image.fileName}
                          />
                        </div>
                        <Button kind="ghost" className={styles.removeButton} onClick={() => handleRemoveImage(index)}>
                          <CloseFilled size={16} className={styles.closeIcon} />
                        </Button>
                      </div>
                    ))}
                  </div>
                </FormGroup>
              </Column>
            </Row>
          </Stack>
        </div>
        <ButtonSet className={classnames({ [styles.tablet]: isTablet, [styles.desktop]: !isTablet })}>
          <Button className={styles.button} kind="secondary" onClick={() => closeWorkspace()}>
            {t('discard', 'Discard')}
          </Button>
          <Button className={styles.button} kind="primary" type="submit" disabled={isSubmitting || isSubmittingLocal}>
            {isSubmitting || isSubmittingLocal ? (
              <InlineLoading description={t('saving', 'Saving') + '...'} />
            ) : (
              <span>{t('saveAndClose', 'Save and close')}</span>
            )}
          </Button>
        </ButtonSet>
      </Form>
    </Workspace2>
  );
};

function DiagnosisSearch({
  name,
  control,
  labelText,
  placeholder,
  handleSearch,
  error,
  setIsSearching,
  disabled,
}: DiagnosisSearchProps) {
  const isTablet = useLayoutType() === 'tablet';
  const inputRef = useRef(null);

  const searchInputFocus = () => {
    inputRef.current.focus();
  };

  useEffect(() => {
    if (error) {
      searchInputFocus();
    }
  }, [error]);

  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { value, onChange, onBlur }, fieldState }) => (
        <>
          <ResponsiveWrapper>
            <Search
              ref={inputRef}
              size={isTablet ? 'lg' : 'md'}
              id={name}
              labelText={labelText}
              className={error && styles.diagnoserrorOutline}
              placeholder={placeholder}
              renderIcon={error && ((props) => <WarningFilled fill="red" {...props} />)}
              onChange={(e) => {
                setIsSearching(true);
                onChange(e);
                handleSearch(name);
              }}
              value={value instanceof Date ? value.toISOString() : value}
              onBlur={onBlur}
              disabled={disabled}
            />
          </ResponsiveWrapper>
          {fieldState?.error?.message && <p className={styles.errorMessage}>{fieldState?.error?.message}</p>}
        </>
      )}
    />
  );
}

function DiagnosesDisplay({
  fieldName,
  isDiagnosisNotSelected,
  isLoading,
  isSearching,
  onAddDiagnosis,
  searchResults,
  t,
  value,
  skipCertaintyChooser = false,
  disableAdd = false,
}: DiagnosesDisplayProps) {
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<Concept | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isTablet = useLayoutType() === 'tablet';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setSelectedDiagnosis(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!value) {
    return null;
  }

  if (isSearching || isLoading) {
    return <Loader />;
  }

  if (disableAdd) {
    return (
      <ResponsiveWrapper>
        <Tile className={styles.emptyResults}>
          <span>
            {t(
              'removeCurrentMainDiagnosisFirst',
              'Remove the currently selected main diagnosis before choosing another.',
            )}
          </span>
        </Tile>
      </ResponsiveWrapper>
    );
  }

  if (!isSearching && searchResults?.length > 0) {
    return (
      <ul className={styles.diagnosisList}>
        {searchResults.map((diagnosis, index) => {
          if (isDiagnosisNotSelected(diagnosis)) {
            return (
              <li key={index} className={styles.diagnosisListItem}>
                <div className={styles.diagnosisRow}>
                  <div className={styles.diagnosisInfo}>
                    <span className={styles.diagnosisName}>{diagnosis.display}</span>
                  </div>
                  <Button
                    size="sm"
                    kind="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (skipCertaintyChooser) {
                        onAddDiagnosis(diagnosis, 'CONFIRMED', fieldName);
                        return;
                      }
                      setSelectedDiagnosis(diagnosis);
                      setShowDropdown(!showDropdown || selectedDiagnosis?.uuid !== diagnosis.uuid);
                    }}
                    className={styles.addButton}
                    renderIcon={Add}
                    iconDescription={
                      skipCertaintyChooser ? t('add', 'Add') : t('addWithCertainty', 'Add with certainty')
                    }>
                    {t('add', 'Add')}
                  </Button>
                </div>

                {selectedDiagnosis?.uuid === diagnosis.uuid && showDropdown && (
                  <div ref={dropdownRef} className={styles.certaintyDropdown}>
                    <div className={styles.dropdownHeader}>
                      <div className={styles.dropdownTitle}>
                        <span className={styles.diagnosisPreview}>
                          {diagnosis.display.length > 40
                            ? `${diagnosis.display.substring(0, 40)}...`
                            : diagnosis.display}
                        </span>
                      </div>
                      <p className={styles.dropdownSubtitle}>{t('selectCertainty', 'Select certainty level')}</p>
                    </div>

                    <div className={styles.certaintyOptions}>
                      <button
                        className={classnames(styles.certaintyOption, styles.confirmedOption)}
                        onClick={() => {
                          onAddDiagnosis(diagnosis, 'CONFIRMED', fieldName);
                          setShowDropdown(false);
                          setSelectedDiagnosis(null);
                        }}>
                        <div className={styles.optionContent}>
                          <CheckmarkFilled size={16} className={styles.optionIcon} />
                          <div className={styles.optionText}>
                            <span className={styles.optionTitle}>{t('confirmed', 'Confirmed')}</span>
                          </div>
                        </div>
                      </button>

                      <button
                        className={classnames(styles.certaintyOption, styles.presumedOption)}
                        onClick={() => {
                          onAddDiagnosis(diagnosis, 'PROVISIONAL', fieldName);
                          setShowDropdown(false);
                          setSelectedDiagnosis(null);
                        }}>
                        <div className={styles.optionContent}>
                          <Help size={16} className={styles.optionIcon} />
                          <div className={styles.optionText}>
                            <span className={styles.optionTitle}>{t('presumed', 'Presumed')}</span>
                          </div>
                        </div>
                      </button>
                    </div>

                    <div className={styles.dropdownFooter}>
                      <Button
                        size="sm"
                        kind="tertiary"
                        onClick={() => {
                          setShowDropdown(false);
                          setSelectedDiagnosis(null);
                        }}>
                        {t('cancel', 'Cancel')}
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            );
          }
        })}
      </ul>
    );
  }

  if (searchResults?.length === 0) {
    return (
      <ResponsiveWrapper>
        <Tile className={styles.emptyResults}>
          <span>
            {t('noMatchingDiagnoses', 'No diagnoses found matching')} <strong>"{value}"</strong>
          </span>
        </Tile>
      </ResponsiveWrapper>
    );
  }
}

function Loader() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, index) => (
        <SkeletonText key={index} className={styles.skeleton} />
      ))}
    </>
  );
}

export default VisitNotesForm;
