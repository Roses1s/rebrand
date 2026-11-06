import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Copy,
  Mail,
  MapPin,
  MoreHorizontal,
  Package,
  Phone,
  Trash2,
  Truck,
  User,
} from "lucide-react";

import { Shell } from "../app/Shell";
import { Button, IconButton } from "../ui/Button";
import { Avatar, Status } from "../ui/Tag";
import { OWNER, SHIPMENTS, SHIPMENT_STATUS } from "../mock/data";
import { money } from "../lib/format";

const STEPS = [
  { key: "new", label: "Новая" },
  { key: "checked", label: "Проверена" },
  { key: "loaded", label: "Загружена" },
  { key: "unloaded", label: "Выгружена" },
];

const TONE = { new: "new", checked: "progress", loaded: "done", unloaded: "done" };

export function ShipmentPage() {
  const { id } = useParams();
  const shipment = SHIPMENTS.find((item) => item.id === Number(id));
  const [status, setStatus] = useState(shipment?.status ?? "new");

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
  const margin = shipment.customerPrice - shipment.carrierPrice;

  return (
    <Shell title="Карточка заявки" crumb={`Заявки · ${shipment.number}`}>
      <Link to="/shipments" className="back-link">
        <ArrowLeft size={14} strokeWidth={2} />
        К списку заявок
      </Link>

      <div className="lead-head">
        <span className="lead-head__logo">
          <Truck size={24} strokeWidth={1.8} />
        </span>

        <div className="grow">
          <h1 className="lead-head__name">{shipment.number}</h1>
          <div className="lead-head__meta">
            <Status tone={TONE[status]}>{SHIPMENT_STATUS[status].label}</Status>
            <Link to={`/crm/leads/${shipment.leadId}`} style={{ color: "var(--accent)" }}>
              {shipment.client}
            </Link>
            <span>·</span>
            <span>{shipment.created}</span>
          </div>
        </div>

        <div className="lead-head__actions">
          <Button icon={Copy}>Копировать</Button>
          <IconButton icon={MoreHorizontal} label="Ещё" />
          <IconButton icon={Trash2} label="Удалить" />
        </div>
      </div>

      <div className="stage-strip" style={{ marginBottom: 16 }}>
        {STEPS.map((step) => (
          <button key={step.key} type="button" aria-pressed={status === step.key} onClick={() => setStatus(step.key)}>
            {step.label}
          </button>
        ))}
      </div>

      <div className="grid grid--2-1">
        <div className="stack">
          {[
            { title: "Погрузка", data: shipment.loading, icon: Package },
            { title: "Выгрузка", data: shipment.unloading, icon: MapPin },
          ].map(({ title, data, icon: Icon }) => (
            <div key={title} className="card">
              <div className="card__head">
                <div className="row">
                  <span className="tile tile--slate">
                    <Icon size={16} strokeWidth={1.9} />
                  </span>
                  <div>
                    <div className="card__title">{title}</div>
                    <div className="card__sub">{data.city}</div>
                  </div>
                </div>
              </div>
              <div className="card__body" style={{ paddingTop: 8 }}>
                <div className="field-row">
                  <span className="field-row__label">Адрес</span>
                  <span className="field-row__value">{data.address}</span>
                </div>
                <div className="field-row">
                  <span className="field-row__label">Дата</span>
                  <span className="field-row__value">
                    {data.date} · {data.time}
                  </span>
                </div>
                <div className="field-row">
                  <span className="field-row__label">Контакт</span>
                  <span className="field-row__value">{data.contact}</span>
                </div>
                <div className="field-row">
                  <span className="field-row__label">Телефон</span>
                  <span className="field-row__value mono">{data.phone}</span>
                </div>
              </div>
            </div>
          ))}

          <div className="card">
            <div className="card__head">
              <div>
                <div className="card__title">Перевозчик и машина</div>
                <div className="card__sub">{shipment.carrier.name}</div>
              </div>
            </div>
            <div className="card__body" style={{ paddingTop: 8 }}>
              <div className="field-row">
                <span className="field-row__label">ИНН</span>
                <span className="field-row__value mono">{shipment.carrier.inn || "—"}</span>
              </div>
              <div className="field-row">
                <span className="field-row__label">Контакт</span>
                <span className="field-row__value">{shipment.carrier.contact || "—"}</span>
              </div>
              <div className="field-row">
                <span className="field-row__label">Машина</span>
                <span className="field-row__value">
                  {shipment.carrier.vehicle} · {shipment.carrier.plate || "номер не указан"}
                </span>
              </div>
              <div className="field-row">
                <span className="field-row__label">Прицеп</span>
                <span className="field-row__value">{shipment.carrier.trailer || "—"}</span>
              </div>
              <div className="field-row">
                <span className="field-row__label">Водитель</span>
                <span className="field-row__value">{shipment.carrier.driver || "—"}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card__head">
              <div className="card__title">Груз</div>
            </div>
            <div className="card__body" style={{ paddingTop: 8 }}>
              <div className="field-row">
                <span className="field-row__label">Тип</span>
                <span className="field-row__value">{shipment.cargo.type}</span>
              </div>
              <div className="field-row">
                <span className="field-row__label">Вес / объём</span>
                <span className="field-row__value">
                  {shipment.cargo.weight} · {shipment.cargo.volume}
                </span>
              </div>
              <div className="field-row">
                <span className="field-row__label">Кузов</span>
                <span className="field-row__value">{shipment.cargo.body}</span>
              </div>
              <div className="field-row">
                <span className="field-row__label">Упаковка</span>
                <span className="field-row__value">{shipment.cargo.packaging}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <div className="card__body">
              <div className="money-label">Маржа по заявке</div>
              <div className="money-big" style={{ marginTop: 6, color: margin >= 0 ? "var(--money)" : "var(--danger)" }}>
                {margin >= 0 ? "+" : "−"} {money(Math.abs(margin))}
              </div>

              <div style={{ marginTop: 16 }}>
                <div className="field-row">
                  <span className="field-row__label">Клиенту</span>
                  <span className="field-row__value mono">{money(shipment.customerPrice)}</span>
                </div>
                <div className="field-row">
                  <span className="field-row__label">Перевозчику</span>
                  <span className="field-row__value mono">{money(shipment.carrierPrice)}</span>
                </div>
                <div className="field-row">
                  <span className="field-row__label">Налог</span>
                  <span className="field-row__value">{shipment.tax}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card__head">
              <div className="card__title">Рейс</div>
            </div>
            <div className="card__body" style={{ paddingTop: 10 }}>
              <div className="route-card">
                <div className="route-card__row">
                  <MapPin size={14} strokeWidth={2} style={{ color: "var(--accent)" }} />
                  {shipment.route}
                </div>
                <div className="route-card__chips">
                  <span className="route-chip">{shipment.loading.date}</span>
                  <span className="route-chip">{shipment.unloading.date}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card__head">
              <div className="card__title">Ответственный</div>
            </div>
            <div className="card__body" style={{ paddingTop: 8 }}>
              <div className="row">
                <Avatar initials={owner.initials} color={owner.color} />
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{owner.name}</div>
                  <div className="muted" style={{ fontSize: 11 }}>
                    {owner.role}
                  </div>
                </div>
                <div className="row" style={{ marginLeft: "auto", gap: 4 }}>
                  <IconButton icon={Phone} label="Позвонить" />
                  <IconButton icon={Mail} label="Написать" />
                </div>
              </div>

              {shipment.comment && (
                <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>
                  {shipment.comment}
                </p>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card__body row" style={{ gap: 8 }}>
              <span className="tile tile--slate">
                <User size={16} strokeWidth={1.9} />
              </span>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>История заявки</div>
                <div className="muted" style={{ fontSize: 11.5 }}>
                  12 событий · вложения и чаттер
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
