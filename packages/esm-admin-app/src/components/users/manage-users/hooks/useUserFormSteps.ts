import { useCallback, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from '@carbon/react/icons';
import type { TFunction } from 'i18next';
import { SECTIONS } from '../../../../constants';
import { FORM_STEP_IDS, FORM_STEP_KEYS } from '../user-management.constants';

export interface FormStep {
  id: string;
  label: string;
}

interface UseUserFormStepsParams {
  t: TFunction;
  closeWorkspace: () => void;
}

export function useUserFormSteps({ t, closeWorkspace }: UseUserFormStepsParams) {
  const [activeSection, setActiveSection] = useState(SECTIONS.DEMOGRAPHIC);
  const [currentIndex, setCurrentIndex] = useState(0);

  const steps = useMemo<FormStep[]>(
    () =>
      FORM_STEP_IDS.map((id) => ({
        id,
        label: t(FORM_STEP_KEYS[id].key, FORM_STEP_KEYS[id].fallback),
      })),
    [t],
  );

  const toggleSection = useCallback((section: string) => {
    setActiveSection((prev) => (prev !== section ? section : prev));
  }, []);

  const hasLoginInfo = activeSection === SECTIONS.LOGIN;
  const hasRoles = activeSection === SECTIONS.ROLES;
  const hasDemographicInfo = activeSection === SECTIONS.DEMOGRAPHIC;
  const hasProviderAccount = activeSection === SECTIONS.PROVIDER;

  const isSaveAndClose = !(hasDemographicInfo || hasLoginInfo || hasProviderAccount);

  const getSubmitButtonText = () =>
    t(isSaveAndClose ? 'saveAndClose' : 'next', isSaveAndClose ? 'Save & close' : 'Next');

  const getSubmitButtonType = () => (isSaveAndClose ? 'submit' : 'button');

  const getSubmitButtonIcon = () => (isSaveAndClose ? ChevronLeft : ChevronRight);

  const handleBackClick = useCallback(() => {
    if (hasDemographicInfo) {
      closeWorkspace();
    } else {
      toggleSection(steps[currentIndex - 1].id);
      setCurrentIndex((i) => i - 1);
    }
  }, [hasDemographicInfo, closeWorkspace, currentIndex, steps, toggleSection]);

  const handleNextClick = useCallback(
    (e: React.MouseEvent) => {
      if (!isSaveAndClose) {
        e.preventDefault();
        toggleSection(steps[currentIndex + 1].id);
        setCurrentIndex((i) => i + 1);
      }
    },
    [isSaveAndClose, currentIndex, steps, toggleSection],
  );

  const handleStepChange = useCallback(
    (newIndex: number) => {
      toggleSection(steps[newIndex].id);
      setCurrentIndex(newIndex);
    },
    [steps, toggleSection],
  );

  return {
    steps,
    currentIndex,
    activeSection,
    hasDemographicInfo,
    hasLoginInfo,
    hasProviderAccount,
    hasRoles,
    isSaveAndClose,
    toggleSection,
    setCurrentIndex,
    handleBackClick,
    handleNextClick,
    handleStepChange,
    getSubmitButtonText,
    getSubmitButtonType,
    getSubmitButtonIcon,
  };
}
