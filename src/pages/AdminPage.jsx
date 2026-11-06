/** Администрирование для роли «Администратор»: пользователи, доступы, безопасность, копии. */
import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Database, HardDrive, Lock, Plus, ShieldCheck, UserPlus, Users } from "lucide-react";

import { Shell } from "../app/Shell";
import { Button } from "../ui/Button";
import { Avatar } from "../ui/Tag";
import { ALL_LEADS, ME, SHIPMENTS, TEAM } from "../mock/data";
import { shortMoney } from "../lib/format";

const BACKUPS = [
  { date: "06.11.2026, 03:00", size: "182 МБ", status: "успешно", tone: "done" },
  { date: "05.11.2026, 03:00", size: "181 МБ", status: "успешно", tone: "done" },
  { date: "04.11.2026, 03:00", size: "180 МБ", status: "успешно", tone: "done" },
  { date: "03.11.2026, 03:00", size: "178 МБ", status: "с ошибкой", tone: "lost" },
];

function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      className="switch"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    >
      <span className="switch__dot" />
    </button>
  );
}

export function AdminPage() {
  const [accountants, setAccountants] = useState([
    { id: 1, name: "Ольга Белова", email: "belova@transline.ru", invoices: true, bank: true, online: true },
    { id: 2, name: "Пётр Ершов", email: "ershov@transline.ru", invoices: true, bank: false, online: false },
  ]);
  const [twoFactor, setTwoFactor] = useState(true);
  const [sessionLimit, setSessionLimit] = useState(true);

  if (!ME.isAdmin) {
    return (
      <Shell title="Администрирование" crumb="Раздел только для администратора">
        <div className="card" style={{ padding: 28, textAlign: "center" }}>
          <span className="empty__icon" style={{ margin: "0 auto 10px" }}>
            <Lock size={20} strokeWidth={1.8} />
          </span>
          <div className="empty__title">Доступ только у администратора</div>
          <p className="empty__text" style={{ margin: "6px auto 16px", maxWidth: 460 }}>
            В рабочей CRM не-администратора выкидывает из раздела. Чтобы посмотреть макет админки, включите роль
            «Администратор» в настройках.
          </p>
          <Link to="/settings" className="btn btn--primary">
            Открыть настройки
          </Link>
        </div>
      </Shell>
    );
  }

  const kpi = [
    { label: "Сотрудников", value: String(TEAM.length), foot: "в отделе продаж", color: "var(--stage-1)" },
    {
      label: "Лидов в работе",
      value: String(ALL_LEADS.length),
      foot: shortMoney(ALL_LEADS.reduce((sum, lead) => sum + lead.price, 0)),
      color: "var(--stage-4)",
    },
    { label: "Заявок", value: String(SHIPMENTS.length), foot: "за текущий месяц", color: "var(--stage-3)" },
    { label: "Доступ к деньгам", value: String(accountants.length), foot: "бухгалтеров", color: "var(--stage-2)" },
  ];

  return (
    <Shell>
      <div className="kpi-grid" style={{ marginBottom: 18 }}>
        {kpi.map((item) => (
          <div key={item.label} className="kpi" style={{ "--kpi": item.color }}>
            <span className="kpi__label">{item.label}</span>
            <span className="kpi__value">{item.value}</span>
            <span className="kpi__foot">{item.foot}</span>
          </div>
        ))}
      </div>

      <div className="stack">
        <div className="card">
          <div className="card__head">
            <div>
              <div className="card__title">Пользователи</div>
              <div className="card__sub">Роли, доступы и активность сотрудников</div>
            </div>
            <Button size="sm" icon={UserPlus}>
              Пригласить
            </Button>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>Сотрудник</th>
                <th>Роль</th>
                <th style={{ textAlign: "right" }}>Лидов</th>
                <th>Последний вход</th>
                <th style={{ textAlign: "right" }}>Статус</th>
              </tr>
            </thead>
            <tbody>
              {TEAM.map((person, index) => {
                const personLeads = ALL_LEADS.filter((lead) => lead.ownerId === person.id);
                return (
                  <tr key={person.id}>
                    <td>
                      <div className="cell-company">
                        <Avatar initials={person.initials} color={person.color} />
                        <div style={{ minWidth: 0 }}>
                          <div className="cell-company__name">{person.name}</div>
                          <div className="cell-company__sub">
                            {person.email ?? `user${person.id}@transline.ru`}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${person.id === 1 ? "badge--hot" : "badge--mid"}`}>
                        {person.id === 1 ? "Администратор" : "Менеджер"}
                      </span>
                    </td>
                    <td className="cell-money">{personLeads.length}</td>
                    <td className="cell-sub">{index === 0 ? "сегодня, 09:12" : `${index + 1} ноября, 18:40`}</td>
                    <td style={{ textAlign: "right" }}>
                      <span className={`status status--${person.online ? "done" : "new"}`}>
                        {person.online ? "в сети" : "офлайн"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="grid grid--1-1">
          <div className="card">
            <div className="card__head">
              <div>
                <div className="card__title">Доступ бухгалтеров</div>
                <div className="card__sub">Кто видит счета, банк и кассу</div>
              </div>
              <Button size="sm" variant="ghost" icon={Plus}>
                Добавить
              </Button>
            </div>
            <div className="card__body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {accountants.map((person) => (
                <div key={person.id} className="admin-row">
                  <Avatar initials={person.name.split(" ").map((part) => part[0]).join("")} />
                  <div style={{ minWidth: 0 }}>
                    <div className="cell-company__name">{person.name}</div>
                    <div className="cell-company__sub">{person.email}</div>
                  </div>
                  <div className="admin-row__toggles">
                    <label className="admin-toggle">
                      <Switch
                        checked={person.invoices}
                        label={`Счета: ${person.name}`}
                        onChange={(next) =>
                          setAccountants((prev) =>
                            prev.map((item) => (item.id === person.id ? { ...item, invoices: next } : item)),
                          )
                        }
                      />
                      Счета
                    </label>
                    <label className="admin-toggle">
                      <Switch
                        checked={person.bank}
                        label={`Банк: ${person.name}`}
                        onChange={(next) =>
                          setAccountants((prev) =>
                            prev.map((item) => (item.id === person.id ? { ...item, bank: next } : item)),
                          )
                        }
                      />
                      Банк
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card__head">
              <div>
                <div className="card__title">Безопасность</div>
                <div className="card__sub">Двухфакторный вход и сессии</div>
              </div>
            </div>
            <div className="card__body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="admin-row">
                <span className="tile" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                  <ShieldCheck size={17} strokeWidth={1.9} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div className="cell-company__name">Двухфакторный вход</div>
                  <div className="cell-company__sub">Обязателен для администраторов</div>
                </div>
                <div style={{ marginLeft: "auto" }}>
                  <Switch checked={twoFactor} onChange={setTwoFactor} label="Двухфакторный вход" />
                </div>
              </div>

              <div className="admin-row">
                <span className="tile" style={{ background: "var(--info-soft)", color: "var(--info)" }}>
                  <Users size={17} strokeWidth={1.9} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div className="cell-company__name">Одна активная сессия</div>
                  <div className="cell-company__sub">Новый вход закрывает прежний</div>
                </div>
                <div style={{ marginLeft: "auto" }}>
                  <Switch checked={sessionLimit} onChange={setSessionLimit} label="Одна активная сессия" />
                </div>
              </div>

              <div className="admin-row">
                <span className="tile" style={{ background: "var(--money-soft)", color: "var(--money)" }}>
                  <HardDrive size={17} strokeWidth={1.9} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div className="cell-company__name">Резервные копии</div>
                  <div className="cell-company__sub">Ежедневно в 03:00, храним 30 дней</div>
                </div>
                <span className="status status--done" style={{ marginLeft: "auto" }}>
                  <Check size={12} strokeWidth={3} /> включено
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card__head">
            <div>
              <div className="card__title">Резервные копии</div>
              <div className="card__sub">Последние четыре копии базы</div>
            </div>
            <Button size="sm" variant="ghost" icon={Database}>
              Создать копию
            </Button>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Дата</th>
                <th>Размер</th>
                <th style={{ textAlign: "right" }}>Статус</th>
              </tr>
            </thead>
            <tbody>
              {BACKUPS.map((backup) => (
                <tr key={backup.date}>
                  <td className="cell-main">{backup.date}</td>
                  <td className="cell-sub">{backup.size}</td>
                  <td style={{ textAlign: "right" }}>
                    <span className={`status status--${backup.tone}`}>{backup.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}
