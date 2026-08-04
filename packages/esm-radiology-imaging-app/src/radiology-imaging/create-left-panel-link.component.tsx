import React, { useMemo } from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ConfigurableLink } from '@openmrs/esm-framework';
import { type CarbonIconType } from '@carbon/react/icons';
import styles from './create-left-panel-link.scss';

export interface LeftPanelLinkConfig {
  name: string;
  title: string;
  icon?: CarbonIconType;
}

function LeftPanelLinkExtension({ config }: { config: LeftPanelLinkConfig }) {
  const { t } = useTranslation();
  const { name, title, icon: Icon } = config;
  const location = useLocation();
  const basePath = `${window.spaBase}/radiology-imaging`;

  const isActive = useMemo(() => {
    const segments = location.pathname.split('/').map((s) => decodeURIComponent(s));
    return segments.includes(name);
  }, [location.pathname, name]);

  return (
    <ConfigurableLink
      to={`${basePath}/${name}`}
      className={`cds--side-nav__link ${isActive ? 'active-left-nav-link' : ''}`}>
      {Icon && <Icon className={styles.icon} />}
      <span>{t(title)}</span>
    </ConfigurableLink>
  );
}

export const createLeftPanelLink = (config: LeftPanelLinkConfig) => () =>
  (
    <BrowserRouter>
      <LeftPanelLinkExtension config={config} />
    </BrowserRouter>
  );
