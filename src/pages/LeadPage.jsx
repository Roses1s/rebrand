/**
 * Карточка лида: этапы воронки, клиент, заявки, файлы и история.
 * Лид коллеги открывается усечённо — только название, ИНН и продавец.
 */
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  ChevronDown,
  Clock,
  FileText,
  Mail,
  MapPin,
  MoreHorizontal,
  Package,
  Paperclip,
  Phone,
  Truck,
  User,
} from "lucide-react";

import { Shell } from "../app/Shell";
import { useLeads } from "../app/store";
import { Button, IconButton } from "../ui/Button";
import { Avatar, Status, Tag } from "../ui/Tag";
import { ALL_LEADS, ME, OWNER, PRIORITY, SHIPMENTS } from "../mock/data";
import { money } from "../lib/format";

const FILES = [
  { name: "Договор-2026-148.pdf", size: "1,2 МБ", date: "05.11.2026" },
  { name: "Заявка-ЗВ-0148.pdf", size: "340 КБ", date: "05.11.2026" },
  { name: "Доверенность.jpg", size: "820 КБ", date: "04.11.2026" },
];

const HISTORY = [
  { who: "Мария Соколова", what: "перевела лид на этап «Новый»", when: "сегодня 09:14" },
  { who: "Мария Соколова", what: "создала заявку ЗВ-2026-0148", when: "05.11 09:12" },
  { who: "Виталий Нестеров", what: "оставил заметку: «Нужен тент, погрузка со двора»", when: "05.11 08:40" },
  { who: "Система", what: "получен лид с сайта / формы заявки", when: "04.11 17:02" },
];

export function LeadPage() {
  const { id } = useParams();
  const { leads, stages, moveLead } = useLeads();
  const lead = leads.find((item) => item.id === Number(id)) ?? ALL_LEADS.find((item) => item.id === Number(id));
  const [tab, setTab] = useState("shipments");
  const [stageId, setStageId] = useState(lead?.stageId ?? 1);

  if (!lead) {
    return (
      <Shell title="Карточка лида">
        <div className="card" style={{ padding: 40, textAlign: "center" }}>
          <h2 style={{ marginBottom: 8 }}>Лид не найден</h2>
          <p className="muted" style={{ marginBottom: 16 }}>
            Возможно, ссылка устарела.
          </p>
          <Link to="/crm" className="btn">
            Вернуться к воронке
          </Link>
        </div>
      </Shell>
    );
  }

  if (lead.ownerId !== ME.id) {
    const colleague = OWNER(lead.ownerId);
    return (
      <Shell title="Карточка лида" crumb={`Воронка · ${lead.name}`}>
        <Link to="/crm" className="back-link">
          <ArrowLeft size={14} strokeWidth={2} />К воронке
        </Link>

        <div className="lead-head">
          <span className="lead-head__logo">
            <Building2 size={24} strokeWidth={1.8} />
          </span>
          <div className="grow">
            <h1 className="lead-head__name">{lead.name}</h1>
            <div className="lead-head__meta">
              <span className="mono">ИНН {lead.inn}</span>
              <span>{lead.city}</span>
            </div>
          </div>
          <div className="lead-head__actions">
            <Avatar initials={colleague.initials} color={colleague.color} size="lg" title={colleague.name} />
            <span style={{ fontSize: 12, color: "var(--ink-2)" }}>{colleague.name}</span>
          </div>
        </div>

        <div className="stub">
          <div>
            <b>Лид коллеги.</b> Активный лид другого менеджера открыт только для просмотра: название, ИНН и продавец.
            Заявки, контакты и деньги доступны владельцу лида и администратору.
          </div>
        </div>
      </Shell>
    );
  }

  const owner = OWNER(lead.ownerId);
  const priority = PRIORITY[lead.priority];
  const shipments = SHIPMENTS.filter((item) => item.leadId === lead.id);

  return (
    <Shell title="Карточка лида" crumb={`Воронка · ${lead.name}`}>
      <Link to="/crm" className="back-link">
        <ArrowLeft size={14} strokeWidth={2} />
        К воронке
      </Link>

      <div className="lead-head">
        <span className="lead-head__logo">
          <Building2 size={24} strokeWidth={1.8} />
        </span>

        <div className="grow">
          <h1 className="lead-head__name">{lead.name}</h1>
          <div className="lead-head__meta">
            <span className="mono">ИНН {lead.inn}</span>
            <Status tone="progress">{stages.find((s) => s.id === stageId)?.name ?? "Без этапа"}</Status>
            <span>{lead.city}</span>
            <span>·</span>
            <span>{lead.created}</span>
          </div>
        </div>

        <div className="lead-head__actions">
          <Button variant="success" icon={Phone}>
            Позвонить
          </Button>
          <Button variant="info" icon={Mail}>
            Письмо
          </Button>
          <IconButton icon={MoreHorizontal} label="Ещё" />
        </div>
      </div>

      <div className="stage-strip" style={{ marginBottom: 16 }}>
        {stages.map((stage) => (
          <button key={stage.id} type="button" aria-pressed={stageId === stage.id} onClick={() => { setStageId(stage.id); moveLead(lead.id, stage.id); }}>
            <span className="stage-strip__dot" style={{ background: stage.color }} />
            {stage.name}
          </button>
        ))}
      </div>

      <div className="grid grid--2-1">
        <div className="stack">
          <div className="card">
            <div className="card__head">
              <div>
                <div className="card__title">Клиент</div>
                <div className="card__sub">Реквизиты и контакты</div>
              </div>
            </div>
            <div className="card__body" style={{ paddingTop: 6 }}>
              <div className="field-row">
                <span className="field-row__label">Компания</span>
                <span className="field-row__value">{lead.name}</span>
              </div>
              <div className="field-row">
                <span className="field-row__label">ИНН</span>
                <span className="field-row__value mono">{lead.inn}</span>
              </div>
              <div className="field-row">
                <span className="field-row__label">Контакт</span>
                <span className="field-row__value">
                  {lead.contact} · {lead.role}
                </span>
              </div>
              <div className="field-row">
                <span className="field-row__label">Телефон</span>
                <span className="field-row__value mono">{lead.phone}</span>
              </div>
              <div className="field-row">
                <span className="field-row__label">E-mail</span>
                <span className="field-row__value">{lead.email}</span>
              </div>
              <div className="field-row">
                <span className="field-row__label">Бухгалтер</span>
                <span className="field-row__value">
                  Смирнова О. П. <ChevronDown size={13} style={{ verticalAlign: "-2px" }} />
                </span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="tabbar" role="tablist">
              <button type="button" role="tab" aria-selected={tab === "shipments"} onClick={() => setTab("shipments")}>
                Заявки ({shipments.length})
              </button>
              <button type="button" role="tab" aria-selected={tab === "files"} onClick={() => setTab("files")}>
                Файлы ({FILES.length})
              </button>
              <button type="button" role="tab" aria-selected={tab === "history"} onClick={() => setTab("history")}>
                История
              </button>
            </div>

            <div className="card__body">
              {tab === "shipments" &&
                (shipments.length === 0 ? (
                  <div className="empty">
                    <span className="empty__icon">
                      <Truck size={20} strokeWidth={1.8} />
                    </span>
                    <span className="empty__title">Заявок пока нет</span>
                    <p className="empty__text">Создайте первую заявку — она появится здесь и в общем списке.</p>
                    <Button size="sm" variant="primary">
                      Создать заявку
                    </Button>
                  </div>
                ) : (
                  <div className="stack" style={{ gap: 8 }}>
                    {shipments.map((item) => (
                      <Link
                        key={item.id}
                        to={`/shipments/${item.id}`}
                        className="row"
                        style={{ padding: "10px 12px", borderRadius: 10, background: "var(--surface-2)" }}
                      >
                        <Package size={16} strokeWidth={1.9} style={{ color: "var(--ink-3)" }} />
                        <span className="mono" style={{ fontSize: 12 }}>
                          {item.number}
                        </span>
                        <span className="truncate" style={{ fontSize: 12.5 }}>
                          {item.route}
                        </span>
                        <span style={{ marginLeft: "auto", fontWeight: 600, fontSize: 12.5 }}>
                          {money(item.customerPrice)}
                        </span>
                      </Link>
                    ))}
                  </div>
                ))}

              {tab === "files" && (
                <div className="stack" style={{ gap: 8 }}>
                  {FILES.map((file) => (
                    <div key={file.name} className="row" style={{ padding: "9px 12px", borderRadius: 10, background: "var(--surface-2)" }}>
                      <FileText size={16} strokeWidth={1.9} style={{ color: "var(--ink-3)" }} />
                      <span style={{ fontSize: 12.5 }}>{file.name}</span>
                      <span className="muted" style={{ marginLeft: "auto", fontSize: 11.5 }}>
                        {file.size} · {file.date}
                      </span>
                    </div>
                  ))}
                  <Button size="sm" icon={Paperclip} variant="soft">
                    Прикрепить файл
                  </Button>
                </div>
              )}

              {tab === "history" && (
                <div className="stack" style={{ gap: 12 }}>
                  {HISTORY.map((item) => (
                    <div key={item.when} className="row" style={{ alignItems: "flex-start" }}>
                      <Avatar initials={item.who.slice(0, 1)} size="sm" />
                      <div>
                        <div style={{ fontSize: 12.5 }}>
                          <b>{item.who}</b> {item.what}
                        </div>
                        <div className="muted" style={{ fontSize: 11 }}>
                          {item.when}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <div className="card__body">
              <div className="money-label">Бюджет сделки</div>
              <div className="money-big" style={{ marginTop: 6 }}>
                {money(lead.price)}
              </div>
              <div className="row" style={{ marginTop: 14, gap: 8 }}>
                <Button variant="success" icon={Phone} style={{ flex: 1 }}>
                  Позвонить
                </Button>
                <Button variant="info" icon={Mail} style={{ flex: 1 }}>
                  Письмо
                </Button>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card__head">
              <div className="card__title">Маршрут</div>
            </div>
            <div className="card__body" style={{ paddingTop: 10 }}>
              <div className="route-card">
                <div className="route-card__row">
                  <MapPin size={14} strokeWidth={2} style={{ color: "var(--accent)" }} />
                  {lead.route}
                </div>
                <div className="route-card__chips">
                  <span className="route-chip">
                    <Package size={12} /> {lead.cargo}
                  </span>
                  <span className="route-chip">{lead.weight}</span>
                  <span className="route-chip">{lead.body}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card__head">
              <div className="card__title">Детали</div>
            </div>
            <div className="card__body" style={{ paddingTop: 4 }}>
              <div className="field-row">
                <span className="field-row__label">Источник</span>
                <span className="field-row__value">{lead.source}</span>
              </div>
              <div className="field-row">
                <span className="field-row__label">Приоритет</span>
                <span className="field-row__value">
                  <span className={`badge ${priority.cls}`}>{priority.label}</span>
                </span>
              </div>
              <div className="field-row">
                <span className="field-row__label">Ответственный</span>
                <span className="field-row__value row" style={{ justifyContent: "flex-end" }}>
                  <Avatar initials={owner.initials} color={owner.color} size="sm" />
                  {owner.name}
                </span>
              </div>
              <div className="field-row">
                <span className="field-row__label">Создан</span>
                <span className="field-row__value">{lead.created}</span>
              </div>
              <div className="field-row">
                <span className="field-row__label">Без движения</span>
                <span className="field-row__value" style={{ color: lead.days > 7 ? "var(--danger)" : "var(--ink)" }}>
                  {lead.days} дн.
                </span>
              </div>
              <div className="field-row">
                <span className="field-row__label">Теги</span>
                <span className="field-row__value row" style={{ justifyContent: "flex-end", gap: 5 }}>
                  <Tag color="var(--stage-3)">Тент</Tag>
                  <Tag color="var(--stage-5)">Постоянный</Tag>
                </span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card__body">
              <div className="row" style={{ gap: 8, marginBottom: 10 }}>
                <Clock size={15} style={{ color: "var(--ink-3)" }} />
                <span style={{ fontSize: 12.5, fontWeight: 600 }}>Последнее действие</span>
              </div>
              <p className="muted" style={{ fontSize: 12 }}>
                Звонок назначен на {lead.due}. Держите лид в движении — карточки без активности подсвечиваются.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
