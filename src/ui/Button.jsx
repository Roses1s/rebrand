import { cn } from "./cn";

/**
 * Кнопка. Варианты (классы `btn--*` в ui.css): primary — главное действие,
 * ghost — второстепенное, soft — мягкий акцент, success / info — цветные
 * действия, danger — удаление. Без варианта — обычная кнопка с рамкой.
 * Размеры: sm, md (по умолчанию), lg.
 */
export function Button({
  variant = "default",
  size = "md",
  icon: Icon,
  iconRight: IconRight,
  className,
  children,
  ...props
}) {
  return (
    <button
      type="button"
      className={cn("btn", variant !== "default" && `btn--${variant}`, size !== "md" && `btn--${size}`, className)}
      {...props}
    >
      {Icon && <Icon size={size === "sm" ? 14 : 16} strokeWidth={1.9} />}
      {children}
      {IconRight && <IconRight size={size === "sm" ? 14 : 16} strokeWidth={1.9} />}
    </button>
  );
}

/** Квадратная иконка-кнопка для шапок, карточек и меню. */
export function IconButton({ icon: Icon, label, size = 16, className, ...props }) {
  return (
    <button type="button" className={cn("icon-btn", className)} aria-label={label} title={label} {...props}>
      <Icon size={size} strokeWidth={1.8} />
    </button>
  );
}
