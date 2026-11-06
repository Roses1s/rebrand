/** Заявки менеджера: фильтры по статусам, суммы клиента и перевозчика, маржа. */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Package } from "lucide-react";

import { Shell } from "../app/Shell";
import { ME, SHIPMENTS, SHIPMENT_STATUS } from "../mock/data";
import { TableSkeleton } from "../ui/States";
import { money } from "../lib/format";

const FILTERS = [
  { value: "all", label: "Все" },
  { value: "new", label: "Новые" },
  { value: "checked", label: "Проверены" },
  { value: "loaded", label: "Загружены" },
  { value: "unloaded", label: "Выгружены" },
];

const TONE = { new: "new", checked: "progress", loaded: "done", unloaded: "done" };

const myShipments = SHIPMENTS.filter((item) => item.ownerId === ME.id);

export function ShipmentsPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 260);
    return () => window.clearTimeout(timer);
  }, []);

  const rows = myShipments.filter((item) => filter === "all" || item.status === filter);
  const marginOf = (item) => item.customerPrice - item.carrierPrice;

  return (
    <Shell>
      <div className="toolbar">
        {FILTERS.map((item) => {
          const count =
            item.value === "all" ? myShipments.length : myShipments.filter((s) => s.status === item.value).length;
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
          <span className="muted" style={{ fontSize: 11.5 }}>
            Только мои заявки
          </span>
        </div>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Номер</th>
              <th>Клиент</th>
              <th>Маршрут</th>
              <th>Статус</th>
              <th style={{ textAlign: "right" }}>Клиент</th>
              <th style={{ textAlign: "right" }}>Перевозчик</th>
              <th style={{ textAlign: "right" }}>Маржа</th>
              <th>Создан</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} style={{ padding: 0 }}>
                  <TableSkeleton rows={5} cols={7} />
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((item) => {
              const margin = marginOf(item);
              return (
                <tr key={item.id} style={{ cursor: "pointer" }} onClick={() => navigate(`/shipments/${item.id}`)}>
                  <td className="mono" style={{ fontSize: 12 }}>
                    {item.number}
                  </td>
                  <td className="cell-main">{item.client}</td>
                  <td>
                    <div className="cell-main">{item.route}</div>
                    <div className="cell-sub">{item.cargo.type}</div>
                  </td>
                  <td>
                    <span className={`status status--${TONE[item.status]}`}>{SHIPMENT_STATUS[item.status].label}</span>
                  </td>
                  <td className="cell-money">{money(item.customerPrice)}</td>
                  <td className="cell-money muted">{money(item.carrierPrice)}</td>
                  <td className={`cell-money ${margin >= 0 ? "cell-money--plus" : "cell-money--minus"}`}>
                    {margin >= 0 ? "+" : "−"} {money(Math.abs(margin))}
                  </td>
                  <td className="cell-sub">{item.created}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {!loading && rows.length === 0 && (
          <div className="empty">
            <span className="empty__icon">
              <Package size={20} strokeWidth={1.8} />
            </span>
            <span className="empty__title">Заявок нет</span>
            <p className="empty__text">Выберите другой статус или создайте новую заявку из карточки лида.</p>
          </div>
        )}
      </div>
    </Shell>
  );
}
