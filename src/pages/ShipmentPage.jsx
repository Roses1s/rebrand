/**
 * Карточка заявки — полная форма по образцу рабочей CRM (`ShipmentFormPage`):
 * шапка с номером, статусы, блоки «Заявка», «Погрузка», «Выгрузка»,
 * «Перевозчик», «Груз», вкладки «Позиции заказа» и «Прочая информация»,
 * лента справа. Правки копятся в черновике и сохраняются сами через
 * 3 секунды, по Enter или кнопкой; статус меняется сразу.
 * «Копировать» создаёт новую заявку, «Удалить» — только администратор.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, ChevronDown, Copy, FileText, Trash2, Truck } from "lucide-react";

import { Shell } from "../app/Shell";
import { useLeads } from "../app/store";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { Avatar, Status } from "../ui/Tag";
import { StageBar } from "../ui/StageBar";
import { Chatter } from "../ui/Chatter";
import { TokenField } from "../ui/TokenField";
import { shipmentChatter } from "../mock/chatter";
import { ME, OWNER, SHIPMENT_STATUS } from "../mock/data";
import { money } from "../lib/format";
import { shipmentMargin } from "../lib/margin";
import {
  OWN_COMPANY,
  SERVICE_NAME,
  SHIPMENT_STEPS,
  TAX_OPTIONS,
  TRANSPORT_OPTIONS,
  formatShipmentDate,
  netAmount,
} from "../lib/shipment";

/** Всё, что редактируется формой; статус меняется отдельно и сразу. */
function draftOf(shipment) {
  if (!shipment) return {};
  const { id: _id, status: _status, route: _route, ...rest } = shipment;
  return rest;
}

const signedMoney = (value) => (value == null ? "—" : `${value >= 0 ? "+" : "−"} ${money(Math.abs(value))}`);
const innLooksWrong = (value) => Boolean(value) && !/^(\d{10}|\d{12})$/.test(value);

/** Строка поля: подпись слева, значение справа — те же классы, что в карточке лида. */
function Row({ label, htmlFor, top = false, children }) {
  return (
    <div className={`lead-field${top ? " lead-field--top" : ""}`}>
      <label className="lead-field__label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Group({ title, children, extra }) {
  return (
    <div className="card ship-group">
      <div className="card__head">
        <div className="card__title">{title}</div>
        {extra}
      </div>
      <div className="card__body lead-form">{children}</div>
    </div>
  );
}

export function DeleteShipmentDialog({ number, onCancel, onConfirm }) {
  return (
    <Modal
      open
      title="Удалить заявку безвозвратно?"
      onClose={onCancel}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            Отмена
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            Удалить навсегда
          </Button>
        </>
      }
    >
      <p className="modal-copy">
        Заявка №{number}, её история и документы будут удалены навсегда. Связанный лид и остальные его заявки
        останутся. Если в форме есть несохранённые правки, они тоже будут потеряны.
      </p>
      <p className="modal-copy muted">В системном журнале останется запись о факте удаления.</p>
    </Modal>
  );
}

export function ShipmentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { shipments, leads, updateShipment, copyShipment, deleteShipment } = useLeads();
  const shipment = shipments.find((item) => item.id === Number(id));
  const lead = leads.find((item) => item.id === shipment?.leadId);

  const [draft, setDraft] = useState(() => draftOf(shipment));
  const [saved, setSaved] = useState(() => draftOf(shipment));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("lines");
  const [moreCarrier, setMoreCarrier] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  // Демо-лента собирается один раз на заявку, а не от каждой правки.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const chatter = useMemo(() => shipmentChatter(shipment), [shipment?.id]);

  useEffect(() => {
    const next = draftOf(shipment);
    setDraft(next);
    setSaved(next);
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shipment?.id]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const persist = (next = draft) => {
    if (!String(next.number ?? "").trim()) {
      setError("Номер заявки не может быть пустым");
      return;
    }
    setError("");
    updateShipment(shipment.id, { ...next, number: next.number.trim() });
    setSaved(next);
    setSaving(true);
    window.setTimeout(() => setSaving(false), 350);
  };

  const discard = () => {
    setDraft(saved);
    setError("");
  };

  // Автосохранение через 3 секунды после последней правки; пока открыт
  // диалог удаления — не сохраняем то, что подтверждение обещает отбросить.
  useEffect(() => {
    if (!shipment || !dirty || deleteOpen) return undefined;
    const timer = window.setTimeout(() => persist(draft), 3000);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, dirty, deleteOpen, shipment?.id]);

  // Уход со страницы с правками — дописываем их, как в карточке лида.
  const latest = useRef(null);
  latest.current = { id: shipment?.id, dirty, draft, update: updateShipment, deleted: false };
  useEffect(
    () => () => {
      const state = latest.current;
      if (state?.dirty && !state.deleted && String(state.draft.number ?? "").trim()) state.update(state.id, state.draft);
    },
    [],
  );

  if (!shipment) {
    return (
      <Shell title="Карточка заявки">
        <div className="card" style={{ padding: 40, textAlign: "center" }}>
          <h2 style={{ marginBottom: 8 }}>Заявка не найдена</h2>
          <Link to="/shipments" className="btn">
            К списку заявок
          </Link>
        </div>
      </Shell>
    );
  }

  const owner = OWNER(shipment.ownerId);
  const margin = shipmentMargin({ customerPrice: draft.customerPrice, carrierPrice: draft.carrierPrice });
  const customerNet = netAmount(draft.customerPrice, draft.customerTax);
  const carrierNet = netAmount(draft.carrierPrice, draft.carrierTax);

  const set = (key) => (event) => setDraft((prev) => ({ ...prev, [key]: event.target.value }));
  const setValue = (key) => (value) => setDraft((prev) => ({ ...prev, [key]: value }));
  const setPrice = (key) => (event) => {
    const raw = event.target.value.trim();
    setDraft((prev) => ({ ...prev, [key]: raw === "" ? null : Number(raw) }));
  };

  /**
   * Enter — сохранить, Esc — вернуть сохранённое. Только в однострочных полях:
   * в комментарии Enter — перенос строки, на кнопках и галочках — их действие.
   */
  function onFieldKeyDown(event) {
    const { tagName, type } = event.target;
    if (tagName !== "INPUT" || type === "checkbox") return;
    if (event.key === "Enter") {
      event.preventDefault();
      if (dirty) persist(draft);
      event.target.blur?.();
    } else if (event.key === "Escape") {
      event.preventDefault();
      discard();
      event.target.blur?.();
    }
  }

  function copy() {
    if (dirty) persist(draft);
    const created = copyShipment(shipment.id, dirty ? draft : null);
    if (created) navigate(`/shipments/${created.id}`);
  }

  function removeForever() {
    latest.current.deleted = true;
    setDeleteOpen(false);
    deleteShipment(shipment.id);
    navigate("/shipments");
  }

  const input = (key, props = {}) => (
    <input id={`ship-${key}`} className="lead-input" value={draft[key] ?? ""} onChange={set(key)} autoComplete="off" {...props} />
  );

  return (
    <Shell title="Карточка заявки" crumb={`Заявки · ${draft.number || shipment.number}`}>
      <div className="lead-page">
        <Link to="/shipments" className="back-link">
          <ArrowLeft size={14} strokeWidth={2} />
          К списку заявок
        </Link>

        <div className="lead-head">
          <span className="lead-head__logo">
            <Truck size={24} strokeWidth={1.8} />
          </span>

          <div className="grow">
            <h1 className="lead-head__title">
              <input
                className="lead-title-input"
                value={draft.number ?? ""}
                onChange={set("number")}
                onKeyDown={onFieldKeyDown}
                aria-label="Номер заявки"
                placeholder="Номер заявки"
                autoComplete="off"
              />
            </h1>
            <div className="lead-head__meta">
              <Status tone={SHIPMENT_STATUS[shipment.status].tone}>{SHIPMENT_STATUS[shipment.status].label}</Status>
              <span>{shipment.client}</span>
              <span>·</span>
              <span className="mono">{formatShipmentDate(draft.createdAt)}</span>
              <span>·</span>
              <span className={margin == null || margin >= 0 ? "money-plus" : "money-minus"}>Маржа {signedMoney(margin)}</span>
            </div>
          </div>

          <div className="lead-head__actions">
            {saving ? (
              <span className="lead-save__state lead-save__state--saving">Сохранение…</span>
            ) : dirty ? (
              <div className="lead-save">
                <span className="lead-save__state">Изменено</span>
                <Button size="sm" variant="ghost" onClick={discard}>
                  Отменить
                </Button>
                <Button size="sm" variant="primary" icon={Check} onClick={() => persist(draft)}>
                  Сохранить
                </Button>
              </div>
            ) : (
              <span className="lead-save__ok">
                <Check size={13} strokeWidth={2.2} /> Сохранено
              </span>
            )}

            {lead && (
              <Link to={`/crm/leads/${lead.id}`} className="btn btn--sm">
                <FileText size={14} strokeWidth={2} />
                Открыть лид
              </Link>
            )}
            <Button size="sm" icon={Copy} onClick={copy} title="Создать новую заявку на основе этой">
              Копировать
            </Button>
            {ME.isAdmin && (
              <Button size="sm" variant="danger" icon={Trash2} onClick={() => setDeleteOpen(true)} title="Безвозвратно удалить заявку">
                Удалить
              </Button>
            )}
          </div>
        </div>

        <div className="lead-layout">
          <div className="stack">
            <div className="lead-stagebar">
              <StageBar
                stages={SHIPMENT_STEPS}
                label="Этапы заявки"
                currentId={shipment.status}
                onSelect={(status) => updateShipment(shipment.id, { status })}
              />
            </div>

            {error && (
              <div className="record-alert record-alert--danger" role="alert">
                {error}
              </div>
            )}

            <div className="ship-grid" onKeyDown={onFieldKeyDown}>
              <Group title="Заявка">
                <Row label="Компания">
                  <span className="lead-field__value lead-field__text">{OWN_COMPANY}</span>
                </Row>
                <Row label="Дата создания" htmlFor="ship-createdAt">
                  {input("createdAt", { type: "datetime-local" })}
                </Row>
                <Row label="Заказчик">
                  <span className="lead-field__value lead-field__text">
                    {lead ? <Link to={`/crm/leads/${lead.id}`} className="table-link">{shipment.client}</Link> : shipment.client}
                  </span>
                </Row>
                <Row label="ИНН заказчика">
                  <span className="lead-field__value lead-field__text mono">{lead?.inn || "—"}</span>
                </Row>
                <Row label="Контакт заказчика" htmlFor="ship-customerContact">
                  {input("customerContact", { placeholder: "Фамилия Имя, телефон" })}
                </Row>
                <Row label="Продавец">
                  <span className="lead-field__value lead-field__text seller-cell">
                    <Avatar initials={owner.initials} className="avatar--square" />
                    {owner.name}
                  </span>
                </Row>
              </Group>

              <Group title="Погрузка">
                <Row label="Города" top>
                  <TokenField value={draft.loadingCities} onChange={setValue("loadingCities")} placeholder="Город + Enter" label="Города погрузки" />
                </Row>
                <Row label="Адрес" htmlFor="ship-loadingAddress">
                  {input("loadingAddress")}
                </Row>
                <Row label="Контакт и телефон" htmlFor="ship-loadingContact">
                  {input("loadingContact", { placeholder: "Иванов Иван, +7 900 000-00-00" })}
                </Row>
                <Row label="Дата с" htmlFor="ship-loadingDateFrom">
                  {input("loadingDateFrom", { type: "date" })}
                </Row>
                <Row label="Дата по" htmlFor="ship-loadingDateTo">
                  {input("loadingDateTo", { type: "date" })}
                </Row>
                <Row label="Время" htmlFor="ship-loadingTime">
                  {input("loadingTime", { placeholder: "09:00", className: "lead-input lead-input--mono" })}
                </Row>
              </Group>

              <Group title="Выгрузка">
                <Row label="Города" top>
                  <TokenField value={draft.unloadingCities} onChange={setValue("unloadingCities")} placeholder="Город + Enter" label="Города выгрузки" />
                </Row>
                <Row label="Адрес" htmlFor="ship-unloadingAddress">
                  {input("unloadingAddress")}
                </Row>
                <Row label="Контакт и телефон" htmlFor="ship-unloadingContact">
                  {input("unloadingContact", { placeholder: "Иванов Иван, +7 900 000-00-00" })}
                </Row>
                <Row label="Дата с" htmlFor="ship-unloadingDateFrom">
                  {input("unloadingDateFrom", { type: "date" })}
                </Row>
                <Row label="Дата по" htmlFor="ship-unloadingDateTo">
                  {input("unloadingDateTo", { type: "date" })}
                </Row>
                <Row label="Время" htmlFor="ship-unloadingTime">
                  {input("unloadingTime", { placeholder: "09:00", className: "lead-input lead-input--mono" })}
                </Row>
              </Group>

              <Group
                title="Перевозчик"
                extra={
                  <button
                    type="button"
                    className="ship-more"
                    aria-expanded={moreCarrier}
                    onClick={() => setMoreCarrier((value) => !value)}
                  >
                    Водитель и подписант
                    <ChevronDown size={13} strokeWidth={2} className={moreCarrier ? "is-open" : ""} />
                  </button>
                }
              >
                <Row label="Перевозчик" htmlFor="ship-carrierName">
                  {input("carrierName", { placeholder: "Название компании" })}
                </Row>
                <Row label="ИНН" htmlFor="ship-carrierInn">
                  {input("carrierInn", {
                    placeholder: "10 или 12 цифр",
                    inputMode: "numeric",
                    className: `lead-input lead-input--mono${innLooksWrong(draft.carrierInn) ? " lead-input--error" : ""}`,
                    "aria-invalid": innLooksWrong(draft.carrierInn) || undefined,
                  })}
                </Row>
                {innLooksWrong(draft.carrierInn) && <p className="field-error">ИНН должен содержать 10 или 12 цифр.</p>}
                <Row label="Контакт" htmlFor="ship-carrierContact">
                  {input("carrierContact")}
                </Row>
                <Row label="ТС (марка)" htmlFor="ship-vehicle">
                  {input("vehicle")}
                </Row>
                <Row label="Номер ТС" htmlFor="ship-vehicleNumber">
                  {input("vehicleNumber", { className: "lead-input lead-input--mono" })}
                </Row>
                <Row label="Прицеп">
                  <label className="lead-field__value ship-check">
                    <input
                      type="checkbox"
                      checked={Boolean(draft.hasTrailer)}
                      onChange={(event) => setDraft((prev) => ({ ...prev, hasTrailer: event.target.checked }))}
                    />
                    Есть прицеп
                  </label>
                </Row>
                {draft.hasTrailer && (
                  <Row label="Номер прицепа" htmlFor="ship-trailerNumber">
                    {input("trailerNumber", { className: "lead-input lead-input--mono" })}
                  </Row>
                )}
                {moreCarrier && (
                  <>
                    <Row label="ФИО водителя" htmlFor="ship-driverName">
                      {input("driverName")}
                    </Row>
                    <Row label="Телефон водителя" htmlFor="ship-driverPhone">
                      {input("driverPhone", { placeholder: "+7 900 000-00-00", className: "lead-input lead-input--mono" })}
                    </Row>
                    <Row label="Паспорт водителя" htmlFor="ship-driverPassport">
                      {input("driverPassport", { className: "lead-input lead-input--mono" })}
                    </Row>
                    <Row label="Кто подписывает" htmlFor="ship-carrierSigner">
                      {input("carrierSigner")}
                    </Row>
                  </>
                )}
              </Group>

              <Group title="Груз">
                <Row label="Тип груза" htmlFor="ship-cargoType">
                  {input("cargoType")}
                </Row>
                <Row label="Упаковка" htmlFor="ship-cargoPackaging">
                  {input("cargoPackaging")}
                </Row>
                <Row label="Объём кузова, м³" htmlFor="ship-cargoVolume">
                  {input("cargoVolume", { inputMode: "decimal", className: "lead-input lead-input--mono" })}
                </Row>
                <Row label="Вес груза, т" htmlFor="ship-cargoWeight">
                  {input("cargoWeight", { inputMode: "decimal", className: "lead-input lead-input--mono" })}
                </Row>
                <Row label="Грузоподъёмность, т" htmlFor="ship-capacity">
                  {input("capacity", { inputMode: "decimal", className: "lead-input lead-input--mono" })}
                </Row>
                <Row label="Тип кузова" top>
                  <TokenField value={draft.bodyType} onChange={setValue("bodyType")} placeholder="Например: изотерм + Enter" label="Тип кузова" />
                </Row>
                <Row label="Способ погрузки" top>
                  <TokenField value={draft.loadingMethod} onChange={setValue("loadingMethod")} placeholder="Например: задняя + Enter" label="Способ погрузки" />
                </Row>
                <Row label="Тип транспорта" htmlFor="ship-transportType">
                  <select id="ship-transportType" className="lead-input lead-input--select" value={draft.transportType} onChange={set("transportType")}>
                    {TRANSPORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Row>
              </Group>
            </div>

            <div className="card">
              <div className="tabbar" role="tablist">
                <button type="button" role="tab" aria-selected={tab === "lines"} onClick={() => setTab("lines")}>
                  Позиции заказа
                </button>
                <button type="button" role="tab" aria-selected={tab === "info"} onClick={() => setTab("info")}>
                  Прочая информация
                </button>
              </div>

              <div className="card__body" onKeyDown={onFieldKeyDown}>
                {tab === "lines" ? (
                  <>
                    <div className="table-scroll">
                      <table className="table order-lines">
                        <thead>
                          <tr>
                            <th rowSpan={2}>Продукт</th>
                            <th colSpan={3} className="order-lines__group">
                              Заказчик
                            </th>
                            <th colSpan={3} className="order-lines__group">
                              Перевозчик
                            </th>
                          </tr>
                          <tr>
                            <th className="order-lines__split">Цена</th>
                            <th>Налог</th>
                            <th>Налог исключён.</th>
                            <th className="order-lines__split">Цена</th>
                            <th>Налог</th>
                            <th>Налог исключён.</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>{SERVICE_NAME}</td>
                            <td className="order-lines__split">
                              <input
                                className="lead-input lead-input--mono"
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0,00"
                                aria-label="Цена для заказчика"
                                value={draft.customerPrice ?? ""}
                                onChange={setPrice("customerPrice")}
                              />
                            </td>
                            <td>
                              <select className="lead-input lead-input--select" aria-label="Налог заказчика" value={draft.customerTax} onChange={set("customerTax")}>
                                {TAX_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="cell-money muted">{customerNet == null ? "" : money(customerNet)}</td>
                            <td className="order-lines__split">
                              <input
                                className="lead-input lead-input--mono"
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0,00"
                                aria-label="Цена для перевозчика"
                                value={draft.carrierPrice ?? ""}
                                onChange={setPrice("carrierPrice")}
                              />
                            </td>
                            <td>
                              <select className="lead-input lead-input--select" aria-label="Налог перевозчика" value={draft.carrierTax} onChange={set("carrierTax")}>
                                {TAX_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="cell-money muted">{carrierNet == null ? "" : money(carrierNet)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="order-lines__total">
                      <span>Маржа</span>
                      <b className={margin == null || margin >= 0 ? "money-plus" : "money-minus"}>{signedMoney(margin)}</b>
                    </div>
                    <p className="order-lines__note">
                      В макете маржа — цена заказчика минус цена перевозчика. В рабочей CRM её считает сервер: без НДС и
                      с вычетом доли расходов.
                    </p>
                  </>
                ) : (
                  <textarea
                    className="lead-input ship-comment"
                    rows={4}
                    placeholder="Дополнительные условия, комментарии…"
                    aria-label="Прочая информация"
                    value={draft.comment ?? ""}
                    onChange={set("comment")}
                  />
                )}
              </div>
            </div>
          </div>

          <Chatter key={shipment.id} entries={chatter} authorInitials={ME.initials} currentUserId={ME.id} />
        </div>
      </div>

      {deleteOpen && (
        <DeleteShipmentDialog number={shipment.number} onCancel={() => setDeleteOpen(false)} onConfirm={removeForever} />
      )}
    </Shell>
  );
}
