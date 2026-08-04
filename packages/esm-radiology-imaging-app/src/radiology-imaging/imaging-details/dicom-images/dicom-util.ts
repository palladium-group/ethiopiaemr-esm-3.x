type OpenWindowOptions = {
  target?: string;
  width?: number;
  height?: number;
  noopener?: boolean;
  noreferrer?: boolean;
};

export function openWindow(url: string, options: OpenWindowOptions = {}): Window | null {
  const { target = '_blank', width, height, noopener = true, noreferrer = true } = options;

  const features: string[] = [];

  if (noopener) {
    features.push('noopener');
  }
  if (noreferrer) {
    features.push('noreferrer');
  }

  if (width && height) {
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    features.push(`width=${width}`, `height=${height}`, `left=${left}`, `top=${top}`);
  }

  return window.open(url, target, features.join(','));
}
