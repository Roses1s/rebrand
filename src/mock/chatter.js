/**
 * Демо-лента карточки лида. Повторяет форму записи рабочей CRM
 * (`TimelineEntry`): type, body, fieldLabel/oldValue/newValue, attachments,
 * createdAt, автор. При переносе источника не будет — останется только
 * разметка и стили.
 */
import { ME, STAGES, TEAM } from "./data";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Метка времени «столько-то назад» от текущего момента. */
function ago({ days = 0, hours = 0, minutes = 0 }) {
  return new Date(Date.now() - days * DAY - hours * HOUR - minutes * MINUTE).toISOString();
}

const USERS = Object.fromEntries(TEAM.map((user) => [user.id, user]));

function author(id) {
  if (id === null) return { id: null, name: "Система", initials: "—" };
  if (id === ME.id) return ME;
  return USERS[id] ?? TEAM[0];
}

let nextId = 1;

function entry({ type = "note", body = "", who = ME.id, at, fieldLabel = null, oldValue = null, newValue = null, attachments = [] }) {
  const person = author(who);
  return {
    id: nextId++,
    type,
    body,
    fieldLabel,
    oldValue,
    newValue,
    attachments,
    createdAt: at,
    authorId: person.id,
    authorName: person.name,
    authorInitials: person.initials,
  };
}

const STAGE_NAME = (id) => STAGES.find((stage) => stage.id === id)?.name ?? "Без этапа";

/**
 * Лента конкретного лида: создание, переводы по этапам, заметки,
 * созданная заявка и вложение. Набор собирается из данных лида, поэтому
 * выглядит правдоподобно на любой карточке.
 */
export function leadChatter(lead) {
  if (!lead) return [];
  const stageName = STAGE_NAME(lead.stageId);
  const contact = lead.contact ?? "контакт";
  const route = lead.route ?? "маршрут";

  return [
    entry({
      type: "history",
      body: "Лид создан из формы на сайте",
      who: null,
      at: ago({ days: 12, hours: 3 }),
    }),
    entry({
      type: "history",
      fieldLabel: "Этап",
      oldValue: STAGE_NAME(1),
      newValue: STAGE_NAME(2),
      who: 2,
      at: ago({ days: 10, hours: 1 }),
    }),
    entry({
      body: `Дозвонилась: ${contact}. Запрос актуальный, работают с нами впервые. Просят ставку по маршруту ${route}.`,
      who: 2,
      at: ago({ days: 9, hours: 5 }),
    }),
    entry({
      type: "history",
      body: `Создана заявка ЗВ-2026-0148 · ${route}`,
      who: 3,
      at: ago({ days: 6, hours: 2 }),
    }),
    entry({
      body: "Скинул проект договора и карточку компании. Ждём подтверждение реквизитов от бухгалтерии клиента.",
      attachments: [{ id: 1, name: "Договор-2026-148.pdf", size: 1_258_291 }],
      at: ago({ days: 4, hours: 6 }),
    }),
    entry({
      type: "history",
      fieldLabel: "Этап",
      oldValue: STAGE_NAME(2),
      newValue: stageName,
      at: ago({ days: 2, hours: 2 }),
    }),
    entry({
      body: `Созвонились: ${contact}. Готовы работать, ждут наш ответ по срокам погрузки.`,
      at: ago({ hours: 4 }),
    }),
    entry({
      body: "Клиент просил пересчитать ставку: рассматривает ещё одного перевозчика. Держу на контроле до пятницы.",
      who: 2,
      at: ago({ minutes: 38 }),
    }),
  ];
}

/**
 * Лента заявки: создание из лида, смены статуса, заметка логиста и
 * вложение — как таймлайн заявки в рабочей CRM.
 */
export function shipmentChatter(shipment) {
  if (!shipment) return [];
  const steps = ["Новая", "Проверена и подписана заявка", "Машина загрузилась", "Машина выгрузилась"];
  const index = Math.max(0, ["new", "checked", "loaded", "unloaded"].indexOf(shipment.status));
  const list = [
    entry({
      type: "history",
      body: `Заявка ${shipment.number} создана из карточки лида «${shipment.client}»`,
      who: shipment.ownerId,
      at: ago({ days: 5, hours: 4 }),
    }),
  ];
  for (let step = 1; step <= index; step += 1) {
    list.push(
      entry({
        type: "history",
        fieldLabel: "Статус",
        oldValue: steps[step - 1],
        newValue: steps[step],
        who: shipment.ownerId,
        at: ago({ days: 5 - step, hours: 2 }),
      }),
    );
  }
  list.push(
    entry({
      body: shipment.carrierName
        ? `Перевозчик ${shipment.carrierName} подтвердил машину. Скан заявки подписан с двух сторон.`
        : "Ищем перевозчика: две ставки на рассмотрении, решим до вечера.",
      attachments: shipment.carrierName ? [{ id: 1, name: `Заявка-${shipment.number}.pdf`, size: 482_133 }] : [],
      who: shipment.ownerId,
      at: ago({ hours: 6 }),
    }),
  );
  return list;
}
