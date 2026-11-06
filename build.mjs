/**
 * Сборка автономных версий страниц: CSS и JS встраиваются в один HTML-файл.
 * Запуск: node build.mjs
 *   index.html    → crm-standalone.html      (Лиды)
 *   requests.html → requests-standalone.html (Заявки)
 */
import { readFile, writeFile } from 'node:fs/promises';

const PAGES = [
  { src: 'index.html', out: 'crm-standalone.html' },
  { src: 'requests.html', out: 'requests-standalone.html' },
  { src: 'trips.html', out: 'trips-standalone.html' },
];

const css = await readFile('assets/styles.css', 'utf8');

// ссылки между страницами внутри автономных файлов ведут на автономные версии
const LINK_MAP = {
  'index.html': 'crm-standalone.html',
  'requests.html': 'requests-standalone.html',
  'trips.html': 'trips-standalone.html',
};

const SCRIPT_RE = /<script src="(assets\/[^"]+\.js)"><\/script>/g;

async function inlineScripts(html) {
  let out = '';
  let last = 0;
  let match;

  SCRIPT_RE.lastIndex = 0;
  while ((match = SCRIPT_RE.exec(html)) !== null) {
    out += html.slice(last, match.index);
    const code = await readFile(match[1], 'utf8');
    out += `<script>\n${code}\n</script>`;
    last = match.index + match[0].length;
  }
  out += html.slice(last);
  return out;
}

for (const page of PAGES) {
  let html = await readFile(page.src, 'utf8');

  // функции-замены обязательны: в тексте JS/CSS есть последовательности вида $$,
  // которые String.replace иначе трактует как спецсимволы и портит код
  html = html.replace('<link rel="stylesheet" href="assets/styles.css" />', () => `<style>\n${css}\n</style>`);
  html = await inlineScripts(html);

  for (const [from, to] of Object.entries(LINK_MAP)) {
    html = html.split(`href="${from}"`).join(`href="${to}"`);
  }

  if (html.includes('assets/styles.css') || html.includes('src="assets/')) {
    throw new Error(`Не удалось встроить ресурсы в ${page.src}`);
  }

  await writeFile(page.out, html);
  console.log(`${page.out} собран — ${(html.length / 1024).toFixed(0)} КБ`);
}
