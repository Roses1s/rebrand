import { cn } from "./cn";

/** Метка: точка цвета + название (витрина /kit). Теги лида — TagChip. */
export function Tag({ children, color = "var(--ink-3)", className }) {
  return (
    <span className={cn("tag", className)} style={{ "--tag-color": color }}>
      <span className="tag__dot" />
      {children}
    </span>
  );
}

/** Статус: new / progress / done / lost. */
export function Status({ tone = "progress", children }) {
  return <span className={cn("status", `status--${tone}`)}>{children}</span>;
}

/** Фильтр-чип с количеством. */
export function Chip({ active, count, children, ...props }) {
  return (
    <button type="button" className="chip" aria-pressed={active} {...props}>
      {children}
      {count != null && <span className="chip__count">{count}</span>}
    </button>
  );
}

/**
 * Квадратный аватар с инициалами (скругление 4 px, как в основной CRM).
 * Размеры: sm, md (по умолчанию), lg, xl.
 * Там, где размер задан стилями места (лента, «Продавец», плашка доски),
 * он важнее размера аватара.
 */
export function Avatar({ initials, title, size = "md", className }) {
  return (
    <span
      className={cn("avatar", size !== "md" && `avatar--${size}`, className)}
      title={title}
    >
      {initials}
    </span>
  );
}
