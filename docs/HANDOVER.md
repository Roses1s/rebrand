# Паспорт проекта: макет CRM Детроид

Документ для следующего агента и для себя: что это за проект, как он устроен,
что уже сделано, где грабли и что делать дальше. Пользовательское описание —
[`../README.md`](../README.md), решения — [`../PLAN.md`](../PLAN.md), матрица
функций — [`../PARITY.md`](../PARITY.md), живой статус — [`STATUS.md`](STATUS.md)
(дата, HEAD, что сделано и что дальше).

Проверено на 15.11.2026, ветка `arena/4c2e5e44-rebrand`. Последняя точка кода
перед текущей правкой — `805499b` (маржа заявок на карточке лида); точная
отметка текущего кода и результаты проверок всегда находятся в STATUS.md.

## 1. Что это

Макет **нового интерфейса** для рабочей CRM `Roses1s/crm` (CRM Детроид, транспортная
компания). Вёрстка собрана с нуля по присланному референсу, часть функций
рабочей системы повторена локально (готовность — в PARITY.md). Бэкенда нет:
используются демо-данные, состояние компонентов и `localStorage`.

- Рабочая CRM: FastAPI + PostgreSQL + React 19 + Tailwind v4, живёт на crmdetroid.ru.
- Этот репозиторий: React 19 + Vite 8 + собственные CSS-токены, чистый макет.
- Бренд взят из рабочей CRM: логотип `public/logo.svg`, название «CRM Детроид»,
  подпись «Детроид · транспортная компания».
- Перенос в рабочую CRM — отдельная задача: см. раздел 12.

## 2. Запуск

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production-сборка, обязательная проверка
npm run preview
```

Пользователь на Windows, Node ставил MSI с nodejs.org (`winget` нет). После каждой
правки ему нужен блок:

```powershell
git pull origin arena/4c2e5e44-rebrand; npm install; npm run dev
```

Если dev-сервер уже запущен — `git pull`, при новых зависимостях `npm install`,
перезапуск и **Ctrl+Shift+R**.

Крупную задачу сначала согласовать с владельцем: один план из 3–5 шагов,
дождаться «да», затем выполнять без остановок на каждом техническом шаге.
Точечные согласованные правки не превращать в новую переработку интерфейса.

## 3. Стек

| Слой | Что используется |
|---|---|
| UI | React 19, React Router 7, lucide-react |
| Перетаскивание | @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities |
| Сборка | Vite 8 (внутри rolldown, отдельного esbuild нет) |
| Стили | собственные CSS-файлы, токены в `tokens.css`, без Tailwind |
| Данные | `src/mock/data.js` + `localStorage` |

## 4. Маршруты

| Маршрут | Экран |
|---|---|
| `/` | редирект на `/crm` |
| `/crm` | Воронка лидов: KPI, фильтры, канбан и список |
| `/crm/leads/:id` | Карточка лида |
| `/customers` | Клиенты |
| `/shipments` | Заявки |
| `/shipments/:id` | Карточка заявки |
| `/tasks` | Задачи |
| `/analytics` | Аналитика |
| `/accounting` | Бухгалтерия (заглушка) |
| `/settings` | Настройки, роль, редактор этапов |
| `/admin` | Администрирование (только роль admin) |
| `/kit` | Витрина дизайн-системы |
| `*` | редирект на `/crm` |

## 5. Структура кода

```
src/
  main.jsx             точка входа, стили
  App.jsx              BrowserRouter, LeadsProvider, маршруты
  app/Shell.jsx        панель, верхняя строка, диалог нового лида, тема
  app/store.jsx        лиды и этапы в localStorage, вся мутационная логика
  pages/               11 экранов (Funnel, Lead, Clients, Shipments, Shipment,
                       Tasks, Analytics, Accounting, Settings, Admin, Kit)
  ui/                  Button, Field, Tag (Status/Chip/Avatar), Modal,
                       Segmented, States (Empty/Skeleton/TableSkeleton),
                       Chatter (лента карточки лида), StageBar (полоса
                       этапов с «…»), Toast (уведомление), cn
  lib/format.js        money, shortMoney, initials, fileSize,
                       relativeTime, absoluteTime, dayLabel
  lib/margin.js        маржа заявки и сумма маржи связанных с лидом заявок
  mock/data.js         демо-данные в форме API рабочей CRM
  mock/chatter.js      лента лида в форме TimelineEntry рабочей CRM
  styles/              tokens, base, ui, shell, board, pages, kit, compact,
                       lead-form, stage-bar, chatter, toast
```

Порядок в `styles/index.css`: основные стили → `compact.css` → локальные
`lead-form.css`, `stage-bar.css`, `chatter.css`, `toast.css`. Компактный слой
переопределяет размеры, не цвета; локальные слои идут после него намеренно.
`chatter.css` держит `.chatter*` и раскладку `.lead-layout`/`.lead-facts`.

## 6. Данные и хранение

`src/mock/data.js` экспортирует: `ME`, `IS_ADMIN`, `TEAM`, `PRIORITY`, `STAGES`
(5 этапов с лидами), `ALL_LEADS`, `OWNER()`, `CLIENTS`, `SHIPMENT_STATUS`,
`SHIPMENTS`, `TASKS`, `TASK_TYPES`, `EDO_OPERATORS`, `ANALYTICS` (по периодам:
`inflow`, `sources`). В исходном наборе 18 лидов/клиентов, из них 10 своих;
своих заявок — 3, задач — 7.

`store.jsx` — единственное место, где меняются лиды и этапы:

- `leads` — записи под ключом менеджера, у каждой `stageId` и `position`;
  исходный демо-набор включает и лиды коллег, доска отбирает только `ownerId === ME.id`;
- `updateLead(id, patch)` — правка полей карточки (название, ИНН, контакты,
  оператор ЭДО, бухгалтер), единственная точка сохранения формы лида. Карточка вызывает его
  из автосохранения (3 с), по Enter и по кнопке «Сохранить», а также при уходе
  со страницы с несохранёнными правками;
- `stages` — этапы текущего менеджера: `id`, `name`, `hint`, `color`;
- `addLead`, `moveLead(id, stageId, index)`, `removeLeads`, `addStage`,
  `updateStage`, `moveStage`, `removeStage`, `resetAll`;
- при загрузке лиды без своего этапа падают на первый, позиции нормализуются.

Ключи `localStorage`:

| Ключ | Смысл |
|---|---|
| `crm.leads.<id>.v1` | лиды и их позиции |
| `crm.stages.<id>.v1` | этапы воронки |
| `crm.theme` | `light` / `dark` |
| `crm.accent` | `indigo` / `violet` / `emerald` |
| `crm.density` | `comfort` / `compact` |
| `crm.role` | `manager` / `admin` |
| `crm.funnel.view` | `board` / `list` |
| `crm.sidebar` | `open` / `collapsed` (свёрнутая панель) |

Сброс: «Настройки → Сбросить мою воронку» (`resetAll`). Роль: там же, страница
перезагружается, потому что `IS_ADMIN` читается при импорте `data.js`.

Задачи и заметки чаттера живут в состоянии компонентов, без записи в
localStorage, и сбрасываются при размонтировании или перезагрузке. «Клиенты»
читают статический `CLIENTS`, а не `useLeads`: правка лида автоматически
не обновляет этот список. Это ограничения макета, не работающего API.

## 7. Механика воронки

**Карточки и KPI:**

- `LeadCard` общий для доски и `DragOverlay`: название, контакт, приоритет, маржа
  связанных заявок, срок. `leadShipmentMargin(lead.id, SHIPMENTS)` складывает
  `customerPrice − carrierPrice` только у заявок с тем же `leadId`; без заявок — 0 ₽.
  В макете нет отдельных ставок НДС и вычета, поэтому формула совпадает с его
  экранами заявок, но упрощена относительно рабочей CRM. Приоритет — слева под
  контактом (`.lead-card__priority`, `flex-start`);
- направление, материал и тоннаж скрыты только на карточках, но остаются в данных
  и в списке; `title` с подсказкой о переносе убран, атрибуты dnd-kit сохранены;
- KPI «Маржа заявок», сводка «Моя доска», шапки этапов и денежная колонка
  списка считают `sumMarginsOf(myLeads)` через `leadShipmentMargin`. Фильтры
  «Горячие» и «Просроченные» общий итог не меняют, сортировка списка идёт по
  той же марже;
- источник лидов — `crm.leads.<id>.v1`, при отсутствии сохранения — демо из
  `STAGES`; источник денег — `SHIPMENTS`. В исходном наборе 10 своих лидов,
  5 связанных заявок и 213 000 ₽ маржи. Ожидаемой суммы и `FUNNEL_KPI` больше нет;
- новый лид создаётся только через общую форму: Компания, ИНН, Контакт логиста,
  Телефон логиста, E-mail — все обязательны. Кнопка «+» колонки открывает ту же
  форму через `openLeadDialog(stageId)` и сохраняет лид в выбранный этап. Денежного
  поля нет: до первой связанной заявки он везде даёт 0 ₽ маржи.

**Перетаскивание** (`FunnelPage.jsx`):

- `DndContext` с сенсорами: `MouseSensor` (срабатывание после 6 px),
  `TouchSensor` (долгое нажатие 160 мс, допуск 8), `KeyboardSensor` с
  `sortableKeyboardCoordinates`;
- колонки — `useDroppable` с id `stage-<id>`, карточки — `useSortable`;
- своя `collisionDetection`: `pointerWithin`, запасной `rectIntersection`,
  карточки приоритетнее колонки;
- `resolveTarget` считает этап и индекс вставки: центр перетаскиваемой карточки
  выше центра карточки под курсором — вставить перед, ниже — после;
- призрак в `DragOverlay` (наклон −3°, масштаб 1.02, обводка акцентом), источник
  с прозрачностью 40 %;
- после переноса клик гасится (`suppressClick`), чтобы карточка не открывалась;
- пустая колонка показывает слот, в остальных — линия вставки между карточками.

**Этапы** (`SettingsPage.jsx`): создание, название, подсказка, цвет из палитры
`STAGE_COLORS`, порядок стрелками, удаление (лиды переезжают на соседний этап,
последний удалить нельзя). Правки сохраняются сразу.

## 8. Роли и приватность

- По умолчанию — менеджер: на доске только свои лиды, свои задачи и заявки.
- «Настройки → Роль в макете → Администратор»: в панели появляется
  «Администрирование» (`/admin`), у менеджера на этом маршруте заглушка.
- Клиенты: свои лиды открываются, лиды коллег приглушены, с замком и без перехода.
- Карточка чужого лида (`/crm/leads/:id`): только название, ИНН, город, продавец.
- Авторизации нет — это осознанное решение макета.

## 9. Оформление

- Токены: `styles/tokens.css` (светлая и тёмная темы, три акцента, плотность).
- Оформление по референсу: фон `#F7F6FB`, акцент `#6C5CE7`, градиент
  `135deg #7C5CFC → #A78BFA`, мягкие тени, кнопки-пилюли.
- Компактный слой: панель 228 px (свёрнутая — 68 px, только иконки), верхняя
  строка 64 px, колонка 258 px, текст 13 px.
- Бренд: `public/logo.svg` выводится через CSS-маску в `.brand__logo` и красится
  `currentColor` (в тёмной теме светлый, в светлой тёмный).
- Заголовок и favicon страницы — в `index.html`.

**Не менять без прямой просьбы владельца:** палитру, тёмную тему, бренд, размеры
компактного слоя, менеджерский вид по умолчанию.

## 10. Грабли

1. **Браузера в песочнице нет.** Визуальную проверку делает владелец по скриншотам.
   Проверяй сборку и серверный рендер (раздел 11).
2. **Vite 8 использует rolldown**, отдельного `esbuild` в `node_modules` нет.
   Для SSR-смоука собирай через `npx vite build --ssr`.
3. **`/tmp` не сохраняется** между сессиями. Важное — только в репозитории.
4. **`node_modules` не переживает перезапуск** — `npm install` после паузы.
5. **dnd-kit**: не добавляй `PointerSensor` вместе с `TouchSensor` — на телефоне
   сломается прокрутка. Клик по ссылке внутри карточки не должен превращаться
   в перенос: порог 6 px обязателен.
6. **`--r-pill`** объявлен в `tokens.css`. Если добавить `var(--r-pill)` без
   токена, браузер молча нарисует прямые углы.
7. **Миграции localStorage**: у старых сохранений нет `position` — нормализация
   в `loadState()`. Меняя формат, поднимай версию ключа (`v1` → `v2`).
8. **`IS_ADMIN` читается на импорте**, поэтому смена роли перезагружает страницу.
9. **Не возвращать**: тёмную «Терминал диспетчера», индиго «Soft SaaS», блок
   «Команда» в панели, фильтр «Все менеджеры», рейтинг менеджеров — это
   отвергнутые итерации.
10. **PARITY.md** — обязательная сверка. Новые экраны не должны убирать функции
    из таблицы; статусы обновляются вместе с кодом.

## 11. Проверки

Минимум перед каждым коммитом:

```bash
npm run build
```

Серверный рендер всех 11 экранов в обеих ролях. Рецепт для Bash в песочнице:
он создаёт отдельную временную папку, удаляет её при выходе и не добавляет
постоянных тестов или зависимостей. Вместе со списком и отсутствующими/чужими
записями выполняются 30 рендеров.

```bash
(
set -euo pipefail
mkdir -p .cache
check_dir=$(mktemp -d .cache/ssr-XXXXXX)
trap 'rm -rf "$check_dir"' EXIT
cat > "$check_dir/smoke.jsx" <<'EOF'
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { LeadsProvider } from "../../src/app/store";
import { ME } from "../../src/mock/data";
import { FunnelPage } from "../../src/pages/FunnelPage";
import { LeadPage } from "../../src/pages/LeadPage";
import { ClientsPage } from "../../src/pages/ClientsPage";
import { ShipmentsPage } from "../../src/pages/ShipmentsPage";
import { ShipmentPage } from "../../src/pages/ShipmentPage";
import { TasksPage } from "../../src/pages/TasksPage";
import { AnalyticsPage } from "../../src/pages/AnalyticsPage";
import { AccountingPage } from "../../src/pages/AccountingPage";
import { SettingsPage } from "../../src/pages/SettingsPage";
import { AdminPage } from "../../src/pages/AdminPage";
import { KitPage } from "../../src/pages/KitPage";
const screens = [
  ["/crm", FunnelPage, "/crm"], ["/crm/leads/:id", LeadPage, "/crm/leads/1"],
  ["/customers", ClientsPage, "/customers"], ["/shipments", ShipmentsPage, "/shipments"],
  ["/shipments/:id", ShipmentPage, "/shipments/147"], ["/tasks", TasksPage, "/tasks"],
  ["/analytics", AnalyticsPage, "/analytics"], ["/accounting", AccountingPage, "/accounting"],
  ["/settings", SettingsPage, "/settings"], ["/admin", AdminPage, "/admin"],
  ["/kit", KitPage, "/kit"],
];
function render(path) {
  const html = renderToString(
    <MemoryRouter initialEntries={[path]}><LeadsProvider><Routes>
      {screens.map(([pattern, Screen]) => <Route key={pattern} path={pattern} element={<Screen />} />)}
    </Routes></LeadsProvider></MemoryRouter>,
  );
  assert.ok(html.includes('<main class="main">'), path);
  console.log(`PASS ${process.env.CHECK_ROLE} ${path}`);
  return html;
}
export function run() {
  assert.equal(ME.isAdmin, process.env.CHECK_ROLE === "admin");
  for (const [, , path] of screens) {
    const html = render(path);
    if (path === "/crm") {
      assert.ok(!html.includes("Перетащите карточку на другой этап"));
      assert.ok(html.includes("lead-card__priority"));
      assert.ok(html.includes("Маржа по заявкам:"));
      assert.ok(html.includes("Маржа заявок"));
      assert.ok(!html.includes("Сумма воронки"));
    }
    if (path === "/admin") assert.ok(html.includes(ME.isAdmin ? "Доступ бухгалтеров" : "Доступ только у администратора"));
  }
  assert.ok(render("/crm/leads/3").includes("Лид коллеги."));
  assert.ok(render("/crm/leads/999999").includes("Лид не найден"));
  assert.ok(render("/shipments/999999").includes("Заявка не найдена"));
  window.localStorage.setItem("crm.funnel.view", "list");
  assert.ok(render("/crm").includes('class="table leads-table"'));
}
EOF
npx vite build --ssr "$check_dir/smoke.jsx" --outDir "$check_dir/ssr-out" --emptyOutDir true
for role in manager admin; do
  CHECK_ROLE="$role" CHECK_MODULE="./$check_dir/ssr-out/smoke.js" node --input-type=module <<'EOF'
const storage = new Map([["crm.role", process.env.CHECK_ROLE]]);
globalThis.window = { localStorage: {
  getItem(key) { return storage.get(key) ?? null; },
  setItem(key, value) { storage.set(key, String(value)); },
} };
(await import(process.env.CHECK_MODULE)).run();
EOF
done
)
```

SSR не запускает эффекты и не проверяет CSS глазами: в клиентах и заявках
рендерится начальный скелетон. Интерактивность, автосохранение и внешний вид
нужно отдельно проверять в браузере; успешный HTTP 200 выдаёт только оболочку SPA.

Маршруты при запущенном `npm run dev` (в песочнице сервер должен слушать
`0.0.0.0:5173`; это уже задано в vite.config.js):

```bash
(
set -euo pipefail
for r in / /crm /crm/leads/1 /crm/leads/3 /customers /shipments /shipments/147 /tasks /analytics /accounting /settings /admin /kit; do
  code=$(curl --silent --show-error --fail --output /dev/null --write-out '%{http_code}' --max-time 10 "http://127.0.0.1:5173$r")
  printf '%s: %s\n' "$r" "$code"
  test "$code" = 200
done
)
```

Ручной чек-лист для владельца: перетаскивание мышью/пальцем/клавиатурой;
пустая колонка; порядок внутри этапа; новый лид из шапки и «+» этапа (ровно пять
обязательных полей, ИНН только цифрами, создание в выбранном этапе); создание и
удаление этапа; смена роли; тёмная тема; телефон; перезагрузка сохраняет лиды,
этапы, их порядок и настройки (но не задачи и новые заметки).

## 12. Что дальше

Готово: воронка (канбан, список, перетаскивание, этапы, массовые действия,
создание лида), карточка лида, клиенты, заявки, задачи, аналитика, бухгалтерия,
настройки, админка, витрина, бренд, тёмная тема, адаптив, состояния загрузки.

Не реализовано (осознанно, поведение — не вёрстка):

- глобальный поиск `⌘K` и хранение поиска в адресе страницы;
- открытие доски сотрудника из админки (сейчас только таблица пользователей);
- диалоги редактирования пользователей и бухгалтеров, удаление с подтверждением;
- ошибки API с «Повторить», догрузка списков, скелетоны воронки и задач;
- перетаскивание самих колонок (порядок этапов меняется стрелками).

Перенос в рабочую CRM:

- этапы и порядок лидов — API этапов (CRUD + позиция) и эндпойнт перемещения;
- **задачи** — новая сущность и API (тип, заголовок, лид, срок, ответственный, статус);
- **аналитика** — эндпойнт отчётов, остальное считается из лидов и заявок;
- вёрстка переносится почти без изменений, но на компонентах рабочего проекта.

## 13. Git

Ветка этой сессии: `arena/4c2e5e44-rebrand`, пушить только в неё. Перед работой
проверять `git rev-parse --abbrev-ref HEAD`; старые отметки ветвей не являются
разрешением переключиться или создать другую ветку.

Ключевые точки истории:

| Коммит | Что было |
|---|---|
| `51bce44` | ранняя vanilla-версия |
| `030f9ce` | каркас React |
| `2e59af1` | лавандовый дизайн по референсу |
| `291675e` | вид от менеджера |
| `95deaf0` | лиды списком |
| `75ab996` | админка, массовые действия, адаптив |
| `74b385d` | перетаскивание и редактор этапов |
| `5acd861` | механика перетаскивания с порядком |
| `a5b7fa0` | бренд CRM Детроид |
| `5681175` | комментарии и README |

Откат — только по подтверждённому запросу владельца, обычным
`git revert <коммит>`; `reset --hard` не применять.

Завершение сессии:

- Обновить STATUS: дата, учтённый HEAD, сделанное, решения, ограничения и бэклог.
  Уточнять смысл SHA; коммит самого документа — `git log -1 -- docs/STATUS.md`.
- Если менялся код, фиксировать STATUS вместе с ним. README — описание и запуск,
  HANDOVER — устройство и проверки, PLAN — принятые решения, PARITY — готовность.
  Поддерживать их факты, но не редактировать передаточный промт без запроса.
- Перед коммитом — зелёная сборка, SSR и `curl`; после push — проверить SHA и
  чистоту дерева. Короткий отчёт в 5–7 строк: ветка, работающие возможности,
  соответствие HEAD/STATUS и последующие коммиты, следующий шаг, риски.
- Приложить владельцу команду обновления/запуска из раздела 2; непроверенную
  визуальную часть назвать явно. Бэклог — не разрешение запускать новые функции.
