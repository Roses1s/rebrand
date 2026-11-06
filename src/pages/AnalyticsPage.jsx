import { useState } from "react";
import { ArrowUpRight } from "lucide-react";

import { Shell } from "../app/Shell";
import { Segmented } from "../ui/Segmented";
import { Avatar } from "../ui/Tag";
import { ANALYTICS, TEAM } from "../mock/data";

const PERIODS = [
  { value: "week", label: "Неделя" },
  { value: "month", label: "Месяц" },
  { value: "quarter", label: "Квартал" },
];

function InflowChart({ data }) {
  const width = 640;
  const height = 180;
  const pad = 8;
  const max = Math.max(...data) || 1;
  const stepX = (width - pad * 2) / (data.length - 1);

  const points = data.map((value, index) => {
    const x = pad + index * stepX;
    const y = height - pad - (value / max) * (height - pad * 2);
    return [x, y];
  });

  const line = points.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${width - pad},${height - pad} L${pad},${height - pad} Z`;

  return (
    <svg className="chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="Поступление лидов">
      <defs>
        <linearGradient id="inflow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {[0.25, 0.5, 0.75].map((ratio) => (
        <line
          key={ratio}
          x1={pad}
          x2={width - pad}
          y1={height * ratio}
          y2={height * ratio}
          stroke="var(--line)"
          strokeWidth="1"
          strokeDasharray="4 6"
        />
      ))}

      <path d={area} fill="url(#inflow)" />
      <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />

      {points.map(([x, y], index) => (
        <circle key={index} cx={x} cy={y} r="3" fill="var(--surface)" stroke="var(--accent)" strokeWidth="2" />
      ))}
    </svg>
  );
}

export function AnalyticsPage() {
  const [period, setPeriod] = useState("month");
  const data = ANALYTICS[period];

  return (
    <Shell>
      <div className="toolbar">
        <Segmented label="Период" value={period} onChange={setPeriod} options={PERIODS} />
        <div className="toolbar__right">
          <button type="button" className="btn btn--sm">
            Экспорт
          </button>
        </div>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 14 }}>
        {data.kpi.map((item) => (
          <div key={item.label} className="kpi" style={{ "--kpi": item.color }}>
            <span className="kpi__label">{item.label}</span>
            <span className="kpi__value">{item.value}</span>
            <span className="kpi__foot">
              <ArrowUpRight size={12} strokeWidth={2.4} style={{ color: "var(--money)" }} />
              {item.foot}
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid--2-1">
        <div className="stack">
          <div className="card">
            <div className="card__head">
              <div>
                <div className="card__title">Воронка продаж</div>
                <div className="card__sub">Распределение лидов и сумма по этапам</div>
              </div>
            </div>
            <div className="card__body">
              {data.funnel.map((stage) => (
                <div key={stage.name} className="bar-row">
                  <span className="bar-row__name">
                    <span className="bar-row__dot" style={{ background: stage.color }} />
                    {stage.name}
                  </span>
                  <span className="bar-row__track">
                    <span className="bar-row__fill" style={{ width: `${stage.width}%`, background: stage.color }} />
                  </span>
                  <span className="bar-row__value">
                    {stage.count} · {stage.sum}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card__head">
              <div>
                <div className="card__title">Поступление лидов</div>
                <div className="card__sub">Динамика за 8 недель</div>
              </div>
            </div>
            <div className="card__body">
              <InflowChart data={data.inflow} />
              <div className="chart-legend">
                <span>
                  <span className="bar-row__dot" style={{ background: "var(--accent)" }} />
                  Новые лиды
                </span>
                <span style={{ marginLeft: "auto" }}>
                  Всего: <b style={{ color: "var(--ink)" }}>{data.inflow.reduce((a, b) => a + b, 0)}</b>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <div className="card__head">
              <div>
                <div className="card__title">Рейтинг менеджеров</div>
                <div className="card__sub">По сумме сделок</div>
              </div>
            </div>
            <div className="card__body" style={{ paddingTop: 6 }}>
              {data.managers.map((manager, index) => {
                const person = TEAM[index] ?? TEAM[0];
                return (
                  <div key={manager.name} className="mgr-row">
                    <Avatar initials={person.initials} color={person.color} />
                    <div style={{ minWidth: 0 }}>
                      <div className="mgr-row__name">{manager.name}</div>
                      <div className="mgr-row__sub">{manager.leads} лидов в работе</div>
                    </div>
                    <span className="mgr-bar">
                      <span className="mgr-bar__fill" style={{ width: `${manager.width}%`, background: manager.color }} />
                    </span>
                    <span className="mgr-row__sum">{manager.sum}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <div className="card__head">
              <div>
                <div className="card__title">Источники лидов</div>
                <div className="card__sub">Откуда приходят клиенты</div>
              </div>
            </div>
            <div className="card__body" style={{ paddingTop: 8 }}>
              {data.sources.map((source) => (
                <div key={source.name} className="bar-row">
                  <span className="bar-row__name">{source.name}</span>
                  <span className="bar-row__track">
                    <span className="bar-row__fill" style={{ width: `${source.width}%` }} />
                  </span>
                  <span className="bar-row__value">{source.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
