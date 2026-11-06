import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { ME, STAGES } from "../mock/data";

const LeadsContext = createContext(null);

const STAGES_KEY = `crm.stages.${ME.id}.v1`;
const LEADS_KEY = `crm.leads.${ME.id}.v1`;

export const STAGE_COLORS = [
  "#3b82f6",
  "#f59e0b",
  "#8b5cf6",
  "#10b981",
  "#14b8a6",
  "#ec4899",
  "#ef4444",
  "#64748b",
];

const DEFAULT_STAGES = STAGES.map(({ id, name, color, hint }) => ({ id, name, color, hint }));
const DEFAULT_LEADS = STAGES.flatMap((stage) =>
  stage.leads.map((lead, index) => ({ ...lead, position: index })),
);

function load(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* приватный режим или переполнение */
  }
}

/** Этапы и лиды одного менеджера: лиды без своего этапа падают на первый. */
function loadState() {
  const stages = load(STAGES_KEY, DEFAULT_STAGES);
  const known = new Set(stages.map((stage) => stage.id));
  const leads = load(LEADS_KEY, DEFAULT_LEADS).map((lead) =>
    known.has(lead.stageId) ? { ...lead } : { ...lead, stageId: stages[0].id },
  );

  const byStage = new Map();
  leads.forEach((lead) => {
    if (!byStage.has(lead.stageId)) byStage.set(lead.stageId, []);
    byStage.get(lead.stageId).push(lead);
  });
  byStage.forEach((list) => {
    list
      .sort((a, b) => (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER))
      .forEach((lead, index) => {
        lead.position = index;
      });
  });

  return { stages, leads };
}

function nextStageId(stages) {
  return stages.reduce((max, stage) => Math.max(max, stage.id), 0) + 1;
}

/**
 * Макетное хранилище: этапы и лиды живут в браузере.
 * Каждый менеджер правит свою воронку — данные лежат под его ключом.
 */
export function LeadsProvider({ children }) {
  const [initial] = useState(loadState);
  const [stages, setStages] = useState(initial.stages);
  const [leads, setLeads] = useState(initial.leads);

  useEffect(() => {
    save(STAGES_KEY, stages);
  }, [stages]);

  useEffect(() => {
    save(LEADS_KEY, leads);
  }, [leads]);

  const value = useMemo(() => {
    const addLead = (draft) =>
      setLeads((prev) => {
        const nextId = prev.reduce((max, lead) => Math.max(max, lead.id), 0) + 1;
        const targetStage = draft.stageId ?? stages[0]?.id ?? 1;
        const top = prev
          .filter((lead) => lead.stageId === targetStage)
          .reduce((min, lead) => Math.min(min, lead.position ?? 0), 0);
        return [
          {
            id: nextId,
            name: "Без названия",
            inn: "—",
            city: "—",
            contact: "—",
            role: "—",
            phone: "—",
            email: "—",
            route: "Москва → Москва",
            cargo: "Сборный груз",
            weight: "—",
            price: 0,
            priority: "mid",
            hot: false,
            late: false,
            due: "сегодня",
            created: "только что",
            stageId: targetStage,
            position: top - 1,
            ownerId: ME.id,
            ...draft,
          },
          ...prev,
        ];
      });

    /**
     * Перенос лида на этап с конкретной позицией.
     * index — место среди карточек этапа без самого лида: 0 — в начало, null — в конец.
     */
    const moveLead = (id, stageId, index = null) =>
      setLeads((prev) => {
        const moving = prev.find((lead) => lead.id === id);
        if (!moving) return prev;

        const rest = prev.filter((lead) => lead.id !== id);
        const target = rest
          .filter((lead) => lead.stageId === stageId)
          .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

        const at = index == null ? target.length : Math.max(0, Math.min(index, target.length));
        const order = [...target.slice(0, at).map((lead) => lead.id), id, ...target.slice(at).map((lead) => lead.id)];
        const positions = new Map(order.map((leadId, position) => [leadId, position]));

        if (moving.stageId !== stageId) {
          rest
            .filter((lead) => lead.stageId === moving.stageId)
            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
            .forEach((lead, position) => positions.set(lead.id, position));
        }

        return prev.map((lead) => {
          if (lead.id === id) return { ...lead, stageId, position: positions.get(id) ?? 0 };
          const position = positions.get(lead.id);
          return position == null ? lead : { ...lead, position };
        });
      });

    const removeLeads = (ids) =>
      setLeads((prev) => {
        const rest = prev.filter((lead) => !ids.includes(lead.id));
        const byStage = new Map();
        rest.forEach((lead) => {
          if (!byStage.has(lead.stageId)) byStage.set(lead.stageId, []);
          byStage.get(lead.stageId).push(lead);
        });
        const positions = new Map();
        byStage.forEach((list) =>
          list
            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
            .forEach((lead, index) => positions.set(lead.id, index)),
        );
        return rest.map((lead) => ({ ...lead, position: positions.get(lead.id) ?? lead.position }));
      });

    const addStage = () =>
      setStages((prev) => {
        const id = nextStageId(prev);
        return [
          ...prev,
          {
            id,
            name: "Новый этап",
            color: STAGE_COLORS[prev.length % STAGE_COLORS.length],
            hint: "Опишите этап",
          },
        ];
      });

    const updateStage = (id, patch) =>
      setStages((prev) => prev.map((stage) => (stage.id === id ? { ...stage, ...patch } : stage)));

    const moveStage = (id, direction) =>
      setStages((prev) => {
        const index = prev.findIndex((stage) => stage.id === id);
        const target = index + direction;
        if (index < 0 || target < 0 || target >= prev.length) return prev;
        const next = [...prev];
        [next[index], next[target]] = [next[target], next[index]];
        return next;
      });

    /** Удаляем этап: его лиды переезжают на соседний, последний удалить нельзя. */
    const removeStage = (id) => {
      if (stages.length <= 1) return;
      const index = stages.findIndex((stage) => stage.id === id);
      const fallback = stages[index - 1] ?? stages[index + 1];
      setLeads((prev) => prev.map((lead) => (lead.stageId === id ? { ...lead, stageId: fallback.id } : lead)));
      setStages((prev) => prev.filter((stage) => stage.id !== id));
    };

    const resetAll = () => {
      setStages(DEFAULT_STAGES);
      setLeads(DEFAULT_LEADS);
    };

    return {
      leads,
      stages,
      addLead,
      moveLead,
      removeLeads,
      addStage,
      updateStage,
      moveStage,
      removeStage,
      resetAll,
    };
  }, [leads, stages]);

  return <LeadsContext.Provider value={value}>{children}</LeadsContext.Provider>;
}

export function useLeads() {
  const context = useContext(LeadsContext);
  if (!context) throw new Error("useLeads нужно вызывать внутри LeadsProvider");
  return context;
}
