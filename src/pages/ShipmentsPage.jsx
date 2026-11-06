import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Package } from "lucide-react";

import { Shell } from "../app/Shell";
import { Avatar } from "../ui/Tag";
import { OWNER, SHIPMENTS, SHIPMENT_STATUS } from "../mock/data";
import { money } from "../lib/format";

const FILTERS = [
  { value: "all", label: "Все" },
  { value: "new", label: "Новые" },
  { value: "checked", label: "Проверены" },
  { value: "loaded", label: "Загружены" },
  { value: "unloaded", label: "Выгружены" },
];

const TONE = { new: "new", checked: "progress", loaded: "done", unloaded: "done" };

export function ShipmentsPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");

  const rows = SHIPMENTS.filter((item) => filter === "all" || item.status === filter);
  const marginOf = (item) => item.customerPrice - item.carrierPrice;

  return (
    <Shell>
      <div className="toolbar">
        {FILTERS.map((item) => {
          const count = item.value === "all" ? SHIPMENTS.length : SHIPMENTS.filter((s) => s.status === item.value).length;
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
              <th>Менеджер</th>
              <th>Создан</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => {
              const owner = OWNER(item.ownerId);
              const margin = marginOf(item);
              return (
                <tr key={item.id} style={{ cursor: "pointer" }} onClick={() => navigate(`/shipments/${item.id}`)}>
                  <td className="mono" style={{ fontSize: 12 }}>
                    {item.number}
                  </td>
                  <td className="cell-main">{item.client}</td>
                  <td>
                    <div className="cell-main">{item.route}</div>
                    <div className="cell-sub">{SHIPMENT_STATUS[item.status].label}</div>
                  </td>
                  <td>
                    <span className={`status status--${TONE[item.status]}`}>{SHIPMENT_STATUS[item.status].label}</span>
                  </td>
                  <td className="cell-money">{money(item.customerPrice)}</td>
                  <td className="cell-money muted">{money(item.carrierPrice)}</td>
                  <td className={`cell-money ${margin >= 0 ? "cell-money--plus" : "cell-money--minus"}`}>
                    {margin >= 0 ? "+" : "−"} {money(Math.abs(margin))}
                  </td>
                  <td>
                    <div className="row" style={{ gap: 8 }}>
                      <Avatar initials={owner.initials} color={owner.color} size="sm" />
                      <span style={{ fontSize: 12.5 }}>{owner.name.split(" ")[0]}</span>
                    </div>
                  </td>
                  <td className="cell-sub">{item.created}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {rows.length === 0 && (
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
