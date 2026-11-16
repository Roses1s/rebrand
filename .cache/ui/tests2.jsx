import assert from "node:assert/strict";
import { mount, unmount, wait, $, $$, byText, click, type, key, loc, data } from "./harness";
export const tests = [];
const t = (name, fn) => tests.push([name, fn]);
const ADMIN = data.ME.isAdmin;
const leadsStored = () => JSON.parse(window.localStorage.getItem(`crm.leads.${data.ME.id}.v1`) ?? "[]");
const leadS = (id) => leadsStored().find((l) => l.id === id);
const shipsStored = () => JSON.parse(window.localStorage.getItem(`crm.shipments.${data.ME.id}.v1`) ?? "[]");
const modalBtn = (text) => [...document.querySelectorAll(".modal button")].find((b) => b.textContent.trim() === text);
const menuItem = async (text) => { await click($('.lead-head__actions .menu > button')); await click(byText('[role="menuitem"]', text)); };

t("экраны: задачи, аналитика, витрина, список лидов открываются", async () => {
  window.localStorage.clear(); window.localStorage.setItem("crm.role", ADMIN ? "admin" : "manager");
  for (const p of ["/tasks", "/analytics", "/kit"]) { await mount(p); assert.ok($("main.main"), p); }
  await mount("/crm"); await click($('button[title="Список"]'));
  assert.ok($(".leads-table tbody tr")); await click($('button[title="Канбан"]'));
});
t("доска: звёзды сохраняются сразу, повторный клик снимает", async () => {
  await mount("/crm");
  const card = $(".lead-card");
  const id = Number(card.querySelector(".lead-card__link").getAttribute("href").split("/").pop());
  const before = data.STAGES.flatMap((s) => s.leads).find((l) => l.id === id).priority;
  const target = before === 2 ? 1 : 2;
  await click(card.querySelector(`[aria-label="Приоритет ${target} из 3"]`)); assert.equal(leadS(id).priority, target, `было ${before}`);
  await click(card.querySelector('[aria-label="Приоритет 3 из 3"]')); assert.equal(leadS(id).priority, 3);
  await click(card.querySelector('[aria-label="Снять приоритет 3"]')); assert.equal(leadS(id).priority, 0);
});
t("доска: сворачивание этапа запоминается", async () => {
  await mount("/crm");
  const name = $(".col").getAttribute("aria-label");
  await click($(`button[aria-label="Свернуть этап «${name}»"]`));
  assert.ok($(`[aria-label^="Развернуть этап «${name}»"]`));
  await mount("/crm"); const unfold = $(`[aria-label^="Развернуть этап «${name}»"]`); assert.ok(unfold, "не запомнилось");
  await click(unfold); assert.ok($(`button[aria-label="Свернуть этап «${name}»"]`));
});
t("лид: правка названия, автосохранение 3 с", async () => {
  await mount("/crm/leads/1");
  await type($(".lead-title-input"), "ООО «Тест-Имя»");
  await wait(3300); assert.equal(leadS(1).name, "ООО «Тест-Имя»");
  await mount("/crm"); assert.ok(document.body.textContent.includes("Тест-Имя"));
});
t("лид: тег — выбрать и создать", async () => {
  await mount("/crm/leads/1");
  await click($(".tags-field__add"));
  const s = $(".tags-field__search"); await type(s, "Проверочный"); await key(s, "Enter");
  await wait(3300);
  const tags = JSON.parse(window.localStorage.getItem("crm.tags.v1") ?? "[]");
  const tag = tags.find((x) => x.name === "Проверочный"); assert.ok(tag, "тег не создан");
  assert.ok(leadS(1).tagIds.includes(tag.id), "тег не на лиде");
});
t("лид: проигрыш с причиной → только чтение → восстановить", async () => {
  await mount("/crm/leads/12");
  await menuItem("Отметить проигрышем");
  assert.ok(modalBtn("Отметить проигрышем").disabled, "без причины можно");
  await click($$(".choice input")[0]); await click(modalBtn("Отметить проигрышем"));
  assert.ok(leadS(12).lost); assert.ok($(".lost-ribbon")); assert.ok($(".lead-title-input").disabled);
  await mount("/crm"); assert.ok(!$$(".lead-card__link").some((a) => a.getAttribute("href") === "/crm/leads/12"));
  await mount("/customers"); await click(byText(".toolbar .chip", "Проигранные"));
  assert.ok($$(".client-tile").some((x) => x.textContent.includes(data.STAGES.flatMap((s) => s.leads).find((l) => l.id === 12).name)));
  await mount("/crm/leads/12"); await click(byText("button", "Восстановить"));
  assert.ok(!leadS(12).lost); assert.ok(!$(".lost-ribbon"));
});
t("лид: передача коллеге уносит заявки", async () => {
  await mount("/crm/leads/16");
  await menuItem("Передать коллеге");
  await click(byText(".picker-list__item", "Мария")); await click(modalBtn("Передать"));
  assert.equal(leadS(16).ownerId, 2);
  assert.ok(shipsStored().filter((s) => s.leadId === 16).every((s) => s.ownerId === 2), "заявки остались у старого владельца");
});
if (ADMIN) t("лид (админ): удаление без возврата удаляет и заявки", async () => {
  await mount("/crm/leads/9");
  await menuItem("Удалить лид");
  await click([...document.querySelectorAll(".modal button")].pop());
  assert.ok(!leadS(9)); assert.ok(!shipsStored().some((s) => s.leadId === 9));
  assert.ok(!loc.path.includes("/crm/leads/9"));
});
if (!ADMIN) t("лид (менеджер): лид коллеги только для чтения", async () => {
  await mount("/crm/leads/3"); assert.ok(document.body.textContent.includes("Лид коллеги."));
});
t("воронка: маржа по заявкам на карточке лида 1", async () => {
  window.localStorage.removeItem(`crm.shipments.${data.ME.id}.v1`);
  await mount("/crm");
  const card = $$(".lead-card").find((c) => c.querySelector('a[href="/crm/leads/1"]'));
  assert.ok(card.querySelector(".price").getAttribute("aria-label").includes("48"), card.querySelector(".price").getAttribute("aria-label"));
  await unmount();
});
t("доска: на карточке нет «⋯», клик по карточке открывает лид", async () => {
  await mount("/crm");
  assert.equal($$('[aria-label="Меню карточки"]').length, 0);
  assert.equal($$(".lead-card .menu").length, 0);
  const link = $(".lead-card__link"); const href = link.getAttribute("href");
  await click(link); assert.equal(loc.path, href);
});
t("доска: клик по звезде не открывает лид", async () => {
  await mount("/crm");
  const star = $(".lead-card").querySelector('[aria-label^="Приоритет 1"], [aria-label="Снять приоритет 1"]');
  await click(star); assert.equal(loc.path, "/crm");
});
t("лид: «Создать заявку» перед этапами, кнопки «Проигрыш» у этапов нет", async () => {
  await mount("/crm/leads/1");
  const bar = $(".lead-stagebar");
  const first = bar.firstElementChild;
  assert.ok(first.tagName === "BUTTON" && first.textContent.includes("Создать заявку"), first.className);
  assert.ok(first.nextElementSibling.classList.contains("stage-strip"));
  assert.ok(![...bar.querySelectorAll("button")].some((b) => b.textContent.trim() === "Проигрыш"));
  await click($('.lead-head__actions .menu > button'));
  assert.ok(byText('[role="menuitem"]', "Отметить проигрышем"), "в «Действия» нет проигрыша");
});
t("лид проигранный: «Создать заявку» нет, «Восстановить» справа от этапов", async () => {
  await mount("/crm/leads/19");
  const bar = $(".lead-stagebar");
  assert.ok(bar.firstElementChild.classList.contains("stage-strip"));
  assert.ok(bar.lastElementChild.textContent.includes("Восстановить"));
  assert.ok(![...bar.querySelectorAll("button")].some((b) => b.textContent.includes("Создать заявку")));
  await unmount();
});
