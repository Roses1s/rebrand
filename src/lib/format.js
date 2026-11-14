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

/** 1258291 → «1,2 МБ» */
export function fileSize(bytes) {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} МБ`;
}

/** Русское склонение: plural(3, ["минуту", "минуты", "минут"]) → «минуты» */
function plural(count, forms) {
  const tail = count % 100;
  if (tail > 10 && tail < 20) return forms[2];
  const last = count % 10;
  if (last === 1) return forms[0];
  if (last >= 2 && last <= 4) return forms[1];
  return forms[2];
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** ISO → «Сегодня» / «Вчера» / «6 ноября 2026 г.» — заголовок дня в ленте. */
export function dayLabel(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diff = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86_400_000);
  if (diff === 0) return "Сегодня";
  if (diff === 1) return "Вчера";
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

/** ISO → «только что», «5 минут назад», «2 часа назад», «3 дня назад». */
export function relativeTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const minutes = Math.round((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return "только что";
  if (minutes < 60) return `${minutes} ${plural(minutes, ["минуту", "минуты", "минут"])} назад`;
  const hours = Math.round(minutes / 60);
  if (hours < 24 && startOfDay(date) === startOfDay(new Date())) {
    return `${hours} ${plural(hours, ["час", "часа", "часов"])} назад`;
  }
  const days = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86_400_000);
  if (days === 1) return "вчера";
  if (days < 7) return `${days} ${plural(days, ["день", "дня", "дней"])} назад`;
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}

/** ISO → «6 ноября 2026 г., 09:14» — подсказка к относительному времени. */
export function absoluteTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const day = date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
  const time = date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  return `${day}, ${time}`;
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
