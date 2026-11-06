import { Link } from "react-router-dom";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  KanbanSquare,
  Package,
  PhoneCall,
  Plus,
  Upload,
  Users,
  Wallet,
} from "lucide-react";

import { Shell } from "../app/Shell";
import { Button } from "../ui/Button";
import { Avatar, Status } from "../ui/Tag";
import { ATTENTION, FEED, FUNNEL } from "../mock/data";

const KPI = [
  {
    label: "Лидов в работе",
    value: "128",
    icon: Users,
    tone: "",
    delta: "+12",
    up: true,
    foot: "из 340 в базе",
  },
  {
    label: "Требуют звонка",
    value: "9",
    icon: PhoneCall,
    tone: "warn",
    foot: "больше 3 дней без движения",
  },
  {
    label: "Заявок в пути",
    value: "14",
    icon: Package,
    tone: "",
    foot: "26 за ноябрь",
  },
  {
    label: "Маржа за месяц",
    value: "2,43",
    unit: "млн ₽",
    icon: Wallet,
    tone: "money",
    delta: "−6%",
    up: false,
    foot: "план 2,8 млн ₽",
  },
];

export function OverviewPage() {
  return (
    <Shell crumb="Четверг, 6 ноября">
      <div className="page__head">
        <div>
          <h1 className="page__title">Добрый день, Алексей</h1>
          <p className="page__sub">3 лида ждут звонка, 2 заявки — подписания.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button icon={CalendarDays}>Календарь</Button>
          <Button variant="primary" icon={Plus}>
            Новый лид
          </Button>
        </div>
      </div>

      <div className="kpi-grid">
        {KPI.map(({ label, value, unit, icon: Icon, tone, delta, up, foot }) => (
          <div key={label} className="kpi">
            <div className="kpi__top">
              <span className="kpi__label">{label}</span>
              <span className={`kpi__icon${tone ? ` kpi__icon--${tone}` : ""}`}>
                <Icon size={17} strokeWidth={1.9} />
              </span>
            </div>
            <div className="kpi__value">
              {value}
              {unit && <small>{unit}</small>}
            </div>
            <div className="kpi__foot">
              {delta && (
                <span className={`delta${up ? "" : " delta--down"}`}>
                  {up ? <ArrowUpRight size={12} strokeWidth={2.4} /> : <ArrowDownRight size={12} strokeWidth={2.4} />}
                  {delta}
                </span>
              )}
              {foot}
            </div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        <div className="stack">
          <div className="card">
            <div className="card__head">
              <div>
                <div className="card__title">Воронка</div>
                <div className="card__sub">Своя доска · 13 лидов</div>
              </div>
              <Link to="/crm" className="btn btn--sm">
                Открыть доску
              </Link>
            </div>
            <div className="card__body">
              <div className="funnel">
                {FUNNEL.map((stage) => (
                  <div key={stage.name} className="funnel__row">
                    <span className="funnel__name">
                      <span className="funnel__dot" style={{ background: stage.color }} />
                      {stage.name}
                    </span>
                    <span className="funnel__track">
                      <span
                        className="funnel__fill"
                        style={{ width: `${stage.width}%`, background: stage.color }}
                      />
                    </span>
                    <span className="funnel__count">{stage.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card__head">
              <div>
                <div className="card__title">Требует внимания</div>
                <div className="card__sub">Без движения, просрочки, новые лиды</div>
              </div>
              <Status tone="lost">4</Status>
            </div>
            <div className="card__body" style={{ paddingTop: 6 }}>
              <div className="attn">
                {ATTENTION.map((item) => (
                  <div key={item.id} className="attn__row">
                    <Avatar initials={item.owner.initials} className={item.owner.color} />
                    <div className="attn__main">
                      <div className="attn__name">{item.name}</div>
                      <div className="attn__meta">{item.meta}</div>
                    </div>
                    <span className={`days${item.tone === "danger" ? " days--hot" : ""}`}>{item.label}</span>
                    <Button size="sm">Позвонить</Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <div className="card__head">
              <div className="card__title">Лента</div>
              <Link to="/crm" className="btn btn--sm btn--ghost">
                Вся история
              </Link>
            </div>
            <div className="card__body" style={{ paddingTop: 10 }}>
              <div className="feed">
                {FEED.map((item, index) => (
                  <div key={index} className="feed__item">
                    <span className={`feed__dot${item.tone ? ` feed__dot--${item.tone}` : ""}`} />
                    <div style={{ minWidth: 0 }}>
                      <div className="feed__text" dangerouslySetInnerHTML={{ __html: item.text }} />
                      <div className="feed__time" style={{ marginLeft: 0 }}>
                        {item.time}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card__head">
              <div className="card__title">Быстрые действия</div>
            </div>
            <div className="card__body">
              <div className="quick">
                <button type="button" className="quick__item">
                  <KanbanSquare size={18} strokeWidth={1.8} />
                  Новая доска
                </button>
                <button type="button" className="quick__item">
                  <Package size={18} strokeWidth={1.8} />
                  Создать заявку
                </button>
                <button type="button" className="quick__item">
                  <Upload size={18} strokeWidth={1.8} />
                  Загрузить файл
                </button>
                <button type="button" className="quick__item">
                  <PhoneCall size={18} strokeWidth={1.8} />
                  Обзвонить
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
