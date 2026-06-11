import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ComboBox, InlineLoading } from '@carbon/react';
import { Add, TrashCan } from '@carbon/react/icons';
import { type Control, useFieldArray } from 'react-hook-form';
import { useDrugSearch } from '../api/drug-search.resource';
import { useOrderTemplates } from '../api/order-template.resource';
import type { DrugSearchResult, OrderSetFormValues, OrderTemplateListItem } from '../types';
import styles from './order-set-members-field.scss';

interface OrderSetMembersFieldProps {
  control: Control<OrderSetFormValues>;
  onRetireMember?: (memberUuid: string) => void;
  invalid?: boolean;
  invalidText?: string;
}

const OrderSetMembersField: React.FC<OrderSetMembersFieldProps> = ({
  control,
  onRetireMember,
  invalid,
  invalidText,
}) => {
  const { t } = useTranslation();
  const { fields, append, remove, update } = useFieldArray({
    control,
    name: 'members',
    keyName: 'clientId',
  });
  const { orderTemplates, isLoading: isLoadingTemplates } = useOrderTemplates();

  const handleAddMember = () => {
    append({
      drugUuid: '',
      drugDisplay: '',
      conceptUuid: '',
      linkedTemplateUuid: '',
    });
  };

  return (
    <div className={styles.field}>
      <div className={styles.label}>
        {t('orderSetMembers', 'Order set members')}
        <span className={styles.required} aria-hidden="true">
          {' '}
          *
        </span>
      </div>

      {fields.length > 0 ? (
        <div className={styles.memberList}>
          {fields.map((field, index) => (
            <OrderSetMemberRow
              key={field.clientId}
              index={index}
              member={field}
              orderTemplates={orderTemplates}
              isLoadingTemplates={isLoadingTemplates}
              onUpdate={(nextMember) => update(index, nextMember)}
              onRemove={() => {
                if (field.uuid) {
                  onRetireMember?.(field.uuid);
                }
                remove(index);
              }}
            />
          ))}
        </div>
      ) : null}

      <Button kind="ghost" size="sm" renderIcon={Add} onClick={handleAddMember}>
        {t('addOrderSetMember', 'Add drug')}
      </Button>

      {invalid ? <div className={styles.invalidText}>{invalidText}</div> : null}
    </div>
  );
};

interface OrderSetMemberRowProps {
  index: number;
  member: OrderSetFormValues['members'][number] & { clientId: string };
  orderTemplates: Array<OrderTemplateListItem>;
  isLoadingTemplates: boolean;
  onUpdate: (member: OrderSetFormValues['members'][number]) => void;
  onRemove: () => void;
}

const OrderSetMemberRow: React.FC<OrderSetMemberRowProps> = ({
  index,
  member,
  orderTemplates,
  isLoadingTemplates,
  onUpdate,
  onRemove,
}) => {
  const { t } = useTranslation();
  const [drugSearchTerm, setDrugSearchTerm] = useState(member.drugDisplay ?? '');
  const { drugs, isLoading: isSearchingDrugs } = useDrugSearch(drugSearchTerm);

  const drugItems = useMemo(() => {
    const items = drugs.map((drug) => ({
      id: drug.uuid,
      text: drug.display,
      drug,
    }));

    if (member.drugUuid && member.drugDisplay && !items.some((item) => item.id === member.drugUuid)) {
      items.unshift({
        id: member.drugUuid,
        text: member.drugDisplay,
        drug: {
          uuid: member.drugUuid,
          display: member.drugDisplay,
          name: member.drugDisplay,
          concept: {
            uuid: member.conceptUuid,
            display: '',
          },
        },
      });
    }

    return items;
  }, [drugs, member.conceptUuid, member.drugDisplay, member.drugUuid]);

  const templateOptions = useMemo(
    () =>
      orderTemplates
        .filter((template) => !template.retired && template.drug?.uuid === member.drugUuid)
        .map((template) => ({
          id: template.uuid,
          text: template.name,
          template,
        })),
    [member.drugUuid, orderTemplates],
  );

  const handleDrugSelection = (drug: DrugSearchResult | null) => {
    if (!drug) {
      onUpdate({
        ...member,
        drugUuid: '',
        drugDisplay: '',
        conceptUuid: '',
        linkedTemplateUuid: '',
      });
      setDrugSearchTerm('');
      return;
    }

    onUpdate({
      ...member,
      drugUuid: drug.uuid,
      drugDisplay: drug.display,
      conceptUuid: drug.concept.uuid,
      linkedTemplateUuid: '',
    });
    setDrugSearchTerm(drug.display);
  };

  return (
    <div className={styles.memberRow}>
      <div className={styles.memberHeader}>
        <span className={styles.memberTitle}>
          {t('orderSetMemberNumber', 'Drug {{number}}', { number: index + 1 })}
        </span>
        <Button
          kind="ghost"
          size="sm"
          renderIcon={TrashCan}
          iconDescription={t('removeOrderSetMember', 'Remove drug')}
          hasIconOnly
          onClick={onRemove}
        />
      </div>

      <ComboBox
        id={`order-set-member-drug-${index}`}
        titleText={t('drug', 'Drug')}
        placeholder={t('searchDrugPlaceholder', 'Search for a drug (min. 2 characters)')}
        items={drugItems}
        itemToString={(item) => item?.text ?? ''}
        selectedItem={member.drugUuid ? drugItems.find((item) => item.id === member.drugUuid) ?? null : null}
        onInputChange={(value) => setDrugSearchTerm(value ?? '')}
        onChange={({ selectedItem }) => handleDrugSelection(selectedItem?.drug ?? null)}
        shouldFilterItem={() => true}
      />
      {isSearchingDrugs ? <InlineLoading description={t('searchingDrugs', 'Searching drugs...')} /> : null}

      <ComboBox
        id={`order-set-member-template-${index}`}
        titleText={t('linkedOrderTemplate', 'Linked order template')}
        helperText={t('linkedOrderTemplateHelper', 'Optional. Applies default dosing for this drug in the bundle.')}
        items={templateOptions}
        itemToString={(item) => item?.text ?? ''}
        selectedItem={
          member.linkedTemplateUuid
            ? templateOptions.find((item) => item.id === member.linkedTemplateUuid) ?? null
            : null
        }
        onChange={({ selectedItem }) =>
          onUpdate({
            ...member,
            linkedTemplateUuid: selectedItem?.id ?? '',
          })
        }
        disabled={!member.drugUuid || isLoadingTemplates}
        shouldFilterItem={() => true}
      />
    </div>
  );
};

export default OrderSetMembersField;
