import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  Button,
  DataTable,
  DataTableSkeleton,
  InlineNotification,
  OverflowMenu,
  OverflowMenuItem,
  Search,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
} from '@carbon/react';
import { Add } from '@carbon/react/icons';
import { launchWorkspace, showModal, useLayoutType, UserHasAccess } from '@openmrs/esm-framework';
import { CardHeader, EmptyState, ErrorState } from '@openmrs/esm-patient-common-lib';
import { Permissions } from '../../../permission/permissions.constants';
import type { ExemptionRule } from '../exemption-rules.utils';
import { useExemptionsSetting } from '../exemptions.resource';
import styles from './exemption-rules.scss';

export function describeCriterion(rule: Pick<ExemptionRule, 'criterion' | 'value'>, t: TFunction) {
  switch (rule.criterion) {
    case 'all':
      return t('exemptionAllPatients', 'All patients');
    case 'location':
      return t('exemptionAtLocation', 'Patients at {{value}}', {
        value: rule.value,
        interpolation: { escapeValue: false },
      });
    case 'program':
      return t('exemptionInProgram', 'Patients in the {{value}} program', {
        value: rule.value,
        interpolation: { escapeValue: false },
      });
    case 'ageUnder':
      return t('exemptionYoungerThan', 'Patients younger than {{value}} years', {
        value: rule.value,
        interpolation: { escapeValue: false },
      });
    case 'ageOver':
      return t('exemptionOlderThan', 'Patients older than {{value}} years', {
        value: rule.value,
        interpolation: { escapeValue: false },
      });
    case 'visitAttribute':
      return t('exemptionInCategory', 'Patients in the “{{value}}” exemption category', {
        value: rule.value,
        interpolation: { escapeValue: false },
      });
  }
}

export const launchExemptionRuleWorkspace = (t: TFunction, initialRule?: ExemptionRule) =>
  launchWorkspace('exemption-rule-workspace', {
    workspaceTitle: initialRule
      ? t('editExemptionRule', 'Edit exemption rule')
      : t('addExemptionRule', 'Add exemption rule'),
    initialRule,
  });

const ExemptionRulesTable: React.FC = () => {
  const { t } = useTranslation();
  const size = useLayoutType() === 'tablet' ? 'md' : 'sm';
  const { config, parseError, error, isLoading } = useExemptionsSetting();
  const [searchTerm, setSearchTerm] = useState('');

  const unrecognisedKeys = [
    ...Object.keys(config.unrecognised.services),
    ...Object.keys(config.unrecognised.commodities),
  ];

  const rows = useMemo(
    () =>
      config.rules
        .map((rule) => ({
          rule,
          id: rule.id,
          appliesTo: describeCriterion(rule, t),
          covers: rule.section === 'services' ? t('services', 'Services') : t('commodities', 'Commodities'),
          itemsText: rule.allItems
            ? t('allItems', 'All items')
            : rule.items.map((item) => item.description || String(item.concept)).join(', '),
        }))
        .filter((row) =>
          [row.appliesTo, row.covers, row.itemsText].join(' ').toLowerCase().includes(searchTerm.toLowerCase()),
        ),
    [config.rules, searchTerm, t],
  );

  const showDeleteModal = (rule: ExemptionRule) => {
    const dispose = showModal('delete-exemption-rule-modal', {
      closeModal: () => dispose(),
      rule,
      ruleDescription: describeCriterion(rule, t),
    });
  };

  if (isLoading) {
    return <DataTableSkeleton role="progressbar" />;
  }

  if (error) {
    return <ErrorState error={error} headerTitle={t('exemptionRules', 'Exemption rules')} />;
  }

  const notifications = (
    <>
      {parseError && (
        <InlineNotification
          kind="error"
          lowContrast
          hideCloseButton
          title={t('exemptionsInvalidJson', 'The saved exemptions are not valid JSON')}
          subtitle={t('exemptionsInvalidJsonHelp', 'Fix them in the Advanced (JSON) tab before adding rules.')}
        />
      )}
      {unrecognisedKeys.length > 0 && (
        <InlineNotification
          kind="warning"
          lowContrast
          hideCloseButton
          title={t('exemptionsUnrecognised', 'Some saved entries can only be edited as JSON')}
          subtitle={unrecognisedKeys.join(', ')}
        />
      )}
    </>
  );

  if (config.rules.length === 0) {
    return (
      <div className={styles.rulesContainer}>
        {notifications}
        <EmptyState
          headerTitle={t('exemptionRules', 'Exemption rules')}
          displayText={t('exemptionRulesLower', 'exemption rules')}
          launchForm={parseError ? undefined : () => launchExemptionRuleWorkspace(t)}
        />
      </div>
    );
  }

  const headers = [
    { key: 'appliesTo', header: t('exemptionAppliesTo', 'Who is exempted') },
    { key: 'covers', header: t('exemptionCovers', 'What is exempted') },
    { key: 'itemsText', header: t('items', 'Items') },
  ];

  return (
    <div className={styles.rulesContainer}>
      {notifications}
      <CardHeader title={t('exemptionRules', 'Exemption rules')}>
        <UserHasAccess privilege={Permissions.AddExcemptionsSchema}>
          <Button
            kind="ghost"
            size={size}
            renderIcon={Add}
            disabled={!!parseError}
            onClick={() => launchExemptionRuleWorkspace(t)}>
            {t('addExemptionRule', 'Add exemption rule')}
          </Button>
        </UserHasAccess>
      </CardHeader>
      <Search
        size={size}
        labelText={t('searchExemptionRules', 'Search exemption rules')}
        placeholder={t('searchExemptionRules', 'Search exemption rules')}
        onChange={(event) => setSearchTerm(event.target.value)}
      />
      <DataTable rows={rows} headers={headers} size={size} useZebraStyles>
        {({ rows: tableRows, headers: tableHeaders, getHeaderProps, getRowProps, getTableProps }) => (
          <TableContainer>
            <Table {...getTableProps()} aria-label={t('exemptionRules', 'Exemption rules')}>
              <TableHead>
                <TableRow>
                  {tableHeaders.map((header) => (
                    <TableHeader {...getHeaderProps({ header })} key={header.key}>
                      {header.header}
                    </TableHeader>
                  ))}
                  <TableHeader aria-label={t('actions', 'Actions')} />
                </TableRow>
              </TableHead>
              <TableBody>
                {tableRows.map((tableRow) => {
                  const rule = rows.find((row) => row.id === tableRow.id)?.rule;
                  return (
                    <TableRow {...getRowProps({ row: tableRow })} key={tableRow.id}>
                      {tableRow.cells.map((cell) => (
                        <TableCell key={cell.id}>
                          {cell.info.header === 'itemsText' && rule?.allItems ? (
                            <Tag type="green" size="sm">
                              {cell.value}
                            </Tag>
                          ) : (
                            cell.value
                          )}
                        </TableCell>
                      ))}
                      <TableCell className="cds--table-column-menu">
                        <UserHasAccess privilege={Permissions.AddExcemptionsSchema}>
                          <OverflowMenu size={size} flipped iconDescription={t('actions', 'Actions')}>
                            <OverflowMenuItem
                              itemText={t('edit', 'Edit')}
                              onClick={() => launchExemptionRuleWorkspace(t, rule)}
                            />
                            <OverflowMenuItem
                              hasDivider
                              isDelete
                              itemText={t('delete', 'Delete')}
                              onClick={() => showDeleteModal(rule)}
                            />
                          </OverflowMenu>
                        </UserHasAccess>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DataTable>
      {rows.length === 0 && (
        <p className={styles.noResults}>{t('noMatchingExemptionRules', 'No rules match your search')}</p>
      )}
    </div>
  );
};

export default ExemptionRulesTable;
