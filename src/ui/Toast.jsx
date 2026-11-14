/**
 * Всплывающее уведомление внизу справа: показывается одно за раз,
 * гаснет само через несколько секунд, закрывается крестиком.
 * Живёт вне ленты и меню, поэтому `position: fixed` — под перенос
 * в основную CRM подходит без изменений.
 */
import { useEffect } from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

const ICONS = { warn: AlertTriangle, ok: CheckCircle2, info: Info };

export function Toast({ message, tone = "info", onClose, duration = 4500 }) {
  useEffect(() => {
    if (!onClose) return undefined;
    const timer = window.setTimeout(onClose, duration);
    return () => window.clearTimeout(timer);
  }, [message, duration, onClose]);

  const Icon = ICONS[tone] ?? Info;

  return (
    <div className={`toast toast--${tone}`} role="status" aria-live="polite">
      <span className="toast__icon">
        <Icon size={15} strokeWidth={2.1} />
      </span>
      <span className="toast__text">{message}</span>
      <button type="button" className="toast__close" onClick={onClose} aria-label="Закрыть уведомление">
        <X size={13} strokeWidth={2.2} />
      </button>
    </div>
  );
}
