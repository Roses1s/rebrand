import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, Flame, MapPin, MoreVertical, Package, Phone, Plus, Target, Users, Wallet } from "lucide-react";

import { Shell } from "../app/Shell";
import { Avatar, Chip } from "../ui/Tag";
import { ME, OWNER, PRIORITY, STAGES, TASKS } from "../mock/data";
import { shortMoney } from "../lib/format";

const ICONS = { users: Users, wallet: Wallet, target: Target, flame: Flame, clock: Clock };

const myLeads = STAGES.flatMap((stage) => stage.leads).filter((lead) => lead.ownerId === ME.id);
const sumOf = (leads) => leads.reduce((total, lead) => total + lead.price, 0);
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

export function FunnelPage() {
  const [filter, setFilter] = useState("all");

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
        <Chip
          active={filter === "hot"}
          count={myLeads.filter((lead) => lead.hot).length}
          onClick={() => setFilter("hot")}
        >
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
        </div>
      </div>

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
                  <div
                    className="card"
                    style={{ padding: 18, textAlign: "center", color: "var(--ink-3)", fontSize: 12 }}
                  >
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
    </Shell>
  );
}
