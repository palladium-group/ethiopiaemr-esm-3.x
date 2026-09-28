import React from 'react';
import { useTranslation } from 'react-i18next';
import { InlineNotification, Tab, TabList, TabPanel, TabPanels, Tabs } from '@carbon/react';
import { UserHasAccess } from '@openmrs/esm-framework';
import BillingHeader from '../../billing-header/billing-header.component';
import { Permissions } from '../../permission/permissions.constants';
import ExemptionRulesTable from './rules/exemption-rules-table.component';
import ExemptionsJsonEditor from './advanced/exemptions-json-editor.component';

const BillableExemptions = () => {
  const { t } = useTranslation();
  return (
    <div>
      <BillingHeader title={t('billableExemptionAdministration', 'Exemption Administration')} />
      <UserHasAccess
        privilege={Permissions.ViewExemptionsSchema}
        fallback={
          <InlineNotification
            kind="warning"
            lowContrast
            hideCloseButton
            title={t('noExemptionsAccess', 'You do not have permission to view billing exemptions')}
          />
        }>
        <Tabs>
          <TabList aria-label={t('billableExemptions', 'Billable Exemptions')}>
            <Tab>{t('exemptionRules', 'Exemption rules')}</Tab>
            <Tab>{t('exemptionsAdvancedJson', 'Advanced (JSON)')}</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <ExemptionRulesTable />
            </TabPanel>
            <TabPanel>
              <ExemptionsJsonEditor />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </UserHasAccess>
    </div>
  );
};

export default BillableExemptions;
