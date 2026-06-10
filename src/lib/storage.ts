let memoryStorage: Record<string, string> = {};

export const safeSetItem = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    memoryStorage[key] = value;
  }
};

export const safeGetItem = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    return memoryStorage[key] || null;
  }
};
