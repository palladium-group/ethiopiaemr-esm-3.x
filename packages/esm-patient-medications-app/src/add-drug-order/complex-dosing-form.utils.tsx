import React, { type ReactNode } from 'react';
import { Layer } from '@carbon/react';
import { useLayoutType } from '@openmrs/esm-framework';
import formStyles from './drug-order-form.scss';

/**
 * Wraps a form field in a Carbon `Layer` (adjusting depth for tablet vs desktop)
 * and applies the shared field styling. Shared across the standard and complex
 * dosing forms.
 */
export function InputWrapper({ children }: { children: ReactNode }) {
  const isTablet = useLayoutType() === 'tablet';
  return (
    <Layer level={isTablet ? 1 : 0}>
      <div className={formStyles.field}>{children}</div>
    </Layer>
  );
}

/** Parses a numeric dose/duration input, returning null for empty or invalid values. */
export function parseDoseValue(value: string | number): number | null {
  const number = parseFloat(String(value));
  return isNaN(number) ? null : number;
}
