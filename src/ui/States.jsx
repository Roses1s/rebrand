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
