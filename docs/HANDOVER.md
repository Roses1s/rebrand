# Паспорт проекта: макет CRM Детроид

Документ для следующего агента и для себя: что это за проект, как он устроен,
что уже сделано, где грабли и что делать дальше. Пользовательское описание —
[`../README.md`](../README.md), решения — [`../PLAN.md`](../PLAN.md), матрица
функций — [`../PARITY.md`](../PARITY.md), живой статус — [`STATUS.md`](STATUS.md)
(дата, HEAD, что сделано и что дальше).

Проверено на 16.11.2026, ветка `arena/c31ae4ca-rebrand`. Перенос вёрстки в
рабочую CRM описан в [`PORTING.md`](PORTING.md); точная отметка текущего кода и
результаты проверок всегда находятся в STATUS.md.

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
git pull origin arena/c31ae4ca-rebrand; npm install; npm run dev
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
| `/customers` | Клиенты: плитки или таблица |
| `/shipments` | Заявки; у админа `?employee=N` — заявки сотрудника |
| `/shipments/:id` | Карточка заявки — полная форма |
| `/tasks` | Задачи |
| `/analytics` | Аналитика |
| `/accounting` | Бухгалтерия (заглушка) |
| `/settings` | Настройки, роль, редактор этапов |
| `/admin` | Панель управления (только роль admin); `?section=accountants` / `security` |
| `/kit` | Витрина дизайн-системы |
| `*` | редирект на `/crm` |

## 5. Структура кода

```
src/
  main.jsx             точка входа, стили
  App.jsx              BrowserRouter, LeadsProvider, маршруты
  app/Shell.jsx        панель, верхняя строка, диалог нового лида, тема
  app/store.jsx        лиды, этапы и заявки в localStorage, вся мутационная логика
  pages/               11 экранов (Funnel, Lead, Clients, Shipments, Shipment,
                       Tasks, Analytics, Accounting, Settings, Admin, Kit)
  ui/                  Button, Field, Tag (Status/Chip/Avatar), Modal,
                       Segmented, States (Empty/Skeleton/TableSkeleton),
                       Chatter (лента карточки лида и заявки), StageBar
                       (полоса этапов с «…»), Toast (уведомление), Menu,
                       StarRating, TagChip, TagsField, LeadDialogs,
                       TokenField (поле чипами), ShowMore («Показать ещё»),
                       EmployeeSuggestions (подсказки сотрудников под
                       поиском, только админ), QuickCreateShipmentDialog, cn
  lib/format.js        money, shortMoney, initials, fileSize,
                       relativeTime, absoluteTime, dayLabel
  lib/margin.js        маржа заявки и сумма маржи связанных с лидом заявок
  lib/shipment.js      этапы и справочники заявки, нормализация старых
                       сохранений, маршрут из городов, копия, даты
  lib/folded.js        свёрнутые этапы доски
  mock/data.js         демо-данные в форме API рабочей CRM
  mock/chatter.js      ленты лида и заявки в форме TimelineEntry рабочей CRM
  styles/              tokens, base, ui, shell, board, pages, kit, compact,
                       lead-form, stage-bar, chatter, toast
```

Порядок в `styles/index.css`: основные стили → `compact.css` → локальные
`lead-form.css`, `stage-bar.css`, `chatter.css`, `toast.css`. Компактный слой
переопределяет размеры, не цвета; локальные слои идут после него намеренно.
`chatter.css` держит `.chatter*` и раскладку `.lead-layout`/`.lead-facts`.

## 6. Данные и хранение

`src/mock/data.js` экспортирует: `ME`, `IS_ADMIN`, `TEAM`, `PRIORITY_MAX` (3),
`TAGS` (5 общих демо-тегов), `LOSS_REASONS` (3 причины проигрыша), `STAGES`
(5 этапов с лидами), `ALL_LEADS`, `OWNER()`, `CLIENTS`, `SHIPMENT_STATUS`,
`SHIPMENTS`, `TASKS`, `TASK_TYPES`, `EDO_OPERATORS`, `ANALYTICS` (по периодам:
`inflow`, `sources`). В исходном наборе 20 лидов/клиентов, из них 11 своих;
два проигранных — 19 «ВолгаАгро» (свой) и 20 «Пермь-Кабель» (коллеги), так что
на доске 10 активных своих. Заявок — 8 (своих 5, у коллег 3, чтобы админу было
что отбирать; продавец заявки всегда совпадает с ответственным за лид), задач — 7. Поля заявки плоские, как у сервера в camelCase
(`loadingCities`, `carrierInn`, `customerTax`, `hasTrailer`…); `route` не
хранится, его собирает `routeOf` из городов; старые вложенные сохранения
переводит `normalizeShipment` при загрузке. У лида `priority` —
число 0–3 (старые сохранения со словами high/mid/low переводятся при загрузке),
а также `tagIds`, `lost`, `lossReason`.

`store.jsx` — единственное место, где меняются лиды, этапы и заявки:

- `leads` — записи под ключом менеджера, у каждой `stageId` и `position`;
  исходный демо-набор включает и лиды коллег, доска отбирает только `ownerId === ME.id`;
- `updateLead(id, patch)` — правка полей карточки (название, ИНН, контакты,
  приоритет, оператор ЭДО, бухгалтер), единственная точка сохранения формы лида.
  Карточка вызывает его
  из автосохранения (3 с), по Enter и по кнопке «Сохранить», а также при уходе
  со страницы с несохранёнными правками;
- `stages` — этапы текущего менеджера: `id`, `name`, `hint`, `color`;
- `shipments` — первоначально демо-набор `SHIPMENTS`, затем локальная копия под
  ключом менеджера; все экраны берут заявки только отсюда;
- `addShipment({ lead, … })` — быстро создаёт заявку с новым id и номером,
  привязывает её к лиду, переносит из лида контакт и ответственного, оставляет
  деньги, груз и адрес пустыми; `updateShipment(id, patch)` — единственная точка
  сохранения формы заявки (пересчитывает маршрут); `copyShipment(id)` — копия с
  новым номером, статусом «Новая» и датой «сейчас», возвращает новую заявку;
  `deleteShipment(id)` — удаление (в интерфейсе только у админа);
- `tags`, `addTag(name, color)` (без дублей по имени), `removeTag(id)` (снимает
  тег со всех лидов); `loseLead(id, reason)`, `restoreLead(id, { takeOver })`
  («Восстановить» / «Взять себе»), `transferLead(id, ownerId)` (лид встаёт
  наверх первого этапа нового владельца, заявки уходят вместе с ним),
  `deleteLead(id)` (удаляет лид и его заявки); `openLeadDialog(stageId, ownerId)`;
- `addLead`, `moveLead(id, stageId, index)`, `removeLeads`, `addStage`,
  `updateStage`, `moveStage`, `removeStage`, `resetAll`;
- при загрузке лиды без своего этапа падают на первый, позиции нормализуются.

Ключи `localStorage`:

| Ключ | Смысл |
|---|---|
| `crm.leads.<id>.v1` | лиды и их позиции |
| `crm.stages.<id>.v1` | этапы воронки |
| `crm.shipments.<id>.v1` | заявки, созданные в макете |
| `crm.theme` | `light` / `dark` |
| `crm.accent` | `indigo` / `violet` / `emerald` |
| `crm.density` | `comfort` / `compact` |
| `crm.role` | `manager` / `admin` |
| `crm.funnel.view` | `board` / `list` |
| `crm.tags.v1` | общие теги компании |
| `crm.folded.<зритель>.<доска>.v1` | свёрнутые этапы — отдельно для каждой доски |
| `crm.sidebar` | `open` / `collapsed` (свёрнутая панель) |

Сброс: «Настройки → Сбросить мою воронку» (`resetAll`) — возвращает демо-этапы,
лиды, теги и заявки. Роль: там же, страница
перезагружается, потому что `IS_ADMIN` читается при импорте `data.js`.

Задачи и заметки чаттера живут в состоянии компонентов, без записи в
localStorage, и сбрасываются при размонтировании или перезагрузке. «Клиенты»,
списки заявок, воронка, задачи, аналитика, админ-сводка и счётчики меню читают
лиды и заявки из `useLeads`, поэтому новая заявка и её связь с лидом отражаются
во всех этих витринах. Это всё ещё локальный макет без API.

## 7. Механика воронки

**Карточки и KPI:**

- `LeadCard` общий для доски и `DragOverlay`: название, контакт, приоритет, маржа
  связанных заявок, срок. `leadShipmentMargin(lead.id, shipments)` складывает
  `customerPrice − carrierPrice` только у заявок из store с тем же `leadId`;
  без заявок — 0 ₽. Заявка без заполненных цен не меняет маржу.
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
  `STAGES`; источник заявок — `crm.shipments.<id>.v1`, при отсутствии сохранения
  — демо `SHIPMENTS`. В исходном наборе 10 своих лидов, 5 связанных заявок и
  213 000 ₽ маржи. Ожидаемой суммы и `FUNNEL_KPI` больше нет;
- новый лид создаётся только через общую форму: Компания, ИНН, Контакт логиста,
  Телефон логиста, E-mail — все обязательны. Кнопка «+» колонки открывает ту же
  форму через `openLeadDialog(stageId)` и сохраняет лид в выбранный этап. Денежного
  поля нет: до первой связанной заявки он везде даёт 0 ₽ маржи;
- последняя ячейка канбана — `stage-creator`: кнопка «Добавить этап» заменяется
  полем. Непустое имя на Enter или при уходе из поля передаётся в `addStage(name)`;
  Escape отменяет. `addStage` оставляет прежнее поведение для настроек без
  аргумента и для явного имени ставит цвет по следующему индексу палитры и
  подсказку «Опишите этап»;
- быстрая заявка открывается из `LeadPage` по кнопке рядом с этапами и в пустой
  вкладке заявок. `QuickCreateShipmentDialog` повторяет основную CRM: обязательны
  города и даты погрузки/выгрузки, перевозчик; ИНН и контакт перевозчика
  необязательны. Заявка привязана к текущему лиду, получает статус `new` и затем
  открывается на `/shipments/:id`.

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

**Этапы** (`FunnelPage.jsx`, `SettingsPage.jsx`): создание прямо в конце
канбан-доски или в настройках, название, подсказка, цвет из палитры
`STAGE_COLORS`, порядок стрелками, удаление (лиды переезжают на соседний этап,
последний удалить нельзя). Правки сохраняются сразу.

## 8. Роли и приватность

- По умолчанию — менеджер: на доске только свои лиды, свои задачи и заявки.
- «Настройки → Роль в макете → Администратор»: в панели появляется
  «Администрирование» (`/admin`), у менеджера на этом маршруте заглушка.
- Клиенты: свои лиды открываются, активные лиды коллег приглушены, с замком и
  без перехода; проигранные открываются всем (их можно «Взять себе»).
- Карточка чужого активного лида (`/crm/leads/:id`) у менеджера: только
  название, ИНН, город, продавец. Администратор видит карточку целиком.
- Администратор: доска сотрудника (`/crm?board=N`, список «Доска: …»), удаление
  лида и удаление общих тегов. Проигрыш и передача доступны всем.
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
записями, проигранными лидами, доской сотрудника, формой заявки, заявками
сотрудника и разделами админки выполняются 52 рендера (по 26 на роль); плитки
клиентов и диалоги админки и удаления заявки проверяются отдельным рендером.

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
import { ClientsPage, ClientTile } from "../../src/pages/ClientsPage";
import { ALL_LEADS, TAGS } from "../../src/mock/data";
import { ShipmentsPage } from "../../src/pages/ShipmentsPage";
import { ShipmentPage, DeleteShipmentDialog } from "../../src/pages/ShipmentPage";
import { TasksPage } from "../../src/pages/TasksPage";
import { AnalyticsPage } from "../../src/pages/AnalyticsPage";
import { AccountingPage } from "../../src/pages/AccountingPage";
import { SettingsPage } from "../../src/pages/SettingsPage";
import { AdminPage, UserDialog, AccountantDialog } from "../../src/pages/AdminPage";
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
      assert.ok(html.includes("Добавить этап"));
      assert.ok(!html.includes("Сумма воронки"));
    }
    if (path === "/admin") assert.ok(html.includes(ME.isAdmin ? "Разделы панели управления" : "Доступ только у администратора"));
  }
  const leadHtml = render("/crm/leads/1");
  assert.ok(leadHtml.includes('aria-label="Приоритет лида"'));
  assert.ok(leadHtml.includes("Создать заявку"));
  const colleague = render("/crm/leads/3");
  assert.ok(ME.isAdmin ? !colleague.includes("Лид коллеги.") : colleague.includes("Лид коллеги."));
  assert.ok(leadHtml.includes("stars--editable"));
  assert.ok(leadHtml.includes("Добавить тег") || leadHtml.includes("tag-chip"));
  assert.ok(leadHtml.includes("Соседние лиды"));
  const lostHtml = render("/crm/leads/19");
  assert.ok(lostHtml.includes("Лид проигран"), "lost banner");
  assert.ok(lostHtml.includes("lost-ribbon"), "ribbon");
  assert.ok(lostHtml.includes("Восстановить"), "restore");
  assert.ok(lostHtml.includes("Перестал возить"));
  const board = render("/crm");
  assert.ok(!board.includes("ВолгаАгро"), "lost hidden");
  assert.ok(board.includes("tag-chip"), "tags on board");
  assert.ok(board.includes("lead-card__owner"), "owner square");
  const foreign = render("/crm?board=2");
  assert.equal(foreign.includes("Доска сотрудника:"), ME.isAdmin, "foreign board banner");
  const lostColleague = render("/crm/leads/20");
  assert.ok(lostColleague.includes("Взять себе"), "take over");
  assert.ok(render("/crm/leads/999999").includes("Лид не найден"));
  assert.ok(render("/shipments/999999").includes("Заявка не найдена"));
  const ship = render("/shipments/148");
  assert.ok(ship.includes("Позиции заказа") && ship.includes("Транспортно-экспедиционное обслуживание"), "ship form");
  assert.ok(ship.includes("Копировать") && ship.includes("Открыть лид"), "ship actions");
  assert.equal(ship.includes("Безвозвратно удалить заявку"), ME.isAdmin, "delete admin only");
  assert.ok(render("/shipments/142").includes("Тип транспорта"), "ship without carrier");
  assert.ok(render("/customers").includes("Вид списка клиентов"), "customers view switch");
  for (const lead of ALL_LEADS.slice(0, 20)) {
    const locked = lead.ownerId !== ME.id && !lead.lost && !ME.isAdmin;
    const tile = renderToString(<ClientTile client={{ ...lead, stageName: "Этап" }} tags={TAGS ?? []} locked={locked} onOpen={() => {}} />);
    assert.ok(tile.includes("ИНН"), "tile inn");
    assert.equal(tile.includes("Лид коллеги"), locked, "tile lock");
    if (lead.lost) assert.ok(tile.includes("Проигрыш"), "tile lost");
  }
  for (const section of ["accountants", "security"]) {
    const admin = render(`/admin?section=${section}`);
    if (ME.isAdmin) assert.ok(admin.includes(section === "security" ? "Неудачные попытки входа" : "Доступ бухгалтеров"), section);
  }
  assert.ok(renderToString(<UserDialog users={[]} onCancel={() => {}} onSave={() => {}} />).includes("Новый пользователь"), "user dialog");
  assert.ok(renderToString(<UserDialog user={{ id: 1, email: "a@b.ru", firstName: "", lastName: "", role: "admin", isActive: true }} users={[]} onCancel={() => {}} onSave={() => {}} />).includes("пусто = не менять"), "user edit");
  assert.ok(renderToString(<AccountantDialog onCancel={() => {}} onSave={() => {}} />).includes("Новый бухгалтер"), "acc dialog");
  assert.ok(renderToString(<DeleteShipmentDialog number="ЗВ-1" onCancel={() => {}} onConfirm={() => {}} />).includes("Удалить навсегда"), "delete dialog");
  const byEmployee = render("/shipments?employee=2");
  assert.equal(byEmployee.includes("Заявки сотрудника:"), ME.isAdmin, "employee banner");
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
обязательных полей, ИНН только цифрами, создание в выбранном этапе); смена
приоритета звёздами на доске и в карточке; теги (выбор, создание, удаление
админом); свернуть/развернуть этап и перезагрузка; проигрыш с причиной,
«Восстановить» и «Взять себе»; передача коллеге; удаление (админ); стрелки
«предыдущий / следующий»; доска сотрудника `?board=2` в роли администратора; быстрая заявка
из карточки лида (обязательные поля, отмена, номер, переход в карточку, вкладка
лида, общий список, счётчик и сохранение после перезагрузки); добавление этапа в
конце доски (Enter, клик мимо, Escape, пустое имя) и его сохранение после
перезагрузки; удаление этапа; смена роли; тёмная тема; телефон; перезагрузка
сохраняет лиды, этапы, заявки, их порядок и настройки (но не задачи и новые
заметки).

## 12. Что дальше

Готово: воронка (канбан, список, перетаскивание, этапы, массовые действия,
создание лида), карточка лида, клиенты, заявки, задачи, аналитика, бухгалтерия,
настройки, админка, витрина, бренд, тёмная тема, адаптив, состояния загрузки.

Не реализовано (осознанно, поведение — не вёрстка):

- глобальный поиск `⌘K` и хранение поиска в адресе страницы (поиск работает
  внутри экрана; подсказки сотрудников под поиском — у админа на воронке и в заявках);
- диалог «Есть несохранённые изменения» (макет дописывает правки при уходе);
- ошибки API с «Повторить», скелетоны воронки и задач;
- перетаскивание самих колонок (порядок этапов меняется стрелками).

Перенос в рабочую CRM — по [`PORTING.md`](PORTING.md): там решения владельца,
карта экранов, что уже сделано в макете и задания для агента рабочей CRM
(в её код отсюда не пишем). Новый вид включается рядом со старым. Вход и
лаунчер — позже. Что нужно серверу для «наших» полей:

- этапы и порядок лидов — API этапов (CRUD + позиция) и эндпойнт перемещения;
- **задачи** — новая сущность и API (тип, заголовок, лид, срок, ответственный, статус);
- **аналитика** — эндпойнт отчётов, остальное считается из лидов и заявок;
- вёрстка переносится почти без изменений, но на компонентах рабочего проекта.

## 13. Git

Ветка этой сессии: `arena/c31ae4ca-rebrand`, пушить только в неё. Перед работой
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
