import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronDown,
  MessageSquare,
  Package,
  Paperclip,
  Phone,
  Plus,
  SlidersHorizontal,
  Star,
} from "lucide-react";

import { Shell } from "../app/Shell";
import { Button } from "../ui/Button";
import { Avatar, Chip, Tag } from "../ui/Tag";
import { Segmented } from "../ui/Segmented";
import { STAGES } from "../mock/data";

function Stars({ value }) {
  return (
    <span className="stars" aria-label={`Приоритет ${value} из 3`}>
      {[1, 2, 3].map((n) => (
        <Star key={n} className={n <= value ? undefined : "stars__off"} fill={n <= value ? "currentColor" : "none"} />
      ))}
    </span>
  );
}

function LeadCard({ lead }) {
  const dayTone = lead.days >= 10 ? "days days--hot" : lead.days <= 2 ? "days days--fresh" : "days";

  return (
    <Link to={`/crm/leads/${lead.id}`} className="lead-card">
      <div className="lead-card__top">
        <span className="lead-card__name">{lead.name}</span>
        <Stars value={lead.priority} />
      </div>

      <span className="lead-card__meta">ИНН {lead.inn}</span>

      <span className="lead-card__contact">
        <Phone size={12} strokeWidth={2} />
        <span>{lead.logist_contact}</span>
      </span>

      {lead.tags.length > 0 && (
        <div className="lead-card__tags">
          {lead.tags.map((tag) => (
            <Tag key={tag.name} color={tag.color}>
              {tag.name}
            </Tag>
          ))}
        </div>
      )}

      <div className="lead-card__foot">
        <Avatar initials={lead.owner.initials} color={lead.owner.color} title={lead.owner.name} />
        <span className={dayTone}>{lead.days} дн.</span>
        <span className="lead-card__icons">
          {lead.shipments > 0 && (
            <span>
              <Package size={12} strokeWidth={1.9} />
              {lead.shipments}
            </span>
          )}
          {lead.attachments > 0 && (
            <span>
              <Paperclip size={12} strokeWidth={1.9} />
              {lead.attachments}
            </span>
          )}
        </span>
      </div>
    </Link>
  );
}

export function KanbanPage() {
  const [view, setView] = useState("kanban");
  const [filter, setFilter] = useState("all");

  const total = STAGES.reduce((sum, stage) => sum + stage.leads.length, 0);

  return (
    <Shell crumb="CRM · моя доска">
      <div className="page__head">
        <div>
          <h1 className="page__title">Лиды</h1>
          <p className="page__sub">
            {total} карточек · 4 требуют звонка · среднее время в воронке 6 дней
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button icon={SlidersHorizontal}>Настроить доску</Button>
          <Button variant="primary" icon={Plus}>
            Новый лид
          </Button>
        </div>
      </div>

      <div className="board-toolbar">
        <Chip active={filter === "all"} count={total} onClick={() => setFilter("all")}>
          Все
        </Chip>
        <Chip active={filter === "mine"} count={7} onClick={() => setFilter("mine")}>
          Мои
        </Chip>
        <Chip active={filter === "call"} count={4} onClick={() => setFilter("call")}>
          Требуют звонка
        </Chip>
        <Chip active={filter === "vip"} count={3} onClick={() => setFilter("vip")}>
          VIP
        </Chip>

        <div className="board-toolbar__right">
          <Segmented
            label="Вид"
            value={view}
            onChange={setView}
            options={[
              { value: "kanban", label: "Канбан" },
              { value: "list", label: "Список" },
            ]}
          />
          <Button icon={ChevronDown} iconRight={undefined}>
            Моя доска
          </Button>
        </div>
      </div>

      <div className="board">
        {STAGES.map((stage) => (
          <section key={stage.id} className="col" aria-label={stage.name}>
            <div className="col__head">
              <span className="col__dot" style={{ background: stage.color }} />
              <span className="col__name">{stage.name}</span>
              <span className="col__count">{stage.leads.length}</span>
              <button type="button" className="col__add" aria-label={`Добавить лид в «${stage.name}»`}>
                <Plus size={15} strokeWidth={2} />
              </button>
            </div>

            {stage.leads.map((lead) => (
              <LeadCard key={lead.id} lead={lead} />
            ))}

            <button
              type="button"
              className="btn btn--ghost btn--sm btn--block"
              style={{ justifyContent: "flex-start", color: "var(--ink-3)" }}
            >
              <Plus size={14} strokeWidth={2} />
              Добавить карточку
            </button>
          </section>
        ))}

        <section className="col" style={{ background: "transparent", borderStyle: "dashed" }}>
          <div className="col__head">
            <span className="col__dot" style={{ background: "var(--line-strong)" }} />
            <span className="col__name">Добавить этап</span>
          </div>
          <button type="button" className="btn btn--ghost btn--sm" style={{ justifyContent: "flex-start" }}>
            <Plus size={14} strokeWidth={2} />
            Новый этап
          </button>
        </section>
      </div>

      <div className="placeholder-note" style={{ marginTop: 18 }}>
        <MessageSquare size={16} strokeWidth={1.8} />
        <div>
          Это новый визуальный язык: светлая холодная основа, плавающая панель, индиго-градиент,
          мягкие тени и карточки, которые «поднимаются» под курсором. Ниже — то же самое в тёмной теме,
          переключатель внизу панели.
        </div>
      </div>
    </Shell>
  );
}
