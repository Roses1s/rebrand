/**
 * Полоса этапов карточки лида.
 *
 * Показывает не больше `VISIBLE_COUNT` этапов, окно центрируется по текущему:
 * текущий этап всегда в середине видимой части. Скрытые слева и справа
 * этапы сворачиваются в кнопку «…» со счётчиком; по нажатию открывается
 * список скрытых этапов — можно сразу переключиться.
 *
 * Логика окна повторяет `FormStatusbar` рабочей CRM; оформление наше.
 * Меню рисуется вне полосы (`position: fixed`): у полосы `overflow-x: auto`,
 * и внутри неё список обрезался бы.
 */
import { useEffect, useRef, useState } from "react";

/** Сколько этапов держим видимыми; остальные уходят под «…». */
const VISIBLE_COUNT = 6;

/** disabled — карточка только для чтения (например, проигранный лид). */
export function StageBar({ stages = [], currentId, onSelect, disabled = false }) {
  const [open, setOpen] = useState(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef(null);

  const count = Math.max(1, Math.min(VISIBLE_COUNT, stages.length));
  const currentIndex = Math.max(
    stages.findIndex((stage) => stage.id === currentId),
    0,
  );
  const maxStart = Math.max(stages.length - count, 0);
  const start = Math.min(Math.max(currentIndex - Math.floor(count / 2), 0), maxStart);
  const before = stages.slice(0, start);
  const visible = stages.slice(start, start + count);
  const after = stages.slice(start + count);
  const hidden = open === "before" ? before : after;

  function close() {
    setOpen(null);
  }

  function toggle(event, side) {
    const rect = event.currentTarget.getBoundingClientRect();
    const width = 236;
    setPosition({
      top: rect.bottom + 6,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
    });
    setOpen((value) => (value === side ? null : side));
  }

  function pick(stageId) {
    close();
    onSelect(stageId);
  }

  // Меню стоит по координатам кнопки: при прокрутке и ресайзе закрываем,
  // чтобы оно не «отклеилось».
  useEffect(() => {
    if (!open) return undefined;
    const handle = (event) => {
      if (event.type === "keydown" && event.key === "Escape") {
        close();
        return;
      }
      if (menuRef.current?.contains(event.target)) return;
      close();
    };
    window.addEventListener("scroll", handle, true);
    window.addEventListener("resize", handle);
    window.addEventListener("keydown", handle);
    return () => {
      window.removeEventListener("scroll", handle, true);
      window.removeEventListener("resize", handle);
      window.removeEventListener("keydown", handle);
    };
  }, [open]);

  function more(side, items) {
    return (
      <button
        type="button"
        className="stage-strip__more"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open === side}
        aria-label={`${side === "before" ? "Предыдущие этапы" : "Следующие этапы"}: ${items.length}`}
        title={side === "before" ? "Предыдущие этапы" : "Следующие этапы"}
        onClick={(event) => toggle(event, side)}
      >
        <span aria-hidden="true">…</span>
        <span className="stage-strip__count">{items.length}</span>
      </button>
    );
  }

  return (
    <>
      <div className={`stage-strip${disabled ? " stage-strip--disabled" : ""}`} role="group" aria-label="Этапы лида">
        {before.length > 0 && more("before", before)}

        {visible.map((stage) => (
          <button
            key={stage.id}
            type="button"
            aria-pressed={stage.id === currentId}
            disabled={disabled}
            onClick={() => pick(stage.id)}
          >
            <span className="stage-strip__dot" style={{ background: stage.color }} />
            {stage.name}
          </button>
        ))}

        {after.length > 0 && more("after", after)}
      </div>

      {open && (
        <>
          <button type="button" className="stage-menu__scrim" aria-label="Закрыть" onClick={close} />
          <div
            ref={menuRef}
            role="menu"
            className="stage-menu"
            style={{ top: position.top, left: position.left }}
            aria-label={open === "before" ? "Предыдущие этапы" : "Следующие этапы"}
          >
            {hidden.map((stage) => (
              <button
                key={stage.id}
                type="button"
                role="menuitem"
                className="stage-menu__item"
                aria-current={stage.id === currentId ? "true" : undefined}
                onClick={() => pick(stage.id)}
              >
                <span className="stage-strip__dot" style={{ background: stage.color }} />
                <span className="stage-menu__name">{stage.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}
