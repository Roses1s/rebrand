const NBSP = "\u00A0";

/** 185000 → «185 000 ₽» */
export function money(value) {
  if (value == null) return "—";
  return `${Math.round(value).toLocaleString("ru-RU").replace(/\s/g, NBSP)}${NBSP}₽`;
}

/** 185000 → «185 тыс ₽», 2900000 → «2,9 млн ₽» */
export function shortMoney(value) {
  if (value == null) return "—";
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(".", ",").replace(",0", "")}${NBSP}млн${NBSP}₽`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${Math.round(value / 1_000)}${NBSP}тыс${NBSP}₽`;
  }
  return money(value);
}

/** «Виталий Нестеров» → «ВН» */
export function initials(name = "") {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}
