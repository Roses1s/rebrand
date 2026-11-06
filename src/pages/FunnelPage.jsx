import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Clock,
  Flame,
  KanbanSquare,
  List,
  MapPin,
  MoreVertical,
  Package,
  Phone,
  Plus,
  Target,
  Users,
  Wallet,
} from "lucide-react";

import { Shell } from "../app/Shell";
import { Avatar, Chip } from "../ui/Tag";
import { ME, OWNER, PRIORITY, STAGES, TASKS } from "../mock/data";
import { shortMoney } from "../lib/format";

const ICONS = { users: Users, wallet: Wallet, target: Target, flame: Flame, clock: Clock };

const myLeads = STAGES.flatMap((stage) => stage.leads).filter((lead) => lead.ownerId === ME.id);
const sumOf = (leads) => leads.reduce((total, lead) => total + lead.price, 0);
const overdueTasks = TASKS.filter((task) => task.ownerId === ME.id && task.status === "overdue").length;
const stageOf = (lead) => STAGES.find((stage) => stage.id === lead.stageId);

function LeadCard({ lead }) {
  const priority = PRIORITY[lead.priority];
  const owner = OWNER(lead.ownerId);
  const foreign = lead.ownerId !== ME.id;

  return (
    <Link to={`/crm/leads/${lead.id}`} className="lead-card">
      <div className="lead-card__title">
        {lead.hot && <Flame size={14} className="fire" strokeWidth={2.2} />}
        <span>{lead.name}</span>
      </div>

      <div className="lead-card__sub">
        {lead.contact} · {lead.role}
      </div>

      <span className="route">
        <MapPin size={12} strokeWidth={2} />
        {lead.route}
      </span>

      <div className="cargo">
        <Package size={12} strokeWidth={2} />
        <span className="cargo__type">{lead.cargo}</span>
        <span className="cargo__weight">{lead.weight}</span>
        <span className={`badge ${priority.cls}`}>{priority.label}</span>
      </div>

      <div className="lead-card__foot">
        {foreign && <Avatar initials={owner.initials} color={owner.color} size="sm" title={owner.name} />}
        <span className="price">{shortMoney(lead.price)}</span>
        <span className="lead-card__right">
          <Phone size={13} strokeWidth={2} style={{ color: "var(--ink-3)" }} />
          <span className={`due${lead.late ? " due--late" : ""}`}>{lead.due}</span>
        </span>
      </div>
    </Link>
  );
}

function SortHead({ label, sortKey, sort, onSort, align = "left", width }) {
  const active = sort.key === sortKey;
  const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ChevronUp : ChevronDown;

  return (
    <th style={{ textAlign: align, width }}>
      <button
        type="button"
        className={`th-sort${active ? " is-active" : ""}`}
        onClick={() => onSort(sortKey)}
        style={{ justifyContent: align === "right" ? "flex-end" : "flex-start", width: "100%" }}
      >
        {label}
        <Icon size={12} strokeWidth={2.2} />
      </button>
    </th>
  );
}

export function FunnelPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState(() => {
    try {
      return window.localStorage.getItem("crm.funnel.view") ?? "board";
    } catch {
      return "board";
    }
  });
  const [sort, setSort] = useState({ key: "stage", dir: "asc" });

  function switchView(next) {
    setView(next);
    try {
      window.localStorage.setItem("crm.funnel.view", next);
    } catch {
      /* приватный режим */
    }
  }

  function toggleSort(key) {
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  }

  const kpi = useMemo(() => {
    const sum = sumOf(myLeads);
    const potential = myLeads.filter((lead) => lead.stageId === 4).length;
    const hot = myLeads.filter((lead) => lead.hot).length;
    return [
      {
        label: "Лидов в работе",
        value: String(myLeads.length),
        foot: "5 этапов моей воронки",
        color: "var(--stage-1)",
        icon: "users",
      },
      {
        label: "Сумма воронки",
        value: shortMoney(sum),
        foot: `средний чек ${shortMoney(Math.round(sum / myLeads.length))}`,
        color: "var(--stage-4)",
        icon: "wallet",
      },
      {
        label: "Потенциальные",
        value: String(potential),
        foot: `конверсия ${Math.round((potential / myLeads.length) * 100)}%`,
        color: "var(--stage-5)",
        icon: "target",
      },
      {
        label: "Горячие лиды",
        value: String(hot),
        foot: "высокий приоритет",
        color: "var(--stage-2)",
        icon: "flame",
      },
      {
        label: "Просрочено",
        value: String(overdueTasks),
        foot: "задач требуют звонка",
        color: "var(--danger)",
        icon: "clock",
      },
    ];
  }, []);

  const visible = (lead) => {
    if (filter === "hot" && !lead.hot) return false;
    if (filter === "late" && !lead.late) return false;
    return true;
  };

  const listRows = useMemo(() => {
    const rows = myLeads.filter(visible);
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      if (sort.key === "price") return (a.price - b.price) * dir;
      if (sort.key === "stage") return (a.stageId - b.stageId) * dir;
      if (sort.key === "name") return a.name.localeCompare(b.name, "ru") * dir;
      return 0;
    });
  }, [filter, sort]);

  return (
    <Shell>
      <div className="kpi-grid" style={{ marginBottom: 18 }}>
        {kpi.map((item) => {
          const Icon = ICONS[item.icon];
          return (
            <div key={item.label} className="kpi" style={{ "--kpi": item.color }}>
              <div className="kpi__top">
                <span className="kpi__label">{item.label}</span>
                <span
                  className="tile"
                  style={{ background: `color-mix(in srgb, ${item.color} 12%, transparent)`, color: item.color }}
                >
                  <Icon size={17} strokeWidth={1.9} />
                </span>
              </div>
              <span className="kpi__value">{item.value}</span>
              <span className="kpi__foot">{item.foot}</span>
            </div>
          );
        })}
      </div>

      <div className="toolbar">
        <Chip active={filter === "all"} count={myLeads.length} onClick={() => setFilter("all")}>
          Все
        </Chip>
        <Chip active={filter === "hot"} count={myLeads.filter((lead) => lead.hot).length} onClick={() => setFilter("hot")}>
          Горячие
        </Chip>
        <Chip
          active={filter === "late"}
          count={myLeads.filter((lead) => lead.late).length}
          onClick={() => setFilter("late")}
        >
          Просроченные
        </Chip>

        <div className="toolbar__right">
          <span className="muted" style={{ fontSize: 11.5 }}>
            Моя доска · {shortMoney(sumOf(myLeads))}
          </span>

          <div className="view-switch" role="group" aria-label="Вид списка лидов">
            <button type="button" aria-pressed={view === "board"} onClick={() => switchView("board")} title="Канбан">
              <KanbanSquare size={15} strokeWidth={1.9} />
            </button>
            <button type="button" aria-pressed={view === "list"} onClick={() => switchView("list")} title="Список">
              <List size={15} strokeWidth={1.9} />
            </button>
          </div>
        </div>
      </div>

      {view === "board" ? (
        <div className="board">
          {STAGES.map((stage) => {
            const leads = stage.leads.filter((lead) => lead.ownerId === ME.id && visible(lead));
            const sum = sumOf(leads);
            return (
              <section key={stage.id} className="col" aria-label={stage.name}>
                <div className="col__head">
                  <span className="col__dot" style={{ background: stage.color }} />
                  <span className="col__name">{stage.name}</span>
                  <span className="col__count">{leads.length}</span>
                  <button type="button" className="col__btn" aria-label={`Добавить лид в «${stage.name}»`}>
                    <Plus size={15} strokeWidth={2} />
                  </button>
                  <button type="button" className="col__btn" aria-label={`Меню этапа «${stage.name}»`}>
                    <MoreVertical size={15} strokeWidth={2} />
                  </button>
                </div>

                <div className="col__sub" title={`${shortMoney(sum)} · ${stage.hint}`}>
                  {shortMoney(sum)} · {stage.hint}
                </div>
                <div className="col__rule" style={{ "--col-color": stage.color }} />

                <div className="col__cards">
                  {leads.map((lead) => (
                    <LeadCard key={lead.id} lead={lead} />
                  ))}

                  {leads.length === 0 && (
                    <div className="card" style={{ padding: 18, textAlign: "center", color: "var(--ink-3)", fontSize: 12 }}>
                      {stage.leads.some((lead) => lead.ownerId === ME.id)
                        ? "По этому фильтру карточек нет"
                        : "Пока пусто — добавьте лид"}
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table leads-table">
            <thead>
              <tr>
                <SortHead label="Компания" sortKey="name" sort={sort} onSort={toggleSort} />
                <th>Контакт</th>
                <SortHead label="Этап" sortKey="stage" sort={sort} onSort={toggleSort} width={170} />
                <th>Маршрут</th>
                <th>Приоритет</th>
                <SortHead label="Сумма" sortKey="price" sort={sort} onSort={toggleSort} align="right" width={120} />
                <th>Срок</th>
              </tr>
            </thead>
            <tbody>
              {listRows.map((lead) => {
                const stage = stageOf(lead);
                const priority = PRIORITY[lead.priority];
                return (
                  <tr key={lead.id} style={{ cursor: "pointer" }} onClick={() => navigate(`/crm/leads/${lead.id}`)}>
                    <td>
                      <div className="cell-company">
                        <span className="cell-logo">
                          {lead.hot ? (
                            <Flame size={16} strokeWidth={2} style={{ color: "var(--warn)" }} />
                          ) : (
                            <Package size={16} strokeWidth={1.8} />
                          )}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <Link to={`/crm/leads/${lead.id}`} className="cell-company__name">
                            {lead.name}
                          </Link>
                          <div className="cell-company__sub">
                            {lead.city} · ИНН {lead.inn}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="cell-main">{lead.contact}</div>
                      <div className="cell-sub">{lead.phone}</div>
                    </td>
                    <td>
                      <span className="stage-cell">
                        <span className="bar-row__dot" style={{ background: stage.color }} />
                        {stage.name}
                      </span>
                    </td>
                    <td>
                      <div className="cell-main">{lead.route}</div>
                      <div className="cell-sub">
                        {lead.cargo} · {lead.weight}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${priority.cls}`}>{priority.label}</span>
                    </td>
                    <td className="cell-money">{shortMoney(lead.price)}</td>
                    <td>
                      <span className={`due${lead.late ? " due--late" : ""}`}>{lead.due}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {listRows.length === 0 && (
            <div className="empty">
              <span className="empty__icon">
                <List size={20} strokeWidth={1.8} />
              </span>
              <span className="empty__title">Лидов нет</span>
              <p className="empty__text">Измените фильтр или добавьте новый лид кнопкой в шапке.</p>
            </div>
          )}
        </div>
      )}
    </Shell>
  );
}
