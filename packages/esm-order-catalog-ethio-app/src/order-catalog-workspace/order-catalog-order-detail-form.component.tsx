import React from 'react';
import { useTranslation } from 'react-i18next';
import { DatePicker, DatePickerInput, NumberInput, Select, SelectItem, TextArea, TextInput } from '@carbon/react';
import {
  createDefaultOrderDetail,
  type OrderCatalogOrderType,
  type OrderDetail,
  type OrderLaterality,
  type OrderUrgency,
} from '../types/order-catalog.types';
import styles from './order-catalog-order-detail-form.scss';

export interface OrderCatalogOrderDetailFormProps {
  /** Stable id prefix so each order's fields get unique ids. */
  idPrefix: string;
  orderType: OrderCatalogOrderType;
  value: OrderDetail | undefined;
  onChange: (next: OrderDetail) => void;
}

const OrderCatalogOrderDetailForm: React.FC<OrderCatalogOrderDetailFormProps> = ({
  idPrefix,
  orderType,
  value,
  onChange,
}) => {
  const { t } = useTranslation();
  const detail = value ?? createDefaultOrderDetail();

  const update = (patch: Partial<OrderDetail>) => onChange({ ...detail, ...patch });

  const urgencyOptions: Array<{ value: OrderUrgency; label: string }> = [
    { value: 'ROUTINE', label: t('urgencyRoutine', 'Routine') },
    { value: 'STAT', label: t('urgencyStat', 'Stat') },
    { value: 'ON_SCHEDULED_DATE', label: t('urgencyScheduled', 'On scheduled date') },
  ];

  const lateralityOptions: Array<{ value: OrderLaterality; label: string }> = [
    { value: 'LEFT', label: t('lateralityLeft', 'Left') },
    { value: 'RIGHT', label: t('lateralityRight', 'Right') },
    { value: 'BILATERAL', label: t('lateralityBilateral', 'Bilateral') },
  ];

  const showReason = orderType === 'radiology' || orderType === 'procedure';
  const showComments = orderType === 'radiology' || orderType === 'procedure';

  return (
    <div className={styles.form}>
      <Select
        id={`${idPrefix}-urgency`}
        size="sm"
        labelText={t('priority', 'Priority')}
        value={detail.urgency}
        onChange={(event) => update({ urgency: event.target.value as OrderUrgency })}>
        {urgencyOptions.map((option) => (
          <SelectItem key={option.value} value={option.value} text={option.label} />
        ))}
      </Select>

      {detail.urgency === 'ON_SCHEDULED_DATE' ? (
        <DatePicker
          datePickerType="single"
          value={detail.scheduledDate ? [detail.scheduledDate] : []}
          onChange={(dates: Array<Date>) => update({ scheduledDate: dates?.[0] ? dates[0].toISOString() : undefined })}>
          <DatePickerInput
            id={`${idPrefix}-scheduled-date`}
            size="sm"
            placeholder="dd/mm/yyyy"
            labelText={t('scheduledDate', 'Scheduled date')}
          />
        </DatePicker>
      ) : null}

      {orderType === 'radiology' ? (
        <Select
          id={`${idPrefix}-laterality`}
          size="sm"
          labelText={t('laterality', 'Laterality')}
          value={detail.laterality ?? ''}
          onChange={(event) =>
            update({ laterality: (event.target.value || undefined) as OrderLaterality | undefined })
          }>
          <SelectItem value="" text={t('notApplicable', 'Not applicable')} />
          {lateralityOptions.map((option) => (
            <SelectItem key={option.value} value={option.value} text={option.label} />
          ))}
        </Select>
      ) : null}

      {orderType === 'procedure' ? (
        <>
          <TextInput
            id={`${idPrefix}-body-site`}
            size="sm"
            labelText={t('bodySite', 'Body site')}
            value={detail.bodySite ?? ''}
            onChange={(event) => update({ bodySite: event.target.value })}
          />
          <NumberInput
            id={`${idPrefix}-repeats`}
            size="sm"
            min={0}
            label={t('numberOfRepeats', 'Number of repeats')}
            value={detail.numberOfRepeats ?? ''}
            onChange={(_event, { value: nextValue }) =>
              update({ numberOfRepeats: nextValue === '' ? undefined : String(nextValue) })
            }
          />
        </>
      ) : null}

      {showReason ? (
        <TextArea
          id={`${idPrefix}-order-reason`}
          rows={2}
          labelText={t('orderReason', 'Order reason')}
          value={detail.orderReasonNonCoded ?? ''}
          onChange={(event) => update({ orderReasonNonCoded: event.target.value })}
        />
      ) : null}

      <TextArea
        id={`${idPrefix}-instructions`}
        rows={2}
        labelText={t('additionalInstructions', 'Additional instructions')}
        value={detail.instructions ?? ''}
        onChange={(event) => update({ instructions: event.target.value })}
      />

      {showComments ? (
        <TextArea
          id={`${idPrefix}-comments`}
          rows={2}
          labelText={t('commentsToFulfiller', 'Comments to fulfiller')}
          value={detail.commentsToFulfiller ?? ''}
          onChange={(event) => update({ commentsToFulfiller: event.target.value })}
        />
      ) : null}
    </div>
  );
};

export default OrderCatalogOrderDetailForm;
