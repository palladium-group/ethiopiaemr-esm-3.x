import { Button, ButtonSet, FilterableMultiSelect, Form, FormGroup, InlineLoading, Stack } from '@carbon/react';
import {
  type DefaultWorkspaceProps,
  ErrorState,
  ResponsiveWrapper,
  restBaseUrl,
  showSnackbar,
  useLayoutType,
} from '@openmrs/esm-framework';
import classNames from 'classnames';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { extractErrorMessagesFromResponse } from '../../../locations/helpers';
import { handleMutation } from '../../../../user-management.resources';
import { User } from '../../../../types';
import {
  type LoginLocation,
  saveUserLoginLocations,
  useTaggedLoginLocations,
  useUserLoginLocationMappings,
} from './user-login-locations.resource';
import styles from './user-login-locations.workspace.scss';

type UserLoginLocationsWorkspaceProps = DefaultWorkspaceProps & {
  user: User;
};

const UserLoginLocationsWorkspace: React.FC<UserLoginLocationsWorkspaceProps> = ({
  closeWorkspace,
  closeWorkspaceWithSavedChanges,
  promptBeforeClosing,
  user,
}) => {
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';
  const { locations, error: locationsError, isLoading: isLoadingLocations } = useTaggedLoginLocations();
  const { mappings, error: mappingsError, isLoading: isLoadingMappings } = useUserLoginLocationMappings(user.uuid);

  const [selected, setSelected] = useState<Array<LoginLocation> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoadingMappings && !mappingsError && selected === null) {
      setSelected(mappings);
    }
  }, [isLoadingMappings, mappingsError, mappings, selected]);

  // include mapped locations that lost the tag so they stay visible and removable
  const items = useMemo(() => {
    const tagged = new Set(locations.map((location) => location.uuid));
    return [...locations, ...mappings.filter((mapping) => !tagged.has(mapping.uuid))];
  }, [locations, mappings]);

  const isDirty = useMemo(() => {
    if (selected === null) {
      return false;
    }
    const current = new Set(mappings.map((mapping) => mapping.uuid));
    return selected.length !== current.size || selected.some((location) => !current.has(location.uuid));
  }, [selected, mappings]);

  useEffect(() => {
    promptBeforeClosing(() => isDirty);
  }, [isDirty, promptBeforeClosing]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await saveUserLoginLocations(
        user.uuid,
        mappings.map((mapping) => mapping.uuid),
        (selected ?? []).map((location) => location.uuid),
      );

      showSnackbar({
        title: t('success', 'Success'),
        kind: 'success',
        subtitle: t('loginLocationsUpdated', 'Login locations for {{userName}} were updated successfully.', {
          userName: user.person?.display || user.display,
        }),
      });

      handleMutation(`${restBaseUrl}/user/${user.uuid}/location`);
      closeWorkspaceWithSavedChanges();
    } catch (error) {
      const errorMessages = extractErrorMessagesFromResponse(error);
      showSnackbar({
        title: t('error', 'Error'),
        kind: 'error',
        subtitle: errorMessages.join(', ') || t('loginLocationsSaveError', 'Error saving login locations'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (locationsError || mappingsError) {
    return <ErrorState error={locationsError || mappingsError} headerTitle={t('loginLocations', 'Login locations')} />;
  }

  if (isLoadingLocations || isLoadingMappings || selected === null) {
    return <InlineLoading status="active" iconDescription="Loading" description={t('loading', 'Loading') + '...'} />;
  }

  return (
    <Form onSubmit={onSubmit} className={styles.form}>
      <div className={styles.formContainer}>
        <Stack gap={3}>
          <ResponsiveWrapper>
            <FormGroup legendText="">
              <FilterableMultiSelect
                id="userLoginLocations"
                titleText={t('selectLoginLocations', 'Select login location(s)')}
                placeholder={t('selectLoginLocationsPlaceholder', 'Search for a login location')}
                helperText={t(
                  'loginLocationsHelper',
                  'A user with no mapped locations can log in at any login location.',
                )}
                items={items}
                selectedItems={selected}
                onChange={({ selectedItems }) => setSelected(selectedItems || [])}
                itemToString={(item: LoginLocation | null) => item?.name ?? ''}
                selectionFeedback="top-after-reopen"
                disabled={!items.length}
              />
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
              {t('submitting', 'Submitting') + '...'}
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

export default UserLoginLocationsWorkspace;
