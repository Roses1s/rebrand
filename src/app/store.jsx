import { createContext, useContext, useMemo, useState } from "react";

import { ME, STAGES } from "../mock/data";

const LeadsContext = createContext(null);

const initialLeads = STAGES.flatMap((stage) => stage.leads.map((lead) => ({ ...lead })));

/**
 * Макетное хранилище лидов: живёт в памяти вкладки.
 * Нужно, чтобы «Новый лид», смена этапа и массовые действия работали без бэкенда.
 */
export function LeadsProvider({ children }) {
  const [leads, setLeads] = useState(initialLeads);

  const value = useMemo(() => {
    const addLead = (draft) =>
      setLeads((prev) => {
        const nextId = prev.reduce((max, lead) => Math.max(max, lead.id), 0) + 1;
        return [
          {
            id: nextId,
            name: "Без названия",
            inn: "—",
            city: "—",
            contact: "—",
            role: "—",
            phone: "—",
            route: "Москва → Москва",
            cargo: "Сборный груз",
            weight: "—",
            price: 0,
            priority: "mid",
            hot: false,
            late: false,
            due: "сегодня",
            stageId: 1,
            ownerId: ME.id,
            ...draft,
          },
          ...prev,
        ];
      });

    const moveLead = (id, stageId) =>
      setLeads((prev) => prev.map((lead) => (lead.id === id ? { ...lead, stageId } : lead)));

    const removeLeads = (ids) => setLeads((prev) => prev.filter((lead) => !ids.includes(lead.id)));

    return { leads, addLead, moveLead, removeLeads };
  }, [leads]);

  return <LeadsContext.Provider value={value}>{children}</LeadsContext.Provider>;
}

export function useLeads() {
  const context = useContext(LeadsContext);
  if (!context) throw new Error("useLeads нужно вызывать внутри LeadsProvider");
  return context;
}

export const STAGE_META = STAGES.map(({ id, name, color, hint }) => ({ id, name, color, hint }));
