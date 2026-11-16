/**
 * Поле тегов карточки лида — как виджет тегов рабочей CRM:
 * выбранные теги пилюлями с крестиком, в выпадающем списке — выбор, поиск
 * и создание нового тега с цветом. Удалить общий тег может только
 * администратор: тег снимается со всех карточек компании.
 */
import { useEffect, useRef, useState } from "react";
import { Check, Plus, Trash2, X } from "lucide-react";

import { TagChip } from "./TagChip";
import { STAGE_COLORS } from "../app/store";

export function TagsField({ tags, value = [], onChange, onCreate, onDelete, canDelete = false, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [color, setColor] = useState(STAGE_COLORS[0]);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  const selected = value.map((id) => tags.find((tag) => tag.id === id)).filter(Boolean);
  const q = query.trim().toLowerCase();
  const found = tags.filter((tag) => !q || tag.name.toLowerCase().includes(q));
  const exact = tags.some((tag) => tag.name.toLowerCase() === q);

  const toggle = (id) => onChange(value.includes(id) ? value.filter((item) => item !== id) : [...value, id]);

  function create() {
    if (!q || exact) return;
    const tag = onCreate(query, color);
    if (tag && !value.includes(tag.id)) onChange([...value, tag.id]);
    setQuery("");
  }

  return (
    <div ref={rootRef} className={`tags-field${disabled ? " is-disabled" : ""}`}>
      <div className="tags-field__value">
        {selected.map((tag) => (
          <TagChip key={tag.id} name={tag.name} color={tag.color} size="md">
            {!disabled && (
              <button type="button" className="tag-chip__remove" aria-label={`Убрать тег «${tag.name}»`} onClick={() => toggle(tag.id)}>
                <X size={11} strokeWidth={2.4} />
              </button>
            )}
          </TagChip>
        ))}
        {!disabled && (
          <button
            type="button"
            className="tags-field__add"
            aria-haspopup="listbox"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <Plus size={12} strokeWidth={2.2} />
            {selected.length ? "Тег" : "Добавить тег"}
          </button>
        )}
        {disabled && selected.length === 0 && <span className="tags-field__empty">—</span>}
      </div>

      {open && (
        <div className="tags-field__pop">
          <input
            autoFocus
            className="tags-field__search"
            value={query}
            placeholder="Найти или создать тег"
            aria-label="Найти или создать тег"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                event.stopPropagation();
                if (found.length === 1 && exact) toggle(found[0].id);
                else create();
              }
            }}
          />
          <div className="tags-field__list" role="listbox" aria-multiselectable="true">
            {found.map((tag) => {
              const on = value.includes(tag.id);
              return (
                <div key={tag.id} className="tags-field__row">
                  <button type="button" role="option" aria-selected={on} className="tags-field__option" onClick={() => toggle(tag.id)}>
                    <span className="tags-field__check">{on && <Check size={12} strokeWidth={2.6} />}</span>
                    <TagChip name={tag.name} color={tag.color} />
                  </button>
                  {canDelete && (
                    <button
                      type="button"
                      className="tags-field__delete"
                      aria-label={`Удалить тег «${tag.name}» у всех карточек`}
                      title="Удалить тег у всех карточек (администратор)"
                      onClick={() => onDelete(tag.id)}
                    >
                      <Trash2 size={12} strokeWidth={2} />
                    </button>
                  )}
                </div>
              );
            })}
            {found.length === 0 && !q && <p className="tags-field__hint">Тегов пока нет</p>}
          </div>

          {q && !exact && (
            <div className="tags-field__create">
              <div className="swatches tags-field__colors" role="group" aria-label="Цвет нового тега">
                {STAGE_COLORS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={color === item}
                    aria-label={`Цвет ${item}`}
                    className="swatch-dot"
                    style={{ background: item, color: item }}
                    onClick={() => setColor(item)}
                  />
                ))}
              </div>
              <button type="button" className="tags-field__create-btn" onClick={create}>
                <Plus size={12} strokeWidth={2.2} />
                Создать «{query.trim()}»
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
