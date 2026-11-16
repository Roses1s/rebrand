import assert from "node:assert/strict";
import { mount, unmount, wait, $, $$, byText, click, type, key, loc, data, ship } from "./harness";
export const tests = [];
const t = (name, fn) => tests.push([name, fn]);
const ADMIN = data.ME.isAdmin;
const stored = () => JSON.parse(window.localStorage.getItem(`crm.shipments.${data.ME.id}.v1`) ?? "null");
const storedShip = (id) => stored()?.find((s) => s.id === id);
const topSearch = () => $(".topbar__search input");
const shipRows = () => $$(".shipments-table tbody tr");

/* ---------- данные ---------- */
t("данные: id и номера заявок уникальны", () => {
  const ids = data.SHIPMENTS.map((s) => s.id), nums = data.SHIPMENTS.map((s) => s.number);
  assert.equal(new Set(ids).size, ids.length); assert.equal(new Set(nums).size, nums.length);
});
t("данные: у каждой заявки существует лид, клиент = название лида", () => {
  const leads = data.STAGES.flatMap((s) => s.leads);
  const bad = data.SHIPMENTS.filter((s) => { const l = leads.find((x) => x.id === s.leadId); return !l || l.name !== s.client; });
  assert.deepEqual(bad.map((s) => s.id), []);
});
t("данные: продавец заявки = ответственный лида", () => {
  const leads = data.STAGES.flatMap((s) => s.leads);
  const bad = data.SHIPMENTS.filter((s) => leads.find((x) => x.id === s.leadId)?.ownerId !== s.ownerId)
    .map((s) => `${s.number}: заявка у ${s.ownerId}, лид ${s.leadId} у ${leads.find((x) => x.id === s.leadId)?.ownerId}`);
  assert.deepEqual(bad, []);
});
t("данные: normalizeShipment идемпотентна и строит маршрут", () => {
  for (const s of data.SHIPMENTS) {
    const a = ship.normalizeShipment(s), b = ship.normalizeShipment(a);
    assert.deepEqual(a, b); assert.ok(a.route.includes("→"), s.number);
  }
});
t("данные: старое вложенное сохранение переводится", () => {
  const old = { id: 1, number: "X", leadId: 1, client: "К", ownerId: 1, status: "new", created: "05.11.2026",
    loading: { city: "Казань", address: "ул. 1", date: "2026-11-10" }, unloading: { city: "Москва" },
    carrier: { name: "ООО Т", inn: "1234567890" }, cargo: { type: "Трубы", weight: "5 т" }, tax: "НДС 22%", customerPrice: 100, carrierPrice: 80 };
  const n = ship.normalizeShipment(old);
  assert.deepEqual(n.loadingCities, ["Казань"]); assert.equal(n.carrierName, "ООО Т"); assert.equal(n.cargoType, "Трубы");
  assert.equal(n.route, "Казань → Москва"); assert.ok(!("cargo" in n) && !("loading" in n), "старые поля остались");
});
t("данные: SHIPMENT_STATUS и SHIPMENT_STEPS совпадают", () => {
  for (const step of ship.SHIPMENT_STEPS) assert.equal(data.SHIPMENT_STATUS[step.id].label, step.name);
});
t("данные: нетто только для НДС 22%", () => {
  assert.equal(Math.round(ship.netAmount(122000, "vat_22")), 100000);
  assert.equal(ship.netAmount(1000, "no_vat"), 1000); assert.equal(ship.netAmount(null, "vat_22"), null);
});

/* ---------- список заявок ---------- */
t("заявки: видимость по роли", async () => {
  window.localStorage.clear(); window.localStorage.setItem("crm.role", ADMIN ? "admin" : "manager");
  await mount("/shipments");
  const expected = ADMIN ? data.SHIPMENTS.length : data.SHIPMENTS.filter((s) => s.ownerId === data.ME.id).length;
  assert.equal(shipRows().length, expected);
});
t("заявки: строка «Итого» = сумма маржи и сумм", async () => {
  await mount("/shipments");
  const own = ADMIN ? data.SHIPMENTS : data.SHIPMENTS.filter((s) => s.ownerId === data.ME.id);
  const total = own.reduce((a, s) => a + (s.customerPrice ?? 0), 0);
  const foot = $(".table-total").textContent.replace(/\s/g, "");
  assert.ok(foot.includes(`Итого·${own.length}`), foot);
  assert.ok(foot.includes(total.toLocaleString("ru-RU").replace(/\s/g, "")), `${foot} / ${total}`);
});
t("заявки: чип статуса фильтрует", async () => {
  await mount("/shipments");
  await click(byText(".toolbar .chip", "Новые"));
  const n = (ADMIN ? data.SHIPMENTS : data.SHIPMENTS.filter((s) => s.ownerId === data.ME.id)).filter((s) => s.status === "new").length;
  assert.equal(shipRows().length, n);
});
t("заявки: поиск по клиенту и перевозчику", async () => {
  await mount("/shipments");
  const target = (ADMIN ? data.SHIPMENTS : data.SHIPMENTS.filter((s) => s.ownerId === data.ME.id)).find((s) => s.carrierName);
  await type(topSearch(), target.carrierName.slice(5, 12));
  assert.ok(shipRows().length >= 1 && shipRows().some((r) => r.textContent.includes(target.number)));
  await type(topSearch(), "zzzzqqq");
  assert.equal(shipRows().length, 0); assert.ok($(".empty__title").textContent.includes("Ничего не найдено"));
});
t("заявки: клик по строке открывает карточку", async () => {
  await mount("/shipments");
  await click(shipRows()[0]);
  assert.match(loc.path, /^\/shipments\/\d+$/);
  assert.ok($(".lead-title-input"));
});
if (ADMIN) {
  t("заявки (админ): выбор сотрудника → плашка и «Показать все»", async () => {
    await mount("/shipments");
    await type($('select[aria-label="Чьи заявки показать"]'), "2");
    assert.ok(loc.path.includes("employee=2"));
    assert.ok($(".board-banner").textContent.includes("Мария Соколова"));
    assert.equal(shipRows().length, data.SHIPMENTS.filter((s) => s.ownerId === 2).length);
    await click($(".board-banner__leave"));
    assert.ok(!loc.path.includes("employee")); assert.equal(shipRows().length, data.SHIPMENTS.length);
  });
  t("заявки (админ): подсказка сотрудника в поиске", async () => {
    await mount("/shipments");
    await type(topSearch(), "Игор");
    const opt = $(".search-suggest__item");
    assert.ok(opt && opt.textContent.includes("показать заявки"));
    await click(opt);
    assert.ok(loc.path.includes("employee=3")); assert.equal(topSearch().value, "");
  });
} else {
  t("заявки (менеджер): чужой ?employee игнорируется, подсказок нет", async () => {
    await mount("/shipments?employee=2");
    assert.ok(!$(".board-banner"));
    await type(topSearch(), "Мар"); assert.ok(!$(".search-suggest"));
  });
}

/* ---------- карточка заявки ---------- */
const field = (id) => $(`#ship-${id}`);
t("форма: правка → «Изменено» → автосохранение через 3 с", async () => {
  await mount("/shipments/147");
  await type(field("carrierName"), "ООО «Проверка»");
  assert.ok($(".lead-save__state")?.textContent.includes("Изменено"));
  await wait(2500); assert.notEqual(storedShip(147)?.carrierName, "ООО «Проверка»", "сохранилось раньше 3 с");
  await wait(900);
  assert.equal(storedShip(147).carrierName, "ООО «Проверка»");
  await wait(400); assert.ok($(".lead-save__ok"), "нет «Сохранено»");
});
t("форма: Enter сохраняет сразу, Esc откатывает", async () => {
  await mount("/shipments/147");
  await type(field("vehicle"), "Volvo FH"); await key(field("vehicle"), "Enter");
  assert.equal(storedShip(147).vehicle, "Volvo FH");
  await type(field("vehicle"), "MAN"); await key(field("vehicle"), "Escape");
  assert.equal(field("vehicle").value, "Volvo FH");
});
t("форма: пустой номер — ошибка, не сохраняется", async () => {
  await mount("/shipments/147");
  const before = storedShip(147)?.number ?? "ЗВ-2026-0147";
  await type($(".lead-title-input"), "   "); await key($(".lead-title-input"), "Enter");
  assert.ok($(".record-alert--danger")?.textContent.includes("Номер заявки не может быть пустым"));
  assert.equal(storedShip(147)?.number ?? before, before);
  await key($(".lead-title-input"), "Escape");
});
t("форма: города чипами, маршрут пересчитывается", async () => {
  await mount("/shipments/147");
  const input = $('input[aria-label="Города погрузки"]');
  await type(input, "Тула"); await key(input, "Enter");
  assert.ok($$(".token").some((x) => x.textContent.includes("Тула")));
  assert.ok(!storedShip(147)?.loadingCities?.includes("Тула"), "Enter в чипах не должен сохранять форму сразу");
  await wait(3200);
  assert.ok(storedShip(147).route.includes("Тула"), storedShip(147).route);
  const rm = $('button[aria-label="Убрать «Тула»"]'); await click(rm);
  assert.ok(!$$(".token").some((x) => x.textContent.includes("Тула")));
  await key($('input[aria-label="Города погрузки"]'), "Enter"); // пустой Enter ничего не добавляет
  await wait(3200);
});
t("форма: прицеп и раскрытие водителя", async () => {
  await mount("/shipments/146");
  const cb = byText(".ship-check", "Есть прицеп").querySelector("input");
  const had = cb.checked;
  await click(cb);
  assert.equal(Boolean(field("trailerNumber")), !had);
  await click(cb);
  assert.ok(!field("driverName"));
  await click($(".ship-more")); assert.ok(field("driverName") && field("carrierSigner"));
  await click($(".ship-more")); assert.ok(!field("driverName"));
  await wait(3200);
});
t("форма: Enter на кнопке «Водитель и подписант» не блокируется", async () => {
  await mount("/shipments/146");
  const btn = $(".ship-more");
  const ev = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
  const { act } = await import("react");
  await act(async () => btn.dispatchEvent(ev));
  assert.equal(ev.defaultPrevented, false, "Enter на кнопке гасится формой");
});
t("форма: цены, налог и маржа", async () => {
  await mount("/shipments/145");
  await type($('input[aria-label="Цена для заказчика"]'), "122000");
  await type($('input[aria-label="Цена для перевозчика"]'), "100000");
  await type($('select[aria-label="Налог заказчика"]'), "vat_22");
  const total = $(".order-lines__total").textContent.replace(/\s/g, "");
  assert.ok(total.includes("22000"), total);
  assert.ok($(".order-lines tbody").textContent.replace(/\s/g, "").includes("100000₽"), "нетто 100 000");
  await type($('input[aria-label="Цена для заказчика"]'), "");
  assert.ok($(".order-lines__total").textContent.includes("—"), "пустая цена → «—»");
  await key($('input[aria-label="Цена для заказчика"]'), "Escape");
});
t("форма: вкладка «Прочая информация»", async () => {
  await mount("/shipments/147");
  await click(byText('[role="tab"]', "Прочая информация"));
  const ta = $("textarea.ship-comment"); assert.ok(ta);
  await type(ta, "строка1"); await key(ta, "Enter");
  assert.notEqual(storedShip(147)?.comment, "строка1", "Enter в комментарии не должен сохранять");
  await wait(3200); assert.equal(storedShip(147).comment, "строка1");
});
t("форма: смена статуса сохраняется сразу", async () => {
  await mount("/shipments/145");
  await click(byText(".stage-strip button", "Проверена"));
  assert.equal(storedShip(145).status, "checked");
  await click(byText(".stage-strip button", "Новая"));
  assert.equal(storedShip(145).status, "new");
});
t("форма: «Копировать» берёт и несохранённые правки", async () => {
  await mount("/shipments/147");
  const before = stored()?.length ?? data.SHIPMENTS.length;
  await type(field("cargoType"), "Копия-тест");
  await click(byText("button", "Копировать"));
  assert.match(loc.path, /^\/shipments\/\d+$/); assert.notEqual(loc.path, "/shipments/147");
  const id = Number(loc.path.split("/").pop());
  await wait(50);
  assert.equal(stored().length, before + 1);
  const copy = storedShip(id);
  assert.equal(copy.status, "new"); assert.equal(copy.leadId, 8);
  assert.equal(storedShip(147).cargoType, "Копия-тест", "оригинал не сохранился");
  assert.equal(copy.cargoType, "Копия-тест", "в копию не попала несохранённая правка");
});
t("форма: «Открыть лид» ведёт в лид", async () => {
  await mount("/shipments/147");
  const a = byText("a", "Открыть лид"); assert.equal(a.getAttribute("href"), "/crm/leads/8");
});
if (ADMIN) {
  t("форма (админ): удаление с подтверждением, без «воскрешения»", async () => {
    await mount("/shipments/146");
    await type(field("cargoType"), "несохранённое");
    await click($('button[title="Безвозвратно удалить заявку"]'));
    assert.ok(byText(".modal, [role=dialog], div", "Удалить заявку безвозвратно?"));
    await click(byText("button", "Удалить навсегда"));
    assert.equal(loc.path, "/shipments");
    await wait(3300);
    assert.equal(storedShip(146), undefined, "заявка вернулась");
    assert.ok(!shipRows().some((r) => r.textContent.includes("0146")));
  });
  t("форма (админ): «Отмена» в диалоге удаления ничего не удаляет", async () => {
    await mount("/shipments/145");
    await click($('button[title="Безвозвратно удалить заявку"]'));
    await click(byText(".modal button, button", "Отмена"));
    assert.ok(storedShip(145) || !stored()); assert.equal(loc.path, "/shipments/145");
  });
} else {
  t("форма (менеджер): кнопки «Удалить» нет", async () => {
    await mount("/shipments/147");
    assert.ok(!$('button[title="Безвозвратно удалить заявку"]'));
  });
}
t("форма: несуществующая заявка", async () => {
  await mount("/shipments/999999"); assert.ok(document.body.textContent.includes("Заявка не найдена"));
});

/* ---------- клиенты ---------- */
t("клиенты: плитки по умолчанию, замки, переход", async () => {
  window.localStorage.removeItem("crm.customers.view");
  await mount("/customers");
  const tiles = $$(".client-tile:not(.client-tile--skeleton)");
  const leads = data.STAGES.flatMap((s) => s.leads).filter((l) => !l.lost);
  assert.equal(tiles.length, Math.min(24, leads.length));
  const locked = $$(".client-tile--locked");
  assert.equal(locked.length, ADMIN ? 0 : leads.filter((l) => l.ownerId !== data.ME.id).length);
  assert.ok(locked.every((x) => x.tagName === "DIV"));
  const own = $$("button.client-tile")[0]; await click(own);
  assert.match(loc.path, /^\/crm\/leads\/\d+$/);
});
t("клиенты: проигранные, поиск по ИНН, вид таблицей запоминается", async () => {
  await mount("/customers");
  await click(byText(".toolbar .chip", "Проигранные"));
  assert.ok($$(".client-tile").length >= 1 && $$(".client-tile").every((x) => x.textContent.includes("Проигрыш")));
  await click(byText(".toolbar .chip", "Все"));
  const lead = data.STAGES.flatMap((s) => s.leads).find((l) => !l.lost && l.inn);
  await type(topSearch(), lead.inn);
  assert.ok($$(".client-tile").some((x) => x.textContent.includes(lead.name)));
  await click($('button[title="Таблица"]'));
  assert.equal(window.localStorage.getItem("crm.customers.view"), "table");
  assert.ok($(".table-wrap:not([hidden]) tbody tr"));
  await mount("/customers"); assert.ok(!$(".client-tile")); await click($('button[title="Плитки"]'));
});

/* ---------- админка ---------- */
if (ADMIN) {
  t("админ: пользователи — валидация, добавление, правка, удаление", async () => {
    await mount("/admin");
    const rows = () => $$(".admin-content tbody tr");
    assert.equal(rows().length, 4); assert.ok(rows()[0].textContent.includes("Администратор"));
    await click(byText(".card__head button", "Добавить"));
    await click(byText(".modal button, button", "Сохранить"));
    assert.ok(document.body.textContent.includes("Проверьте поля: email и пароль от 8 символов"));
    const inputs = () => $$('.modal input, [role="dialog"] input');
    await type(inputs()[0], "sokolova@detroid.ru"); await type(inputs()[3], "12345678");
    await click(byText("button", "Сохранить"));
    assert.ok(document.body.textContent.includes("Пользователь с таким email уже существует"));
    await type(inputs()[0], "new@detroid.ru"); await click(byText("button", "Сохранить"));
    assert.equal(rows().length, 5);
    assert.ok(rows().some((r) => r.textContent.includes("— не указано —")));
    const editBtn = [...rows().find((r) => r.textContent.includes("new@detroid.ru")).querySelectorAll("button")].find((b) => b.textContent.includes("Изменить"));
    await click(editBtn);
    assert.ok(document.body.textContent.includes("Изменить пользователя"));
    await type(inputs()[1], "Новый"); await click(byText("button", "Сохранить"));
    assert.ok(rows().some((r) => r.textContent.includes("Новый")));
    const row = rows().find((r) => r.textContent.includes("new@detroid.ru"));
    await click(byText("button", "Удалить") && [...row.querySelectorAll("button")].find((b) => b.textContent.includes("Удалить")));
    assert.ok(document.body.textContent.includes("Удалить new@detroid.ru?"));
    await click([...document.querySelectorAll("button")].filter((b) => b.textContent.trim() === "Удалить").pop());
    assert.equal(rows().length, 4);
    assert.ok([...rows()[0].querySelectorAll("button")].find((b) => b.textContent.includes("Удалить")).disabled, "себя удалить можно");
  });
  t("админ: бухгалтеры — пустое ФИО, добавление, удаление, восстановление", async () => {
    await mount("/admin");
    await click(byText(".admin-nav__item", "Бухгалтеры"));
    assert.ok(loc.path.includes("section=accountants"));
    const rows = () => $$(".admin-content tbody tr");
    const n = rows().length;
    await click(byText(".card__head button", "Добавить"));
    await click(byText("button", "Сохранить"));
    assert.ok(document.body.textContent.includes("Укажите ФИО бухгалтера"));
    await type($('input[placeholder="Фамилия Имя Отчество"]'), "Тест Тестов"); await click(byText("button", "Сохранить"));
    assert.equal(rows().length, n + 1);
    const row = () => rows().find((r) => r.textContent.includes("Тест Тестов"));
    await click([...row().querySelectorAll("button")].find((b) => b.textContent.includes("Удалить")));
    assert.ok(document.body.textContent.includes("исчезнет из новых назначений"));
    await click([...document.querySelectorAll("button")].filter((b) => b.textContent.trim() === "Удалить").pop());
    assert.ok(row().textContent.includes("Неактивен"));
    await click([...row().querySelectorAll("button")].find((b) => b.textContent.includes("Восстановить")));
    assert.ok(row().textContent.includes("Активен"));
  });
  t("админ: безопасность — бэкап и удаление копии", async () => {
    await mount("/admin?section=security");
    const items = () => $$(".backup-list li");
    const n = items().length;
    await click(byText("button", "Запустить бэкап"));
    assert.ok(document.body.textContent.includes("Задача поставлена в очередь"));
    await wait(1900); assert.equal(items().length, n + 1);
    await click(items()[0].querySelector("button"));
    assert.ok(document.body.textContent.includes("Удалить резервную копию?"));
    await click([...document.querySelectorAll("button")].filter((b) => b.textContent.trim() === "Удалить").pop());
    assert.equal(items().length, n);
    assert.ok(document.body.textContent.includes("Неудачные попытки входа") && document.body.textContent.includes("ГБ"));
  });
} else {
  t("админ (менеджер): доступ закрыт", async () => {
    await mount("/admin"); assert.ok(document.body.textContent.includes("Доступ только у администратора"));
  });
}

/* ---------- воронка и лид ---------- */
t("воронка: поиск фильтрует карточки", async () => {
  window.localStorage.removeItem("crm.funnel.view");
  await mount("/crm");
  const all = $$(".lead-card").length; assert.ok(all > 1);
  const name = $(".lead-card").textContent.slice(0, 0);
  const lead = data.STAGES.flatMap((s) => s.leads).find((l) => l.ownerId === data.ME.id && !l.lost);
  await type(topSearch(), lead.inn);
  assert.equal($$(".lead-card").length, 1, `по ИНН ${lead.inn}`);
  await type(topSearch(), "");
  assert.equal($$(".lead-card").length, all);
});
if (ADMIN) t("воронка (админ): подсказка «открыть доску»", async () => {
  await mount("/crm");
  await type(topSearch(), "Дарья");
  await click($(".search-suggest__item"));
  assert.ok(loc.path.includes("board=4")); assert.ok($(".board-banner"));
});
t("лид: быстрая заявка открывает полную форму", async () => {
  await mount("/crm/leads/1");
  await click(byText("button", "Создать заявку"));
  const inputs = $$(".modal input, [role=dialog] input");
  await type(inputs[0], "Рязань"); await type(inputs[1], "Тверь");
  await type(inputs[2], "2026-11-20"); await type(inputs[3], "2026-11-21"); await type(inputs[4], "ООО «Быстрый»");
  await click(byText(".modal button", "Создать заявку"));
  await wait(50);
  assert.match(loc.path, /^\/shipments\/\d+$/);
  assert.ok($$(".token").some((x) => x.textContent.includes("Рязань")));
  assert.equal(field("carrierName").value, "ООО «Быстрый»");
  assert.equal(field("loadingDateFrom").value, "2026-11-20");
});
t("лид: вкладка заявок показывает маршрут", async () => {
  await mount("/crm/leads/8");
  assert.ok(document.body.textContent.includes("ЗВ-2026-0147"));
  assert.ok(/→/.test(document.body.textContent));
});
t("меню: счётчик заявок в панели", async () => {
  await mount("/crm");
  assert.ok($$("nav a, aside a").some((a) => a.textContent.includes("Заявки")));
  await unmount();
});
t("настройки: сброс возвращает и демо-заявки", async () => {
  window.localStorage.setItem(`crm.shipments.${data.ME.id}.v1`, JSON.stringify([ship.normalizeShipment(data.SHIPMENTS[1])]));
  await mount("/settings");
  await click([...document.querySelectorAll("button")].find((b) => b.textContent.includes("Сбросить мою воронку")));
  await wait(50);
  assert.equal(stored().length, data.SHIPMENTS.length);
  await unmount();
});
