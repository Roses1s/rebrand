import { cn } from "./cn";

/** Метка клиента: точка цвета + название. */
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

/** Круглый аватар с инициалами. */
export function Avatar({ initials, title, size = "md", color = "", className }) {
  return (
    <span
      className={cn("avatar", size === "lg" && "avatar--lg", size === "xl" && "avatar--xl", color, className)}
      title={title}
    >
      {initials}
    </span>
  );
}
