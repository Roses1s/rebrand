import { Inbox } from "lucide-react";

/** Пустое состояние: иконка, заголовок, пояснение, действие. */
export function Empty({ icon: Icon = Inbox, title, text, action }) {
  return (
    <div className="empty">
      <span className="empty__icon">
        <Icon size={19} strokeWidth={1.7} />
      </span>
      {title && <span className="empty__title">{title}</span>}
      {text && <p className="empty__text">{text}</p>}
      {action}
    </div>
  );
}

/** Скелетон загрузки. */
export function Skeleton({ width = "100%", height = 12, radius = 4, style }) {
  return <span className="skeleton" style={{ display: "block", width, height, borderRadius: radius, ...style }} />;
}

/** Скелетон таблицы: серые строки той же геометрии. */
export function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <div className="skeleton-table" aria-hidden="true">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="skeleton-table__row">
          {Array.from({ length: cols }).map((__, colIndex) => (
            <span
              key={colIndex}
              className="skeleton"
              style={{ height: 11, width: colIndex === 0 ? "70%" : "85%" }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
