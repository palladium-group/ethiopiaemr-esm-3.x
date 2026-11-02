import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';
import {
  DataTableSkeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from '@carbon/react';
import { type FetchResponse, openmrsFetch, restBaseUrl, useLayoutType } from '@openmrs/esm-framework';
import { type Order } from '@openmrs/esm-patient-common-lib';
import styles from './general-order-details.scss';

type OrderConcept = { uuid: string; display: string; setMembers: Array<{ uuid: string; display: string }> };

const GeneralOrderDetails: React.FC<{ order: Order }> = ({ order }) => {
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';
  const { data, isLoading } = useSWR<FetchResponse<OrderConcept>>(
    `${restBaseUrl}/concept/${order.concept.uuid}?v=custom:(uuid,display,setMembers:(uuid,display))`,
    openmrsFetch,
  );

  const rows = useMemo(() => {
    const concept = data?.data;
    if (!concept) {
      return [];
    }
    return concept.setMembers?.length
      ? concept.setMembers.map(({ uuid, display }) => ({ uuid, display, instructions: '--' }))
      : [{ uuid: concept.uuid, display: concept.display, instructions: order.instructions ?? '--' }];
  }, [data, order.instructions]);

  if (isLoading) {
    return <DataTableSkeleton role="progressbar" compact={isTablet} zebra />;
  }

  return (
    <div className={styles.order}>
      <TableContainer>
        <Table aria-label={t('orderDetails', 'Order details')} size={isTablet ? 'lg' : 'sm'} useZebraStyles>
          <TableHead>
            <TableRow>
              <TableHeader>{order.orderType?.display}</TableHeader>
              <TableHeader>{t('instructions', 'Instructions')}</TableHeader>
              <TableHeader>
                {t('referenceNumberTableHeader', '{{orderType}} reference number', {
                  orderType: order.orderType?.display,
                })}
              </TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.uuid}>
                <TableCell className={styles.cell}>
                  <div className={styles.type}>{row.display}</div>
                </TableCell>
                <TableCell className={styles.cell}>{row.instructions}</TableCell>
                <TableCell className={styles.cell}>{order.accessionNumber}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
};

export default GeneralOrderDetails;
