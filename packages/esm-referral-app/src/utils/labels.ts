import { useTranslation } from 'react-i18next';
import { humanizeCode } from './format';

/**
 * Enum codes from the module, rendered in the user's language. Each code has its own key so a
 * translator can word it properly; the English fallback is the humanised code.
 */
export function useCodeLabel() {
  const { t } = useTranslation();
  return (prefix: string, code?: string | null) => (code ? t(`${prefix}_${code}`, humanizeCode(code)) : '—');
}
