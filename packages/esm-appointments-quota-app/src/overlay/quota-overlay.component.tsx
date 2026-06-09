import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@carbon/react';
import { Close, ChartLineData } from '@carbon/react/icons';
import { useConfig, useStore } from '@openmrs/esm-framework';
import { type ConfigObject } from '../config-schema';
import { dismissQuotaOverlay, quotaOverlayStore } from './quota-overlay.store';
import QuotaPanelContent from './quota-panel-content.component';
import styles from './quota-overlay.scss';

/** Minimum horizontal room (px) to the left of the form before we give up anchoring. */
const MIN_ANCHOR_SPACE = 360;

/**
 * Finds the booking form's workspace panel rect by walking up from a known form
 * field to its absolutely-positioned workspace container. Returns `null` when the
 * booking form isn't on screen (e.g. the overlay was opened manually).
 */
function measureBookingFormPanel(): DOMRect | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const anchor =
    document.querySelector('#service') ??
    document.querySelector('#datePickerInput') ??
    document.querySelector('[data-testid="datePickerInput"]') ??
    document.querySelector('#appointmentRecurringDateRangePicker');

  if (!anchor) {
    return null;
  }

  let el: HTMLElement | null = anchor as HTMLElement;

  while (el && el !== document.body) {
    const position = window.getComputedStyle(el).position;

    if (position === 'absolute' || position === 'fixed') {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        return rect;
      }
    }

    el = el.parentElement;
  }

  const form = (anchor as HTMLElement).closest('form');
  return form ? form.getBoundingClientRect() : null;
}

/**
 * Tracks the booking form panel position and returns inline styles that anchor
 * the overlay flush to the panel's left edge, so it reads as part of the form.
 * Returns `null` when there's no form to anchor to (falls back to SCSS default).
 */
function useBookingFormAnchorStyle(active: boolean): React.CSSProperties | null {
  const [style, setStyle] = useState<React.CSSProperties | null>(null);

  useEffect(() => {
    if (!active) {
      setStyle(null);
      return;
    }

    let frame = 0;
    let lastKey = '';

    const update = () => {
      const rect = measureBookingFormPanel();
      let next: React.CSSProperties | null = null;

      if (rect && rect.left >= MIN_ANCHOR_SPACE) {
        next = {
          insetBlockStart: `${Math.max(rect.top, 0)}px`,
          insetInlineEnd: `${Math.max(window.innerWidth - rect.left, 0)}px`,
          maxBlockSize: `${rect.height}px`,
        };
      }

      const key = next ? `${next.insetBlockStart}|${next.insetInlineEnd}|${next.maxBlockSize}` : '';
      if (key !== lastKey) {
        lastKey = key;
        setStyle(next);
      }

      frame = window.requestAnimationFrame(update);
    };

    frame = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(frame);
  }, [active]);

  return style;
}

/**
 * A fixed-position, self-owned capacity panel that floats flush against the left
 * edge of the right-side booking form. Driven entirely by {@link quotaOverlayStore};
 * mounted once globally and rendered via a portal to `document.body`.
 */
const QuotaOverlay: React.FC = () => {
  const { t } = useTranslation();
  const config = useConfig<ConfigObject>();
  const { visible, props } = useStore(quotaOverlayStore);
  const isActive = Boolean(config.enabled && visible);
  const anchorStyle = useBookingFormAnchorStyle(isActive);

  // Close on Escape for keyboard accessibility.
  useEffect(() => {
    if (!isActive) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        dismissQuotaOverlay();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isActive]);

  if (!isActive || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <section
      className={styles.overlay}
      style={anchorStyle ?? undefined}
      role="complementary"
      aria-label={t('quotaPanelTitle', 'Check service capacity')}>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <ChartLineData size={16} />
          <span>{t('quotaPanelTitle', 'Check service capacity')}</span>
        </div>
        <Button
          kind="ghost"
          size="sm"
          hasIconOnly
          iconDescription={t('close', 'Close')}
          tooltipPosition="left"
          renderIcon={Close}
          onClick={dismissQuotaOverlay}
        />
      </header>
      <QuotaPanelContent panelProps={props} />
    </section>,
    document.body,
  );
};

export default QuotaOverlay;
