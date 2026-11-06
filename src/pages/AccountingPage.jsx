/** Бухгалтерия: честная заглушка из пяти блоков — раздел ещё в разработке. */
import { Banknote, FileText, Landmark, Receipt, Wallet } from "lucide-react";

import { Shell } from "../app/Shell";

const CARDS = [
  { title: "Счета клиентам", icon: FileText, note: "Выставление и оплата" },
  { title: "Счета поставщикам", icon: Receipt, note: "Перевозчики и подрядчики" },
  { title: "Банк", icon: Landmark, note: "Выписки и сверка" },
  { title: "Наличные", icon: Wallet, note: "Касса" },
  { title: "Разные операции", icon: Banknote, note: "Корректировки" },
];

export function AccountingPage() {
  return (
    <Shell>
      <div className="card">
        <div className="card__body" style={{ padding: 24 }}>
          <div className="row" style={{ gap: 14, alignItems: "flex-start" }}>
            <span className="tile tile--amber">
              <Landmark size={18} strokeWidth={1.9} />
            </span>
            <div>
              <div className="card__title">Раздел в разработке</div>
              <div className="card__sub" style={{ maxWidth: 520 }}>
                В рабочей CRM пока нет счетов, банка и кассовых операций — только заявки и маржа. Здесь появятся
                пять блоков, когда для них будут данные.
              </div>
            </div>
          </div>

          <div className="kpi-grid" style={{ marginTop: 20 }}>
            {CARDS.map(({ title, icon: Icon, note }) => (
              <div key={title} className="kpi" style={{ "--kpi": "var(--line-strong)" }}>
                <div className="kpi__top">
                  <span className="kpi__label">{title}</span>
                  <span className="tile tile--slate">
                    <Icon size={17} strokeWidth={1.8} />
                  </span>
                </div>
                <span className="kpi__foot">{note}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}
