/**
 * Письмо клиенту: проверка адреса и ссылка на форму письма в Яндекс Почте.
 * Без React — этот файл переносится в основную CRM как есть.
 */

/** Простая проверка: есть «@», домен и точка в нём, без пробелов. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isEmail(value) {
  return EMAIL_RE.test(String(value ?? "").trim());
}

/**
 * Форма письма в Яндекс Почте с заполненным получателем.
 * Яндекс принимает адрес в параметре `mailto` в виде «mailto:client@example.ru».
 * Тема и тело намеренно не передаются — поля остаются пустыми.
 */
export function yandexComposeUrl(email) {
  return `https://mail.yandex.ru/compose?mailto=${encodeURIComponent(`mailto:${String(email).trim()}`)}`;
}

/**
 * Открывает Яндекс Почту в новой вкладке.
 * Возвращает false, если браузер заблокировал вкладку.
 */
export function openYandexCompose(email) {
  const win = window.open(yandexComposeUrl(email), "_blank");
  if (!win) return false;
  // Ссылку на нашу страницу не отдаём чужому домену.
  win.opener = null;
  return true;
}
