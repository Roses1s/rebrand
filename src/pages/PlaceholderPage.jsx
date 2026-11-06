import { Link } from "react-router-dom";

import { Shell } from "../app/Shell";
import { Empty } from "../ui/States";

/** Временная заглушка для экранов, которые ещё не собраны. */
export function PlaceholderPage({ title, crumb, step, note }) {
  return (
    <Shell title={title} crumb={crumb}>
      <div className="page__head">
        <div>
          <h1 className="page__title">{title}</h1>
          <p className="page__sub">Экран появится на шаге {step}.</p>
        </div>
      </div>

      <div className="card">
        <Empty
          title="Собирается"
          text={note ?? "Каркас и компоненты уже готовы — осталось собрать этот экран из них."}
          action={
            <Link to="/kit" className="btn btn--ink btn--sm">
              Витрина компонентов
            </Link>
          }
        />
      </div>
    </Shell>
  );
}
