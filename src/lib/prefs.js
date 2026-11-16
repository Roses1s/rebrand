/**
 * Настройки вида в localStorage: тема, акцент, плотность.
 *
 * Значение живёт в одном месте, а все экземпляры `usePref` с тем же ключом
 * узнают о смене через событие окна — так переключатель темы в верхней строке
 * и тот же выбор в «Настройках» не расходятся. Атрибуты `data-theme`,
 * `data-accent`, `data-density` на <html> ставятся сразу при записи и один раз
 * при запуске (`applyPrefs`), поэтому выбор действует с первого экрана,
 * а не только после захода в «Настройки».
 */
import { useCallback, useEffect, useState } from "react";

const EVENT = "crm:pref";

/** Ключ хранилища → атрибут на <html> и значение по умолчанию. */
const ATTRIBUTES = {
  "crm.theme": ["theme", "light"],
  "crm.accent": ["accent", "indigo"],
  "crm.density": ["density", "comfort"],
};

export function readPref(key, fallback) {
  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function applyAttribute(key, value) {
  const attribute = ATTRIBUTES[key];
  if (attribute) document.documentElement.dataset[attribute[0]] = value;
}

export function writePref(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* приватный режим — выбор действует до перезагрузки */
  }
  applyAttribute(key, value);
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { key, value } }));
}

/** Ставит сохранённые тему, акцент и плотность до первого рендера. */
export function applyPrefs() {
  Object.entries(ATTRIBUTES).forEach(([key, [, fallback]]) => applyAttribute(key, readPref(key, fallback)));
}

export function usePref(key, fallback) {
  const [value, setValue] = useState(() => readPref(key, fallback));

  useEffect(() => {
    const onChange = (event) => {
      if (event.detail.key === key) setValue(event.detail.value);
    };
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, [key]);

  const update = useCallback((next) => writePref(key, next), [key]);
  return [value, update];
}
