/**
 * Клиенты компании: поиск и сегменты «Все / Мои / Проигранные».
 * Свои лиды открываются по клику, активные лиды коллег закрыты замком.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Lock, Search } from "lucide-react";

import { Shell } from "../app/Shell";
import { useLeads } from "../app/store";
import { Avatar } from "../ui/Tag";
import { TableSkeleton } from "../ui/States";
import { ME, OWNER } from "../mock/data";
import { money } from "../lib/format";
import { leadShipmentMargin } from "../lib/margin";

export function ClientsPage() {
  const navigate = useNavigate();
  const { leads, stages, shipments } = useLeads();
  const clients = useMemo(
    () =>
      leads.map((lead) => ({
        ...lead,
        stageName: stages.find((stage) => stage.id === lead.stageId)?.name ?? "Без этапа",
      })),
    [leads, stages],
  );
  const segments = [
    { value: "all", label: "Все", count: clients.length },
    { value: "mine", label: "Мои", count: clients.filter((client) => client.ownerId === ME.id).length },
    { value: "lost", label: "Проигранные", count: 0 },
  ];
  const [segment, setSegment] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 260);
    return () => window.clearTimeout(timer);
  }, []);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return clients.filter((client) => {
      if (segment === "lost") return false;
      if (segment === "mine" && client.ownerId !== ME.id) return false;
      if (!query) return true;
      return [client.name, client.contact, client.city, client.route, client.cargo]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [clients, segment, search]);

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
              placeholder="Компания, контакт, город"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="table-wrap">
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
              rows.map((client) => {
              const owner = OWNER(client.ownerId);
              const locked = client.ownerId !== ME.id;
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
                          {locked ? " · лид коллеги" : ""}
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
                    <span className="status status--progress" style={{ background: "var(--surface-3)", color: "var(--ink-2)" }}>
                      {client.stageName}
                    </span>
                  </td>
                  <td>
                    <div className="row" style={{ gap: 8 }}>
                      <Avatar initials={owner.initials} color={owner.color} size="sm" />
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

        {rows.length === 0 && (
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
        )}
      </div>
    </Shell>
  );
}
