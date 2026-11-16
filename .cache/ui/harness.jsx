import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { LeadsProvider } from "../../src/app/store";
import { FunnelPage } from "../../src/pages/FunnelPage";
import { LeadPage } from "../../src/pages/LeadPage";
import { ClientsPage } from "../../src/pages/ClientsPage";
import { ShipmentsPage } from "../../src/pages/ShipmentsPage";
import { ShipmentPage } from "../../src/pages/ShipmentPage";
import { AdminPage } from "../../src/pages/AdminPage";
import { SettingsPage } from "../../src/pages/SettingsPage";
import { TasksPage } from "../../src/pages/TasksPage";
import { AnalyticsPage } from "../../src/pages/AnalyticsPage";
import { KitPage } from "../../src/pages/KitPage";
import * as data from "../../src/mock/data";
import * as ship from "../../src/lib/shipment";

export { data, ship };
export const loc = { path: "" };
function Probe() { const l = useLocation(); loc.path = l.pathname + l.search; return null; }

let root = null, host = null;
export async function mount(path) {
  if (root) await unmount();
  host = document.createElement("div"); document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[path]}><LeadsProvider><Probe /><Routes>
        <Route path="/crm" element={<FunnelPage />} />
        <Route path="/crm/leads/:id" element={<LeadPage />} />
        <Route path="/customers" element={<ClientsPage />} />
        <Route path="/shipments" element={<ShipmentsPage />} />
        <Route path="/shipments/:id" element={<ShipmentPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/kit" element={<KitPage />} />
        <Route path="*" element={<Navigate to="/crm" replace />} />
      </Routes></LeadsProvider></MemoryRouter>);
  });
  await wait(320);
  return host;
}
export async function unmount() { await act(async () => root.unmount()); host.remove(); root = null; }
export const wait = (ms) => act(() => new Promise((r) => setTimeout(r, ms)));
export const $ = (sel) => document.querySelector(sel);
export const $$ = (sel) => [...document.querySelectorAll(sel)];
export const byText = (sel, text) => $$(sel).find((el) => el.textContent.trim().includes(text));
export async function click(el) { if (!el) throw new Error("click: нет элемента"); await act(async () => { el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })); el.click(); }); }
export async function type(el, value) {
  if (!el) throw new Error("type: нет элемента");
  const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : el.tagName === "SELECT" ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  await act(async () => { Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value); el.dispatchEvent(new Event(el.tagName === "SELECT" ? "change" : "input", { bubbles: true })); });
}
export async function key(el, k) { await act(async () => { el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true })); }); }
export async function blur(el) { await act(async () => { el.dispatchEvent(new FocusEvent("focusout", { bubbles: true })); el.blur?.(); }); }
