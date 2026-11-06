import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Clock,
  Flame,
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
import { FUNNEL_KPI, OWNER, PRIORITY, STAGES } from "../mock/data";
import { shortMoney } from "../lib/format";

const ICONS = { users: Users, wallet: Wallet, target: Target, flame: Flame, clock: Clock };

function LeadCard({ lead }) {
  const owner = OWNER(lead.ownerId);
  const priority = PRIORITY[lead.priority];

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
        <Avatar initials={owner.initials} color={owner.color} size="sm" title={owner.name} />
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
  const [owner, setOwner] = useState("all");

  const visible = (lead) => {
    if (filter === "hot" && !lead.hot) return false;
    if (filter === "late" && !lead.late) return false;
    if (owner !== "all" && lead.ownerId !== Number(owner)) return false;
    return true;
  };

  return (
    <Shell>
      <div className="kpi-grid" style={{ marginBottom: 18 }}>
        {FUNNEL_KPI.map((item) => {
          const Icon = ICONS[item.icon];
          return (
            <div key={item.label} className="kpi" style={{ "--kpi": item.color }}>
              <div className="kpi__top">
                <span className="kpi__label">{item.label}</span>
                <span className="tile" style={{ background: `color-mix(in srgb, ${item.color} 12%, transparent)`, color: item.color }}>
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
        <Chip active={filter === "all"} count={20} onClick={() => setFilter("all")}>
          Все
        </Chip>
        <Chip active={filter === "hot"} count={8} onClick={() => setFilter("hot")}>
          Горячие
        </Chip>
        <Chip active={filter === "late"} count={1} onClick={() => setFilter("late")}>
          Просроченные
        </Chip>

        <div className="toolbar__right">
          <select
            className="select"
            aria-label="Менеджер"
            style={{ width: 168, height: 32, borderRadius: 999, fontSize: 12, paddingLeft: 14 }}
            value={owner}
            onChange={(event) => setOwner(event.target.value)}
          >
            <option value="all">Все менеджеры</option>
            <option value="1">Алексей Громов</option>
            <option value="2">Мария Соколова</option>
            <option value="3">Игорь Левченко</option>
            <option value="4">Дарья Ким</option>
          </select>
        </div>
      </div>

      <div className="board">
        {STAGES.map((stage) => {
          const leads = stage.leads.filter(visible);
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

              <div className="col__sub" title={stage.summary}>
                {stage.summary}
              </div>
              <div className="col__rule" style={{ "--col-color": stage.color }} />

              <div className="col__cards">
                {leads.map((item) => (
                  <LeadCard key={item.id} lead={item} />
                ))}

                {leads.length === 0 && (
                  <div className="card" style={{ padding: 18, textAlign: "center", color: "var(--ink-3)", fontSize: 12 }}>
                    По этому фильтру карточек нет
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
