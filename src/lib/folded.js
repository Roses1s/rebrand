import { useCallback, useEffect, useState } from "react";

/**
 * Свёрнутые этапы доски. Запоминаются отдельно для каждого зрителя и каждой
 * доски, как в рабочей CRM (`crm-folded-stages:v2:user:<id>:board:<id>`):
 * администратор, свернувший колонку на доске сотрудника, не меняет свою.
 */
const key = (viewerId, boardOwnerId) => `crm.folded.${viewerId}.${boardOwnerId}.v1`;

function read(storageKey) {
  try {
    const value = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]");
    return Array.isArray(value) ? value.filter((id) => Number.isInteger(id)) : [];
  } catch {
    return [];
  }
}

export function useFoldedStages(viewerId, boardOwnerId) {
  const storageKey = key(viewerId, boardOwnerId);
  const [state, setState] = useState(() => ({ key: storageKey, ids: read(storageKey) }));
  // При смене доски сразу показываем её настройку, а не прежнюю.
  const ids = state.key === storageKey ? state.ids : read(storageKey);

  useEffect(() => {
    if (state.key !== storageKey) setState({ key: storageKey, ids: read(storageKey) });
  }, [storageKey, state.key]);

  const setFolded = useCallback(
    (update) =>
      setState((prev) => {
        const current = prev.key === storageKey ? prev.ids : read(storageKey);
        const next = typeof update === "function" ? update(current) : update;
        try {
          window.localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          /* хранилище недоступно — доска работает и без запоминания */
        }
        return { key: storageKey, ids: next };
      }),
    [storageKey],
  );

  return [ids, setFolded];
}
