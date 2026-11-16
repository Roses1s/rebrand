/** Личная аналитика: период, своя воронка, поступление лидов, крупные сделки, источники. */
import { useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";

import { Shell } from "../app/Shell";
import { useLeads } from "../app/store";
import { Segmented } from "../ui/Segmented";
import { Avatar } from "../ui/Tag";
import { ANALYTICS, ME } from "../mock/data";
import { shortMoney } from "../lib/format";
import { leadShipmentMargin } from "../lib/margin";

const PERIODS = [
  { value: "week", label: "Неделя" },
  { value: "month", label: "Месяц" },
  { value: "quarter", label: "Квартал" },
];

/** Период влияет на поступление лидов и конверсию, но не на фактическую маржу заявок. */
const PERIOD_INFO = {
  week: { label: "за неделю", conversion: 19 },
  month: { label: "за месяц", conversion: 24 },
  quarter: { label: "за квартал", conversion: 27 },
};

function InflowChart({ data }) {
  const width = 640;
  const height = 170;
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
    <svg className="chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="Поступление моих лидов">
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
  const { leads, stages, shipments } = useLeads();
  const [period, setPeriod] = useState("month");
  const myLeads = useMemo(() => leads.filter((lead) => lead.ownerId === ME.id && !lead.lost), [leads]);
  const myLeadIds = useMemo(() => new Set(myLeads.map((lead) => lead.id)), [myLeads]);
  const myShipments = useMemo(() => shipments.filter((shipment) => myLeadIds.has(shipment.leadId)), [myLeadIds, shipments]);
  const marginOf = (lead) => leadShipmentMargin(lead.id, shipments);

  const stats = useMemo(() => {
    const margin = myLeads.reduce((total, lead) => total + marginOf(lead), 0);
    const potential = myLeads.filter((lead) => lead.stageId === stages[3]?.id).length;
    const marginLeads = myLeads.filter((lead) => marginOf(lead) !== 0).length;
    const avg = myLeads.length ? Math.round(margin / myLeads.length) : 0;
    return { margin, potential, marginLeads, avg };
  }, [myLeads, shipments, stages]);

  const funnel = useMemo(() => {
    const max = Math.max(...stages.map((stage) => myLeads.filter((lead) => lead.stageId === stage.id).length)) || 1;
    return stages.map((stage) => {
      const stageLeads = myLeads.filter((lead) => lead.stageId === stage.id);
      return {
        name: stage.name,
        color: stage.color,
        count: stageLeads.length,
        margin: stageLeads.reduce((total, lead) => total + marginOf(lead), 0),
        width: Math.round((stageLeads.length / max) * 92) + 8,
      };
    });
  }, [myLeads, shipments, stages]);

  const topDeals = useMemo(
    () => [...myLeads].filter((lead) => marginOf(lead) !== 0).sort((a, b) => marginOf(b) - marginOf(a)).slice(0, 4),
    [myLeads, shipments],
  );
  const maxDeal = topDeals.length ? marginOf(topDeals[0]) || 1 : 1;

  const inflow = ANALYTICS[period].inflow;
  const sources = ANALYTICS[period].sources;
  const periodInfo = PERIOD_INFO[period] ?? PERIOD_INFO.month;

  const kpi = [
    {
      label: "Маржа заявок",
      value: shortMoney(stats.margin),
      foot: `${myShipments.length} ${myShipments.length === 1 ? "заявка" : "заявок"} по моим лидам`,
      color: "var(--stage-4)",
    },
    {
      label: "Конверсия",
      value: `${periodInfo.conversion}%`,
      foot: `в потенциальных ${periodInfo.label}`,
      color: "var(--stage-5)",
    },
    { label: "Средняя маржа", value: shortMoney(stats.avg), foot: "на один лид", color: "var(--stage-1)" },
    {
      label: "Лиды с заявками",
      value: String(stats.marginLeads),
      foot: `${myLeads.length ? Math.round((stats.marginLeads / myLeads.length) * 100) : 0}% моей воронки`,
      color: "var(--stage-2)",
    },
  ];

  return (
    <Shell>
      <div className="toolbar">
        <Segmented label="Период" value={period} onChange={setPeriod} options={PERIODS} />
        <div className="toolbar__right">
          <span className="muted" style={{ fontSize: 11.5 }}>
            Только мои лиды
          </span>
        </div>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 14 }}>
        {kpi.map((item) => (
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
                <div className="card__title">Моя воронка</div>
                <div className="card__sub">Лиды и маржа заявок по этапам</div>
              </div>
            </div>
            <div className="card__body">
              {funnel.map((stage) => (
                <div key={stage.name} className="bar-row">
                  <span className="bar-row__name">
                    <span className="bar-row__dot" style={{ background: stage.color }} />
                    {stage.name}
                  </span>
                  <span className="bar-row__track">
                    <span className="bar-row__fill" style={{ width: `${stage.width}%`, background: stage.color }} />
                  </span>
                  <span className="bar-row__value">
                    {stage.count} · {shortMoney(stage.margin)}
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
              <InflowChart data={inflow} />
              <div className="chart-legend">
                <span>
                  <span className="bar-row__dot" style={{ background: "var(--accent)" }} />
                  Мои новые лиды
                </span>
                <span style={{ marginLeft: "auto" }}>
                  Всего: <b style={{ color: "var(--ink)" }}>{inflow.reduce((a, b) => a + b, 0)}</b>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <div className="card__head">
              <div>
                <div className="card__title">Лиды с заявками</div>
                <div className="card__sub">Мои лиды по марже заявок</div>
              </div>
            </div>
            <div className="card__body" style={{ paddingTop: 6 }}>
              {topDeals.map((deal) => {
                const margin = marginOf(deal);
                return (
                  <div key={deal.id} className="mgr-row">
                    <Avatar initials={deal.name.replace(/[^А-Яа-яA-Za-z]/g, "").slice(0, 2)} size="sm" />
                    <div style={{ minWidth: 0 }}>
                      <div className="mgr-row__name truncate">{deal.name}</div>
                      <div className="mgr-row__sub truncate">{deal.route}</div>
                    </div>
                    <span className="mgr-bar">
                      <span className="mgr-bar__fill" style={{ width: `${Math.round((margin / maxDeal) * 100)}%` }} />
                    </span>
                    <span className="mgr-row__sum">{shortMoney(margin)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <div className="card__head">
              <div>
                <div className="card__title">Мои источники</div>
                <div className="card__sub">Откуда приходят клиенты</div>
              </div>
            </div>
            <div className="card__body" style={{ paddingTop: 8 }}>
              {sources.map((source) => (
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
