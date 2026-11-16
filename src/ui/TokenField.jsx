/**
 * Поле-список значений чипами: города погрузки, тип кузова, способ погрузки.
 * Enter или запятая добавляют значение, Backspace в пустом поле убирает
 * последнее, крестик — конкретное. Как `TokenField` рабочей CRM.
 */
import { useState } from "react";
import { X } from "lucide-react";

export function TokenField({ value = [], onChange, placeholder, label, disabled = false }) {
  const [text, setText] = useState("");

  function add() {
    const next = text.trim().replace(/,$/, "").trim();
    if (next && !value.some((item) => item.toLowerCase() === next.toLowerCase())) onChange([...value, next]);
    setText("");
  }

  return (
    <div className={`token-field${disabled ? " is-disabled" : ""}`}>
      {value.map((item) => (
        <span key={item} className="token">
          {item}
          {!disabled && (
            <button type="button" className="token__remove" aria-label={`Убрать «${item}»`} onClick={() => onChange(value.filter((v) => v !== item))}>
              <X size={11} strokeWidth={2.4} />
            </button>
          )}
        </span>
      ))}
      {!disabled && (
        <input
          className="token-field__input"
          value={text}
          aria-label={label}
          placeholder={value.length ? "" : placeholder}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              // Enter в поле чипов добавляет значение и не сохраняет форму.
              event.stopPropagation();
              add();
            } else if (event.key === "Backspace" && !text && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={add}
        />
      )}
    </div>
  );
}
