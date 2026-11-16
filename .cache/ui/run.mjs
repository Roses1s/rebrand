import { createRequire } from "node:module";
const require = createRequire("/tmp/tools/");
const { JSDOM } = require("jsdom");
const role = process.env.ROLE;
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/", pretendToBeVisual: true });
const g = globalThis;
for (const k of ["window", "document", "navigator", "HTMLElement", "HTMLInputElement", "HTMLTextAreaElement", "HTMLSelectElement", "Element", "Node", "Event", "MouseEvent", "KeyboardEvent", "FocusEvent", "InputEvent", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame", "MutationObserver", "localStorage", "DocumentFragment", "Text", "SVGElement", "CustomEvent", "PointerEvent"]) {
  try { Object.defineProperty(g, k, { value: dom.window[k], configurable: true, writable: true }); } catch {}
}
g.IS_REACT_ACT_ENVIRONMENT = true;
dom.window.localStorage.setItem("crm.role", role);
dom.window.HTMLElement.prototype.scrollIntoView = function () {};
dom.window.matchMedia = dom.window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
dom.window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }; g.ResizeObserver = dom.window.ResizeObserver;
dom.window.open = () => ({});
const errors = [];
const origErr = console.error;
console.error = (...a) => { errors.push(a.map(String).join(" ").slice(0, 300)); };
const T = await import(process.env.MOD);
let pass = 0, fail = 0;
for (const [name, fn] of T.tests) {
  try { await fn(); pass++; console.log(`PASS ${role} ${name}`); }
  catch (e) { fail++; console.log(`FAIL ${role} ${name}: ${e.message}`); }
}
if (errors.length) { console.log(`CONSOLE.ERROR x${errors.length}:`); for (const e of [...new Set(errors)].slice(0, 12)) console.log("  " + e); }
console.log(`ИТОГ ${role}: ${pass} pass, ${fail} fail`);
process.exit(0);
