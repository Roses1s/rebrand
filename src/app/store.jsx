import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { ME, PRIORITY_MAX, SHIPMENTS, STAGES, TAGS } from "../mock/data";
import { copyOf, normalizeShipment, nowLocal, routeOf } from "../lib/shipment";

const LeadsContext = createContext(null);

const STAGES_KEY = `crm.stages.${ME.id}.v1`;
const LEADS_KEY = `crm.leads.${ME.id}.v1`;
const SHIPMENTS_KEY = `crm.shipments.${ME.id}.v1`;
// Теги общие для компании, поэтому ключ без номера менеджера.
const TAGS_KEY = "crm.tags.v1";

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
const DEFAULT_SHIPMENTS = SHIPMENTS.map(normalizeShipment);
const DEFAULT_TAGS = TAGS.map((tag) => ({ ...tag }));

/** Старые сохранения хранили приоритет словом — переводим в звёзды 0–3. */
const LEGACY_PRIORITY = { high: 3, mid: 2, low: 1 };

export function toPriority(value) {
  if (typeof value === "string" && value in LEGACY_PRIORITY) return LEGACY_PRIORITY[value];
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 && number <= PRIORITY_MAX ? number : 0;
}

/** Приводит лид из любого сохранения к текущей форме, ничего не теряя. */
function normalizeLead(lead) {
  return {
    ...lead,
    priority: toPriority(lead.priority),
    tagIds: Array.isArray(lead.tagIds) ? lead.tagIds : [],
    lost: Boolean(lead.lost),
    lossReason: lead.lossReason ?? "",
  };
}

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
  const leads = load(LEADS_KEY, DEFAULT_LEADS).map((stored) => {
    const lead = normalizeLead(stored);
    return known.has(lead.stageId) ? lead : { ...lead, stageId: stages[0].id };
  });

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

  // Старые сохранения заявок (вложенные погрузка/перевозчик/груз) переводятся в плоскую форму.
  const shipments = load(SHIPMENTS_KEY, DEFAULT_SHIPMENTS).map(normalizeShipment);
  const tags = load(TAGS_KEY, DEFAULT_TAGS);
  return { stages, leads, shipments, tags };
}

function nextStageId(stages) {
  return stages.reduce((max, stage) => Math.max(max, stage.id), 0) + 1;
}

function nextShipmentId(shipments) {
  return shipments.reduce((max, shipment) => Math.max(max, shipment.id), 0) + 1;
}

function shipmentNumber(id) {
  return `ЗВ-2026-${String(id).padStart(4, "0")}`;
}

/**
 * Макетное хранилище: этапы воронки, лиды, заявки и теги.
 * Этапы, лиды и заявки живут в localStorage под ключом пользователя, поэтому
 * у каждого своя доска, порядок карточек и настройка этапов; теги общие.
 * Бэкенда нет — всё восстанавливается из этих же ключей после перезагрузки.
 */
export function LeadsProvider({ children }) {
  const [initial] = useState(loadState);
  const [stages, setStages] = useState(initial.stages);
  const [leads, setLeads] = useState(initial.leads);
  const [shipments, setShipments] = useState(initial.shipments);
  const [tags, setTags] = useState(initial.tags);
  // Окно создания общее: «+» в колонке передаёт сюда её этап,
  // чтобы новый лид прошёл ту же обязательную форму, что и кнопка в шапке.
  const [leadDialog, setLeadDialog] = useState(null);

  useEffect(() => {
    save(STAGES_KEY, stages);
  }, [stages]);

  useEffect(() => {
    save(LEADS_KEY, leads);
  }, [leads]);

  useEffect(() => {
    save(SHIPMENTS_KEY, shipments);
  }, [shipments]);

  useEffect(() => {
    save(TAGS_KEY, tags);
  }, [tags]);

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
            priority: 0,
            hot: false,
            late: false,
            lost: false,
            lossReason: "",
            tagIds: [],
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

    // ownerId — чья доска: администратор может завести лид прямо на доске сотрудника.
    const openLeadDialog = (stageId = null, ownerId = ME.id) =>
      setLeadDialog({ stageId: stageId ?? stages[0]?.id ?? null, ownerId });
    const closeLeadDialog = () => setLeadDialog(null);

    /**
     * Быстрая заявка из карточки лида: клиент и ответственный берутся из лида,
     * статус «Новая». Цены, адреса и груз дозаполняются в карточке заявки.
     */
    const addShipment = ({ lead, loadingCity, unloadingCity, loadingDate, unloadingDate, carrierName, carrierInn, carrierContact }) => {
      const id = nextShipmentId(shipments);
      const shipment = normalizeShipment({
        id,
        number: shipmentNumber(id),
        leadId: lead.id,
        client: lead.name,
        ownerId: lead.ownerId,
        status: "new",
        createdAt: nowLocal(),
        customerContact: lead.contact && lead.contact !== "—" ? lead.contact : "",
        loadingCities: loadingCity ? [loadingCity] : [],
        loadingDateFrom: loadingDate ?? "",
        unloadingCities: unloadingCity ? [unloadingCity] : [],
        unloadingDateFrom: unloadingDate ?? "",
        carrierName: carrierName ?? "",
        carrierInn: carrierInn ?? "",
        carrierContact: carrierContact ?? "",
      });
      setShipments((prev) => [...prev, shipment]);
      return shipment;
    };

    /**
     * Копия заявки: новая запись с новым номером, статус «Новая», дата — сейчас.
     * `pending` — несохранённые правки формы: копия делается с того, что видит
     * пользователь, а не с последней сохранённой версии.
     */
    const copyShipment = (sourceId, pending = null) => {
      const source = shipments.find((item) => item.id === sourceId);
      if (!source) return null;
      const id = nextShipmentId(shipments);
      const shipment = normalizeShipment({ ...copyOf({ ...source, ...pending }), id, number: shipmentNumber(id) });
      setShipments((prev) => [...prev, shipment]);
      return shipment;
    };

    /** Удаление заявки без возврата (в рабочей CRM — только администратор). */
    const deleteShipment = (id) => setShipments((prev) => prev.filter((shipment) => shipment.id !== id));

    // Маршрут — производное от городов, поэтому пересобирается при каждой правке.
    const updateShipment = (id, patch) =>
      setShipments((prev) =>
        prev.map((shipment) => {
          if (shipment.id !== id) return shipment;
          const next = { ...shipment, ...patch };
          return { ...next, route: routeOf(next) };
        }),
      );

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

    /** Правка полей лида: название, ИНН, контакты, приоритет, ЭДО, бухгалтер, теги. */
    const updateLead = (id, patch) =>
      setLeads((prev) => prev.map((lead) => (lead.id === id ? { ...lead, ...patch } : lead)));

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

    /** Новый этап создаётся из настроек или прямо в конце канбана. */
    const addStage = (name = "Новый этап") =>
      setStages((prev) => {
        const stageName = typeof name === "string" ? name.trim() : "";
        const id = nextStageId(prev);
        return [
          ...prev,
          {
            id,
            name: stageName || "Новый этап",
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

    /** Первая позиция этапа: лид, вернувшийся на доску, встаёт наверх. */
    const topOf = (list, stageId) =>
      list.filter((lead) => lead.stageId === stageId).reduce((min, lead) => Math.min(min, lead.position ?? 0), 0) - 1;

    /** Проигрыш: лид уходит с доски, причина обязательна и видна в карточке. */
    const loseLead = (id, reason) => updateLead(id, { lost: true, lossReason: reason });

    /**
     * Возврат из проигрыша. Владелец «Восстанавливает» лид у себя, коллега
     * «Берёт себе» — тогда лид переходит к нему, как в рабочей CRM.
     */
    const restoreLead = (id, { takeOver = false } = {}) =>
      setLeads((prev) =>
        prev.map((lead) => {
          if (lead.id !== id) return lead;
          const owner = takeOver ? ME.id : lead.ownerId;
          const others = prev.filter((item) => item.ownerId === owner && !item.lost);
          return { ...lead, lost: false, lossReason: "", ownerId: owner, position: topOf(others, lead.stageId) };
        }),
      );

    /** Передача коллеге: вместе с лидом уходят заявки; проигранный лид возвращается на доску. */
    const transferLead = (id, ownerId) => {
      const firstStage = stages[0]?.id ?? 1;
      setLeads((prev) =>
        prev.map((lead) =>
          lead.id === id
            ? {
                ...lead,
                ownerId,
                lost: false,
                lossReason: "",
                stageId: firstStage,
                position: topOf(prev.filter((item) => item.ownerId === ownerId), firstStage),
              }
            : lead,
        ),
      );
      setShipments((prev) => prev.map((shipment) => (shipment.leadId === id ? { ...shipment, ownerId } : shipment)));
    };

    /** Удаление без возврата: вместе с лидом стираются его заявки. */
    const deleteLead = (id) => {
      removeLeads([id]);
      setShipments((prev) => prev.filter((shipment) => shipment.leadId !== id));
    };

    /** Новый общий тег; совпадающее имя не дублируем, а возвращаем существующий. */
    const addTag = (name, color) => {
      const clean = name.trim();
      const existing = tags.find((tag) => tag.name.toLowerCase() === clean.toLowerCase());
      if (existing) return existing;
      const tag = { id: tags.reduce((max, item) => Math.max(max, item.id), 0) + 1, name: clean, color };
      setTags((prev) => [...prev, tag]);
      return tag;
    };

    /** Удаление тега (только администратор) снимает его со всех карточек. */
    const removeTag = (id) => {
      setTags((prev) => prev.filter((tag) => tag.id !== id));
      setLeads((prev) =>
        prev.map((lead) => (lead.tagIds?.includes(id) ? { ...lead, tagIds: lead.tagIds.filter((tagId) => tagId !== id) } : lead)),
      );
    };

    const resetAll = () => {
      setStages(DEFAULT_STAGES);
      setLeads(DEFAULT_LEADS);
      setTags(DEFAULT_TAGS);
      // Заявки связаны с лидами по leadId: без них вернувшиеся лиды остались
      // бы без своих демо-заявок, а новые демо-заявки не появились бы вовсе.
      setShipments(DEFAULT_SHIPMENTS);
    };

    return {
      leads,
      stages,
      shipments,
      tags,
      leadDialog,
      addLead,
      addShipment,
      copyShipment,
      deleteShipment,
      updateShipment,
      openLeadDialog,
      closeLeadDialog,
      updateLead,
      loseLead,
      restoreLead,
      transferLead,
      deleteLead,
      addTag,
      removeTag,
      moveLead,
      removeLeads,
      addStage,
      updateStage,
      moveStage,
      removeStage,
      resetAll,
    };
  }, [leads, stages, shipments, tags, leadDialog]);

  return <LeadsContext.Provider value={value}>{children}</LeadsContext.Provider>;
}

export function useLeads() {
  const context = useContext(LeadsContext);
  if (!context) throw new Error("useLeads нужно вызывать внутри LeadsProvider");
  return context;
}
