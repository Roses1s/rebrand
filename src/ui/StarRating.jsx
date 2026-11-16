import { PRIORITY_MAX } from "../mock/data";

const LEVELS = Array.from({ length: PRIORITY_MAX }, (_, index) => index + 1);
const LABELS = ["Без приоритета", "Низкий приоритет", "Средний приоритет", "Высокий приоритет"];

export const priorityLabel = (value) => LABELS[value] ?? LABELS[0];

/**
 * Приоритет звёздами 0–3, как в рабочей CRM (`StarRating`).
 * Клик по звезде ставит приоритет, повторный клик по той же — снимает (0).
 * Без `onChange` звёзды только показывают значение.
 *
 * События мыши, пальца и клавиатуры не уходят наверх: на доске карточка
 * перетаскивается, и клик по звезде не должен начинать перенос или
 * открывать лид.
 */
export function StarRating({ value = 0, onChange, size = "md", className = "" }) {
  const label = `${priorityLabel(value)}: ${value} из ${PRIORITY_MAX}`;

  if (!onChange) {
    return (
      <span className={`stars stars--${size} ${className}`} role="img" aria-label={label} title={priorityLabel(value)}>
        {LEVELS.map((level) => (
          <span key={level} className={`stars__star${value >= level ? " is-on" : ""}`} aria-hidden="true">
            {value >= level ? "★" : "☆"}
          </span>
        ))}
      </span>
    );
  }

  const stop = (event) => event.stopPropagation();

  return (
    <span
      className={`stars stars--${size} stars--editable ${className}`}
      role="group"
      aria-label={label}
      onMouseDown={stop}
      onTouchStart={stop}
      onPointerDown={stop}
      onKeyDown={stop}
    >
      {LEVELS.map((level) => (
        <button
          key={level}
          type="button"
          className={`stars__star${value >= level ? " is-on" : ""}`}
          aria-label={value === level ? `Снять приоритет ${level}` : `Приоритет ${level} из ${PRIORITY_MAX}`}
          aria-pressed={value >= level}
          title={value === level ? "Снять приоритет" : priorityLabel(level)}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onChange(value === level ? 0 : level);
          }}
        >
          {value >= level ? "★" : "☆"}
        </button>
      ))}
    </span>
  );
}
