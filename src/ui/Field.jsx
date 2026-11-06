import { Search } from "lucide-react";
import { cn } from "./cn";

/** Обёртка поля: микро-подпись сверху, подсказка снизу. */
export function Field({ label, hint, htmlFor, className, children }) {
  return (
    <label className={cn("field", className)} htmlFor={htmlFor}>
      {label && <span className="field__label">{label}</span>}
      {children}
      {hint && <span className="field__hint">{hint}</span>}
    </label>
  );
}

export function Input({ className, ...props }) {
  return <input className={cn("input", className)} {...props} />;
}

export function Select({ className, children, ...props }) {
  return (
    <select className={cn("select", className)} {...props}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...props }) {
  return <textarea className={cn("textarea", className)} {...props} />;
}

/** Поиск с подсказкой клавиши. */
export function SearchInput({ value, onChange, placeholder = "Поиск", kbd = "⌘K", className }) {
  return (
    <div className={cn("search", className)}>
      <Search size={15} strokeWidth={1.9} />
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange?.(event.target.value)}
      />
      {kbd && <kbd>{kbd}</kbd>}
    </div>
  );
}
