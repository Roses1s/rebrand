/**
 * Сборка автономной версии: весь CSS и JS встраиваются в один HTML-файл.
 * Запуск: node build.mjs  →  crm-standalone.html
 */
import { readFile, writeFile } from 'node:fs/promises';

const html = await readFile('index.html', 'utf8');
const css = await readFile('assets/styles.css', 'utf8');
const js = await readFile('assets/app.js', 'utf8');

// функции-замены обязательны: в тексте JS/CSS есть последовательности вида $$,
// которые String.replace иначе трактует как спецсимволы и портит код
const out = html
  .replace('<link rel="stylesheet" href="assets/styles.css" />', () => `<style>\n${css}\n</style>`)
  .replace('<script src="assets/app.js"></script>', () => `<script>\n${js}\n</script>`);

if (out.includes('assets/styles.css') || out.includes('assets/app.js')) {
  throw new Error('Не удалось встроить ресурсы: проверьте пути в index.html');
}

await writeFile('crm-standalone.html', out);
console.log(`crm-standalone.html собран — ${(out.length / 1024).toFixed(0)} КБ`);
