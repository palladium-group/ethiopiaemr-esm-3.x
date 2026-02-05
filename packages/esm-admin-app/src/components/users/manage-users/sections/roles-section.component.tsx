import React from 'react';
import { useTranslation } from 'react-i18next';
import { Controller, Control } from 'react-hook-form';
import { ResponsiveWrapper } from '@openmrs/esm-framework';
import { Column, CheckboxGroup, InlineLoading } from '@carbon/react';
import { filterRolesConfig, RoleConfigCategory } from '../user-management.utils';
import type { UserFormSchema } from '../hooks/useUserManagementForm';
import type { Role } from '../../../../types';
import styles from '../user-management.workspace.scss';

interface RolesSectionProps {
  control: Control<UserFormSchema>;
  roles: Role[];
  rolesConfig: RoleConfigCategory[];
  isLoading: boolean;
}

export const RolesSection: React.FC<RolesSectionProps> = ({ control, roles, rolesConfig, isLoading }) => {
  const { t } = useTranslation();
  const filteredRolesConfig = filterRolesConfig(rolesConfig);

  return (
    <ResponsiveWrapper>
      <span className={styles.formHeaderSection}>{t('rolesInfo', 'Roles Info')}</span>
      <ResponsiveWrapper>
        {filteredRolesConfig.map((category) => (
          <Column key={category.category} xsm={8} md={12} lg={12} className={styles.checkBoxColumn}>
            <CheckboxGroup legendText={category.category} className={styles.checkboxGroupGrid}>
              {isLoading ? (
                <InlineLoading status="active" iconDescription="Loading" description="Loading data..." />
              ) : (
                <Controller
                  name="roles"
                  control={control}
                  render={({ field }) => {
                    const selectedRoles = field.value || [];

                    return (
                      <>
                        {roles
                          .filter((role) => category.roles.includes(role.name))
                          .map((role) => {
                            const isSelected = selectedRoles.some(
                              (r) =>
                                r.display === role.display &&
                                r.description === role.description &&
                                r.uuid === role.uuid,
                            );

                            return (
                              <label
                                key={role.display}
                                className={isSelected ? styles.checkboxLabelSelected : styles.checkboxLabel}>
                                <input
                                  type="checkbox"
                                  id={role.display}
                                  checked={isSelected}
                                  onChange={(e) => {
                                    const updatedValue = e.target.checked
                                      ? [
                                          ...selectedRoles,
                                          {
                                            uuid: role.uuid,
                                            display: role.display,
                                            description: role.description ?? null,
                                          },
                                        ]
                                      : selectedRoles.filter((selectedRole) => selectedRole.display !== role.display);

                                    field.onChange(updatedValue);
                                  }}
                                />
                                {role.display}
                              </label>
                            );
                          })}
                      </>
                    );
                  }}
                />
              )}
            </CheckboxGroup>
          </Column>
        ))}
      </ResponsiveWrapper>
    </ResponsiveWrapper>
  );
};
