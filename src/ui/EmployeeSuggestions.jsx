/**
 * Подсказки сотрудников под строкой поиска — для администратора, как
 * `BoardSuggestions` в рабочей CRM: от двух букв фамилии или имени
 * показываются до пяти сотрудников с действием («открыть доску»,
 * «показать заявки»). Менеджеру не показываются.
 */
import { ArrowRight } from "lucide-react";

import { Avatar } from "./Tag";
import { ME, TEAM } from "../mock/data";

export function EmployeeSuggestions({ query, excludeUserId, actionLabel, onPick }) {
  const q = (query ?? "").trim().toLowerCase();
  if (!ME.isAdmin || q.length < 2) return null;
  const found = TEAM.filter((user) => user.id !== excludeUserId && user.name.toLowerCase().includes(q)).slice(0, 5);
  if (!found.length) return null;

  return (
    <div className="search-suggest" role="listbox" aria-label="Сотрудники">
      <div className="search-suggest__title">Сотрудники</div>
      {found.map((user) => (
        <button
          key={user.id}
          type="button"
          role="option"
          aria-selected="false"
          className="search-suggest__item"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onPick(user.id)}
        >
          <Avatar initials={user.initials} color={user.color} />
          <span className="search-suggest__name">{user.name}</span>
          <span className="search-suggest__action">
            {actionLabel}
            <ArrowRight size={12} strokeWidth={2} />
          </span>
        </button>
      ))}
    </div>
  );
}
