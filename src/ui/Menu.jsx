import { useEffect, useRef, useState } from "react";

/**
 * Выпадающее меню: кнопка и список действий под ней. Сейчас это меню
 * «Действия» в шапке карточки лида (передать, отметить проигрышем, удалить).
 * Закрывается кликом мимо, Esc и после выбора пункта.
 *
 * `items`: { label, onSelect?, to?, danger?, disabled?, icon? } — пункт с `to`
 * рендерится ссылкой через `renderLink`, чтобы меню не зависело от роутера.
 * События не уходят наверх, чтобы клик по меню не срабатывал у родителя.
 */
export function Menu({ label, icon: Icon, items, align = "right", className = "", buttonClassName = "icon-btn", renderLink }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const stop = (event) => event.stopPropagation();
  const visible = items.filter(Boolean);

  return (
    <span
      ref={rootRef}
      className={`menu ${className}`}
      onMouseDown={stop}
      onTouchStart={stop}
      onPointerDown={stop}
      onKeyDown={stop}
    >
      <button
        type="button"
        className={buttonClassName}
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        <Icon size={15} strokeWidth={2} />
      </button>

      {open && (
        <span role="menu" className={`menu__list menu__list--${align}`}>
          {visible.map((item) => {
            const ItemIcon = item.icon;
            const content = (
              <>
                {ItemIcon && <ItemIcon size={14} strokeWidth={1.9} />}
                {item.label}
              </>
            );
            const cls = `menu__item${item.danger ? " menu__item--danger" : ""}`;
            if (item.to && renderLink) {
              return renderLink({ key: item.label, to: item.to, className: cls, role: "menuitem", children: content });
            }
            return (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                className={cls}
                disabled={item.disabled}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setOpen(false);
                  item.onSelect?.();
                }}
              >
                {content}
              </button>
            );
          })}
        </span>
      )}
    </span>
  );
}
