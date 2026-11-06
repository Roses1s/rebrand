import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { Shell } from "../app/Shell";
import { useLeads } from "../app/store";
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
    <Link to={`/crm/leads/${lead.id}`} className="lead-card" draggable={false}>
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

function SortableLead({ lead }) {
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({
    id: lead.id,
    data: { stageId: lead.stageId },
  });

  return (
    <div
      ref={setNodeRef}
      className={`drag-wrap${isDragging ? " is-dragging" : ""}`}
      title="Перетащите карточку на другой этап. С клавиатуры: Space, стрелки, Space"
      {...attributes}
      {...listeners}
    >
      <LeadCard lead={lead} />
    </div>
  );
}

function StageColumn({ stage, stageLeads, dragging, dropIndex, onAdd }) {
  const { setNodeRef, isOver } = useDroppable({ id: `stage-${stage.id}`, data: { stageId: stage.id } });
  const sum = sumOf(stageLeads);
  const showLine = dragging && dropIndex != null;

  return (
    <section ref={setNodeRef} className={`col${isOver ? " is-over" : ""}`} aria-label={stage.name}>
      <div className="col__head">
        <span className="col__dot" style={{ background: stage.color }} />
        <span className="col__name">{stage.name}</span>
        <span className="col__count">{stageLeads.length}</span>
        <button
          type="button"
          className="col__btn"
          aria-label={`Добавить лид в «${stage.name}»`}
          title="Добавить лид на этот этап"
          onClick={onAdd}
        >
          <Plus size={15} strokeWidth={2} />
        </button>
        <Link
          to="/settings"
          className="col__btn"
          aria-label={`Настроить этап «${stage.name}»`}
          title="Настроить этапы воронки"
        >
          <MoreVertical size={15} strokeWidth={2} />
        </Link>
      </div>

      <div className="col__sub" title={`${shortMoney(sum)} · ${stage.hint}`}>
        {shortMoney(sum)} · {stage.hint}
      </div>
      <div className="col__rule" style={{ "--col-color": stage.color }} />

      <div className="col__cards">
        <SortableContext items={stageLeads.map((lead) => lead.id)} strategy={verticalListSortingStrategy}>
          {stageLeads.map((lead, index) => (
            <Fragment key={lead.id}>
              {showLine && dropIndex === index && <div className="drop-line" aria-hidden="true" />}
              <SortableLead lead={lead} />
            </Fragment>
          ))}

          {showLine && dropIndex >= stageLeads.length && <div className="drop-line" aria-hidden="true" />}
        </SortableContext>

        {stageLeads.length === 0 &&
          (dragging && showLine ? (
            <div className="col__drop-slot" aria-hidden="true">
              Отпустите здесь
            </div>
          ) : (
            <div className="col__drop-hint" aria-hidden="true">
              Пока пусто — перетащите лид или добавьте новый
            </div>
          ))}
      </div>
    </section>
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
  const { leads, stages, addLead, moveLead, removeLeads } = useLeads();
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
  const [activeId, setActiveId] = useState(null);
  const [activeWidth, setActiveWidth] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const suppressClick = useRef(false);
  const allCheckbox = useRef(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 160, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const myLeads = useMemo(
    () => leads.filter((lead) => lead.ownerId === ME.id).sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    [leads],
  );
  const activeLead = activeId != null ? myLeads.find((lead) => lead.id === activeId) : null;

  /** Точка вставки: карточка под курсором важнее колонки, иначе — в конец этапа. */
  const resolveTarget = useCallback(
    ({ active, over }) => {
      if (!over) return null;

      if (typeof over.id === "string" && over.id.startsWith("stage-")) {
        const stageId = Number(over.id.slice("stage-".length));
        const count = myLeads.filter((lead) => lead.stageId === stageId && lead.id !== active.id).length;
        return { stageId, index: count };
      }

      const overLead = myLeads.find((lead) => lead.id === over.id);
      if (!overLead) return null;
      if (overLead.id === active.id) {
        return { stageId: overLead.stageId, index: overLead.position ?? 0 };
      }

      const list = myLeads.filter((lead) => lead.stageId === overLead.stageId && lead.id !== active.id);
      const overIndex = list.findIndex((lead) => lead.id === overLead.id);
      if (overIndex < 0) return { stageId: overLead.stageId, index: list.length };

      const activeRect = active.rect.current.translated ?? active.rect.current.initial;
      const below = activeRect
        ? activeRect.top + activeRect.height / 2 > over.rect.top + over.rect.height / 2
        : false;

      return { stageId: overLead.stageId, index: below ? overIndex + 1 : overIndex };
    },
    [myLeads],
  );

  const collisionDetection = useCallback((args) => {
    const hits = pointerWithin(args);
    const list = hits.length ? hits : rectIntersection(args);
    // Карточки точнее колонки: сначала они, колонка — запасной вариант.
    return [...list].sort(
      (a, b) => Number(String(a.id).startsWith("stage-")) - Number(String(b.id).startsWith("stage-")),
    );
  }, []);

  function resetDrag() {
    setActiveId(null);
    setActiveWidth(null);
    setDropTarget(null);
  }

  function handleDragStart(event) {
    setActiveId(event.active.id);
    setActiveWidth(event.active.rect.current.initial?.width ?? null);
    setDropTarget(null);
  }

  function handleDragOver(event) {
    const next = resolveTarget(event);
    setDropTarget((prev) =>
      prev && next && prev.stageId === next.stageId && prev.index === next.index ? prev : next,
    );
  }

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

  function handleDragEnd(event) {
    const target = resolveTarget(event);
    resetDrag();

    // Гасим «хвостовой» клик, чтобы после переноса не открывалась карточка.
    suppressClick.current = true;
    window.setTimeout(() => {
      suppressClick.current = false;
    }, 240);

    if (!target) return;
    const lead = myLeads.find((item) => item.id === event.active.id);
    if (!lead) return;
    if (lead.stageId === target.stageId && lead.position === target.index) return;

    moveLead(lead.id, target.stageId, target.index);
  }

  const kpi = useMemo(() => {
    const sum = sumOf(myLeads);
    const potentialStage = stages[3] ?? stages[stages.length - 1];
    const potential = myLeads.filter((lead) => lead.stageId === potentialStage?.id).length;
    const hot = myLeads.filter((lead) => lead.hot).length;
    return [
      {
        label: "Лидов в работе",
        value: String(myLeads.length),
        foot: `${stages.length} ${stages.length === 1 ? "этап" : "этапов"} моей воронки`,
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
  }, [myLeads, stages]);

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
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragCancel={resetDrag}
          onDragEnd={handleDragEnd}
        >
          <div
            className={activeId != null ? "board board--dragging" : "board"}
            onClickCapture={(event) => {
              if (!suppressClick.current) return;
              event.preventDefault();
              event.stopPropagation();
              suppressClick.current = false;
            }}
          >
            {stages.map((stage) => {
              const stageLeads = myLeads.filter((lead) => lead.stageId === stage.id && visible(lead));

              let dropIndex = null;
              if (dropTarget && dropTarget.stageId === stage.id) {
                const order = myLeads.filter((lead) => lead.stageId === stage.id && lead.id !== activeId);
                dropIndex = order.slice(0, dropTarget.index).filter(visible).length;
              }

              return (
                <StageColumn
                  key={stage.id}
                  stage={stage}
                  dragging={activeId != null}
                  stageLeads={stageLeads}
                  dropIndex={dropIndex}
                  onAdd={() => addLead({ name: "Новый лид", city: "Москва", stageId: stage.id })}
                />
              );
            })}
          </div>

          <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.22, 0.8, 0.28, 1)" }}>
            {activeLead ? (
              <div className="drag-overlay" style={activeWidth ? { width: activeWidth } : undefined}>
                <LeadCard lead={activeLead} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
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
                  const stage = stages.find((item) => item.id === lead.stageId) ?? stages[0];
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
                          <span className="bar-row__dot" style={{ background: stage?.color ?? "var(--ink-3)" }} />
                          {stage?.name ?? "Без этапа"}
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
