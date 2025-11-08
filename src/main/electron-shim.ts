import { createRequire } from 'node:module';

const requireFn = createRequire(import.meta.url);

const electronModule = (() => {
  try {
    const candidate = requireFn('electron');
    if (candidate && typeof candidate === 'object' && 'app' in candidate) {
      return candidate as typeof import('electron');
    }
    return null;
  } catch {
    return null;
  }
})();

export const hasElectron = Boolean(process.versions?.electron && electronModule);

export default electronModule;
