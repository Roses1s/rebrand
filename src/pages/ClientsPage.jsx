/**
 * Клиенты компании: поиск и сегменты «Все / Мои / Проигранные»; вид —
 * плитки, как в рабочей CRM (`CustomerTile`), или таблица.
 * Свои лиды открываются по клику, активные лиды коллег закрыты замком
 * (администратору открыты все). «Все» и «Мои» — активные лиды; проигранные
 * живут в своём сегменте, их может открыть и забрать себе любой сотрудник.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, LayoutGrid, List, Lock, Search } from "lucide-react";

import { Shell } from "../app/Shell";
import { useLeads } from "../app/store";
import { Avatar } from "../ui/Tag";
import { TableSkeleton } from "../ui/States";
import { ShowMore } from "../ui/ShowMore";
import { StarRating } from "../ui/StarRating";
import { TagList } from "../ui/TagChip";
import { ME, OWNER } from "../mock/data";
import { money } from "../lib/format";
import { leadShipmentMargin } from "../lib/margin";

const PAGE_SIZE = 24;
const VIEW_KEY = "crm.customers.view";

/** Две буквы названия без формы собственности: «ООО «Гринлайн»» → «ГР». */
function monogram(name = "") {
  const clean = name.replace(/^(ООО|АО|ПАО|ЗАО|ИП|ГК)\s+/i, "").replace(/[«»"']/g, "").trim();
  return clean.slice(0, 2).toUpperCase() || "—";
}

/** Плитка клиента: монограмма, название, ИНН, этап или проигрыш, продавец. */
export function ClientTile({ client, tags, locked, onOpen }) {
  const owner = client.ownerId ? OWNER(client.ownerId) : null;
  const Tag = locked ? "div" : "button";
  return (
    <Tag
      {...(locked ? {} : { type: "button", onClick: onOpen })}
      className={`client-tile${locked ? " client-tile--locked" : ""}${client.lost ? " client-tile--lost" : ""}`}
      title={locked ? "Активный лид коллеги — доступны только название, ИНН и продавец" : undefined}
    >
      <div className="client-tile__head">
        <span className="client-tile__mark">{monogram(client.name)}</span>
        <span className="client-tile__title">
          <span className="client-tile__name">{client.name}</span>
          <span className="client-tile__inn mono">ИНН {client.inn || "—"}</span>
        </span>
        {locked && <Lock size={14} strokeWidth={2} className="client-tile__lock" aria-label="Лид коллеги" />}
      </div>

      {client.lost ? (
        <span className="client-tile__lost">
          <span className="status client-tile__lost-chip">Проигрыш</span>
          <span className="client-tile__reason">{client.lossReason || "без причины"}</span>
        </span>
      ) : (
        !locked && <span className="client-tile__stage">{client.stageName}</span>
      )}

      {!locked && (client.tagIds?.length > 0 || client.priority > 0) && (
        <div className="client-tile__meta">
          <TagList ids={client.tagIds} tags={tags} />
          {client.priority > 0 && <StarRating value={client.priority} size="sm" />}
        </div>
      )}

      <div className="client-tile__owner">
        {owner ? (
          <>
            <Avatar initials={owner.initials} className="avatar--xs" />
            {owner.name}
          </>
        ) : (
          <span className="muted">Не назначен</span>
        )}
      </div>
    </Tag>
  );
}

export function ClientsPage() {
  const navigate = useNavigate();
  const { leads, stages, shipments, tags } = useLeads();
  const clients = useMemo(
    () =>
      leads.map((lead) => ({
        ...lead,
        stageName: stages.find((stage) => stage.id === lead.stageId)?.name ?? "Без этапа",
      })),
    [leads, stages],
  );
  const active = clients.filter((client) => !client.lost);
  const segments = [
    { value: "all", label: "Все", count: active.length },
    { value: "mine", label: "Мои", count: active.filter((client) => client.ownerId === ME.id).length },
    { value: "lost", label: "Проигранные", count: clients.length - active.length },
  ];
  const [segment, setSegment] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [view, setView] = useState(() => {
    try {
      return window.localStorage.getItem(VIEW_KEY) ?? "tiles";
    } catch {
      return "tiles";
    }
  });

  function switchView(next) {
    setView(next);
    try {
      window.localStorage.setItem(VIEW_KEY, next);
    } catch {
      /* без сохранения вида — не страшно */
    }
  }

  useEffect(() => setLimit(PAGE_SIZE), [segment, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 260);
    return () => window.clearTimeout(timer);
  }, []);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return clients.filter((client) => {
      if ((segment === "lost") !== Boolean(client.lost)) return false;
      if (segment === "mine" && client.ownerId !== ME.id) return false;
      if (!query) return true;
      return [client.name, client.inn, client.contact, client.city, client.route, client.cargo]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [clients, segment, search]);
  const shown = rows.slice(0, limit);
  const isLocked = (client) => client.ownerId !== ME.id && !client.lost && !ME.isAdmin;

  return (
    <Shell search={search} onSearch={setSearch}>
      <div className="toolbar">
        {segments.map((item) => (
          <button
            key={item.value}
            type="button"
            className="chip"
            aria-pressed={segment === item.value}
            onClick={() => setSegment(item.value)}
          >
            {item.label}
            <span className="chip__count">{item.count}</span>
          </button>
        ))}

        <div className="toolbar__right">
          <div className="search" style={{ width: 280 }}>
            <Search size={15} strokeWidth={2} />
            <input
              type="search"
              placeholder="Компания, ИНН, контакт, город"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="view-switch" role="group" aria-label="Вид списка клиентов">
            <button type="button" aria-pressed={view === "tiles"} onClick={() => switchView("tiles")} title="Плитки">
              <LayoutGrid size={15} strokeWidth={1.9} />
            </button>
            <button type="button" aria-pressed={view === "table"} onClick={() => switchView("table")} title="Таблица">
              <List size={15} strokeWidth={1.9} />
            </button>
          </div>
        </div>
      </div>

      {view === "tiles" && (
        <div className="client-tiles-wrap">
          {loading ? (
            <div className="client-tiles">
              {Array.from({ length: 8 }, (_, index) => (
                <div key={index} className="client-tile client-tile--skeleton skeleton" />
              ))}
            </div>
          ) : (
            <div className="client-tiles">
              {shown.map((client) => (
                <ClientTile
                  key={client.id}
                  client={client}
                  tags={tags}
                  locked={isLocked(client)}
                  onOpen={() => navigate(`/crm/leads/${client.id}`)}
                />
              ))}
            </div>
          )}
          {!loading && <ShowMore shown={shown.length} total={rows.length} step={PAGE_SIZE} onMore={() => setLimit((n) => n + PAGE_SIZE)} />}
        </div>
      )}

      <div className="table-wrap" hidden={view !== "table"}>
        <table className="table">
          <thead>
            <tr>
              <th>Компания</th>
              <th>Контакт</th>
              <th>Направление</th>
              <th>Этап</th>
              <th>Менеджер</th>
              <th style={{ textAlign: "right" }}>Маржа</th>
              <th>Создан</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} style={{ padding: 0 }}>
                  <TableSkeleton rows={6} cols={6} />
                </td>
              </tr>
            )}
            {!loading &&
              shown.map((client) => {
              const owner = OWNER(client.ownerId);
              const locked = isLocked(client);
              return (
                <tr
                  key={client.id}
                  style={{ cursor: locked ? "default" : "pointer", opacity: locked ? 0.72 : 1 }}
                  title={locked ? "Активный лид коллеги — доступны только название, ИНН и продавец" : undefined}
                  onClick={() => !locked && navigate(`/crm/leads/${client.id}`)}
                >
                  <td>
                    <div className="cell-company">
                      <span className="cell-logo">
                        {locked ? <Lock size={14} strokeWidth={1.9} /> : <Building2 size={16} strokeWidth={1.9} />}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div className="cell-company__name">{client.name}</div>
                        <div className="cell-company__sub">
                          {client.city}
                          {locked ? " · лид коллеги" : client.lost && client.ownerId !== ME.id ? " · можно взять себе" : ""}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="cell-main">{client.contact}</div>
                    <div className="cell-sub mono">{client.phone}</div>
                  </td>
                  <td>
                    <div className="cell-main">{client.route}</div>
                    <div className="cell-sub">
                      {client.cargo} · {client.weight}
                    </div>
                  </td>
                  <td>
                    {client.lost ? (
                      <span className="status" style={{ background: "var(--danger-soft)", color: "var(--danger)" }} title="Причина проигрыша">
                        Проигрыш · {client.lossReason || "без причины"}
                      </span>
                    ) : (
                      <span className="status status--progress" style={{ background: "var(--surface-3)", color: "var(--ink-2)" }}>
                        {client.stageName}
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="row" style={{ gap: 8 }}>
                      <Avatar initials={owner.initials} size="sm" />
                      <span style={{ fontSize: 12.5 }}>{owner.name.split(" ")[0]}</span>
                    </div>
                  </td>
                  <td className="cell-money">{money(leadShipmentMargin(client.id, shipments))}</td>
                  <td className="cell-sub">{client.created}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {!loading && <ShowMore shown={shown.length} total={rows.length} step={PAGE_SIZE} onMore={() => setLimit((n) => n + PAGE_SIZE)} />}
      </div>

      {!loading && rows.length === 0 && (
        <div className="table-wrap">
          <div className="empty">
            <span className="empty__icon">
              <Building2 size={20} strokeWidth={1.8} />
            </span>
            <span className="empty__title">
              {segment === "lost" ? "Проигранных клиентов нет" : "Ничего не найдено"}
            </span>
            <p className="empty__text">
              {segment === "lost"
                ? "Когда лид проигран, он останется здесь — с причиной и историей."
                : "Попробуйте изменить запрос или сбросить фильтр."}
            </p>
          </div>
        </div>
      )}
    </Shell>
  );
}
