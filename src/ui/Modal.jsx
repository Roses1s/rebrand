import { X } from "lucide-react";
import { useEffect } from "react";

/** Модалка: затемнение, Esc, клик по фону, кнопки внизу. */
export function Modal({ open, title, onClose, children, footer }) {
  useEffect(() => {
    if (!open) return undefined;
    function onKey(event) {
      if (event.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    // Клик по затемнению закрывает окно; нажатие внутри окна сюда не считается.
    // Фон — role="presentation": для клавиатуры есть Esc и кнопка «Закрыть».
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal__head">
          <span className="modal__title">{title}</span>
          <button type="button" className="icon-btn" aria-label="Закрыть" onClick={onClose}>
            <X size={16} strokeWidth={1.9} />
          </button>
        </div>
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__foot">{footer}</div>}
      </div>
    </div>
  );
}
