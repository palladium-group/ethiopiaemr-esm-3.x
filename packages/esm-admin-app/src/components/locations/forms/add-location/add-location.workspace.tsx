import React, { useEffect, useMemo } from 'react';
import {
  type DefaultWorkspaceProps,
  ResponsiveWrapper,
  useLayoutType,
  showSnackbar,
  useConfig,
  restBaseUrl,
} from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import { Controller, useForm } from 'react-hook-form';
import {
  ButtonSet,
  Button,
  InlineLoading,
  TextInput,
  FormGroup,
  Stack,
  Form,
  FilterableMultiSelect,
  Dropdown,
} from '@carbon/react';
import classNames from 'classnames';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import styles from './add-location.workspace.scss';
import { type LocationResponse } from '../../types';
import { extractErrorMessagesFromResponse } from '../../helpers';
import { useLocationTags } from '../../hooks/useLocationTags';
import { mutate } from 'swr';
import {
  attributeValueUuid,
  saveOrUpdateLocation,
  syncDepartmentTypeAttribute,
  useDepartmentTypes,
  useLocationDetails,
} from '../../hooks/useLocation';
import { LocationAutosuggest } from '../../auto-suggest/location-autosuggest.component';
import { type ConfigObject } from '../../../../config-schema';

type AddLocationWorkspaceProps = DefaultWorkspaceProps & {
  location?: LocationResponse;
};

const baseLocationFormSchema = z.object({
  name: z.string().min(1, { message: 'Location name is required' }),
  tags: z
    .object({
      uuid: z.string().uuid(),
      display: z.string(),
    })
    .array()
    .nonempty('At least one tag is required'),
  parentLocation: z.object({ uuid: z.string(), display: z.string(), isDepartment: z.boolean() }).nullable(),
  departmentType: z.string().nullable(),
});

type LocationFormType = z.infer<typeof baseLocationFormSchema>;

// Departments are flat: a Department must carry a Department Type and cannot sit under another Department.
export const buildLocationFormSchema = (departmentTagUuid: string) =>
  baseLocationFormSchema.superRefine((data, ctx) => {
    if (!data.tags.some((tag) => tag.uuid === departmentTagUuid)) {
      return;
    }
    if (!data.departmentType) {
      ctx.addIssue({ code: 'custom', path: ['departmentType'], message: 'Department type is required' });
    }
    if (data.parentLocation?.isDepartment) {
      ctx.addIssue({
        code: 'custom',
        path: ['parentLocation'],
        message: 'A department cannot be placed under another department',
      });
    }
  });

const AddLocationWorkspace: React.FC<AddLocationWorkspaceProps> = ({
  closeWorkspace,
  closeWorkspaceWithSavedChanges,
  promptBeforeClosing,
  location,
}) => {
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';
  const { locationTagList: Tags } = useLocationTags();
  const { departmentTagUuid, departmentTypeAttributeTypeUuid, departmentTypesConceptSetUuid } =
    useConfig<ConfigObject>();
  const { departmentTypes } = useDepartmentTypes(departmentTypesConceptSetUuid);
  const { locationDetails, isLoading: isLoadingDetails } = useLocationDetails(location?.uuid);
  const existingDepartmentType = locationDetails?.attributes?.find(
    (attribute) => attribute.attributeType?.uuid === departmentTypeAttributeTypeUuid,
  );

  // Facility attributes (MFC etc.) lock the name; the department type attribute does not.
  const hasLocationAttributes = useMemo(() => {
    return location?.attributes?.some((attribute) => attribute.attributeType?.uuid !== departmentTypeAttributeTypeUuid);
  }, [location?.attributes, departmentTypeAttributeTypeUuid]);

  const locationFormSchema = useMemo(() => buildLocationFormSchema(departmentTagUuid), [departmentTagUuid]);

  const handleMutation = () => {
    const url = `${restBaseUrl}/location`;
    mutate((key) => typeof key === 'string' && key.startsWith(url), undefined, { revalidate: true });
  };

  const {
    handleSubmit,
    control,
    getValues,
    reset,
    watch,
    formState: { isSubmitting, isDirty, errors },
  } = useForm<LocationFormType>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: {
      name: location?.name || '',
      tags: location?.tags || [],
      parentLocation: null,
      departmentType: null,
    },
  });

  // Parent and department type are not in the table row, so load them before editing.
  useEffect(() => {
    if (!locationDetails) {
      return;
    }
    const parent = locationDetails.parentLocation;
    reset({
      ...getValues(),
      parentLocation: parent
        ? {
            uuid: parent.uuid,
            display: parent.display,
            isDepartment: !!parent.tags?.some((tag) => tag.uuid === departmentTagUuid),
          }
        : null,
      departmentType: attributeValueUuid(existingDepartmentType) ?? null,
    });
  }, [locationDetails, existingDepartmentType, departmentTagUuid, reset, getValues]);

  const isDepartment = !!watch('tags')?.some((tag) => tag.uuid === departmentTagUuid);
  const excludedParentUuids = useMemo(
    () => (location ? [location.uuid, ...(locationDetails?.childLocations ?? []).map((child) => child.uuid)] : []),
    [location, locationDetails],
  );

  const onSubmit = async (data: LocationFormType) => {
    const formDataFormSubmission = getValues();

    const locationTagsUuid = formDataFormSubmission?.tags?.map((tag) => tag.uuid) || [];

    const departmentTypeUuid = isDepartment ? formDataFormSubmission.departmentType : null;
    const locationUuid = location?.uuid && typeof location.uuid === 'string' ? location.uuid : undefined;

    const locationPayload: Record<string, unknown> = {
      name: formDataFormSubmission.name,
      tags: locationTagsUuid,
      parentLocation: formDataFormSubmission.parentLocation?.uuid ?? null,
    };
    if (!locationUuid && departmentTypeUuid) {
      locationPayload.attributes = [{ attributeType: departmentTypeAttributeTypeUuid, value: departmentTypeUuid }];
    }

    try {
      await saveOrUpdateLocation(locationPayload, locationUuid);
      if (locationUuid) {
        await syncDepartmentTypeAttribute(
          locationUuid,
          departmentTypeAttributeTypeUuid,
          existingDepartmentType,
          departmentTypeUuid,
        );
      }

      showSnackbar({
        title: t('success', 'Success'),
        kind: 'success',
        subtitle: locationUuid
          ? t('locationUpdated', 'Location {{locationName}} was updated successfully.', {
              locationName: data.name,
            })
          : t('locationCreated', 'Location {{locationName}} was created successfully.', {
              locationName: data.name,
            }),
      });
      handleMutation();
      closeWorkspaceWithSavedChanges();
    } catch (error: any) {
      const errorMessages = extractErrorMessagesFromResponse(error);
      showSnackbar({
        title: t('error', 'Error'),
        kind: 'error',
        subtitle: errorMessages.join(', ') || t('locationSaveError', 'Error saving location'),
      });
    }
  };

  useEffect(() => {
    promptBeforeClosing(() => isDirty);
  }, [isDirty, promptBeforeClosing]);

  return (
    <Form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      <div className={styles.formContainer}>
        <Stack gap={3}>
          <ResponsiveWrapper>
            <FormGroup legendText="">
              <Controller
                control={control}
                name="name"
                render={({ field }) => (
                  <TextInput
                    id="locationName"
                    placeholder={t('locationPlaceholder', 'Add a location')}
                    labelText={t('locationName', 'Location Name')}
                    value={field.value}
                    onChange={field.onChange}
                    invalid={!!errors.name?.message}
                    invalidText={errors.name?.message}
                    disabled={hasLocationAttributes}
                  />
                )}
              />
            </FormGroup>
          </ResponsiveWrapper>

          <ResponsiveWrapper>
            <FormGroup legendText="">
              <Controller
                control={control}
                name="tags"
                render={({ field: { onChange, value, ref } }) => (
                  <FilterableMultiSelect
                    id="locationTags"
                    titleText={t('selectTags', 'Select tag(s)')}
                    placeholder={t('selectTagPlaceholder', 'Select a tag')}
                    items={Tags || []}
                    selectedItems={(value || []).map(
                      (selected) => Tags?.find((tag) => tag.uuid === selected.uuid) || selected,
                    )}
                    onChange={({ selectedItems }) => onChange(selectedItems || [])}
                    itemToString={(item) => (item && typeof item === 'object' ? item.display : '')}
                    selectionFeedback="top-after-reopen"
                    invalid={!!errors.tags?.message}
                    invalidText={errors.tags?.message}
                    disabled={!Tags?.length}
                    ref={ref}
                  />
                )}
              />
            </FormGroup>
          </ResponsiveWrapper>

          {isDepartment && (
            <ResponsiveWrapper>
              <FormGroup legendText="">
                <Controller
                  control={control}
                  name="departmentType"
                  render={({ field: { onChange, value } }) => (
                    <Dropdown
                      id="departmentType"
                      titleText={t('departmentType', 'Department type')}
                      label={t('selectDepartmentType', 'Select a department type')}
                      items={departmentTypes}
                      itemToString={(item) => item?.display ?? ''}
                      selectedItem={departmentTypes.find((item) => item.uuid === value) ?? null}
                      onChange={({ selectedItem }) => onChange(selectedItem?.uuid ?? null)}
                      invalid={!!errors.departmentType?.message}
                      invalidText={errors.departmentType?.message}
                    />
                  )}
                />
              </FormGroup>
            </ResponsiveWrapper>
          )}

          <ResponsiveWrapper>
            <FormGroup legendText="">
              {location && isLoadingDetails ? (
                <InlineLoading description={t('loading', 'Loading...')} />
              ) : (
                <Controller
                  control={control}
                  name="parentLocation"
                  render={({ field: { onChange, value } }) => (
                    <LocationAutosuggest
                      key={locationDetails?.parentLocation?.uuid ?? 'none'}
                      labelText={t('parentLocationOptional', 'Parent location (optional)')}
                      placeholder={t('searchParentLocation', 'Search for location...')}
                      defaultValue={value?.display}
                      excludeUuids={excludedParentUuids}
                      onLocationSelected={(uuid, selected) =>
                        onChange({
                          uuid,
                          display: selected.display,
                          isDepartment: !!selected.tags?.some((tag) => tag.uuid === departmentTagUuid),
                        })
                      }
                      onLocationCleared={() => onChange(null)}
                      invalid={!!errors.parentLocation?.message}
                      invalidText={errors.parentLocation?.message}
                    />
                  )}
                />
              )}
            </FormGroup>
          </ResponsiveWrapper>
        </Stack>
      </div>

      <ButtonSet
        className={classNames({
          [styles.tablet]: isTablet,
          [styles.desktop]: !isTablet,
        })}>
        <Button className={styles.buttonContainer} kind="secondary" onClick={() => closeWorkspace()}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button className={styles.buttonContainer} disabled={isSubmitting || !isDirty} kind="primary" type="submit">
          {isSubmitting ? (
            <span className={styles.inlineLoading}>
              {t('submitting', 'Submitting' + '...')}
              <InlineLoading status="active" iconDescription="Loading" />
            </span>
          ) : (
            t('saveAndClose', 'Save & close')
          )}
        </Button>
      </ButtonSet>
    </Form>
  );
};

export default AddLocationWorkspace;
