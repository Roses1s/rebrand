/**
 * Заявки: таблица как в рабочей CRM — Номер, Дата создания, Продавец, Клиент,
 * Перевозчик, Статус, Маржа, Всего — и строка «Итого» по текущему отбору.
 * Поиск — в верхней строке, фильтр — чипы статусов. Менеджер видит свои
 * заявки; администратор — все, и может оставить заявки одного сотрудника
 * (`?employee=N`, плашка «Заявки сотрудника»). Список догружается кнопкой
 * «Показать ещё N из M».
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Package, X } from "lucide-react";

import { Shell } from "../app/Shell";
import { useLeads } from "../app/store";
import { ME, OWNER, SHIPMENT_STATUS, TEAM } from "../mock/data";
import { Avatar } from "../ui/Tag";
import { TableSkeleton } from "../ui/States";
import { ShowMore } from "../ui/ShowMore";
import { EmployeeSuggestions } from "../ui/EmployeeSuggestions";
import { money } from "../lib/format";
import { shipmentMargin } from "../lib/margin";
import { formatShipmentDate } from "../lib/shipment";

const FILTERS = [
  { value: "all", label: "Все" },
  { value: "new", label: "Новые" },
  { value: "checked", label: "Проверены" },
  { value: "loaded", label: "Загружены" },
  { value: "unloaded", label: "Выгружены" },
];

/** Порция списка: столько строк показывается сразу и догружается кнопкой. */
export const PAGE_SIZE = 20;

const signedMoney = (value) => (value == null ? "—" : `${value >= 0 ? "" : "−"}${money(Math.abs(value))}`);

export function ShipmentsPage() {
  const navigate = useNavigate();
  const { shipments } = useLeads();
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);

  // Отбор по сотруднику — только у администратора; номер живёт в адресе.
  const employeeParam = Number(params.get("employee"));
  const employee = ME.isAdmin && employeeParam ? TEAM.find((user) => user.id === employeeParam) : null;

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 260);
    return () => window.clearTimeout(timer);
  }, []);

  // Новый отбор — снова первая порция.
  useEffect(() => setLimit(PAGE_SIZE), [filter, search, employee?.id]);

  const scoped = useMemo(() => {
    const q = search.trim().toLowerCase();
    return shipments
      .filter((item) => (employee ? item.ownerId === employee.id : ME.isAdmin || item.ownerId === ME.id))
      .filter((item) => !q || [item.number, item.client, item.carrierName, item.route].join(" ").toLowerCase().includes(q))
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  }, [shipments, employee, search]);

  const rows = scoped.filter((item) => filter === "all" || item.status === filter);
  const shown = rows.slice(0, limit);
  const totalMargin = rows.reduce((sum, item) => sum + (shipmentMargin(item) ?? 0), 0);
  const totalCustomer = rows.reduce((sum, item) => sum + (Number(item.customerPrice) || 0), 0);

  function setEmployee(userId) {
    const next = new URLSearchParams(params);
    if (userId) next.set("employee", String(userId));
    else next.delete("employee");
    setParams(next);
  }

  return (
    <Shell
      search={search}
      onSearch={setSearch}
      searchSuggestions={
        <EmployeeSuggestions
          query={search}
          excludeUserId={employee?.id}
          actionLabel="показать заявки"
          onPick={(userId) => {
            setSearch("");
            setEmployee(userId);
          }}
        />
      }
    >
      {employee && (
        <div className="board-banner" role="status">
          <Avatar initials={employee.initials} />
          <span>
            Заявки сотрудника: <b>{employee.name}</b>
          </span>
          <button type="button" className="board-banner__leave" onClick={() => setEmployee(null)}>
            <X size={13} strokeWidth={2.2} />
            Показать все
          </button>
        </div>
      )}

      <div className="toolbar">
        {FILTERS.map((item) => {
          const count = item.value === "all" ? scoped.length : scoped.filter((s) => s.status === item.value).length;
          return (
            <button
              key={item.value}
              type="button"
              className="chip"
              aria-pressed={filter === item.value}
              onClick={() => setFilter(item.value)}
            >
              {item.label}
              <span className="chip__count">{count}</span>
            </button>
          );
        })}

        <div className="toolbar__right">
          {ME.isAdmin ? (
            <label className="board-picker">
              <span className="board-picker__label">Сотрудник</span>
              <select
                className="board-picker__select"
                value={employee?.id ?? ""}
                onChange={(event) => setEmployee(Number(event.target.value) || null)}
                aria-label="Чьи заявки показать"
              >
                <option value="">Все сотрудники</option>
                {TEAM.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <span className="muted" style={{ fontSize: 11.5 }}>
              Только мои заявки
            </span>
          )}
        </div>
      </div>

      <div className="table-wrap">
        <table className="table shipments-table">
          <thead>
            <tr>
              <th>Номер</th>
              <th>Дата создания</th>
              <th>Продавец</th>
              <th>Клиент</th>
              <th>Перевозчик</th>
              <th>Статус</th>
              <th style={{ textAlign: "right" }}>Маржа</th>
              <th style={{ textAlign: "right" }}>Всего</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} style={{ padding: 0 }}>
                  <TableSkeleton rows={5} cols={8} />
                </td>
              </tr>
            )}
            {!loading &&
              shown.map((item) => {
                const margin = shipmentMargin(item);
                const seller = OWNER(item.ownerId);
                return (
                  <tr key={item.id} style={{ cursor: "pointer" }} onClick={() => navigate(`/shipments/${item.id}`)}>
                    <td className="mono" style={{ fontSize: 12 }}>
                      {/* Настоящая ссылка: фокус с клавиатуры и открытие в новой вкладке. */}
                      <Link to={`/shipments/${item.id}`} className="table-link" onClick={(event) => event.stopPropagation()}>
                        {item.number}
                      </Link>
                    </td>
                    <td className="cell-sub mono">{formatShipmentDate(item.createdAt)}</td>
                    <td>
                      <span className="seller-cell">
                        <Avatar initials={seller.initials} className="avatar--square" />
                        {seller.name}
                      </span>
                    </td>
                    <td>
                      <div className="cell-main">{item.client}</div>
                      <div className="cell-sub">{item.route}</div>
                    </td>
                    <td className="cell-sub">{item.carrierName || "—"}</td>
                    <td>
                      <span className={`status status--${SHIPMENT_STATUS[item.status].tone}`}>{SHIPMENT_STATUS[item.status].label}</span>
                    </td>
                    <td className={`cell-money ${margin == null || margin >= 0 ? "cell-money--plus" : "cell-money--minus"}`}>
                      {signedMoney(margin)}
                    </td>
                    <td className="cell-money">{money(item.customerPrice)}</td>
                  </tr>
                );
              })}
          </tbody>
          {/* Итоги — по всему текущему отбору, а не только по показанной порции. */}
          {!loading && rows.length > 0 && (
            <tfoot>
              <tr className="table-total">
                <td colSpan={6}>Итого · {rows.length}</td>
                <td className={`cell-money ${totalMargin >= 0 ? "cell-money--plus" : "cell-money--minus"}`}>
                  {signedMoney(totalMargin)}
                </td>
                <td className="cell-money">{money(totalCustomer)}</td>
              </tr>
            </tfoot>
          )}
        </table>

        {!loading && <ShowMore shown={shown.length} total={rows.length} step={PAGE_SIZE} onMore={() => setLimit((n) => n + PAGE_SIZE)} />}

        {!loading && rows.length === 0 && (
          <div className="empty">
            <span className="empty__icon">
              <Package size={20} strokeWidth={1.8} />
            </span>
            <span className="empty__title">{search ? "Ничего не найдено" : "Заявок нет"}</span>
            <p className="empty__text">
              {search
                ? "Попробуйте изменить запрос: ищем по номеру, клиенту, перевозчику и маршруту."
                : "Выберите другой статус или создайте новую заявку из карточки лида."}
            </p>
          </div>
        )}
      </div>
    </Shell>
  );
}
