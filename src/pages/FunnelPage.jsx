import { useEffect, useMemo, useRef, useState } from "react";
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
  Trash2,
  Users,
  Wallet,
  X,
} from "lucide-react";

import { Shell } from "../app/Shell";
import { STAGE_META, useLeads } from "../app/store";
import { Avatar, Chip } from "../ui/Tag";
import { ME, OWNER, PRIORITY, TASKS } from "../mock/data";
import { shortMoney } from "../lib/format";

const ICONS = { users: Users, wallet: Wallet, target: Target, flame: Flame, clock: Clock };
const PRIORITY_RANK = { high: 3, mid: 2, low: 1 };

const sumOf = (leads) => leads.reduce((total, lead) => total + (Number(lead.price) || 0), 0);
const overdueTasks = TASKS.filter((task) => task.ownerId === ME.id && task.status === "overdue").length;

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
  const { leads, addLead, removeLeads } = useLeads();
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState(() => {
    try {
      return window.localStorage.getItem("crm.funnel.view") ?? "board";
    } catch {
      return "board";
    }
  });
  const [sort, setSort] = useState({ key: "stage", dir: "asc" });
  const [selected, setSelected] = useState([]);
  const allCheckbox = useRef(null);

  const myLeads = useMemo(() => leads.filter((lead) => lead.ownerId === ME.id), [leads]);

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
        foot: myLeads.length ? `средний чек ${shortMoney(Math.round(sum / myLeads.length))}` : "лидов пока нет",
        color: "var(--stage-4)",
        icon: "wallet",
      },
      {
        label: "Потенциальные",
        value: String(potential),
        foot: myLeads.length ? `конверсия ${Math.round((potential / myLeads.length) * 100)}%` : "—",
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
  }, [myLeads]);

  const visible = (lead) => {
    if (filter === "hot" && !lead.hot) return false;
    if (filter === "late" && !lead.late) return false;
    return true;
  };

  const listRows = useMemo(() => {
    const rows = myLeads.filter(visible);
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      switch (sort.key) {
        case "price":
          return (a.price - b.price) * dir;
        case "stage":
          return (a.stageId - b.stageId) * dir;
        case "contact":
          return a.contact.localeCompare(b.contact, "ru") * dir;
        case "priority":
          return ((PRIORITY_RANK[a.priority] ?? 0) - (PRIORITY_RANK[b.priority] ?? 0)) * dir;
        case "due":
          return ((a.late ? 0 : 1) - (b.late ? 0 : 1) || a.due.localeCompare(b.due, "ru")) * dir;
        default:
          return a.name.localeCompare(b.name, "ru") * dir;
      }
    });
  }, [myLeads, filter, sort]);

  const allSelected = listRows.length > 0 && listRows.every((lead) => selected.includes(lead.id));
  const someSelected = selected.length > 0 && !allSelected;

  useEffect(() => {
    if (allCheckbox.current) allCheckbox.current.indeterminate = someSelected;
  }, [someSelected]);

  function toggleSelect(id) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  function toggleAll() {
    setSelected(allSelected ? [] : listRows.map((lead) => lead.id));
  }

  function removeSelected() {
    removeLeads(selected);
    setSelected([]);
  }

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
          <span className="muted toolbar__sum">
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
          {STAGE_META.map((stage) => {
            const stageLeads = myLeads.filter((lead) => lead.stageId === stage.id && visible(lead));
            const sum = sumOf(stageLeads);
            return (
              <section key={stage.id} className="col" aria-label={stage.name}>
                <div className="col__head">
                  <span className="col__dot" style={{ background: stage.color }} />
                  <span className="col__name">{stage.name}</span>
                  <span className="col__count">{stageLeads.length}</span>
                  <button
                    type="button"
                    className="col__btn"
                    aria-label={`Добавить лид в «${stage.name}»`}
                    title="Добавить лид на этот этап"
                    onClick={() => addLead({ name: "Новый лид", city: "Москва", stageId: stage.id })}
                  >
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
                  {stageLeads.map((lead) => (
                    <LeadCard key={lead.id} lead={lead} />
                  ))}

                  {stageLeads.length === 0 && (
                    <div className="card" style={{ padding: 18, textAlign: "center", color: "var(--ink-3)", fontSize: 12 }}>
                      {myLeads.some((lead) => lead.stageId === stage.id)
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
        <>
          {selected.length > 0 && (
            <div className="bulk-bar">
              <span className="bulk-bar__count">
                Выбрано записей: <b>{selected.length}</b>
              </span>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setSelected([])}>
                <X size={14} strokeWidth={2} />
                Снять выделение
              </button>
              <button type="button" className="btn btn--danger btn--sm" style={{ marginLeft: "auto" }} onClick={removeSelected}>
                <Trash2 size={14} strokeWidth={2} />
                Удалить
              </button>
            </div>
          )}

          <div className="table-wrap">
            <table className="table leads-table">
              <thead>
                <tr>
                  <th style={{ width: 36, paddingRight: 0 }}>
                    <input
                      ref={allCheckbox}
                      type="checkbox"
                      className="row-check"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label="Выбрать все лиды"
                    />
                  </th>
                  <SortHead label="Компания" sortKey="name" sort={sort} onSort={toggleSort} />
                  <SortHead label="Контакт" sortKey="contact" sort={sort} onSort={toggleSort} />
                  <SortHead label="Этап" sortKey="stage" sort={sort} onSort={toggleSort} width={170} />
                  <th>Маршрут</th>
                  <SortHead label="Приоритет" sortKey="priority" sort={sort} onSort={toggleSort} width={110} />
                  <SortHead label="Сумма" sortKey="price" sort={sort} onSort={toggleSort} align="right" width={120} />
                  <SortHead label="Срок" sortKey="due" sort={sort} onSort={toggleSort} width={110} />
                </tr>
              </thead>
              <tbody>
                {listRows.map((lead) => {
                  const stage = STAGE_META.find((item) => item.id === lead.stageId) ?? STAGE_META[0];
                  const priority = PRIORITY[lead.priority];
                  const isSelected = selected.includes(lead.id);
                  return (
                    <tr
                      key={lead.id}
                      className={isSelected ? "is-selected" : undefined}
                      style={{ cursor: "pointer" }}
                      onClick={() => navigate(`/crm/leads/${lead.id}`)}
                    >
                      <td style={{ paddingRight: 0 }} onClick={(event) => event.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="row-check"
                          checked={isSelected}
                          onChange={() => toggleSelect(lead.id)}
                          aria-label={`Выбрать ${lead.name}`}
                        />
                      </td>
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
                            <Link
                              to={`/crm/leads/${lead.id}`}
                              className="cell-company__name"
                              onClick={(event) => event.stopPropagation()}
                            >
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

          <div className="table-foot">
            <span>
              Показано {listRows.length} из {myLeads.length}
            </span>
            {listRows.length !== myLeads.length && (
              <span className="muted">Скрыто фильтром: {myLeads.length - listRows.length}</span>
            )}
            {selected.length > 0 && <span className="muted">Выбрано: {selected.length}</span>}
          </div>
        </>
      )}
    </Shell>
  );
}
