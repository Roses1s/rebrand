/**
 * Заявка на перевозку: справочники, форма записи и миграция старых сохранений.
 *
 * Поля повторяют форму рабочей CRM (`ShipmentFormPage.tsx`) в camelCase:
 * `loading_cities` → `loadingCities`, `carrier_tax` → `carrierTax` и т. д.
 * Так при переносе вёрстки поле макета однозначно ложится на поле сервера.
 * Маржа в макете по-прежнему `сумма клиента − сумма перевозчика` (решение
 * владельца 15.11); в рабочей CRM её считает сервер — без НДС и с вычетом.
 */

/** Своя компания в шапке заявки — как `OWN_COMPANY` в рабочей CRM. */
export const OWN_COMPANY = "ООО «Детроид»";

/** Название единственной позиции заказа. */
export const SERVICE_NAME = "Транспортно-экспедиционное обслуживание";

/** Этапы заявки: та же воронка из четырёх статусов, что в рабочей CRM. */
export const SHIPMENT_STEPS = [
  { id: "new", name: "Новая", color: "var(--warn)", tone: "new" },
  { id: "checked", name: "Проверена и подписана заявка", color: "var(--info)", tone: "progress" },
  { id: "loaded", name: "Машина загрузилась", color: "var(--money)", tone: "done" },
  { id: "unloaded", name: "Машина выгрузилась", color: "var(--money)", tone: "done" },
];

export const TAX_OPTIONS = [
  { value: "vat_22", label: "НДС 22%" },
  { value: "no_vat", label: "Без НДС" },
  { value: "vat_0", label: "НДС 0%" },
];

export const TRANSPORT_OPTIONS = [
  { value: "ft_20", label: "Фура 20т" },
  { value: "ft_40", label: "Фура 40т" },
  { value: "ref", label: "Рефрижератор" },
  { value: "tent", label: "Тент" },
  { value: "gazel", label: "Газель" },
  { value: "other", label: "Другое" },
];

const taxPercent = (tax) => (tax === "vat_22" ? 22 : 0);

/** Сумма без налога для колонки «Налог исключён.»; без цены — null. */
export function netAmount(price, tax) {
  if (price == null || price === "") return null;
  const value = Number(price);
  if (!Number.isFinite(value)) return null;
  return value / (1 + taxPercent(tax) / 100);
}

/** «Москва, Тверь → Казань»: маршрут собирается из городов погрузки и выгрузки. */
export function routeOf(shipment) {
  const from = shipment.loadingCities?.join(", ") || "—";
  const to = shipment.unloadingCities?.join(", ") || "—";
  return `${from} → ${to}`;
}

const pad = (value) => String(value).padStart(2, "0");

/** Сейчас в формате поля `datetime-local`: «2026-11-16T14:05». */
export function nowLocal() {
  const date = new Date();
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** «2026-11-05T09:12» → «05.11.2026 09:12», как дата создания в списке рабочей CRM. */
export function formatShipmentDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(value ?? "");
  if (!match) return "—";
  const [, year, month, day, hours, minutes] = match;
  return hours ? `${day}.${month}.${year} ${hours}:${minutes}` : `${day}.${month}.${year}`;
}

/** «05.11.2026» или «05.11.2026 09:12» из старых сохранений → ISO-вид для полей ввода. */
function fromRuDate(value, withTime = false) {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}):(\d{2}))?/.exec(value ?? "");
  if (!match) return "";
  const [, day, month, year, hours = "00", minutes = "00"] = match;
  return withTime ? `${year}-${month}-${day}T${hours}:${minutes}` : `${year}-${month}-${day}`;
}

const clean = (value) => (value == null || value === "—" || /не (указан|выбран)/.test(value) ? "" : String(value));
const legacyTax = (value) => (/без/i.test(value ?? "") || !value ? "no_vat" : "vat_22");
const legacyNumber = (value) => clean(value).replace(/[^\d.,]/g, "").replace(",", ".");

const EMPTY = {
  status: "new",
  customerPrice: null,
  carrierPrice: null,
  customerTax: "vat_22",
  carrierTax: "vat_22",
  customerContact: "",
  loadingCities: [],
  loadingAddress: "",
  loadingContact: "",
  loadingDateFrom: "",
  loadingDateTo: "",
  loadingTime: "",
  unloadingCities: [],
  unloadingAddress: "",
  unloadingContact: "",
  unloadingDateFrom: "",
  unloadingDateTo: "",
  unloadingTime: "",
  carrierName: "",
  carrierInn: "",
  carrierContact: "",
  vehicle: "",
  vehicleNumber: "",
  hasTrailer: false,
  trailerNumber: "",
  driverName: "",
  driverPhone: "",
  driverPassport: "",
  carrierSigner: "",
  cargoType: "",
  cargoPackaging: "",
  cargoVolume: "",
  cargoWeight: "",
  capacity: "",
  bodyType: [],
  loadingMethod: [],
  transportType: "tent",
  comment: "",
};

/**
 * Приводит заявку к текущей форме. Старые сохранения (до 16.11.2026) хранили
 * погрузку, перевозчика и груз вложенными объектами — переносим их в плоские
 * поля, ничего не теряя.
 */
export function normalizeShipment(raw) {
  if (!raw.loading && !raw.carrier && !raw.cargo) {
    const shipment = { ...EMPTY, ...raw };
    return { ...shipment, route: routeOf(shipment) };
  }

  const { loading = {}, unloading = {}, carrier = {}, cargo = {}, tax, created, ...rest } = raw;
  const time = (value) => clean(value).split(/[–-]/)[0]?.trim() ?? "";
  const contact = (person) => [clean(person.contact), clean(person.phone)].filter(Boolean).join(", ");
  const trailer = clean(carrier.trailer);

  const shipment = {
    ...EMPTY,
    ...rest,
    createdAt: rest.createdAt ?? (fromRuDate(created, true) || nowLocal()),
    customerTax: legacyTax(tax),
    carrierTax: legacyTax(tax),
    loadingCities: clean(loading.city) ? [loading.city] : [],
    loadingAddress: clean(loading.address),
    loadingContact: contact(loading),
    loadingDateFrom: fromRuDate(loading.date),
    loadingTime: time(loading.time),
    unloadingCities: clean(unloading.city) ? [unloading.city] : [],
    unloadingAddress: clean(unloading.address),
    unloadingContact: contact(unloading),
    unloadingDateFrom: fromRuDate(unloading.date),
    unloadingTime: time(unloading.time),
    carrierName: clean(carrier.name),
    carrierInn: clean(carrier.inn),
    carrierContact: [clean(carrier.contact), clean(carrier.phone)].filter(Boolean).join(", "),
    vehicle: clean(carrier.vehicle),
    vehicleNumber: clean(carrier.plate),
    hasTrailer: Boolean(trailer),
    trailerNumber: trailer,
    driverName: clean(carrier.driver),
    driverPhone: clean(carrier.driverPhone),
    cargoType: clean(cargo.type),
    cargoPackaging: clean(cargo.packaging),
    cargoVolume: legacyNumber(cargo.volume),
    cargoWeight: legacyNumber(cargo.weight),
    bodyType: clean(cargo.body) ? [cargo.body] : [],
  };
  return { ...shipment, route: routeOf(shipment) };
}

/** Копия заявки: те же клиент, маршрут, перевозчик и груз; новая дата, статус «Новая». */
export function copyOf(shipment) {
  const { id: _id, number: _number, ...rest } = shipment;
  return { ...rest, status: "new", createdAt: nowLocal() };
}
