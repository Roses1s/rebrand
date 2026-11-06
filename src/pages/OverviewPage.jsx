import { Link } from "react-router-dom";
import { ArrowUpRight, ArrowDownRight, Phone } from "lucide-react";

import { Shell } from "../app/Shell";
import { Button } from "../ui/Button";

const KPI = [
  { label: "Лидов в работе", value: "128", foot: "из 340 в базе", delta: "+12", up: true },
  { label: "Требуют звонка", value: "9", foot: "больше 3 дней без движения" },
  { label: "Заявок в пути", value: "14", foot: "из 26 за месяц" },
  { label: "Маржа за месяц", value: "2,43", unit: "млн ₽", foot: "план 2,8 млн", delta: "−6%", up: false },
];

/** Стартовый экран. Полная версия появится на шаге 2. */
export function OverviewPage() {
  return (
    <Shell crumb="Пульт · четверг, 6 ноября">
      <div className="page__head">
        <div>
          <h1 className="page__title">Добрый день, Алексей</h1>
          <p className="page__sub">Три лида ждут звонка, две заявки — подписания.</p>
        </div>
        <Button icon={Phone}>Обзвонить</Button>
      </div>

      <div className="kpi-row">
        {KPI.map((item) => (
          <div key={item.label} className="kpi">
            <span className="kpi__label">{item.label}</span>
            <span className="kpi__value">
              {item.value}
              {item.unit && <small>{item.unit}</small>}
            </span>
            <span className="kpi__foot">
              {item.delta && (
                <span className={`kpi__delta${item.up ? "" : " kpi__delta--down"}`}>
                  {item.up ? <ArrowUpRight size={12} strokeWidth={2.4} /> : <ArrowDownRight size={12} strokeWidth={2.4} />}
                  {item.delta}
                </span>
              )}
              {item.foot}
            </span>
          </div>
        ))}
      </div>

      <div className="placeholder-note" style={{ marginTop: 24 }}>
        <div>
          <strong>Каркас готов.</strong> Это первый шаг: токены, типографика, оболочка и витрина компонентов.
          Полный экран «Обзор» с воронкой, лентой событий и блоком «требует внимания» соберу на следующем шаге.
          Пока посмотрите <Link to="/kit" style={{ borderBottom: "1px solid var(--ink-3)" }}>витрину дизайн-системы</Link>.
        </div>
      </div>
    </Shell>
  );
}
