import assert from "node:assert/strict";
import { Fragment, act, createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Link, MemoryRouter, NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Fragment as Fragment$1, jsx, jsxs } from "react/jsx-runtime";
import { AlertTriangle, ArrowDown, ArrowLeft, ArrowRight, ArrowRightLeft, ArrowUp, ArrowUpDown, ArrowUpRight, BarChart3, Bell, Building2, Calculator, CalendarDays, Check, CheckCircle2, CheckSquare, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ChevronsLeft, ChevronsRight, Clock, Copy, Database, ExternalLink, FileText, Flame, HardDrive, Inbox, Info, KanbanSquare, Landmark, LayoutGrid, List, Lock, LogOut, Mail, Menu, Moon, MoreHorizontal, MoreVertical, Package, Paperclip, Pencil, Phone, Plus, RotateCcw, Search, Settings, ShieldCheck, Sun, Target, Trash2, Truck, UserPlus, Users, Wallet, X, XCircle } from "lucide-react";
import { DndContext, DragOverlay, KeyboardSensor, MouseSensor, TouchSensor, pointerWithin, rectIntersection, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
// src/lib/shipment.js
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
var OWN_COMPANY = "ООО «Детроид»";
/** Название единственной позиции заказа. */
var SERVICE_NAME = "Транспортно-экспедиционное обслуживание";
/** Этапы заявки: та же воронка из четырёх статусов, что в рабочей CRM. */
var SHIPMENT_STEPS = [
	{
		id: "new",
		name: "Новая",
		color: "var(--warn)",
		tone: "new"
	},
	{
		id: "checked",
		name: "Проверена и подписана заявка",
		color: "var(--info)",
		tone: "progress"
	},
	{
		id: "loaded",
		name: "Машина загрузилась",
		color: "var(--money)",
		tone: "done"
	},
	{
		id: "unloaded",
		name: "Машина выгрузилась",
		color: "var(--money)",
		tone: "done"
	}
];
var TAX_OPTIONS = [
	{
		value: "vat_22",
		label: "НДС 22%"
	},
	{
		value: "no_vat",
		label: "Без НДС"
	},
	{
		value: "vat_0",
		label: "НДС 0%"
	}
];
var TRANSPORT_OPTIONS = [
	{
		value: "ft_20",
		label: "Фура 20т"
	},
	{
		value: "ft_40",
		label: "Фура 40т"
	},
	{
		value: "ref",
		label: "Рефрижератор"
	},
	{
		value: "tent",
		label: "Тент"
	},
	{
		value: "gazel",
		label: "Газель"
	},
	{
		value: "other",
		label: "Другое"
	}
];
var taxPercent = (tax) => tax === "vat_22" ? 22 : 0;
/** Сумма без налога для колонки «Налог исключён.»; без цены — null. */
function netAmount(price, tax) {
	if (price == null || price === "") return null;
	const value = Number(price);
	if (!Number.isFinite(value)) return null;
	return value / (1 + taxPercent(tax) / 100);
}
/** «Москва, Тверь → Казань»: маршрут собирается из городов погрузки и выгрузки. */
function routeOf(shipment) {
	return `${shipment.loadingCities?.join(", ") || "—"} → ${shipment.unloadingCities?.join(", ") || "—"}`;
}
var pad = (value) => String(value).padStart(2, "0");
/** Сейчас в формате поля `datetime-local`: «2026-11-16T14:05». */
function nowLocal() {
	const date = /* @__PURE__ */ new Date();
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
/** «2026-11-05T09:12» → «05.11.2026 09:12», как дата создания в списке рабочей CRM. */
function formatShipmentDate(value) {
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
var clean = (value) => value == null || value === "—" || /не (указан|выбран)/.test(value) ? "" : String(value);
var legacyTax = (value) => /без/i.test(value ?? "") || !value ? "no_vat" : "vat_22";
var legacyNumber = (value) => clean(value).replace(/[^\d.,]/g, "").replace(",", ".");
var EMPTY = {
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
	comment: ""
};
/**
* Приводит заявку к текущей форме. Старые сохранения (до 16.11.2026) хранили
* погрузку, перевозчика и груз вложенными объектами — переносим их в плоские
* поля, ничего не теряя.
*/
function normalizeShipment(raw) {
	if (!raw.loading && !raw.carrier && !raw.cargo) {
		const shipment = {
			...EMPTY,
			...raw
		};
		return {
			...shipment,
			route: routeOf(shipment)
		};
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
		bodyType: clean(cargo.body) ? [cargo.body] : []
	};
	return {
		...shipment,
		route: routeOf(shipment)
	};
}
/** Копия заявки: те же клиент, маршрут, перевозчик и груз; новая дата, статус «Новая». */
function copyOf(shipment) {
	const { id: _id, number: _number, ...rest } = shipment;
	return {
		...rest,
		status: "new",
		createdAt: nowLocal()
	};
}
/** Демо-роль: обычный менеджер по умолчанию, администратор — переключателем в настройках. */
var IS_ADMIN = (() => {
	try {
		return window.localStorage.getItem("crm.role");
	} catch {
		return null;
	}
})() === "admin";
var ME = {
	id: 1,
	name: "Алексей Громов",
	role: IS_ADMIN ? "Администратор" : "Менеджер по продажам",
	initials: "АГ",
	isAdmin: IS_ADMIN
};
var TEAM = [
	{
		id: 1,
		initials: "АГ",
		name: "Алексей Громов",
		role: "Менеджер по продажам",
		color: "",
		online: true
	},
	{
		id: 2,
		initials: "МС",
		name: "Мария Соколова",
		role: "Менеджер по продажам",
		color: "avatar--pink",
		online: true
	},
	{
		id: 3,
		initials: "ИЛ",
		name: "Игорь Левченко",
		role: "Логист-менеджер",
		color: "avatar--green",
		online: true
	},
	{
		id: 4,
		initials: "ДК",
		name: "Дарья Ким",
		role: "Менеджер по продажам",
		color: "avatar--amber",
		online: false
	}
];
var U = Object.fromEntries(TEAM.map((user) => [user.id, user]));
/**
* Теги общие для всей компании, как в рабочей CRM (`tags`, цвет — любой HEX).
* Создаёт любой сотрудник, удаляет только администратор.
*/
var TAGS = [
	{
		id: 1,
		name: "Постоянный",
		color: "#10b981"
	},
	{
		id: 2,
		name: "Срочно",
		color: "#ef4444"
	},
	{
		id: 3,
		name: "Тендер",
		color: "#f59e0b"
	},
	{
		id: 4,
		name: "Рефрижератор",
		color: "#14b8a6"
	},
	{
		id: 5,
		name: "Опт",
		color: "#3b82f6"
	}
];
/** Причины проигрыша — справочник рабочей CRM (`loss_reasons`). */
var LOSS_REASONS = [
	"Перестал возить",
	"Отказ СБ",
	"Отказался работать"
];
/**
* Операторы ЭДО для выпадающего списка в карточке лида.
* В рабочей CRM это справочник с сервера, здесь — фиксированный список.
* `value` уходит в данные лида, `label` показывается в поле.
*/
var EDO_OPERATORS = [
	{
		value: "",
		label: "Не указан",
		vendor: ""
	},
	{
		value: "kontur",
		label: "Контур.Диадок",
		vendor: "СКБ Контур"
	},
	{
		value: "sbis",
		label: "СБИС / Saby",
		vendor: "Тензор"
	},
	{
		value: "astral",
		label: "Калуга Астрал",
		vendor: "Астрал.ЭДО, 1С-ЭДО"
	},
	{
		value: "taxcom",
		label: "Такском",
		vendor: ""
	},
	{
		value: "sberkorus",
		label: "СберКорус",
		vendor: ""
	}
];
var STAGE_META = [
	{
		id: 1,
		name: "Новый",
		color: "var(--stage-1)",
		hint: "Необработанные лиды"
	},
	{
		id: 2,
		name: "Перезвонить",
		color: "var(--stage-2)",
		hint: "Назначен повторный звонок"
	},
	{
		id: 3,
		name: "Вышел на ЛПР",
		color: "var(--stage-3)",
		hint: "Контакт с ЛПР"
	},
	{
		id: 4,
		name: "Потенциальный",
		color: "var(--stage-4)",
		hint: "Высокая вероятность заявки"
	},
	{
		id: 5,
		name: "Уехали, ждём заявку",
		color: "var(--stage-5)",
		hint: "Согласовали условия"
	}
];
function lead(partial) {
	return {
		inn: "7700000000",
		contact: "Контакт",
		city: "Москва",
		phone: "+7 900 000-00-00",
		email: "client@example.ru",
		edo: "",
		source: "Сайт / форма заявки",
		cargo: "Пиломатериалы",
		weight: "20 т",
		body: "Тент 92 м³",
		priority: 0,
		hot: false,
		late: false,
		lost: false,
		lossReason: "",
		days: 1,
		tagIds: [],
		created: "сегодня",
		...partial
	};
}
var STAGES$1 = [
	{
		...STAGE_META[0],
		leads: [
			lead({
				id: 1,
				tagIds: [1, 2],
				name: "ООО «СтройТрансСервис»",
				inn: "7743013902",
				edo: "kontur",
				contact: "Виталий Нестеров",
				route: "Москва → Казань",
				cargo: "Пиломатериалы",
				weight: "20 т",
				priority: 3,
				hot: true,
				due: "завтра 00:02",
				ownerId: 1,
				days: 1,
				stageId: 1
			}),
			lead({
				id: 2,
				name: "ИП Кузнецов А. В.",
				inn: "772703161145",
				edo: "sbis",
				contact: "Артём Кузнецов",
				city: "Тула",
				route: "Тула → Нижний Новгород",
				cargo: "Металлоконструкции",
				weight: "12 т",
				priority: 2,
				due: "завтра 22:02",
				ownerId: 1,
				days: 2,
				stageId: 1
			}),
			lead({
				id: 3,
				name: "АО «Агро-Поволжье»",
				inn: "6452098760",
				edo: "astral",
				contact: "Лилия Фархутдинова",
				city: "Самара",
				route: "Самара → Ростов-на-Дону",
				cargo: "Зерно в биг-бэгах",
				weight: "22 т",
				priority: 1,
				due: "4 нояб.",
				ownerId: 3,
				days: 3,
				stageId: 1
			}),
			lead({
				id: 4,
				tagIds: [5],
				name: "ООО «Северный Профиль»",
				inn: "7801234567",
				edo: "taxcom",
				contact: "Егор Балашов",
				city: "Санкт-Петербург",
				city2: "Мурманск",
				route: "Санкт-Петербург → Мурманск",
				cargo: "Профнастил",
				weight: "16 т",
				priority: 2,
				due: "5 нояб.",
				ownerId: 3,
				days: 5,
				stageId: 1
			})
		]
	},
	{
		...STAGE_META[1],
		leads: [
			lead({
				id: 5,
				tagIds: [4],
				name: "ООО «ХимПром Логистика»",
				inn: "5903012345",
				edo: "kontur",
				contact: "Денис Мартынов",
				city: "Пермь",
				route: "Пермь → Екатеринбург",
				cargo: "Химия (не опас.)",
				weight: "18 т",
				priority: 3,
				hot: true,
				due: "завтра 03:02",
				ownerId: 1,
				days: 1,
				stageId: 2
			}),
			lead({
				id: 6,
				tagIds: [1],
				name: "ООО «МебельГрад»",
				inn: "4345012345",
				contact: "Светлана Рогова",
				city: "Киров",
				route: "Киров → Москва",
				cargo: "Мебель в упаковке",
				weight: "8 т",
				priority: 2,
				due: "04 нояб.",
				ownerId: 2,
				days: 4,
				stageId: 2,
				late: true
			}),
			lead({
				id: 7,
				tagIds: [3],
				name: "ООО «Балтика Трейд»",
				inn: "3906012345",
				contact: "Никита Юшков",
				city: "Калининград",
				route: "Калининград → Москва",
				cargo: "Электроника",
				weight: "6 т",
				priority: 2,
				due: "11 нояб.",
				ownerId: 1,
				days: 11,
				stageId: 2
			}),
			lead({
				id: 19,
				name: "ООО «ВолгаАгро»",
				inn: "6316123450",
				contact: "Олег Данилов",
				city: "Самара",
				phone: "+7 927 118-40-21",
				email: "logist@volga-agro.ru",
				route: "Самара → Москва",
				cargo: "Зерно",
				weight: "20 т",
				priority: 1,
				due: "01 нояб.",
				ownerId: 1,
				days: 15,
				stageId: 2,
				lost: true,
				lossReason: "Перестал возить",
				created: "20 окт."
			})
		]
	},
	{
		...STAGE_META[2],
		leads: [
			lead({
				id: 8,
				tagIds: [1],
				name: "ГК «ФудЛайн»",
				inn: "7716045678",
				contact: "Ольга Степанова",
				city: "Москва",
				route: "Москва → Краснодар",
				cargo: "Продукты, +2 °C",
				weight: "20 т",
				priority: 3,
				hot: true,
				due: "07 нояб.",
				ownerId: 1,
				days: 7,
				stageId: 3
			}),
			lead({
				id: 9,
				tagIds: [2],
				name: "ООО «ТехноИмпорт»",
				inn: "1660012345",
				edo: "sbis",
				contact: "Руслан Шарипов",
				city: "Казань",
				route: "Казань → Новосибирск",
				cargo: "Станки, оборудование",
				weight: "15 т",
				priority: 3,
				due: "08 нояб.",
				ownerId: 1,
				days: 9,
				stageId: 3
			}),
			lead({
				id: 10,
				tagIds: [5],
				name: "ООО «ПолимерПак»",
				inn: "5029012345",
				edo: "sberkorus",
				contact: "Марина Кравцова",
				city: "Мытищи",
				route: "Мытищи → Воронеж",
				cargo: "Полимеры",
				weight: "19 т",
				priority: 2,
				due: "09 нояб.",
				ownerId: 4,
				days: 4,
				stageId: 3
			}),
			lead({
				id: 11,
				name: "ООО «Русский Камень»",
				inn: "6678012345",
				contact: "Владимир Панов",
				city: "Екатеринбург",
				route: "Екатеринбург → Самара",
				cargo: "Натуральный камень",
				weight: "22 т",
				priority: 0,
				due: "12 нояб.",
				ownerId: 4,
				days: 12,
				stageId: 3
			}),
			lead({
				id: 20,
				name: "ООО «Пермь-Кабель»",
				inn: "5904123456",
				contact: "Инна Лаптева",
				city: "Пермь",
				route: "Пермь → Екатеринбург",
				cargo: "Кабельная продукция",
				weight: "12 т",
				priority: 2,
				due: "28 окт.",
				ownerId: 2,
				days: 19,
				stageId: 3,
				lost: true,
				lossReason: "Отказ СБ",
				created: "14 окт."
			})
		]
	},
	{
		...STAGE_META[3],
		leads: [
			lead({
				id: 12,
				tagIds: [1, 5],
				name: "АО «УралМеталлСнаб»",
				inn: "7455012345",
				contact: "Павел Ерёмин",
				city: "Челябинск",
				route: "Челябинск → Санкт-Петербург",
				cargo: "Металлопрокат",
				weight: "24 т",
				priority: 3,
				due: "завтра 04:02",
				ownerId: 1,
				days: 6,
				stageId: 4
			}),
			lead({
				id: 13,
				name: "ООО «Домстрой-Юг»",
				inn: "2312012345",
				contact: "Марина Лебедева",
				city: "Краснодар",
				route: "Краснодар → Сочи",
				cargo: "Стройматериалы",
				weight: "20 т",
				priority: 2,
				due: "08 нояб.",
				ownerId: 1,
				days: 8,
				stageId: 4
			}),
			lead({
				id: 14,
				name: "ООО «Гринлайн»",
				inn: "5031012345",
				contact: "Илья Ковалёв",
				city: "Одинцово",
				route: "Одинцово → Смоленск",
				cargo: "Удобрения",
				weight: "21 т",
				priority: 0,
				due: "10 нояб.",
				ownerId: 3,
				days: 3,
				stageId: 4
			}),
			lead({
				id: 15,
				name: "ООО «СибПродТорг»",
				inn: "5405012345",
				contact: "Андрей Кислов",
				city: "Новосибирск",
				route: "Новосибирск → Тюмень",
				cargo: "Консервы",
				weight: "18 т",
				priority: 1,
				due: "14 нояб.",
				ownerId: 2,
				days: 14,
				stageId: 4
			})
		]
	},
	{
		...STAGE_META[4],
		leads: [
			lead({
				id: 16,
				tagIds: [3],
				name: "ООО «Логистика Плюс»",
				inn: "7715004321",
				contact: "Кирилл Соловьёв",
				city: "Москва",
				route: "Москва → Санкт-Петербург",
				cargo: "Бытовая техника",
				weight: "17 т",
				priority: 3,
				hot: true,
				due: "сегодня 18:00",
				ownerId: 1,
				days: 2,
				stageId: 5
			}),
			lead({
				id: 17,
				name: "ООО «Сибирь-Транс»",
				inn: "5407123456",
				contact: "Антон Хромов",
				city: "Новосибирск",
				route: "Новосибирск → Кемерово",
				cargo: "Уголь",
				weight: "25 т",
				priority: 2,
				due: "сегодня 20:00",
				ownerId: 1,
				days: 4,
				stageId: 5
			}),
			lead({
				id: 18,
				name: "ГК «Восток»",
				inn: "2540123456",
				contact: "Юлия Пахомова",
				city: "Владивосток",
				route: "Владивосток → Хабаровск",
				cargo: "Контейнеры",
				weight: "20 т",
				priority: 1,
				due: "13 нояб.",
				ownerId: 4,
				days: 5,
				stageId: 5
			})
		]
	}
];
var ALL_LEADS = STAGES$1.flatMap((stage) => stage.leads);
var OWNER = (id) => U[id] ?? TEAM[0];
ALL_LEADS.map((item) => ({
	id: item.id,
	name: item.name,
	city: item.city,
	contact: item.contact,
	phone: item.phone,
	route: item.route,
	cargo: item.cargo,
	weight: item.weight,
	stageId: item.stageId,
	stageName: STAGES$1.find((stage) => stage.id === item.stageId)?.name,
	stageColor: STAGES$1.find((stage) => stage.id === item.stageId)?.color,
	ownerId: item.ownerId,
	created: item.created
}));
/** Статусы заявки: подписи и цвета — из одного источника, `SHIPMENT_STEPS`. */
var SHIPMENT_STATUS = Object.fromEntries(SHIPMENT_STEPS.map((step) => [step.id, {
	label: step.name,
	tone: step.tone
}]));
/**
* Демо-заявки в форме карточки рабочей CRM (поля — camelCase серверных).
* Маршрут (`route`) не хранится: его собирает `routeOf` из городов.
*/
var SHIPMENTS = [
	{
		id: 148,
		number: "ЗВ-2026-0148",
		leadId: 1,
		client: "ООО «СтройТрансСервис»",
		ownerId: 1,
		status: "unloaded",
		createdAt: "2026-11-05T09:12",
		customerPrice: 185e3,
		carrierPrice: 137e3,
		customerTax: "no_vat",
		carrierTax: "no_vat",
		customerContact: "Виталий Нестеров",
		loadingCities: ["Москва"],
		loadingAddress: "ул. Складочная, 1, стр. 18",
		loadingContact: "Виталий Нестеров, +7 915 204-18-73",
		loadingDateFrom: "2026-11-05",
		loadingDateTo: "2026-11-05",
		loadingTime: "08:00",
		unloadingCities: ["Казань"],
		unloadingAddress: "ул. Тихорецкая, 14",
		unloadingContact: "Ильдар Сафин, +7 917 220-14-02",
		unloadingDateFrom: "2026-11-07",
		unloadingDateTo: "",
		unloadingTime: "09:00",
		carrierName: "ИП Морозов С. В.",
		carrierInn: "165912345678",
		carrierContact: "Сергей Морозов, +7 927 330-77-12",
		vehicle: "Тент / шторы",
		vehicleNumber: "А 123 ВС 16",
		hasTrailer: true,
		trailerNumber: "ЕА 4567 16",
		driverName: "Морозов Сергей Петрович",
		driverPhone: "+7 927 330-77-12",
		driverPassport: "16 04 123456",
		carrierSigner: "Морозов С. В.",
		cargoType: "Пиломатериалы",
		cargoPackaging: "В упаковке",
		cargoVolume: "82",
		cargoWeight: "20",
		capacity: "20",
		bodyType: ["Тент"],
		loadingMethod: ["задняя"],
		transportType: "tent",
		comment: "Погрузка со стороны двора, пропуск заказывать за час."
	},
	{
		id: 147,
		number: "ЗВ-2026-0147",
		leadId: 8,
		client: "ГК «ФудЛайн»",
		ownerId: 1,
		status: "loaded",
		createdAt: "2026-11-04T16:40",
		customerPrice: 215e3,
		carrierPrice: 168e3,
		customerTax: "vat_22",
		carrierTax: "vat_22",
		customerContact: "Ольга Степанова",
		loadingCities: ["Москва"],
		loadingAddress: "Домодедово, склад №4",
		loadingContact: "Ольга Степанова, +7 985 712-66-01",
		loadingDateFrom: "2026-11-05",
		loadingDateTo: "",
		loadingTime: "20:00",
		unloadingCities: ["Краснодар"],
		unloadingAddress: "ул. Уральская, 98",
		unloadingContact: "Артур Геворкян, +7 918 100-45-90",
		unloadingDateFrom: "2026-11-07",
		unloadingDateTo: "",
		unloadingTime: "06:00",
		carrierName: "ООО «РефТранс»",
		carrierInn: "2311098765",
		carrierContact: "Дмитрий Гуров, +7 918 220-31-77",
		vehicle: "Реф",
		vehicleNumber: "В 887 КК 23",
		hasTrailer: false,
		trailerNumber: "",
		driverName: "Гуров Дмитрий Ильич",
		driverPhone: "+7 918 220-31-77",
		driverPassport: "",
		carrierSigner: "Гуров Д. И.",
		cargoType: "Продукты, +2 °C",
		cargoPackaging: "Паллеты",
		cargoVolume: "60",
		cargoWeight: "20",
		capacity: "20",
		bodyType: ["Реф"],
		loadingMethod: ["задняя"],
		transportType: "ref",
		comment: "Температурный режим не выше +2 °C, датчики фиксируем на выгрузке."
	},
	{
		id: 146,
		number: "ЗВ-2026-0146",
		leadId: 12,
		client: "АО «УралМеталлСнаб»",
		ownerId: 1,
		status: "checked",
		createdAt: "2026-11-02T11:05",
		customerPrice: 268e3,
		carrierPrice: 237e3,
		customerTax: "no_vat",
		carrierTax: "no_vat",
		customerContact: "",
		loadingCities: ["Челябинск"],
		loadingAddress: "Троицкий тракт, 11",
		loadingContact: "Павел Ерёмин, +7 922 811-09-54",
		loadingDateFrom: "2026-11-06",
		loadingDateTo: "",
		loadingTime: "08:00",
		unloadingCities: ["Санкт-Петербург"],
		unloadingAddress: "пр. Обуховской Обороны, 120",
		unloadingContact: "Сергей Титов, +7 921 445-12-08",
		unloadingDateFrom: "2026-11-09",
		unloadingDateTo: "2026-11-10",
		unloadingTime: "08:00",
		carrierName: "ООО «СевЗапТранс»",
		carrierInn: "7802113456",
		carrierContact: "Андрей Гусев, +7 921 100-77-45",
		vehicle: "Площадка",
		vehicleNumber: "О 441 ТТ 78",
		hasTrailer: true,
		trailerNumber: "АК 9087 78",
		driverName: "Гусев Андрей Львович",
		driverPhone: "+7 921 100-77-45",
		driverPassport: "",
		carrierSigner: "",
		cargoType: "Металлопрокат",
		cargoPackaging: "Без упаковки",
		cargoVolume: "",
		cargoWeight: "24",
		capacity: "25",
		bodyType: ["Площадка"],
		loadingMethod: ["боковая", "верхняя"],
		transportType: "other",
		comment: "Подпись заявки у клиента просрочена на 3 дня."
	},
	{
		id: 145,
		number: "ЗВ-2026-0145",
		leadId: 16,
		client: "ООО «Логистика Плюс»",
		ownerId: 1,
		status: "new",
		createdAt: "2026-11-06T08:20",
		customerPrice: 132e3,
		carrierPrice: 104e3,
		customerTax: "vat_22",
		carrierTax: "vat_22",
		customerContact: "",
		loadingCities: ["Москва"],
		loadingAddress: "Шоссе Энтузиастов, 31",
		loadingContact: "Кирилл Соловьёв, +7 495 320-11-09",
		loadingDateFrom: "2026-11-06",
		loadingDateTo: "",
		loadingTime: "18:00",
		unloadingCities: ["Санкт-Петербург"],
		unloadingAddress: "Софийская ул., 60",
		unloadingContact: "Олег Ким, +7 812 400-11-22",
		unloadingDateFrom: "2026-11-08",
		unloadingDateTo: "",
		unloadingTime: "08:00",
		carrierName: "",
		carrierInn: "",
		carrierContact: "",
		vehicle: "Тент",
		vehicleNumber: "",
		hasTrailer: false,
		trailerNumber: "",
		driverName: "",
		driverPhone: "",
		driverPassport: "",
		carrierSigner: "",
		cargoType: "Бытовая техника",
		cargoPackaging: "Паллеты",
		cargoVolume: "80",
		cargoWeight: "17",
		capacity: "20",
		bodyType: ["Тент"],
		loadingMethod: [],
		transportType: "tent",
		comment: ""
	},
	{
		id: 144,
		number: "ЗВ-2026-0144",
		leadId: 9,
		client: "ООО «ТехноИмпорт»",
		ownerId: 1,
		status: "checked",
		createdAt: "2026-11-01T13:44",
		customerPrice: 31e4,
		carrierPrice: 251e3,
		customerTax: "no_vat",
		carrierTax: "no_vat",
		customerContact: "",
		loadingCities: ["Казань"],
		loadingAddress: "ул. Тэцевская, 5",
		loadingContact: "Руслан Шарипов, +7 917 330-95-62",
		loadingDateFrom: "2026-11-10",
		loadingDateTo: "",
		loadingTime: "09:00",
		unloadingCities: ["Новосибирск"],
		unloadingAddress: "ул. Станционная, 60",
		unloadingContact: "Игорь Мельник, +7 913 880-20-14",
		unloadingDateFrom: "2026-11-14",
		unloadingDateTo: "",
		unloadingTime: "08:00",
		carrierName: "ООО «ТрансСиб»",
		carrierInn: "5405998877",
		carrierContact: "Владимир Кац, +7 913 200-45-66",
		vehicle: "Трал",
		vehicleNumber: "Н 552 РР 54",
		hasTrailer: false,
		trailerNumber: "",
		driverName: "Кац Владимир Ильич",
		driverPhone: "+7 913 200-45-66",
		driverPassport: "",
		carrierSigner: "",
		cargoType: "Станки, оборудование",
		cargoPackaging: "Без упаковки",
		cargoVolume: "",
		cargoWeight: "15",
		capacity: "30",
		bodyType: ["Трал"],
		loadingMethod: ["кран"],
		transportType: "other",
		comment: "Нужны крепёжные ремни, груз нестандартный."
	},
	{
		id: 143,
		number: "ЗВ-2026-0143",
		leadId: 10,
		client: "ООО «ПолимерПак»",
		ownerId: 4,
		status: "loaded",
		createdAt: "2026-10-30T10:05",
		customerPrice: 142e3,
		carrierPrice: 118500,
		customerTax: "vat_22",
		carrierTax: "vat_22",
		customerContact: "",
		loadingCities: ["Владимир"],
		loadingAddress: "",
		loadingContact: "",
		loadingDateFrom: "2026-11-03",
		loadingDateTo: "",
		loadingTime: "",
		unloadingCities: ["Москва"],
		unloadingAddress: "",
		unloadingContact: "",
		unloadingDateFrom: "2026-11-04",
		unloadingDateTo: "",
		unloadingTime: "",
		carrierName: "ИП Сорокин А. В.",
		carrierInn: "330501112233",
		carrierContact: "",
		vehicle: "",
		vehicleNumber: "",
		hasTrailer: false,
		trailerNumber: "",
		driverName: "",
		driverPhone: "",
		driverPassport: "",
		carrierSigner: "",
		cargoType: "Плёнка в рулонах",
		cargoPackaging: "",
		cargoVolume: "",
		cargoWeight: "8",
		capacity: "",
		bodyType: ["тент"],
		loadingMethod: [],
		transportType: "tent",
		comment: ""
	},
	{
		id: 142,
		number: "ЗВ-2026-0142",
		leadId: 6,
		client: "ООО «МебельГрад»",
		ownerId: 2,
		status: "new",
		createdAt: "2026-10-29T16:40",
		customerPrice: 96e3,
		carrierPrice: 104e3,
		customerTax: "vat_22",
		carrierTax: "no_vat",
		customerContact: "",
		loadingCities: ["Пенза"],
		loadingAddress: "",
		loadingContact: "",
		loadingDateFrom: "2026-11-18",
		loadingDateTo: "",
		loadingTime: "",
		unloadingCities: ["Самара"],
		unloadingAddress: "",
		unloadingContact: "",
		unloadingDateFrom: "2026-11-19",
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
		cargoType: "Мебель, коробки",
		cargoPackaging: "",
		cargoVolume: "",
		cargoWeight: "3",
		capacity: "",
		bodyType: [],
		loadingMethod: [],
		transportType: "gazel",
		comment: "Перевозчик ещё не выбран; ставка клиента ниже рынка — согласовать."
	},
	{
		id: 141,
		number: "ЗВ-2026-0141",
		leadId: 11,
		client: "ООО «Русский Камень»",
		ownerId: 4,
		status: "unloaded",
		createdAt: "2026-10-27T08:20",
		customerPrice: 268e3,
		carrierPrice: 221e3,
		customerTax: "no_vat",
		carrierTax: "no_vat",
		customerContact: "",
		loadingCities: ["Карелия"],
		loadingAddress: "",
		loadingContact: "",
		loadingDateFrom: "2026-10-29",
		loadingDateTo: "",
		loadingTime: "",
		unloadingCities: ["Москва"],
		unloadingAddress: "",
		unloadingContact: "",
		unloadingDateFrom: "2026-11-01",
		unloadingDateTo: "",
		unloadingTime: "",
		carrierName: "ООО «СеверТракс»",
		carrierInn: "1001234567",
		carrierContact: "",
		vehicle: "",
		vehicleNumber: "",
		hasTrailer: false,
		trailerNumber: "",
		driverName: "",
		driverPhone: "",
		driverPassport: "",
		carrierSigner: "",
		cargoType: "Гранитные плиты",
		cargoPackaging: "",
		cargoVolume: "",
		cargoWeight: "20",
		capacity: "",
		bodyType: ["борт"],
		loadingMethod: [],
		transportType: "other",
		comment: ""
	}
];
var TASKS = [
	{
		id: 1,
		type: "call",
		title: "Повторный звонок",
		company: "ООО «МебельГрад»",
		leadId: 6,
		time: "04 нояб., 10:00",
		phone: "+7 950 332-80-44",
		ownerId: 2,
		status: "overdue"
	},
	{
		id: 2,
		type: "call",
		title: "Квалифицировать лид",
		company: "АО «Агро-Поволжье»",
		leadId: 3,
		time: "сегодня 23:02",
		phone: "+7 977 015-83-49",
		ownerId: 1,
		status: "today"
	},
	{
		id: 3,
		type: "call",
		title: "Первичный звонок",
		company: "ООО «СтройТрансСервис»",
		leadId: 1,
		time: "завтра 00:02",
		phone: "+7 915 204-18-73",
		ownerId: 2,
		status: "upcoming"
	},
	{
		id: 4,
		type: "email",
		title: "Звонок: подтвердить условия",
		company: "ООО «ПолимерПак»",
		leadId: 10,
		time: "завтра 01:02",
		phone: "+7 926 773-50-18",
		ownerId: 1,
		status: "upcoming"
	},
	{
		id: 5,
		type: "call",
		title: "Перезвонить после 16:00",
		company: "ООО «ХимПром Логистика»",
		leadId: 5,
		time: "завтра 03:02",
		phone: "+7 912 440-71-15",
		ownerId: 1,
		status: "upcoming"
	},
	{
		id: 6,
		type: "quote",
		title: "Финальная ставка по маршруту",
		company: "АО «УралМеталлСнаб»",
		leadId: 12,
		time: "завтра 04:02",
		phone: "+7 922 811-09-54",
		ownerId: 1,
		status: "upcoming"
	},
	{
		id: 7,
		type: "quote",
		title: "Отправить расчёт ставки",
		company: "ИП Кузнецов А. В.",
		leadId: 2,
		time: "завтра 09:00",
		phone: "+7 903 771-22-09",
		ownerId: 4,
		status: "upcoming"
	},
	{
		id: 8,
		type: "meeting",
		title: "Встреча в офисе",
		company: "ГК «ФудЛайн»",
		leadId: 8,
		time: "07 нояб., 12:00",
		phone: "+7 985 712-66-01",
		ownerId: 1,
		status: "upcoming"
	},
	{
		id: 9,
		type: "email",
		title: "Отправить договор",
		company: "ООО «ТехноИмпорт»",
		leadId: 9,
		time: "08 нояб., 10:00",
		phone: "+7 917 330-95-62",
		ownerId: 3,
		status: "upcoming"
	},
	{
		id: 10,
		type: "call",
		title: "Проверить выгрузку",
		company: "ООО «Логистика Плюс»",
		leadId: 16,
		time: "вчера 16:00",
		phone: "+7 495 320-11-09",
		ownerId: 1,
		status: "done"
	},
	{
		id: 11,
		type: "email",
		title: "Выслать закрывающие документы",
		company: "ГК «ФудЛайн»",
		leadId: 8,
		time: "вчера 11:30",
		phone: "+7 985 712-66-01",
		ownerId: 1,
		status: "done"
	}
];
var TASK_TYPES = {
	call: {
		label: "Звонок",
		icon: "phone",
		cls: "tile--green"
	},
	email: {
		label: "Письмо",
		icon: "mail",
		cls: "tile--blue"
	},
	meeting: {
		label: "Встреча",
		icon: "calendar",
		cls: "tile--amber"
	},
	quote: {
		label: "Ставка",
		icon: "file",
		cls: ""
	}
};
/**
* Аналитика по периодам: только то, что нельзя вывести из доски менеджера.
* Воронка, конверсия и маржа заявок считаются в AnalyticsPage
* по собственным лидам и связанным с ними заявкам.
*/
var ANALYTICS = {
	week: {
		inflow: [
			2,
			1,
			4,
			3,
			5,
			6,
			8,
			11
		],
		sources: [
			{
				name: "Холодный обзвон",
				count: 6,
				width: 88
			},
			{
				name: "Сайт / форма заявки",
				count: 5,
				width: 74
			},
			{
				name: "Рекомендация",
				count: 3,
				width: 46
			},
			{
				name: "Яндекс.Директ",
				count: 3,
				width: 46
			},
			{
				name: "Выставка TransRussia",
				count: 2,
				width: 32
			},
			{
				name: "LinkedIn / нетворкинг",
				count: 1,
				width: 18
			}
		]
	},
	month: {
		inflow: [
			12,
			18,
			9,
			24,
			21,
			28,
			26,
			34
		],
		sources: [
			{
				name: "Холодный обзвон",
				count: 22,
				width: 92
			},
			{
				name: "Сайт / форма заявки",
				count: 18,
				width: 76
			},
			{
				name: "Рекомендация",
				count: 14,
				width: 58
			},
			{
				name: "Яндекс.Директ",
				count: 12,
				width: 50
			},
			{
				name: "Выставка TransRussia",
				count: 7,
				width: 30
			},
			{
				name: "LinkedIn / нетворкинг",
				count: 5,
				width: 22
			}
		]
	},
	quarter: {
		inflow: [
			42,
			38,
			51,
			47,
			63,
			58,
			71,
			79
		],
		sources: [
			{
				name: "Холодный обзвон",
				count: 64,
				width: 94
			},
			{
				name: "Сайт / форма заявки",
				count: 52,
				width: 78
			},
			{
				name: "Рекомендация",
				count: 41,
				width: 60
			},
			{
				name: "Яндекс.Директ",
				count: 33,
				width: 48
			},
			{
				name: "Выставка TransRussia",
				count: 24,
				width: 34
			},
			{
				name: "LinkedIn / нетворкинг",
				count: 17,
				width: 24
			}
		]
	}
};
// src/app/store.jsx
var LeadsContext = createContext(null);
var STAGES_KEY = `crm.stages.${ME.id}.v1`;
var LEADS_KEY = `crm.leads.${ME.id}.v1`;
var SHIPMENTS_KEY = `crm.shipments.${ME.id}.v1`;
var TAGS_KEY = "crm.tags.v1";
var STAGE_COLORS = [
	"#3b82f6",
	"#f59e0b",
	"#8b5cf6",
	"#10b981",
	"#14b8a6",
	"#ec4899",
	"#ef4444",
	"#64748b"
];
var DEFAULT_STAGES = STAGES$1.map(({ id, name, color, hint }) => ({
	id,
	name,
	color,
	hint
}));
var DEFAULT_LEADS = STAGES$1.flatMap((stage) => stage.leads.map((lead, index) => ({
	...lead,
	position: index
})));
var DEFAULT_SHIPMENTS = SHIPMENTS.map(normalizeShipment);
var DEFAULT_TAGS = TAGS.map((tag) => ({ ...tag }));
/** Старые сохранения хранили приоритет словом — переводим в звёзды 0–3. */
var LEGACY_PRIORITY = {
	high: 3,
	mid: 2,
	low: 1
};
function toPriority(value) {
	if (typeof value === "string" && value in LEGACY_PRIORITY) return LEGACY_PRIORITY[value];
	const number = Number(value);
	return Number.isInteger(number) && number >= 0 && number <= 3 ? number : 0;
}
/** Приводит лид из любого сохранения к текущей форме, ничего не теряя. */
function normalizeLead(lead) {
	return {
		...lead,
		priority: toPriority(lead.priority),
		tagIds: Array.isArray(lead.tagIds) ? lead.tagIds : [],
		lost: Boolean(lead.lost),
		lossReason: lead.lossReason ?? ""
	};
}
function load(key, fallback) {
	try {
		const raw = window.localStorage.getItem(key);
		if (!raw) return fallback;
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) && parsed.length ? parsed : fallback;
	} catch {
		return fallback;
	}
}
function save(key, value) {
	try {
		window.localStorage.setItem(key, JSON.stringify(value));
	} catch {}
}
/** Этапы и лиды одного менеджера: лиды без своего этапа падают на первый. */
function loadState() {
	const stages = load(STAGES_KEY, DEFAULT_STAGES);
	const known = new Set(stages.map((stage) => stage.id));
	const leads = load(LEADS_KEY, DEFAULT_LEADS).map((stored) => {
		const lead = normalizeLead(stored);
		return known.has(lead.stageId) ? lead : {
			...lead,
			stageId: stages[0].id
		};
	});
	const byStage = /* @__PURE__ */ new Map();
	leads.forEach((lead) => {
		if (!byStage.has(lead.stageId)) byStage.set(lead.stageId, []);
		byStage.get(lead.stageId).push(lead);
	});
	byStage.forEach((list) => {
		list.sort((a, b) => (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER)).forEach((lead, index) => {
			lead.position = index;
		});
	});
	return {
		stages,
		leads,
		shipments: load(SHIPMENTS_KEY, DEFAULT_SHIPMENTS).map(normalizeShipment),
		tags: load(TAGS_KEY, DEFAULT_TAGS)
	};
}
function nextStageId(stages) {
	return stages.reduce((max, stage) => Math.max(max, stage.id), 0) + 1;
}
function nextShipmentId(shipments) {
	return shipments.reduce((max, shipment) => Math.max(max, shipment.id), 0) + 1;
}
function shipmentNumber(id) {
	return `ЗВ-2026-${String(id).padStart(4, "0")}`;
}
/**
* Макетное хранилище менеджера: этапы воронки и лиды.
* Живёт в localStorage под ключом пользователя, поэтому у каждого своя доска,
* порядок карточек и настройка этапов. Бэкенда нет — всё восстанавливается
* из этих же ключей после перезагрузки.
*/
function LeadsProvider({ children }) {
	const [initial] = useState(loadState);
	const [stages, setStages] = useState(initial.stages);
	const [leads, setLeads] = useState(initial.leads);
	const [shipments, setShipments] = useState(initial.shipments);
	const [tags, setTags] = useState(initial.tags);
	const [leadDialog, setLeadDialog] = useState(null);
	useEffect(() => {
		save(STAGES_KEY, stages);
	}, [stages]);
	useEffect(() => {
		save(LEADS_KEY, leads);
	}, [leads]);
	useEffect(() => {
		save(SHIPMENTS_KEY, shipments);
	}, [shipments]);
	useEffect(() => {
		save(TAGS_KEY, tags);
	}, [tags]);
	const value = useMemo(() => {
		const addLead = (draft) => setLeads((prev) => {
			const nextId = prev.reduce((max, lead) => Math.max(max, lead.id), 0) + 1;
			const targetStage = draft.stageId ?? stages[0]?.id ?? 1;
			return [{
				id: nextId,
				name: "Без названия",
				inn: "—",
				city: "—",
				contact: "—",
				role: "—",
				phone: "—",
				email: "—",
				route: "Москва → Москва",
				cargo: "Сборный груз",
				weight: "—",
				priority: 0,
				hot: false,
				late: false,
				lost: false,
				lossReason: "",
				tagIds: [],
				due: "сегодня",
				created: "только что",
				stageId: targetStage,
				position: prev.filter((lead) => lead.stageId === targetStage).reduce((min, lead) => Math.min(min, lead.position ?? 0), 0) - 1,
				ownerId: ME.id,
				...draft
			}, ...prev];
		});
		const openLeadDialog = (stageId = null, ownerId = ME.id) => setLeadDialog({
			stageId: stageId ?? stages[0]?.id ?? null,
			ownerId
		});
		const closeLeadDialog = () => setLeadDialog(null);
		/**
		* Быстрое создание заявки из сохранённой карточки лида. В макете цены
		* дозаполняют в карточке, а остальные полные реквизиты остаются заглушками.
		*/
		/** Быстрая заявка из карточки лида: клиент и ответственный берутся из лида. */
		const addShipment = ({ lead, loadingCity, unloadingCity, loadingDate, unloadingDate, carrierName, carrierInn, carrierContact }) => {
			const id = nextShipmentId(shipments);
			const shipment = normalizeShipment({
				id,
				number: shipmentNumber(id),
				leadId: lead.id,
				client: lead.name,
				ownerId: lead.ownerId,
				status: "new",
				createdAt: nowLocal(),
				customerContact: lead.contact && lead.contact !== "—" ? lead.contact : "",
				loadingCities: loadingCity ? [loadingCity] : [],
				loadingDateFrom: loadingDate ?? "",
				unloadingCities: unloadingCity ? [unloadingCity] : [],
				unloadingDateFrom: unloadingDate ?? "",
				carrierName: carrierName ?? "",
				carrierInn: carrierInn ?? "",
				carrierContact: carrierContact ?? ""
			});
			setShipments((prev) => [...prev, shipment]);
			return shipment;
		};
		/**
		* Копия заявки: новая запись с новым номером, статус «Новая», дата — сейчас.
		* `pending` — несохранённые правки формы: копия делается с того, что видит
		* пользователь, а не с последней сохранённой версии.
		*/
		const copyShipment = (sourceId, pending = null) => {
			const source = shipments.find((item) => item.id === sourceId);
			if (!source) return null;
			const id = nextShipmentId(shipments);
			const shipment = normalizeShipment({
				...copyOf({
					...source,
					...pending
				}),
				id,
				number: shipmentNumber(id)
			});
			setShipments((prev) => [...prev, shipment]);
			return shipment;
		};
		/** Удаление заявки без возврата (в рабочей CRM — только администратор). */
		const deleteShipment = (id) => setShipments((prev) => prev.filter((shipment) => shipment.id !== id));
		const updateShipment = (id, patch) => setShipments((prev) => prev.map((shipment) => {
			if (shipment.id !== id) return shipment;
			const next = {
				...shipment,
				...patch
			};
			return {
				...next,
				route: routeOf(next)
			};
		}));
		/**
		* Перенос лида на этап с конкретной позицией.
		* index — место среди карточек этапа без самого лида: 0 — в начало, null — в конец.
		*/
		const moveLead = (id, stageId, index = null) => setLeads((prev) => {
			const moving = prev.find((lead) => lead.id === id);
			if (!moving) return prev;
			const rest = prev.filter((lead) => lead.id !== id);
			const target = rest.filter((lead) => lead.stageId === stageId).sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
			const at = index == null ? target.length : Math.max(0, Math.min(index, target.length));
			const order = [
				...target.slice(0, at).map((lead) => lead.id),
				id,
				...target.slice(at).map((lead) => lead.id)
			];
			const positions = new Map(order.map((leadId, position) => [leadId, position]));
			if (moving.stageId !== stageId) rest.filter((lead) => lead.stageId === moving.stageId).sort((a, b) => (a.position ?? 0) - (b.position ?? 0)).forEach((lead, position) => positions.set(lead.id, position));
			return prev.map((lead) => {
				if (lead.id === id) return {
					...lead,
					stageId,
					position: positions.get(id) ?? 0
				};
				const position = positions.get(lead.id);
				return position == null ? lead : {
					...lead,
					position
				};
			});
		});
		/** Правка полей карточки: название, ИНН, контакты, бухгалтер. */
		const updateLead = (id, patch) => setLeads((prev) => prev.map((lead) => lead.id === id ? {
			...lead,
			...patch
		} : lead));
		const removeLeads = (ids) => setLeads((prev) => {
			const rest = prev.filter((lead) => !ids.includes(lead.id));
			const byStage = /* @__PURE__ */ new Map();
			rest.forEach((lead) => {
				if (!byStage.has(lead.stageId)) byStage.set(lead.stageId, []);
				byStage.get(lead.stageId).push(lead);
			});
			const positions = /* @__PURE__ */ new Map();
			byStage.forEach((list) => list.sort((a, b) => (a.position ?? 0) - (b.position ?? 0)).forEach((lead, index) => positions.set(lead.id, index)));
			return rest.map((lead) => ({
				...lead,
				position: positions.get(lead.id) ?? lead.position
			}));
		});
		/** Новый этап создаётся из настроек или прямо в конце канбана. */
		const addStage = (name = "Новый этап") => setStages((prev) => {
			const stageName = typeof name === "string" ? name.trim() : "";
			const id = nextStageId(prev);
			return [...prev, {
				id,
				name: stageName || "Новый этап",
				color: STAGE_COLORS[prev.length % STAGE_COLORS.length],
				hint: "Опишите этап"
			}];
		});
		const updateStage = (id, patch) => setStages((prev) => prev.map((stage) => stage.id === id ? {
			...stage,
			...patch
		} : stage));
		const moveStage = (id, direction) => setStages((prev) => {
			const index = prev.findIndex((stage) => stage.id === id);
			const target = index + direction;
			if (index < 0 || target < 0 || target >= prev.length) return prev;
			const next = [...prev];
			[next[index], next[target]] = [next[target], next[index]];
			return next;
		});
		/** Удаляем этап: его лиды переезжают на соседний, последний удалить нельзя. */
		const removeStage = (id) => {
			if (stages.length <= 1) return;
			const index = stages.findIndex((stage) => stage.id === id);
			const fallback = stages[index - 1] ?? stages[index + 1];
			setLeads((prev) => prev.map((lead) => lead.stageId === id ? {
				...lead,
				stageId: fallback.id
			} : lead));
			setStages((prev) => prev.filter((stage) => stage.id !== id));
		};
		/** Первая позиция этапа: лид, вернувшийся на доску, встаёт наверх. */
		const topOf = (list, stageId) => list.filter((lead) => lead.stageId === stageId).reduce((min, lead) => Math.min(min, lead.position ?? 0), 0) - 1;
		/** Проигрыш: лид уходит с доски, причина обязательна и видна в карточке. */
		const loseLead = (id, reason) => updateLead(id, {
			lost: true,
			lossReason: reason
		});
		/**
		* Возврат из проигрыша. Владелец «Восстанавливает» лид у себя, коллега
		* «Берёт себе» — тогда лид переходит к нему, как в рабочей CRM.
		*/
		const restoreLead = (id, { takeOver = false } = {}) => setLeads((prev) => prev.map((lead) => {
			if (lead.id !== id) return lead;
			const owner = takeOver ? ME.id : lead.ownerId;
			const others = prev.filter((item) => item.ownerId === owner && !item.lost);
			return {
				...lead,
				lost: false,
				lossReason: "",
				ownerId: owner,
				position: topOf(others, lead.stageId)
			};
		}));
		/** Передача коллеге: вместе с лидом уходят заявки; проигранный лид возвращается на доску. */
		const transferLead = (id, ownerId) => {
			const firstStage = stages[0]?.id ?? 1;
			setLeads((prev) => prev.map((lead) => lead.id === id ? {
				...lead,
				ownerId,
				lost: false,
				lossReason: "",
				stageId: firstStage,
				position: topOf(prev.filter((item) => item.ownerId === ownerId), firstStage)
			} : lead));
			setShipments((prev) => prev.map((shipment) => shipment.leadId === id ? {
				...shipment,
				ownerId
			} : shipment));
		};
		/** Удаление без возврата: вместе с лидом стираются его заявки. */
		const deleteLead = (id) => {
			removeLeads([id]);
			setShipments((prev) => prev.filter((shipment) => shipment.leadId !== id));
		};
		/** Новый общий тег; совпадающее имя не дублируем, а возвращаем существующий. */
		const addTag = (name, color) => {
			const clean = name.trim();
			const existing = tags.find((tag) => tag.name.toLowerCase() === clean.toLowerCase());
			if (existing) return existing;
			const tag = {
				id: tags.reduce((max, item) => Math.max(max, item.id), 0) + 1,
				name: clean,
				color
			};
			setTags((prev) => [...prev, tag]);
			return tag;
		};
		/** Удаление тега (только администратор) снимает его со всех карточек. */
		const removeTag = (id) => {
			setTags((prev) => prev.filter((tag) => tag.id !== id));
			setLeads((prev) => prev.map((lead) => lead.tagIds?.includes(id) ? {
				...lead,
				tagIds: lead.tagIds.filter((tagId) => tagId !== id)
			} : lead));
		};
		const resetAll = () => {
			setStages(DEFAULT_STAGES);
			setLeads(DEFAULT_LEADS);
			setTags(DEFAULT_TAGS);
			setShipments(DEFAULT_SHIPMENTS);
		};
		return {
			leads,
			stages,
			shipments,
			tags,
			leadDialog,
			addLead,
			addShipment,
			copyShipment,
			deleteShipment,
			updateShipment,
			openLeadDialog,
			closeLeadDialog,
			updateLead,
			loseLead,
			restoreLead,
			transferLead,
			deleteLead,
			addTag,
			removeTag,
			moveLead,
			removeLeads,
			addStage,
			updateStage,
			moveStage,
			removeStage,
			resetAll
		};
	}, [
		leads,
		stages,
		shipments,
		tags,
		leadDialog
	]);
	return /* @__PURE__ */ jsx(LeadsContext.Provider, {
		value,
		children
	});
}
function useLeads() {
	const context = useContext(LeadsContext);
	if (!context) throw new Error("useLeads нужно вызывать внутри LeadsProvider");
	return context;
}
// src/ui/cn.js
/** Склейка классов без зависимостей. */
function cn(...parts) {
	return parts.filter(Boolean).join(" ");
}
// src/ui/Button.jsx
/**
* Кнопка. Варианты: ink — главное действие, signal — акцент,
* ghost — второстепенное, quiet — «почти ссылка», danger — удаление.
*/
function Button({ variant = "default", size = "md", icon: Icon, iconRight: IconRight, className, children, ...props }) {
	return /* @__PURE__ */ jsxs("button", {
		type: "button",
		className: cn("btn", variant !== "default" && `btn--${variant}`, size !== "md" && `btn--${size}`, className),
		...props,
		children: [
			Icon && /* @__PURE__ */ jsx(Icon, {
				size: size === "sm" ? 14 : 16,
				strokeWidth: 1.9
			}),
			children,
			IconRight && /* @__PURE__ */ jsx(IconRight, {
				size: size === "sm" ? 14 : 16,
				strokeWidth: 1.9
			})
		]
	});
}
/** Квадратная иконка-кнопка для шапок, карточек и меню. */
function IconButton({ icon: Icon, label, size = 16, className, ...props }) {
	return /* @__PURE__ */ jsx("button", {
		type: "button",
		className: cn("icon-btn", className),
		"aria-label": label,
		title: label,
		...props,
		children: /* @__PURE__ */ jsx(Icon, {
			size,
			strokeWidth: 1.8
		})
	});
}
// src/ui/Field.jsx
/** Обёртка поля: микро-подпись сверху, подсказка снизу. */
function Field({ label, hint, htmlFor, className, children }) {
	return /* @__PURE__ */ jsxs("label", {
		className: cn("field", className),
		htmlFor,
		children: [
			label && /* @__PURE__ */ jsx("span", {
				className: "field__label",
				children: label
			}),
			children,
			hint && /* @__PURE__ */ jsx("span", {
				className: "field__hint",
				children: hint
			})
		]
	});
}
function Input({ className, ...props }) {
	return /* @__PURE__ */ jsx("input", {
		className: cn("input", className),
		...props
	});
}
function Select({ className, children, ...props }) {
	return /* @__PURE__ */ jsx("select", {
		className: cn("select", className),
		...props,
		children
	});
}
function Textarea({ className, ...props }) {
	return /* @__PURE__ */ jsx("textarea", {
		className: cn("textarea", className),
		...props
	});
}
/** Поиск с подсказкой клавиши. */
function SearchInput({ value, onChange, placeholder = "Поиск", kbd = "⌘K", className }) {
	return /* @__PURE__ */ jsxs("div", {
		className: cn("search", className),
		children: [
			/* @__PURE__ */ jsx(Search, {
				size: 15,
				strokeWidth: 1.9
			}),
			/* @__PURE__ */ jsx("input", {
				type: "search",
				value,
				placeholder,
				onChange: (event) => onChange?.(event.target.value)
			}),
			kbd && /* @__PURE__ */ jsx("kbd", { children: kbd })
		]
	});
}
// src/ui/Modal.jsx
/** Модалка: затемнение, Esc, клик по фону, кнопки внизу. */
function Modal({ open, title, onClose, children, footer }) {
	useEffect(() => {
		if (!open) return void 0;
		function onKey(event) {
			if (event.key === "Escape") onClose?.();
		}
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [open, onClose]);
	if (!open) return null;
	return /* @__PURE__ */ jsx("div", {
		className: "modal-backdrop",
		onMouseDown: () => onClose?.(),
		children: /* @__PURE__ */ jsxs("div", {
			className: "modal",
			role: "dialog",
			"aria-modal": "true",
			"aria-label": title,
			onMouseDown: (event) => event.stopPropagation(),
			children: [
				/* @__PURE__ */ jsxs("div", {
					className: "modal__head",
					children: [/* @__PURE__ */ jsx("span", {
						className: "modal__title",
						children: title
					}), /* @__PURE__ */ jsx("button", {
						type: "button",
						className: "icon-btn",
						"aria-label": "Закрыть",
						onClick: onClose,
						children: /* @__PURE__ */ jsx(X, {
							size: 16,
							strokeWidth: 1.9
						})
					})]
				}),
				/* @__PURE__ */ jsx("div", {
					className: "modal__body",
					children
				}),
				footer && /* @__PURE__ */ jsx("div", {
					className: "modal__foot",
					children: footer
				})
			]
		})
	});
}
// src/ui/Tag.jsx
/** Метка клиента: точка цвета + название. */
function Tag({ children, color = "var(--ink-3)", className }) {
	return /* @__PURE__ */ jsxs("span", {
		className: cn("tag", className),
		style: { "--tag-color": color },
		children: [/* @__PURE__ */ jsx("span", { className: "tag__dot" }), children]
	});
}
/** Статус: new / progress / done / lost. */
function Status({ tone = "progress", children }) {
	return /* @__PURE__ */ jsx("span", {
		className: cn("status", `status--${tone}`),
		children
	});
}
/** Фильтр-чип с количеством. */
function Chip({ active, count, children, ...props }) {
	return /* @__PURE__ */ jsxs("button", {
		type: "button",
		className: "chip",
		"aria-pressed": active,
		...props,
		children: [children, count != null && /* @__PURE__ */ jsx("span", {
			className: "chip__count",
			children: count
		})]
	});
}
/** Круглый аватар с инициалами. */
function Avatar({ initials, title, size = "md", color = "", className }) {
	return /* @__PURE__ */ jsx("span", {
		className: cn("avatar", size === "lg" && "avatar--lg", size === "xl" && "avatar--xl", color, className),
		title,
		children: initials
	});
}
// src/app/Shell.jsx
/**
* Оболочка приложения: панель разделов, верхняя строка и рабочая область.
* На телефоне панель выезжает по кнопке меню, «Новый лид» открывает диалог.
*/
var myTasks$1 = TASKS.filter((task) => task.ownerId === ME.id);
var SALES = [
	{
		to: "/crm",
		label: "Воронка лидов",
		icon: KanbanSquare
	},
	{
		to: "/customers",
		label: "Клиенты",
		icon: Users,
		count: String(ALL_LEADS.length)
	},
	{
		to: "/shipments",
		label: "Заявки",
		icon: LayoutGrid
	},
	{
		to: "/tasks",
		label: "Задачи",
		icon: CheckSquare
	}
];
var REPORTS = [{
	to: "/analytics",
	label: "Моя аналитика",
	icon: BarChart3
}, {
	to: "/accounting",
	label: "Бухгалтерия",
	icon: Landmark
}];
var SETTINGS = [{
	to: "/settings",
	label: "Мои настройки",
	icon: Settings
}];
var ADMIN$1 = [{
	to: "/admin",
	label: "Администрирование",
	icon: ShieldCheck,
	count: String(TEAM.length)
}];
var EMPTY_LEAD_DRAFT = {
	name: "",
	inn: "",
	contact: "",
	phone: "",
	email: ""
};
var TITLES = {
	"/": ["Воронка лидов", ""],
	"/crm": ["Воронка лидов", ""],
	"/customers": ["Клиенты", "Мои клиенты и клиенты коллег — чужие карточки без деталей"],
	"/shipments": ["Заявки", "Мои перевозки и статусы отгрузок"],
	"/tasks": ["Задачи", "Мои звонки, письма и напоминания"],
	"/analytics": ["Моя аналитика", "Конверсия, источники и результаты за период"],
	"/accounting": ["Бухгалтерия", "Счета, банк и кассовые операции"],
	"/settings": ["Мои настройки", "Тема оформления и моя воронка"],
	"/admin": ["Администрирование", "Пользователи, доступы и безопасность"],
	"/kit": ["Дизайн-система", "Служебная витрина компонентов"]
};
function useStored(key, initial) {
	const [value, setValue] = useState(() => {
		try {
			return window.localStorage.getItem(key) ?? initial;
		} catch {
			return initial;
		}
	});
	useEffect(() => {
		try {
			window.localStorage.setItem(key, value);
		} catch {}
	}, [key, value]);
	return [value, setValue];
}
function NavGroup({ items, collapsed }) {
	return /* @__PURE__ */ jsx("nav", {
		className: "side-nav",
		children: items.map(({ to, label, icon: Icon, count }) => /* @__PURE__ */ jsxs(NavLink, {
			to,
			title: collapsed ? label : void 0,
			"aria-label": collapsed ? label : void 0,
			className: ({ isActive }) => `nav-item${isActive ? " is-active" : ""}`,
			children: [
				/* @__PURE__ */ jsx(Icon, {}),
				/* @__PURE__ */ jsx("span", {
					className: "nav-item__label",
					children: label
				}),
				count && /* @__PURE__ */ jsx("span", {
					className: "nav-count",
					children: count
				})
			]
		}, to))
	});
}
/**
* `searchSuggestions` — необязательный выпадающий блок под поиском (например,
* подсказки сотрудников у администратора, как `BoardSuggestions` в рабочей CRM).
*/
function Shell({ title, crumb, actions, search, onSearch, searchSuggestions, children }) {
	const { pathname } = useLocation();
	const navigate = useNavigate();
	const { leads, shipments, leadDialog, addLead, openLeadDialog, closeLeadDialog } = useLeads();
	const [theme, setTheme] = useStored("crm.theme", "light");
	const [sidebar, setSidebar] = useStored("crm.sidebar", "open");
	const collapsed = sidebar === "collapsed";
	const [query, setQuery] = useState("");
	const [menuOpen, setMenuOpen] = useState(false);
	const [draft, setDraft] = useState(EMPTY_LEAD_DRAFT);
	useEffect(() => {
		document.documentElement.dataset.theme = theme;
	}, [theme]);
	useEffect(() => {
		setMenuOpen(false);
	}, [pathname]);
	const myLeads = leads.filter((lead) => lead.ownerId === ME.id && !lead.lost);
	const myShipments = shipments.filter((shipment) => shipment.ownerId === ME.id);
	const openTasks = myTasks$1.filter((task) => task.status !== "done").length;
	const overdue = myTasks$1.filter((task) => task.status === "overdue").length;
	const sales = SALES.map((item) => item.to === "/crm" ? {
		...item,
		count: String(myLeads.length)
	} : item.to === "/customers" ? {
		...item,
		count: String(leads.length)
	} : item.to === "/shipments" ? {
		...item,
		count: String(myShipments.length)
	} : item.to === "/tasks" ? {
		...item,
		count: String(openTasks)
	} : item);
	const [pageTitle, pageSub] = TITLES[pathname] ?? [title ?? "CRM", ""];
	const canCreateLead = [
		draft.name,
		draft.inn,
		draft.contact,
		draft.phone,
		draft.email
	].every((value) => value.trim());
	function submitLead() {
		if (!canCreateLead) return;
		addLead({
			name: draft.name.trim(),
			inn: draft.inn,
			contact: draft.contact.trim(),
			phone: draft.phone.trim(),
			email: draft.email.trim(),
			stageId: leadDialog?.stageId ?? void 0,
			ownerId: leadDialog?.ownerId ?? ME.id,
			due: "сегодня"
		});
		const ownerId = leadDialog?.ownerId ?? ME.id;
		setDraft(EMPTY_LEAD_DRAFT);
		closeLeadDialog();
		navigate(ownerId === ME.id ? "/crm" : `/crm?board=${ownerId}`);
	}
	return /* @__PURE__ */ jsxs("div", {
		className: `app${menuOpen ? " app--menu" : ""}${collapsed ? " app--collapsed" : ""}`,
		children: [
			menuOpen && /* @__PURE__ */ jsx("div", {
				className: "scrim",
				onClick: () => setMenuOpen(false),
				"aria-hidden": "true"
			}),
			/* @__PURE__ */ jsxs("aside", {
				className: "sidebar",
				id: "app-sidebar",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "brand",
						children: [/* @__PURE__ */ jsxs(NavLink, {
							to: "/crm",
							className: "brand__link",
							"aria-label": "CRM Детроид — открыть воронку лидов",
							title: "На воронку лидов",
							children: [/* @__PURE__ */ jsx("span", {
								className: "brand__logo",
								role: "img",
								"aria-label": "CRM Детроид"
							}), /* @__PURE__ */ jsxs("span", {
								className: "brand__text",
								children: [/* @__PURE__ */ jsx("span", {
									className: "brand__name",
									children: "CRM Детроид"
								}), /* @__PURE__ */ jsx("span", {
									className: "brand__sub",
									children: "Детроид · транспортная компания"
								})]
							})]
						}), /* @__PURE__ */ jsx("button", {
							type: "button",
							className: "sidebar__close",
							"aria-label": "Закрыть меню",
							onClick: () => setMenuOpen(false),
							children: /* @__PURE__ */ jsx(X, {
								size: 16,
								strokeWidth: 2
							})
						})]
					}),
					/* @__PURE__ */ jsx("div", {
						className: "side-label",
						title: collapsed ? "Продажи" : void 0,
						children: "Продажи"
					}),
					/* @__PURE__ */ jsx(NavGroup, {
						items: sales,
						collapsed
					}),
					/* @__PURE__ */ jsx("div", {
						className: "side-label",
						title: collapsed ? "Отчёты" : void 0,
						children: "Отчёты"
					}),
					/* @__PURE__ */ jsx(NavGroup, {
						items: REPORTS,
						collapsed
					}),
					/* @__PURE__ */ jsx("div", {
						className: "side-label",
						title: collapsed ? "Настройки" : void 0,
						children: "Настройки"
					}),
					/* @__PURE__ */ jsx(NavGroup, {
						items: SETTINGS,
						collapsed
					}),
					ME.isAdmin && /* @__PURE__ */ jsxs(Fragment$1, { children: [/* @__PURE__ */ jsx("div", {
						className: "side-label",
						title: collapsed ? "Администратор" : void 0,
						children: "Администратор"
					}), /* @__PURE__ */ jsx(NavGroup, {
						items: ADMIN$1,
						collapsed
					})] }),
					/* @__PURE__ */ jsxs("div", {
						style: { marginTop: "auto" },
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "plan",
								children: [
									/* @__PURE__ */ jsx("div", {
										className: "plan__title",
										children: "Мой план на месяц"
									}),
									/* @__PURE__ */ jsx("div", {
										className: "plan__sub",
										children: "Закрыто 68% от 720 тыс ₽"
									}),
									/* @__PURE__ */ jsx("div", {
										className: "plan__track",
										children: /* @__PURE__ */ jsx("div", {
											className: "plan__fill",
											style: { width: "68%" }
										})
									})
								]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "team__row",
								style: { marginTop: 8 },
								children: [
									/* @__PURE__ */ jsx(Avatar, { initials: ME.initials }),
									/* @__PURE__ */ jsxs("div", {
										className: "team__text",
										style: { minWidth: 0 },
										children: [/* @__PURE__ */ jsx("span", {
											className: "team__name",
											children: ME.name
										}), /* @__PURE__ */ jsx("span", {
											className: "team__role",
											children: ME.role
										})]
									}),
									/* @__PURE__ */ jsx("button", {
										type: "button",
										className: "col__btn team__exit",
										"aria-label": "Выйти",
										title: "Выйти",
										style: { marginLeft: "auto" },
										children: /* @__PURE__ */ jsx(LogOut, {
											size: 15,
											strokeWidth: 1.9,
											style: { color: "var(--ink-3)" }
										})
									})
								]
							}),
							/* @__PURE__ */ jsxs("button", {
								type: "button",
								className: "side-collapse",
								"aria-label": collapsed ? "Развернуть меню" : "Свернуть меню",
								"aria-expanded": !collapsed,
								"aria-controls": "app-sidebar",
								title: collapsed ? "Развернуть меню" : "Свернуть меню",
								onClick: () => setSidebar(collapsed ? "open" : "collapsed"),
								children: [collapsed ? /* @__PURE__ */ jsx(ChevronsRight, {
									size: 16,
									strokeWidth: 2
								}) : /* @__PURE__ */ jsx(ChevronsLeft, {
									size: 16,
									strokeWidth: 2
								}), /* @__PURE__ */ jsx("span", {
									className: "side-collapse__label",
									children: "Свернуть меню"
								})]
							})
						]
					})
				]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "content",
				children: [/* @__PURE__ */ jsxs("header", {
					className: "topbar",
					children: [
						/* @__PURE__ */ jsx("button", {
							type: "button",
							className: "menu-btn",
							"aria-label": "Открыть меню",
							onClick: () => setMenuOpen(true),
							children: /* @__PURE__ */ jsx(Menu, {
								size: 18,
								strokeWidth: 2
							})
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "topbar__head",
							children: [/* @__PURE__ */ jsx("div", {
								className: "topbar__title",
								children: title ?? pageTitle
							}), crumb ?? pageSub ? /* @__PURE__ */ jsx("div", {
								className: "topbar__sub",
								children: crumb ?? pageSub
							}) : null]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "topbar__search",
							children: [/* @__PURE__ */ jsx(SearchInput, {
								value: search ?? query,
								onChange: onSearch ?? setQuery,
								placeholder: "Поиск",
								kbd: null
							}), searchSuggestions]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "topbar__actions",
							children: [
								/* @__PURE__ */ jsxs("button", {
									type: "button",
									className: "counter-btn",
									title: "Просроченные задачи: требуют звонка сегодня",
									children: ["Просрочено", /* @__PURE__ */ jsx("b", { children: overdue })]
								}),
								/* @__PURE__ */ jsx(IconButton, {
									icon: Bell,
									label: "Уведомления",
									className: "hide-sm"
								}),
								/* @__PURE__ */ jsx(IconButton, {
									className: "hide-sm",
									icon: theme === "dark" ? Sun : Moon,
									label: theme === "dark" ? "Светлая тема" : "Тёмная тема",
									onClick: () => setTheme(theme === "dark" ? "light" : "dark")
								}),
								actions,
								/* @__PURE__ */ jsx(Button, {
									variant: "primary",
									icon: Plus,
									className: "new-lead-btn",
									onClick: () => openLeadDialog(),
									children: /* @__PURE__ */ jsx("span", {
										className: "btn__label",
										children: "Новый лид"
									})
								})
							]
						})
					]
				}), /* @__PURE__ */ jsx("main", {
					className: "main",
					children
				})]
			}),
			/* @__PURE__ */ jsxs(Modal, {
				open: Boolean(leadDialog),
				title: "Новый лид",
				onClose: closeLeadDialog,
				footer: /* @__PURE__ */ jsxs(Fragment$1, { children: [/* @__PURE__ */ jsx(Button, {
					variant: "ghost",
					onClick: closeLeadDialog,
					children: "Отмена"
				}), /* @__PURE__ */ jsx(Button, {
					variant: "primary",
					onClick: submitLead,
					disabled: !canCreateLead,
					children: "Создать лид"
				})] }),
				children: [
					/* @__PURE__ */ jsx(Field, {
						label: "Компания",
						children: /* @__PURE__ */ jsx(Input, {
							autoFocus: true,
							required: true,
							autoComplete: "organization",
							placeholder: "ООО «Ромашка»",
							value: draft.name,
							onChange: (event) => setDraft({
								...draft,
								name: event.target.value
							})
						})
					}),
					/* @__PURE__ */ jsx(Field, {
						label: "ИНН",
						children: /* @__PURE__ */ jsx(Input, {
							required: true,
							inputMode: "numeric",
							maxLength: 12,
							placeholder: "7700000000",
							value: draft.inn,
							onChange: (event) => setDraft({
								...draft,
								inn: event.target.value.replace(/\D/g, "").slice(0, 12)
							})
						})
					}),
					/* @__PURE__ */ jsx(Field, {
						label: "Контакт логиста",
						children: /* @__PURE__ */ jsx(Input, {
							required: true,
							autoComplete: "name",
							placeholder: "Иван Петров",
							value: draft.contact,
							onChange: (event) => setDraft({
								...draft,
								contact: event.target.value
							})
						})
					}),
					/* @__PURE__ */ jsx(Field, {
						label: "Телефон логиста",
						children: /* @__PURE__ */ jsx(Input, {
							required: true,
							type: "tel",
							autoComplete: "tel",
							placeholder: "+7 900 000-00-00",
							value: draft.phone,
							onChange: (event) => setDraft({
								...draft,
								phone: event.target.value
							})
						})
					}),
					/* @__PURE__ */ jsx(Field, {
						label: "E-mail",
						children: /* @__PURE__ */ jsx(Input, {
							required: true,
							type: "email",
							autoComplete: "email",
							placeholder: "logist@company.ru",
							value: draft.email,
							onChange: (event) => setDraft({
								...draft,
								email: event.target.value
							})
						})
					})
				]
			})
		]
	});
}
// src/ui/StarRating.jsx
var LEVELS = Array.from({ length: 3 }, (_, index) => index + 1);
var LABELS = [
	"Без приоритета",
	"Низкий приоритет",
	"Средний приоритет",
	"Высокий приоритет"
];
var priorityLabel = (value) => LABELS[value] ?? LABELS[0];
/**
* Приоритет звёздами 0–3, как в рабочей CRM (`StarRating`).
* Клик по звезде ставит приоритет, повторный клик по той же — снимает (0).
* Без `onChange` звёзды только показывают значение.
*
* События мыши, пальца и клавиатуры не уходят наверх: на доске карточка
* перетаскивается, и клик по звезде не должен начинать перенос или
* открывать лид.
*/
function StarRating({ value = 0, onChange, size = "md", className = "" }) {
	const label = `${priorityLabel(value)}: ${value} из 3`;
	if (!onChange) return /* @__PURE__ */ jsx("span", {
		className: `stars stars--${size} ${className}`,
		role: "img",
		"aria-label": label,
		title: priorityLabel(value),
		children: LEVELS.map((level) => /* @__PURE__ */ jsx("span", {
			className: `stars__star${value >= level ? " is-on" : ""}`,
			"aria-hidden": "true",
			children: value >= level ? "★" : "☆"
		}, level))
	});
	const stop = (event) => event.stopPropagation();
	return /* @__PURE__ */ jsx("span", {
		className: `stars stars--${size} stars--editable ${className}`,
		role: "group",
		"aria-label": label,
		onMouseDown: stop,
		onTouchStart: stop,
		onPointerDown: stop,
		onKeyDown: stop,
		children: LEVELS.map((level) => /* @__PURE__ */ jsx("button", {
			type: "button",
			className: `stars__star${value >= level ? " is-on" : ""}`,
			"aria-label": value === level ? `Снять приоритет ${level}` : `Приоритет ${level} из 3`,
			"aria-pressed": value >= level,
			title: value === level ? "Снять приоритет" : priorityLabel(level),
			onClick: (event) => {
				event.preventDefault();
				event.stopPropagation();
				onChange(value === level ? 0 : level);
			},
			children: value >= level ? "★" : "☆"
		}, level))
	});
}
// src/ui/TagChip.jsx
/**
* Пилюля тега: пастельный фон и насыщенный текст того же тона.
* Цвет тега — любой HEX, как в рабочей CRM; светлый и тёмный варианты
* считаются в CSS через `color-mix`, поэтому пилюля читается в обеих темах.
*/
function TagChip({ name, color, size = "sm", children }) {
	return /* @__PURE__ */ jsxs("span", {
		className: `tag-chip tag-chip--${size}`,
		style: { "--tag": color },
		title: name,
		children: [/* @__PURE__ */ jsx("span", {
			className: "tag-chip__name",
			children: name
		}), children]
	});
}
/** Ряд тегов лида по их id; неизвестные id (удалённый тег) пропускаются. */
function TagList({ ids = [], tags, size = "sm" }) {
	const list = ids.map((id) => tags.find((tag) => tag.id === id)).filter(Boolean);
	if (!list.length) return null;
	return /* @__PURE__ */ jsx("span", {
		className: "tag-list",
		children: list.map((tag) => /* @__PURE__ */ jsx(TagChip, {
			name: tag.name,
			color: tag.color,
			size
		}, tag.id))
	});
}
// src/ui/Menu.jsx
/**
* Выпадающее меню «⋯»: кнопка и список действий под ней.
* Закрывается кликом мимо, Esc и после выбора пункта.
*
* `items`: { label, onSelect?, to?, danger?, disabled?, icon? } — пункт с `to`
* рендерится ссылкой через `renderLink`, чтобы меню не зависело от роутера.
* События не уходят наверх: меню живёт и на перетаскиваемой карточке.
*/
function Menu$1({ label, icon: Icon, items, align = "right", className = "", buttonClassName = "icon-btn", renderLink }) {
	const [open, setOpen] = useState(false);
	const rootRef = useRef(null);
	useEffect(() => {
		if (!open) return void 0;
		const onDown = (event) => {
			if (!rootRef.current?.contains(event.target)) setOpen(false);
		};
		const onKey = (event) => {
			if (event.key === "Escape") setOpen(false);
		};
		document.addEventListener("mousedown", onDown);
		document.addEventListener("touchstart", onDown);
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("mousedown", onDown);
			document.removeEventListener("touchstart", onDown);
			document.removeEventListener("keydown", onKey);
		};
	}, [open]);
	const stop = (event) => event.stopPropagation();
	const visible = items.filter(Boolean);
	return /* @__PURE__ */ jsxs("span", {
		ref: rootRef,
		className: `menu ${className}`,
		onMouseDown: stop,
		onTouchStart: stop,
		onPointerDown: stop,
		onKeyDown: stop,
		children: [/* @__PURE__ */ jsx("button", {
			type: "button",
			className: buttonClassName,
			"aria-label": label,
			title: label,
			"aria-haspopup": "menu",
			"aria-expanded": open,
			onClick: (event) => {
				event.preventDefault();
				event.stopPropagation();
				setOpen((value) => !value);
			},
			children: /* @__PURE__ */ jsx(Icon, {
				size: 15,
				strokeWidth: 2
			})
		}), open && /* @__PURE__ */ jsx("span", {
			role: "menu",
			className: `menu__list menu__list--${align}`,
			children: visible.map((item) => {
				const ItemIcon = item.icon;
				const content = /* @__PURE__ */ jsxs(Fragment$1, { children: [ItemIcon && /* @__PURE__ */ jsx(ItemIcon, {
					size: 14,
					strokeWidth: 1.9
				}), item.label] });
				const cls = `menu__item${item.danger ? " menu__item--danger" : ""}`;
				if (item.to && renderLink) return renderLink({
					key: item.label,
					to: item.to,
					className: cls,
					role: "menuitem",
					children: content
				});
				return /* @__PURE__ */ jsx("button", {
					type: "button",
					role: "menuitem",
					className: cls,
					disabled: item.disabled,
					onClick: (event) => {
						event.preventDefault();
						event.stopPropagation();
						setOpen(false);
						item.onSelect?.();
					},
					children: content
				}, item.label);
			})
		})]
	});
}
// src/ui/EmployeeSuggestions.jsx
/**
* Подсказки сотрудников под строкой поиска — для администратора, как
* `BoardSuggestions` в рабочей CRM: от двух букв фамилии или имени
* показываются до пяти сотрудников с действием («открыть доску»,
* «показать заявки»). Менеджеру не показываются.
*/
function EmployeeSuggestions({ query, excludeUserId, actionLabel, onPick }) {
	const q = (query ?? "").trim().toLowerCase();
	if (!ME.isAdmin || q.length < 2) return null;
	const found = TEAM.filter((user) => user.id !== excludeUserId && user.name.toLowerCase().includes(q)).slice(0, 5);
	if (!found.length) return null;
	return /* @__PURE__ */ jsxs("div", {
		className: "search-suggest",
		role: "listbox",
		"aria-label": "Сотрудники",
		children: [/* @__PURE__ */ jsx("div", {
			className: "search-suggest__title",
			children: "Сотрудники"
		}), found.map((user) => /* @__PURE__ */ jsxs("button", {
			type: "button",
			role: "option",
			"aria-selected": "false",
			className: "search-suggest__item",
			onMouseDown: (event) => event.preventDefault(),
			onClick: () => onPick(user.id),
			children: [
				/* @__PURE__ */ jsx(Avatar, {
					initials: user.initials,
					color: user.color
				}),
				/* @__PURE__ */ jsx("span", {
					className: "search-suggest__name",
					children: user.name
				}),
				/* @__PURE__ */ jsxs("span", {
					className: "search-suggest__action",
					children: [actionLabel, /* @__PURE__ */ jsx(ArrowRight, {
						size: 12,
						strokeWidth: 2
					})]
				})
			]
		}, user.id))]
	});
}
// src/lib/format.js
var NBSP = "\xA0";
/** 185000 → «185 000 ₽» */
function money(value) {
	if (value == null) return "—";
	return `${Math.round(value).toLocaleString("ru-RU").replace(/\s/g, NBSP)}${NBSP}₽`;
}
/** 185000 → «185 тыс ₽», 2900000 → «2,9 млн ₽» */
function shortMoney(value) {
	if (value == null) return "—";
	if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(1).replace(".", ",").replace(",0", "")}${NBSP}млн${NBSP}₽`;
	if (Math.abs(value) >= 1e3) return `${Math.round(value / 1e3)}${NBSP}тыс${NBSP}₽`;
	return money(value);
}
/** 1258291 → «1,2 МБ» */
function fileSize(bytes) {
	if (bytes == null) return "";
	if (bytes < 1024) return `${bytes} Б`;
	if (bytes < 1048576) return `${Math.round(bytes / 1024)} КБ`;
	return `${(bytes / 1048576).toFixed(1).replace(".", ",")} МБ`;
}
/** Русское склонение: plural(3, ["минуту", "минуты", "минут"]) → «минуты» */
function plural(count, forms) {
	const tail = count % 100;
	if (tail > 10 && tail < 20) return forms[2];
	const last = count % 10;
	if (last === 1) return forms[0];
	if (last >= 2 && last <= 4) return forms[1];
	return forms[2];
}
function startOfDay(date) {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}
/** ISO → «Сегодня» / «Вчера» / «6 ноября 2026 г.» — заголовок дня в ленте. */
function dayLabel(iso) {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return "";
	const diff = Math.round((startOfDay(/* @__PURE__ */ new Date()) - startOfDay(date)) / 864e5);
	if (diff === 0) return "Сегодня";
	if (diff === 1) return "Вчера";
	return date.toLocaleDateString("ru-RU", {
		day: "numeric",
		month: "long",
		year: "numeric"
	});
}
/** ISO → «только что», «5 минут назад», «2 часа назад», «3 дня назад». */
function relativeTime(iso) {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return "";
	const minutes = Math.round((Date.now() - date.getTime()) / 6e4);
	if (minutes < 1) return "только что";
	if (minutes < 60) return `${minutes} ${plural(minutes, [
		"минуту",
		"минуты",
		"минут"
	])} назад`;
	const hours = Math.round(minutes / 60);
	if (hours < 24 && startOfDay(date) === startOfDay(/* @__PURE__ */ new Date())) return `${hours} ${plural(hours, [
		"час",
		"часа",
		"часов"
	])} назад`;
	const days = Math.round((startOfDay(/* @__PURE__ */ new Date()) - startOfDay(date)) / 864e5);
	if (days === 1) return "вчера";
	if (days < 7) return `${days} ${plural(days, [
		"день",
		"дня",
		"дней"
	])} назад`;
	return date.toLocaleDateString("ru-RU", {
		day: "numeric",
		month: "long"
	});
}
/** ISO → «6 ноября 2026 г., 09:14» — подсказка к относительному времени. */
function absoluteTime(iso) {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return "";
	return `${date.toLocaleDateString("ru-RU", {
		day: "numeric",
		month: "long",
		year: "numeric"
	})}, ${date.toLocaleTimeString("ru-RU", {
		hour: "2-digit",
		minute: "2-digit"
	})}`;
}
// src/lib/margin.js
/**
* Маржа заявки в границах макета: разница между суммой клиента и суммой
* перевозчика. В демо-данных нет отдельных ставок НДС и ставки вычета,
* поэтому это та же формула, которая показывается на экранах заявок.
*/
function shipmentMargin(shipment) {
	if (shipment.customerPrice == null || shipment.carrierPrice == null) return null;
	const customerPrice = Number(shipment.customerPrice);
	const carrierPrice = Number(shipment.carrierPrice);
	if (!Number.isFinite(customerPrice) || !Number.isFinite(carrierPrice)) return null;
	return customerPrice - carrierPrice;
}
/**
* Итоговая маржа только тех заявок, которые напрямую связаны с лидом.
* Заявки с незаполненными суммами не искажают результат; у лида без заявок
* итог остаётся нулём.
*/
function leadShipmentMargin(leadId, shipments) {
	return shipments.filter((shipment) => shipment.leadId === leadId).reduce((total, shipment) => total + (shipmentMargin(shipment) ?? 0), 0);
}
// src/lib/folded.js
/**
* Свёрнутые этапы доски. Запоминаются отдельно для каждого зрителя и каждой
* доски, как в рабочей CRM (`crm-folded-stages:v2:user:<id>:board:<id>`):
* администратор, свернувший колонку на доске сотрудника, не меняет свою.
*/
var key$1 = (viewerId, boardOwnerId) => `crm.folded.${viewerId}.${boardOwnerId}.v1`;
function read(storageKey) {
	try {
		const value = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]");
		return Array.isArray(value) ? value.filter((id) => Number.isInteger(id)) : [];
	} catch {
		return [];
	}
}
function useFoldedStages(viewerId, boardOwnerId) {
	const storageKey = key$1(viewerId, boardOwnerId);
	const [state, setState] = useState(() => ({
		key: storageKey,
		ids: read(storageKey)
	}));
	const ids = state.key === storageKey ? state.ids : read(storageKey);
	useEffect(() => {
		if (state.key !== storageKey) setState({
			key: storageKey,
			ids: read(storageKey)
		});
	}, [storageKey, state.key]);
	return [ids, useCallback((update) => setState((prev) => {
		const current = prev.key === storageKey ? prev.ids : read(storageKey);
		const next = typeof update === "function" ? update(current) : update;
		try {
			window.localStorage.setItem(storageKey, JSON.stringify(next));
		} catch {}
		return {
			key: storageKey,
			ids: next
		};
	}), [storageKey])];
}
// src/pages/FunnelPage.jsx
/**
* Воронка лидов — стартовый экран менеджера.
* KPI считаются по лидам доски; переключатель «канбан / список»:
* канбан с перетаскиванием на @dnd-kit, список с сортировкой и массовыми действиями.
* Администратор может открыть доску сотрудника (`?board=<id>`), как в рабочей CRM.
* Проигранные лиды на доске и в списке не показываются.
*/
var ICONS$2 = {
	users: Users,
	wallet: Wallet,
	target: Target,
	flame: Flame,
	clock: Clock
};
var marginOf = (lead, shipments) => leadShipmentMargin(lead.id, shipments);
var sumMarginsOf = (leads, shipments) => leads.reduce((total, lead) => total + marginOf(lead, shipments), 0);
var overdueTasks = TASKS.filter((task) => task.ownerId === ME.id && task.status === "overdue").length;
/**
* Карточка лида. Сама карточка — не ссылка: ссылка растянута на всю площадь
* через заголовок (`lead-card__link::after`), а звёзды и меню «⋯» лежат над ней.
* Так кнопки не вложены в `<a>`, клик по пустому месту по-прежнему открывает лид.
* `onPriority` есть только на доске; в призраке перетаскивания звёзды не кликаются.
*/
function LeadCard({ lead, shipments, tags, onPriority, menu = false }) {
	const owner = OWNER(lead.ownerId);
	const margin = marginOf(lead, shipments);
	return /* @__PURE__ */ jsxs("div", {
		className: "lead-card",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "lead-card__title",
				children: [lead.hot && /* @__PURE__ */ jsx(Flame, {
					size: 14,
					className: "fire",
					strokeWidth: 2.2
				}), /* @__PURE__ */ jsx(Link, {
					to: `/crm/leads/${lead.id}`,
					className: "lead-card__link",
					draggable: false,
					children: lead.name
				})]
			}),
			menu && /* @__PURE__ */ jsx(Menu$1, {
				label: "Меню карточки",
				icon: MoreHorizontal,
				className: "lead-card__menu",
				buttonClassName: "lead-card__menu-btn",
				items: [{
					label: "Открыть",
					to: `/crm/leads/${lead.id}`,
					icon: ExternalLink
				}],
				renderLink: ({ key, ...props }) => /* @__PURE__ */ jsx(Link, { ...props }, key)
			}),
			/* @__PURE__ */ jsx("div", {
				className: "lead-card__sub",
				children: lead.contact && lead.contact !== "—" ? lead.contact : "Контакт не указан"
			}),
			/* @__PURE__ */ jsx(TagList, {
				ids: lead.tagIds,
				tags
			}),
			/* @__PURE__ */ jsx(StarRating, {
				value: lead.priority,
				onChange: onPriority,
				className: "lead-card__priority"
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "lead-card__foot",
				children: [/* @__PURE__ */ jsx("span", {
					className: "price",
					title: "Маржа по заявкам",
					"aria-label": `Маржа по заявкам: ${shortMoney(margin)}`,
					children: shortMoney(margin)
				}), /* @__PURE__ */ jsxs("span", {
					className: "lead-card__right",
					children: [
						/* @__PURE__ */ jsx(Phone, {
							size: 13,
							strokeWidth: 2,
							style: { color: "var(--ink-3)" }
						}),
						/* @__PURE__ */ jsx("span", {
							className: `due${lead.late ? " due--late" : ""}`,
							children: lead.due
						}),
						/* @__PURE__ */ jsx(Avatar, {
							initials: owner.initials,
							color: owner.color,
							size: "sm",
							title: `Ответственный: ${owner.name}`,
							className: "lead-card__owner"
						})
					]
				})]
			})
		]
	});
}
function SortableLead({ lead, shipments, tags, onPriority }) {
	const { attributes, listeners, setNodeRef, isDragging } = useSortable({
		id: lead.id,
		data: { stageId: lead.stageId }
	});
	return /* @__PURE__ */ jsx("div", {
		ref: setNodeRef,
		className: `drag-wrap${isDragging ? " is-dragging" : ""}`,
		...attributes,
		...listeners,
		children: /* @__PURE__ */ jsx(LeadCard, {
			lead,
			shipments,
			tags,
			onPriority,
			menu: true
		})
	});
}
/**
* Свёрнутый этап: узкая полоса с вертикальным названием и счётчиком, как в
* рабочей CRM. Клик разворачивает; на полосу можно бросить карточку — она
* встанет в конец этапа.
*/
function FoldedColumn({ stage, count, onUnfold }) {
	const { setNodeRef, isOver } = useDroppable({
		id: `stage-${stage.id}`,
		data: { stageId: stage.id }
	});
	return /* @__PURE__ */ jsxs("button", {
		ref: setNodeRef,
		type: "button",
		className: `col col--folded${isOver ? " is-over" : ""}`,
		style: { "--col-color": stage.color },
		onClick: onUnfold,
		"aria-label": `Развернуть этап «${stage.name}», лидов: ${count}`,
		title: "Развернуть этап",
		children: [/* @__PURE__ */ jsx("span", {
			className: "col--folded__name",
			children: stage.name
		}), /* @__PURE__ */ jsx("span", {
			className: "col__count",
			children: count
		})]
	});
}
function StageColumn({ stage, stageLeads, shipments, tags, dragging, dropIndex, onAdd, onFold, onPriority, canEditStages }) {
	const { setNodeRef, isOver } = useDroppable({
		id: `stage-${stage.id}`,
		data: { stageId: stage.id }
	});
	const sum = sumMarginsOf(stageLeads, shipments);
	const showLine = dragging && dropIndex != null && stageLeads.length > 0;
	return /* @__PURE__ */ jsxs("section", {
		ref: setNodeRef,
		className: "col",
		"aria-label": stage.name,
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "col__head",
				children: [
					/* @__PURE__ */ jsx("span", {
						className: "col__dot",
						style: { background: stage.color }
					}),
					/* @__PURE__ */ jsx("span", {
						className: "col__name",
						children: stage.name
					}),
					/* @__PURE__ */ jsx("span", {
						className: "col__count",
						children: stageLeads.length
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "col__actions",
						children: [
							/* @__PURE__ */ jsx("button", {
								type: "button",
								className: "col__btn",
								"aria-label": `Добавить лид в «${stage.name}»`,
								title: "Добавить лид на этот этап",
								onClick: onAdd,
								children: /* @__PURE__ */ jsx(Plus, {
									size: 15,
									strokeWidth: 2
								})
							}),
							/* @__PURE__ */ jsx("button", {
								type: "button",
								className: "col__btn",
								"aria-label": `Свернуть этап «${stage.name}»`,
								title: "Свернуть этап",
								onClick: onFold,
								children: /* @__PURE__ */ jsx(ChevronsLeft, {
									size: 15,
									strokeWidth: 2
								})
							}),
							canEditStages && /* @__PURE__ */ jsx(Link, {
								to: "/settings",
								className: "col__btn",
								"aria-label": `Настроить этап «${stage.name}»`,
								title: "Настроить этапы воронки",
								children: /* @__PURE__ */ jsx(MoreVertical, {
									size: 15,
									strokeWidth: 2
								})
							})
						]
					})
				]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "col__sub",
				title: `Маржа ${shortMoney(sum)} · ${stage.hint}`,
				children: [
					"Маржа ",
					shortMoney(sum),
					" · ",
					stage.hint
				]
			}),
			/* @__PURE__ */ jsx("div", {
				className: "col__rule",
				style: { "--col-color": stage.color }
			}),
			/* @__PURE__ */ jsxs("div", {
				className: `col__cards${isOver ? " is-over" : ""}`,
				children: [/* @__PURE__ */ jsxs(SortableContext, {
					items: stageLeads.map((lead) => lead.id),
					strategy: verticalListSortingStrategy,
					children: [stageLeads.map((lead, index) => /* @__PURE__ */ jsxs(Fragment, { children: [showLine && dropIndex === index && /* @__PURE__ */ jsx("div", {
						className: "drop-line",
						"aria-hidden": "true"
					}), /* @__PURE__ */ jsx(SortableLead, {
						lead,
						shipments,
						tags,
						onPriority: (value) => onPriority(lead.id, value)
					})] }, lead.id)), showLine && dropIndex >= stageLeads.length && /* @__PURE__ */ jsx("div", {
						className: "drop-line",
						"aria-hidden": "true"
					})]
				}), stageLeads.length === 0 && (dragging && dropIndex != null ? /* @__PURE__ */ jsx("div", {
					className: "col__drop-slot",
					"aria-hidden": "true",
					children: "Отпустите здесь"
				}) : /* @__PURE__ */ jsx("div", {
					className: "col__drop-hint",
					"aria-hidden": "true",
					children: "Пока пусто — перетащите лид или добавьте новый"
				}))]
			})
		]
	});
}
function SortHead({ label, sortKey, sort, onSort, align = "left", width }) {
	const active = sort.key === sortKey;
	const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ChevronUp : ChevronDown;
	return /* @__PURE__ */ jsx("th", {
		style: {
			textAlign: align,
			width
		},
		children: /* @__PURE__ */ jsxs("button", {
			type: "button",
			className: `th-sort${active ? " is-active" : ""}`,
			onClick: () => onSort(sortKey),
			style: {
				justifyContent: align === "right" ? "flex-end" : "flex-start",
				width: "100%"
			},
			children: [label, /* @__PURE__ */ jsx(Icon, {
				size: 12,
				strokeWidth: 2.2
			})]
		})
	});
}
function FunnelPage() {
	const navigate = useNavigate();
	const { leads, stages, shipments, tags, openLeadDialog, moveLead, removeLeads, addStage, updateLead } = useLeads();
	const [params, setParams] = useSearchParams();
	const boardParam = Number(params.get("board"));
	const boardUser = ME.isAdmin && boardParam && boardParam !== ME.id ? TEAM.find((user) => user.id === boardParam) : null;
	const boardOwnerId = boardUser?.id ?? ME.id;
	const foreignBoard = boardOwnerId !== ME.id;
	const [folded, setFolded] = useFoldedStages(ME.id, boardOwnerId);
	const [filter, setFilter] = useState("all");
	const [search, setSearch] = useState("");
	const query = search.trim().toLowerCase();
	const [addingStage, setAddingStage] = useState(false);
	const [stageName, setStageName] = useState("");
	const [view, setView] = useState(() => {
		try {
			return window.localStorage.getItem("crm.funnel.view") ?? "board";
		} catch {
			return "board";
		}
	});
	const [sort, setSort] = useState({
		key: "stage",
		dir: "asc"
	});
	const [selected, setSelected] = useState([]);
	const [activeId, setActiveId] = useState(null);
	const [activeWidth, setActiveWidth] = useState(null);
	const [dropTarget, setDropTarget] = useState(null);
	const suppressClick = useRef(false);
	const stageCreatorCancelled = useRef(false);
	const allCheckbox = useRef(null);
	const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor, { activationConstraint: {
		delay: 160,
		tolerance: 8
	} }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
	const myLeads = useMemo(() => leads.filter((lead) => lead.ownerId === boardOwnerId && !lead.lost).sort((a, b) => (a.position ?? 0) - (b.position ?? 0)), [leads, boardOwnerId]);
	const activeLead = activeId != null ? myLeads.find((lead) => lead.id === activeId) : null;
	/** Точка вставки: карточка под курсором важнее колонки, иначе — в конец этапа. */
	const resolveTarget = useCallback(({ active, over }) => {
		if (!over) return null;
		if (typeof over.id === "string" && over.id.startsWith("stage-")) {
			const stageId = Number(over.id.slice(6));
			return {
				stageId,
				index: myLeads.filter((lead) => lead.stageId === stageId && lead.id !== active.id).length
			};
		}
		const overLead = myLeads.find((lead) => lead.id === over.id);
		if (!overLead) return null;
		if (overLead.id === active.id) return {
			stageId: overLead.stageId,
			index: overLead.position ?? 0
		};
		const list = myLeads.filter((lead) => lead.stageId === overLead.stageId && lead.id !== active.id);
		const overIndex = list.findIndex((lead) => lead.id === overLead.id);
		if (overIndex < 0) return {
			stageId: overLead.stageId,
			index: list.length
		};
		const activeRect = active.rect.current.translated ?? active.rect.current.initial;
		const below = activeRect ? activeRect.top + activeRect.height / 2 > over.rect.top + over.rect.height / 2 : false;
		return {
			stageId: overLead.stageId,
			index: below ? overIndex + 1 : overIndex
		};
	}, [myLeads]);
	const collisionDetection = useCallback((args) => {
		const hits = pointerWithin(args);
		return [...hits.length ? hits : rectIntersection(args)].sort((a, b) => Number(String(a.id).startsWith("stage-")) - Number(String(b.id).startsWith("stage-")));
	}, []);
	function resetDrag() {
		setActiveId(null);
		setActiveWidth(null);
		setDropTarget(null);
	}
	function handleDragStart(event) {
		setActiveId(event.active.id);
		setActiveWidth(event.active.rect.current.initial?.width ?? null);
		setDropTarget(null);
	}
	function handleDragOver(event) {
		const next = resolveTarget(event);
		setDropTarget((prev) => prev && next && prev.stageId === next.stageId && prev.index === next.index ? prev : next);
	}
	function switchView(next) {
		setView(next);
		try {
			window.localStorage.setItem("crm.funnel.view", next);
		} catch {}
	}
	function toggleSort(key) {
		setSort((prev) => prev.key === key ? {
			key,
			dir: prev.dir === "asc" ? "desc" : "asc"
		} : {
			key,
			dir: "asc"
		});
	}
	function handleDragEnd(event) {
		const target = resolveTarget(event);
		resetDrag();
		suppressClick.current = true;
		window.setTimeout(() => {
			suppressClick.current = false;
		}, 240);
		if (!target) return;
		const lead = myLeads.find((item) => item.id === event.active.id);
		if (!lead) return;
		if (lead.stageId === target.stageId && lead.position === target.index) return;
		moveLead(lead.id, target.stageId, target.index);
	}
	const kpi = useMemo(() => {
		const sum = sumMarginsOf(myLeads, shipments);
		const potentialStage = stages[3] ?? stages[stages.length - 1];
		const potential = myLeads.filter((lead) => lead.stageId === potentialStage?.id).length;
		const hot = myLeads.filter((lead) => lead.hot).length;
		return [
			{
				label: "Лидов в работе",
				value: String(myLeads.length),
				foot: `${stages.length} ${stages.length === 1 ? "этап" : "этапов"} моей воронки`,
				color: "var(--stage-1)",
				icon: "users"
			},
			{
				label: "Маржа заявок",
				value: shortMoney(sum),
				foot: myLeads.length ? `средняя маржа ${shortMoney(Math.round(sum / myLeads.length))}` : "лидов пока нет",
				color: "var(--stage-4)",
				icon: "wallet"
			},
			{
				label: "Потенциальные",
				value: String(potential),
				foot: myLeads.length ? `конверсия ${Math.round(potential / myLeads.length * 100)}%` : "—",
				color: "var(--stage-5)",
				icon: "target"
			},
			{
				label: "Горячие лиды",
				value: String(hot),
				foot: "высокий приоритет",
				color: "var(--stage-2)",
				icon: "flame"
			},
			{
				label: "Без движения",
				value: String(overdueTasks),
				foot: "лидов ждут звонка",
				color: "var(--danger)",
				icon: "clock"
			}
		];
	}, [
		myLeads,
		shipments,
		stages
	]);
	const visible = (lead) => {
		if (filter === "hot" && !lead.hot) return false;
		if (filter === "late" && !lead.late) return false;
		if (query && ![
			lead.name,
			lead.inn,
			lead.contact,
			lead.phone
		].join(" ").toLowerCase().includes(query)) return false;
		return true;
	};
	const listRows = useMemo(() => {
		const rows = myLeads.filter(visible);
		const dir = sort.dir === "asc" ? 1 : -1;
		return [...rows].sort((a, b) => {
			switch (sort.key) {
				case "margin": return (marginOf(a, shipments) - marginOf(b, shipments)) * dir;
				case "stage": return (a.stageId - b.stageId) * dir;
				case "contact": return a.contact.localeCompare(b.contact, "ru") * dir;
				case "priority": return ((a.priority ?? 0) - (b.priority ?? 0)) * dir;
				case "due": return ((a.late ? 0 : 1) - (b.late ? 0 : 1) || a.due.localeCompare(b.due, "ru")) * dir;
				default: return a.name.localeCompare(b.name, "ru") * dir;
			}
		});
	}, [
		myLeads,
		shipments,
		filter,
		sort,
		query
	]);
	const allSelected = listRows.length > 0 && listRows.every((lead) => selected.includes(lead.id));
	const someSelected = selected.length > 0 && !allSelected;
	useEffect(() => {
		if (allCheckbox.current) allCheckbox.current.indeterminate = someSelected;
	}, [someSelected]);
	function toggleSelect(id) {
		setSelected((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
	}
	function toggleAll() {
		setSelected(allSelected ? [] : listRows.map((lead) => lead.id));
	}
	function removeSelected() {
		removeLeads(selected);
		setSelected([]);
	}
	function openBoard(userId) {
		const next = new URLSearchParams(params);
		if (!userId || userId === ME.id) next.delete("board");
		else next.set("board", String(userId));
		setParams(next);
		setSelected([]);
	}
	function toggleFold(stageId) {
		setFolded((prev) => prev.includes(stageId) ? prev.filter((id) => id !== stageId) : [...prev, stageId]);
	}
	const setPriority = (id, priority) => updateLead(id, { priority });
	function closeStageCreator({ save = false } = {}) {
		const name = stageName.trim();
		if (save && name) addStage(name);
		setStageName("");
		setAddingStage(false);
	}
	return /* @__PURE__ */ jsx(Shell, {
		search,
		onSearch: setSearch,
		searchSuggestions: /* @__PURE__ */ jsx(EmployeeSuggestions, {
			query: search,
			excludeUserId: boardOwnerId,
			actionLabel: "открыть доску",
			onPick: (userId) => {
				setSearch("");
				openBoard(userId);
			}
		}),
		children: /* @__PURE__ */ jsxs("div", {
			className: "funnel",
			children: [
				foreignBoard && /* @__PURE__ */ jsxs("div", {
					className: "board-banner",
					role: "status",
					children: [
						/* @__PURE__ */ jsx(Avatar, {
							initials: boardUser.initials,
							color: boardUser.color,
							size: "sm"
						}),
						/* @__PURE__ */ jsxs("span", { children: ["Доска сотрудника: ", /* @__PURE__ */ jsx("b", { children: boardUser.name })] }),
						/* @__PURE__ */ jsxs("button", {
							type: "button",
							className: "board-banner__leave",
							onClick: () => openBoard(ME.id),
							children: [/* @__PURE__ */ jsx(X, {
								size: 13,
								strokeWidth: 2.2
							}), "Вернуться к своей"]
						})
					]
				}),
				/* @__PURE__ */ jsx("div", {
					className: "kpi-grid",
					style: { marginBottom: 18 },
					children: kpi.map((item) => {
						const Icon = ICONS$2[item.icon];
						return /* @__PURE__ */ jsxs("div", {
							className: "kpi",
							style: { "--kpi": item.color },
							children: [
								/* @__PURE__ */ jsxs("div", {
									className: "kpi__top",
									children: [/* @__PURE__ */ jsx("span", {
										className: "kpi__label",
										children: item.label
									}), /* @__PURE__ */ jsx("span", {
										className: "tile",
										style: {
											background: `color-mix(in srgb, ${item.color} 12%, transparent)`,
											color: item.color
										},
										children: /* @__PURE__ */ jsx(Icon, {
											size: 17,
											strokeWidth: 1.9
										})
									})]
								}),
								/* @__PURE__ */ jsx("span", {
									className: "kpi__value",
									children: item.value
								}),
								/* @__PURE__ */ jsx("span", {
									className: "kpi__foot",
									children: item.foot
								})
							]
						}, item.label);
					})
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "toolbar",
					children: [
						/* @__PURE__ */ jsx(Chip, {
							active: filter === "all",
							count: myLeads.length,
							onClick: () => setFilter("all"),
							children: "Все"
						}),
						/* @__PURE__ */ jsx(Chip, {
							active: filter === "hot",
							count: myLeads.filter((lead) => lead.hot).length,
							onClick: () => setFilter("hot"),
							children: "Горячие"
						}),
						/* @__PURE__ */ jsx(Chip, {
							active: filter === "late",
							count: myLeads.filter((lead) => lead.late).length,
							onClick: () => setFilter("late"),
							children: "Просроченные"
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "toolbar__right",
							children: [
								ME.isAdmin && /* @__PURE__ */ jsxs("label", {
									className: "board-picker",
									children: [/* @__PURE__ */ jsx("span", {
										className: "board-picker__label",
										children: "Доска"
									}), /* @__PURE__ */ jsx("select", {
										className: "board-picker__select",
										value: boardOwnerId,
										onChange: (event) => openBoard(Number(event.target.value)),
										"aria-label": "Чью доску показать",
										children: TEAM.map((user) => /* @__PURE__ */ jsx("option", {
											value: user.id,
											children: user.id === ME.id ? "Моя доска" : user.name
										}, user.id))
									})]
								}),
								/* @__PURE__ */ jsxs("span", {
									className: "muted toolbar__sum",
									children: [
										foreignBoard ? "Доска сотрудника" : "Моя доска",
										" · маржа ",
										shortMoney(sumMarginsOf(myLeads, shipments))
									]
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "view-switch",
									role: "group",
									"aria-label": "Вид списка лидов",
									children: [/* @__PURE__ */ jsx("button", {
										type: "button",
										"aria-pressed": view === "board",
										onClick: () => switchView("board"),
										title: "Канбан",
										children: /* @__PURE__ */ jsx(KanbanSquare, {
											size: 15,
											strokeWidth: 1.9
										})
									}), /* @__PURE__ */ jsx("button", {
										type: "button",
										"aria-pressed": view === "list",
										onClick: () => switchView("list"),
										title: "Список",
										children: /* @__PURE__ */ jsx(List, {
											size: 15,
											strokeWidth: 1.9
										})
									})]
								})
							]
						})
					]
				}),
				view === "board" ? /* @__PURE__ */ jsxs(DndContext, {
					sensors,
					collisionDetection,
					onDragStart: handleDragStart,
					onDragOver: handleDragOver,
					onDragCancel: resetDrag,
					onDragEnd: handleDragEnd,
					children: [/* @__PURE__ */ jsxs("div", {
						className: activeId != null ? "board board--dragging" : "board",
						"data-folded": stages.some((stage) => folded.includes(stage.id)) ? "" : void 0,
						onClickCapture: (event) => {
							if (!suppressClick.current) return;
							event.preventDefault();
							event.stopPropagation();
							suppressClick.current = false;
						},
						children: [stages.map((stage) => {
							const stageLeads = myLeads.filter((lead) => lead.stageId === stage.id && visible(lead));
							if (folded.includes(stage.id)) return /* @__PURE__ */ jsx(FoldedColumn, {
								stage,
								count: myLeads.filter((lead) => lead.stageId === stage.id).length,
								onUnfold: () => toggleFold(stage.id)
							}, stage.id);
							let dropIndex = null;
							if (dropTarget && dropTarget.stageId === stage.id) dropIndex = myLeads.filter((lead) => lead.stageId === stage.id && lead.id !== activeId).slice(0, dropTarget.index).filter(visible).length;
							return /* @__PURE__ */ jsx(StageColumn, {
								stage,
								shipments,
								dragging: activeId != null,
								tags,
								stageLeads,
								dropIndex,
								onAdd: () => openLeadDialog(stage.id, boardOwnerId),
								onFold: () => toggleFold(stage.id),
								onPriority: setPriority,
								canEditStages: !foreignBoard
							}, stage.id);
						}), !foreignBoard && /* @__PURE__ */ jsx("div", {
							className: "stage-creator",
							children: addingStage ? /* @__PURE__ */ jsx("input", {
								autoFocus: true,
								className: "stage-creator__input",
								"aria-label": "Название нового этапа",
								placeholder: "Название этапа",
								value: stageName,
								onChange: (event) => setStageName(event.target.value),
								onBlur: () => {
									if (!stageCreatorCancelled.current) closeStageCreator({ save: true });
								},
								onKeyDown: (event) => {
									if (event.key === "Enter") {
										event.preventDefault();
										event.currentTarget.blur();
									}
									if (event.key === "Escape") {
										event.preventDefault();
										stageCreatorCancelled.current = true;
										closeStageCreator();
									}
								}
							}) : /* @__PURE__ */ jsxs("button", {
								type: "button",
								className: "stage-creator__button",
								onClick: () => {
									stageCreatorCancelled.current = false;
									setAddingStage(true);
								},
								children: [/* @__PURE__ */ jsx(Plus, {
									size: 16,
									strokeWidth: 2
								}), "Добавить этап"]
							})
						})]
					}), /* @__PURE__ */ jsx(DragOverlay, {
						dropAnimation: {
							duration: 180,
							easing: "cubic-bezier(0.22, 0.8, 0.28, 1)"
						},
						children: activeLead ? /* @__PURE__ */ jsx("div", {
							className: "drag-overlay",
							style: activeWidth ? { width: activeWidth } : void 0,
							children: /* @__PURE__ */ jsx(LeadCard, {
								lead: activeLead,
								shipments,
								tags
							})
						}) : null
					})]
				}) : /* @__PURE__ */ jsxs(Fragment$1, { children: [
					selected.length > 0 && /* @__PURE__ */ jsxs("div", {
						className: "bulk-bar",
						children: [
							/* @__PURE__ */ jsxs("span", {
								className: "bulk-bar__count",
								children: ["Выбрано записей: ", /* @__PURE__ */ jsx("b", { children: selected.length })]
							}),
							/* @__PURE__ */ jsxs("button", {
								type: "button",
								className: "btn btn--ghost btn--sm",
								onClick: () => setSelected([]),
								children: [/* @__PURE__ */ jsx(X, {
									size: 14,
									strokeWidth: 2
								}), "Снять выделение"]
							}),
							/* @__PURE__ */ jsxs("button", {
								type: "button",
								className: "btn btn--danger btn--sm",
								style: { marginLeft: "auto" },
								onClick: removeSelected,
								children: [/* @__PURE__ */ jsx(Trash2, {
									size: 14,
									strokeWidth: 2
								}), "Удалить"]
							})
						]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "table-wrap",
						children: [/* @__PURE__ */ jsxs("table", {
							className: "table leads-table",
							children: [/* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
								/* @__PURE__ */ jsx("th", {
									style: {
										width: 36,
										paddingRight: 0
									},
									children: /* @__PURE__ */ jsx("input", {
										ref: allCheckbox,
										type: "checkbox",
										className: "row-check",
										checked: allSelected,
										onChange: toggleAll,
										"aria-label": "Выбрать все лиды"
									})
								}),
								/* @__PURE__ */ jsx(SortHead, {
									label: "Компания",
									sortKey: "name",
									sort,
									onSort: toggleSort
								}),
								/* @__PURE__ */ jsx(SortHead, {
									label: "Контакт",
									sortKey: "contact",
									sort,
									onSort: toggleSort
								}),
								/* @__PURE__ */ jsx(SortHead, {
									label: "Этап",
									sortKey: "stage",
									sort,
									onSort: toggleSort,
									width: 170
								}),
								/* @__PURE__ */ jsx("th", { children: "Маршрут" }),
								/* @__PURE__ */ jsx(SortHead, {
									label: "Приоритет",
									sortKey: "priority",
									sort,
									onSort: toggleSort,
									width: 110
								}),
								/* @__PURE__ */ jsx(SortHead, {
									label: "Маржа",
									sortKey: "margin",
									sort,
									onSort: toggleSort,
									align: "right",
									width: 120
								}),
								/* @__PURE__ */ jsx(SortHead, {
									label: "Срок",
									sortKey: "due",
									sort,
									onSort: toggleSort,
									width: 110
								})
							] }) }), /* @__PURE__ */ jsx("tbody", { children: listRows.map((lead) => {
								const stage = stages.find((item) => item.id === lead.stageId) ?? stages[0];
								const isSelected = selected.includes(lead.id);
								return /* @__PURE__ */ jsxs("tr", {
									className: isSelected ? "is-selected" : void 0,
									style: { cursor: "pointer" },
									onClick: () => navigate(`/crm/leads/${lead.id}`),
									children: [
										/* @__PURE__ */ jsx("td", {
											style: { paddingRight: 0 },
											onClick: (event) => event.stopPropagation(),
											children: /* @__PURE__ */ jsx("input", {
												type: "checkbox",
												className: "row-check",
												checked: isSelected,
												onChange: () => toggleSelect(lead.id),
												"aria-label": `Выбрать ${lead.name}`
											})
										}),
										/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsxs("div", {
											className: "cell-company",
											children: [/* @__PURE__ */ jsx("span", {
												className: "cell-logo",
												children: lead.hot ? /* @__PURE__ */ jsx(Flame, {
													size: 16,
													strokeWidth: 2,
													style: { color: "var(--warn)" }
												}) : /* @__PURE__ */ jsx(Package, {
													size: 16,
													strokeWidth: 1.8
												})
											}), /* @__PURE__ */ jsxs("div", {
												style: { minWidth: 0 },
												children: [
													/* @__PURE__ */ jsx(Link, {
														to: `/crm/leads/${lead.id}`,
														className: "cell-company__name",
														onClick: (event) => event.stopPropagation(),
														children: lead.name
													}),
													/* @__PURE__ */ jsxs("div", {
														className: "cell-company__sub",
														children: [
															lead.city,
															" · ИНН ",
															lead.inn
														]
													}),
													/* @__PURE__ */ jsx(TagList, {
														ids: lead.tagIds,
														tags
													})
												]
											})]
										}) }),
										/* @__PURE__ */ jsxs("td", { children: [/* @__PURE__ */ jsx("div", {
											className: "cell-main",
											children: lead.contact
										}), /* @__PURE__ */ jsx("div", {
											className: "cell-sub",
											children: lead.phone
										})] }),
										/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsxs("span", {
											className: "stage-cell",
											children: [/* @__PURE__ */ jsx("span", {
												className: "bar-row__dot",
												style: { background: stage?.color ?? "var(--ink-3)" }
											}), stage?.name ?? "Без этапа"]
										}) }),
										/* @__PURE__ */ jsxs("td", { children: [/* @__PURE__ */ jsx("div", {
											className: "cell-main",
											children: lead.route
										}), /* @__PURE__ */ jsxs("div", {
											className: "cell-sub",
											children: [
												lead.cargo,
												" · ",
												lead.weight
											]
										})] }),
										/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx(StarRating, {
											value: lead.priority,
											onChange: (value) => setPriority(lead.id, value),
											size: "sm"
										}) }),
										/* @__PURE__ */ jsx("td", {
											className: "cell-money",
											children: shortMoney(marginOf(lead, shipments))
										}),
										/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("span", {
											className: `due${lead.late ? " due--late" : ""}`,
											children: lead.due
										}) })
									]
								}, lead.id);
							}) })]
						}), listRows.length === 0 && /* @__PURE__ */ jsxs("div", {
							className: "empty",
							children: [
								/* @__PURE__ */ jsx("span", {
									className: "empty__icon",
									children: /* @__PURE__ */ jsx(List, {
										size: 20,
										strokeWidth: 1.8
									})
								}),
								/* @__PURE__ */ jsx("span", {
									className: "empty__title",
									children: "Лидов нет"
								}),
								/* @__PURE__ */ jsx("p", {
									className: "empty__text",
									children: "Измените фильтр или добавьте новый лид кнопкой в шапке."
								})
							]
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "table-foot",
						children: [
							/* @__PURE__ */ jsxs("span", { children: [
								"Показано ",
								listRows.length,
								" из ",
								myLeads.length
							] }),
							listRows.length !== myLeads.length && /* @__PURE__ */ jsxs("span", {
								className: "muted",
								children: ["Скрыто фильтром: ", myLeads.length - listRows.length]
							}),
							selected.length > 0 && /* @__PURE__ */ jsxs("span", {
								className: "muted",
								children: ["Выбрано: ", selected.length]
							})
						]
					})
				] })
			]
		})
	});
}
// src/ui/Chatter.jsx
/**
* Правая колонка карточки лида — лента событий и заметок.
*
* Повторяет чаттер рабочей CRM: панель режима, поиск, вложения, редактор
* записи и лента с группировкой по дням. Данные приходят готовыми
* (`entries`), своих запросов нет. Добавление, правка и удаление заметок
* живут в состоянии компонента: в макете это демонстрация поведения,
* после перезагрузки страницы лента возвращается к демо-набору.
*/
var localId = 1;
function Chatter({ entries = [], authorInitials = "Я", currentUserId, readOnly = false }) {
	const [list, setList] = useState(entries);
	const [text, setText] = useState("");
	const [pending, setPending] = useState([]);
	const [query, setQuery] = useState("");
	const [searchOpen, setSearchOpen] = useState(false);
	const [filesOpen, setFilesOpen] = useState(false);
	const [editingId, setEditingId] = useState(null);
	const [editText, setEditText] = useState("");
	const feedRef = useRef(null);
	const scrollPending = useRef(false);
	const composerRef = useRef(null);
	const composerInput = useRef(null);
	const filesInput = useRef(null);
	const editInput = useRef(null);
	useLayoutEffect(() => {
		const field = composerRef.current;
		if (!field) return;
		field.style.height = "auto";
		field.style.height = `${field.scrollHeight}px`;
	}, [text]);
	useEffect(() => {
		if (!scrollPending.current) return;
		scrollPending.current = false;
		const feed = feedRef.current;
		if (!feed) return;
		if (typeof feed.scrollTo === "function") feed.scrollTo({
			top: 0,
			behavior: "smooth"
		});
		else feed.scrollTop = 0;
	}, [list]);
	const groups = useMemo(() => {
		const needle = query.trim().toLowerCase();
		const sorted = [...needle ? list.filter((entry) => `${entry.authorName} ${entry.body} ${entry.fieldLabel ?? ""} ${entry.oldValue ?? ""} ${entry.newValue ?? ""}`.toLowerCase().includes(needle)) : list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
		const byDay = /* @__PURE__ */ new Map();
		for (const entry of sorted) {
			const key = dayLabel(entry.createdAt);
			byDay.set(key, [...byDay.get(key) ?? [], entry]);
		}
		return [...byDay.entries()];
	}, [list, query]);
	const allFiles = useMemo(() => list.flatMap((entry) => entry.attachments ?? []), [list]);
	function attach(chosen) {
		if (!chosen.length) return;
		setPending((files) => [...files, ...chosen.map((file) => ({
			id: `pending-${localId++}`,
			name: file.name,
			size: file.size,
			kind: file.type.startsWith("image/") ? "image" : "file",
			url: file.type.startsWith("image/") ? URL.createObjectURL(file) : null
		}))]);
	}
	function submit(event) {
		event.preventDefault();
		if (readOnly) return;
		const body = text.trim();
		if (!body && pending.length === 0) return;
		setList((rows) => [{
			id: `local-${localId++}`,
			type: "note",
			body,
			fieldLabel: null,
			oldValue: null,
			newValue: null,
			attachments: pending,
			createdAt: (/* @__PURE__ */ new Date()).toISOString(),
			authorId: currentUserId,
			authorName: "Вы",
			authorInitials
		}, ...rows]);
		setText("");
		setPending([]);
		scrollPending.current = true;
	}
	function startEdit(entry) {
		setEditingId(entry.id);
		setEditText(entry.body);
	}
	function saveEdit(entry) {
		const body = editText.trim();
		if (body && body !== entry.body) setList((rows) => rows.map((row) => row.id === entry.id ? {
			...row,
			body
		} : row));
		setEditingId(null);
		setEditText("");
	}
	function attachToEntry(entry, chosen) {
		if (!chosen.length) return;
		const files = chosen.map((file) => ({
			id: `entry-${localId++}`,
			name: file.name,
			size: file.size,
			url: file.type.startsWith("image/") ? URL.createObjectURL(file) : null
		}));
		setList((rows) => rows.map((row) => row.id === entry.id ? {
			...row,
			attachments: [...row.attachments ?? [], ...files]
		} : row));
	}
	function remove(entry) {
		setList((rows) => rows.filter((row) => row.id !== entry.id));
		if (editingId === entry.id) setEditingId(null);
	}
	return /* @__PURE__ */ jsxs("aside", {
		className: "chatter",
		"aria-label": "Лента лида",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "chatter__head",
				children: [/* @__PURE__ */ jsx("button", {
					type: "button",
					className: "chatter__mode",
					"aria-pressed": "true",
					children: "Лог примечания"
				}), /* @__PURE__ */ jsxs("div", {
					className: "chatter__tools",
					children: [/* @__PURE__ */ jsx("button", {
						type: "button",
						className: "chatter__tool",
						"aria-label": "Поиск по ленте",
						title: "Поиск по ленте",
						"aria-pressed": searchOpen,
						onClick: () => {
							setSearchOpen((open) => !open);
							if (searchOpen) setQuery("");
						},
						children: /* @__PURE__ */ jsx(Search, {
							size: 15,
							strokeWidth: 2
						})
					}), /* @__PURE__ */ jsxs("button", {
						type: "button",
						className: "chatter__tool",
						"aria-label": `Вложения: ${allFiles.length}`,
						title: "Вложения",
						"aria-pressed": filesOpen,
						onClick: () => setFilesOpen((open) => !open),
						children: [/* @__PURE__ */ jsx(Paperclip, {
							size: 15,
							strokeWidth: 2
						}), allFiles.length > 0 && /* @__PURE__ */ jsx("span", {
							className: "chatter__count",
							children: allFiles.length
						})]
					})]
				})]
			}),
			searchOpen && /* @__PURE__ */ jsxs("div", {
				className: "chatter__search",
				children: [
					/* @__PURE__ */ jsx(Search, {
						size: 13,
						strokeWidth: 2
					}),
					/* @__PURE__ */ jsx("input", {
						autoFocus: true,
						value: query,
						onChange: (event) => setQuery(event.target.value),
						placeholder: "Искать в ленте…",
						"aria-label": "Поиск по ленте"
					}),
					query && /* @__PURE__ */ jsx("button", {
						type: "button",
						"aria-label": "Очистить поиск",
						onClick: () => setQuery(""),
						children: /* @__PURE__ */ jsx(X, {
							size: 13,
							strokeWidth: 2
						})
					})
				]
			}),
			filesOpen && /* @__PURE__ */ jsxs("div", {
				className: "chatter__files",
				children: [
					/* @__PURE__ */ jsx("input", {
						ref: filesInput,
						type: "file",
						multiple: true,
						hidden: true,
						"aria-label": "Файлы карточки",
						onChange: (event) => {
							attach(Array.from(event.target.files ?? []));
							event.target.value = "";
						}
					}),
					/* @__PURE__ */ jsxs("button", {
						type: "button",
						className: "chatter__attach",
						disabled: readOnly,
						onClick: () => filesInput.current?.click(),
						children: [/* @__PURE__ */ jsx(Paperclip, {
							size: 13,
							strokeWidth: 2
						}), "Прикрепить файл"]
					}),
					allFiles.length === 0 ? /* @__PURE__ */ jsx("p", {
						className: "chatter__hint",
						children: "Вложений пока нет"
					}) : /* @__PURE__ */ jsx("ul", {
						className: "chatter__filelist",
						children: allFiles.map((file) => /* @__PURE__ */ jsxs("li", { children: [
							/* @__PURE__ */ jsx(Paperclip, {
								size: 13,
								strokeWidth: 2
							}),
							/* @__PURE__ */ jsx("span", {
								className: "chatter__filename",
								title: file.name,
								children: file.name
							}),
							/* @__PURE__ */ jsx("span", {
								className: "chatter__filesize",
								children: fileSize(file.size)
							})
						] }, file.id))
					})
				]
			}),
			/* @__PURE__ */ jsxs("form", {
				className: "chatter__composer",
				onSubmit: submit,
				children: [/* @__PURE__ */ jsx(Avatar, {
					initials: authorInitials,
					size: "sm",
					title: "Вы"
				}), /* @__PURE__ */ jsxs("div", {
					className: "chatter__box",
					children: [
						/* @__PURE__ */ jsx("textarea", {
							ref: composerRef,
							rows: 1,
							value: text,
							disabled: readOnly,
							"aria-label": "Текст внутреннего примечания",
							placeholder: readOnly ? "Карточка только для чтения" : "Запишите внутреннюю запись…",
							onChange: (event) => setText(event.target.value),
							onPaste: (event) => {
								const images = Array.from(event.clipboardData.files).filter((file) => file.type.startsWith("image/"));
								if (images.length) {
									event.preventDefault();
									attach(images);
								}
							}
						}),
						pending.length > 0 && /* @__PURE__ */ jsx("ul", {
							className: "chatter__pending",
							children: pending.map((file) => /* @__PURE__ */ jsxs("li", {
								className: "chatter__chip",
								children: [
									/* @__PURE__ */ jsx(Paperclip, {
										size: 11,
										strokeWidth: 2
									}),
									/* @__PURE__ */ jsx("span", {
										className: "chatter__chipname",
										title: file.name,
										children: file.name
									}),
									/* @__PURE__ */ jsx("span", {
										className: "chatter__filesize",
										children: fileSize(file.size)
									}),
									/* @__PURE__ */ jsx("button", {
										type: "button",
										"aria-label": `Убрать ${file.name}`,
										onClick: () => setPending((files) => files.filter((item) => item.id !== file.id)),
										children: /* @__PURE__ */ jsx(X, {
											size: 11,
											strokeWidth: 2.4
										})
									})
								]
							}, file.id))
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "chatter__bar",
							children: [
								/* @__PURE__ */ jsx("input", {
									ref: composerInput,
									type: "file",
									multiple: true,
									hidden: true,
									"aria-label": "Файлы записи",
									onChange: (event) => {
										attach(Array.from(event.target.files ?? []));
										event.target.value = "";
									}
								}),
								/* @__PURE__ */ jsx("button", {
									type: "button",
									className: "chatter__attach",
									"aria-label": "Прикрепить файл к записи",
									title: "Прикрепить файл к записи",
									disabled: readOnly,
									onClick: () => composerInput.current?.click(),
									children: /* @__PURE__ */ jsx(Paperclip, {
										size: 14,
										strokeWidth: 2
									})
								}),
								/* @__PURE__ */ jsx("button", {
									type: "submit",
									className: "chatter__send",
									disabled: readOnly || !text.trim() && pending.length === 0,
									children: "Лог"
								})
							]
						})
					]
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "chatter__feed",
				ref: feedRef,
				children: [groups.length === 0 && /* @__PURE__ */ jsx("p", {
					className: "chatter__empty",
					children: query ? "Ничего не найдено" : "Пока нет записей"
				}), groups.map(([day, rows]) => /* @__PURE__ */ jsxs("section", {
					className: "chatter__day",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "chatter__day-label",
						children: [
							/* @__PURE__ */ jsx("span", {}),
							day,
							/* @__PURE__ */ jsx("span", {})
						]
					}), rows.map((entry) => /* @__PURE__ */ jsxs("article", {
						className: "chatter__entry",
						children: [/* @__PURE__ */ jsx(Avatar, {
							initials: entry.authorInitials,
							size: "sm",
							title: entry.authorName
						}), /* @__PURE__ */ jsxs("div", {
							className: "chatter__entry-body",
							children: [
								/* @__PURE__ */ jsxs("div", {
									className: "chatter__entry-head",
									children: [
										/* @__PURE__ */ jsx("span", {
											className: "chatter__author",
											children: entry.authorName
										}),
										/* @__PURE__ */ jsxs("span", {
											className: "chatter__time",
											title: absoluteTime(entry.createdAt),
											children: ["· ", relativeTime(entry.createdAt)]
										}),
										!readOnly && entry.type === "note" && entry.authorId === currentUserId && /* @__PURE__ */ jsxs("span", {
											className: "chatter__actions",
											children: [/* @__PURE__ */ jsx("button", {
												type: "button",
												"aria-label": "Изменить запись",
												title: "Изменить",
												onClick: () => startEdit(entry),
												children: /* @__PURE__ */ jsx(Pencil, {
													size: 12,
													strokeWidth: 2
												})
											}), /* @__PURE__ */ jsx("button", {
												type: "button",
												"aria-label": "Удалить запись",
												title: "Удалить",
												onClick: () => remove(entry),
												children: /* @__PURE__ */ jsx(Trash2, {
													size: 12,
													strokeWidth: 2
												})
											})]
										})
									]
								}),
								entry.fieldLabel ? /* @__PURE__ */ jsxs("p", {
									className: "chatter__delta",
									children: [
										/* @__PURE__ */ jsx("span", {
											className: "chatter__bullet",
											children: "•"
										}),
										/* @__PURE__ */ jsx("span", {
											className: "chatter__old",
											children: entry.oldValue || "—"
										}),
										/* @__PURE__ */ jsx(ArrowRight, {
											size: 12,
											strokeWidth: 2
										}),
										/* @__PURE__ */ jsx("span", {
											className: "chatter__new",
											children: entry.newValue || "—"
										}),
										/* @__PURE__ */ jsxs("span", {
											className: "chatter__field",
											children: [
												"(",
												entry.fieldLabel,
												")"
											]
										})
									]
								}) : editingId === entry.id ? /* @__PURE__ */ jsxs("div", {
									className: "chatter__edit",
									children: [/* @__PURE__ */ jsx("textarea", {
										autoFocus: true,
										rows: 2,
										value: editText,
										onChange: (event) => setEditText(event.target.value),
										"aria-label": "Изменить примечание"
									}), /* @__PURE__ */ jsxs("div", {
										className: "chatter__bar",
										children: [
											/* @__PURE__ */ jsx("input", {
												ref: editInput,
												type: "file",
												multiple: true,
												hidden: true,
												"aria-label": "Файлы примечания",
												onChange: (event) => {
													attachToEntry(entry, Array.from(event.target.files ?? []));
													event.target.value = "";
												}
											}),
											/* @__PURE__ */ jsx("button", {
												type: "button",
												className: "chatter__attach",
												"aria-label": "Прикрепить файл",
												title: "Прикрепить файл",
												onClick: () => editInput.current?.click(),
												children: /* @__PURE__ */ jsx(Paperclip, {
													size: 14,
													strokeWidth: 2
												})
											}),
											/* @__PURE__ */ jsxs("button", {
												type: "button",
												className: "chatter__send chatter__send--sm",
												disabled: !editText.trim(),
												onClick: () => saveEdit(entry),
												children: [/* @__PURE__ */ jsx(Check, {
													size: 12,
													strokeWidth: 2.4
												}), " Сохранить"]
											}),
											/* @__PURE__ */ jsx("button", {
												type: "button",
												className: "chatter__cancel",
												onClick: () => {
													setEditingId(null);
													setEditText("");
												},
												children: "Отмена"
											})
										]
									})]
								}) : entry.body && /* @__PURE__ */ jsx("p", {
									className: "chatter__text",
									children: entry.body
								}),
								entry.attachments?.length > 0 && /* @__PURE__ */ jsx("ul", {
									className: "chatter__attachments",
									children: entry.attachments.map((file) => file.url ? /* @__PURE__ */ jsx("li", {
										className: "chatter__thumb",
										children: /* @__PURE__ */ jsx("img", {
											src: file.url,
											alt: file.name
										})
									}, file.id) : /* @__PURE__ */ jsxs("li", {
										className: "chatter__attach-chip",
										children: [
											/* @__PURE__ */ jsx(Paperclip, {
												size: 11,
												strokeWidth: 2
											}),
											/* @__PURE__ */ jsx("span", {
												title: file.name,
												children: file.name
											}),
											/* @__PURE__ */ jsx("span", {
												className: "chatter__filesize",
												children: fileSize(file.size)
											})
										]
									}, file.id))
								})
							]
						})]
					}, entry.id))]
				}, day))]
			})
		]
	});
}
// src/ui/StageBar.jsx
/**
* Полоса этапов карточки лида.
*
* Показывает не больше `VISIBLE_COUNT` этапов, окно центрируется по текущему:
* текущий этап всегда в середине видимой части. Скрытые слева и справа
* этапы сворачиваются в кнопку «…» со счётчиком; по нажатию открывается
* список скрытых этапов — можно сразу переключиться.
*
* Логика окна повторяет `FormStatusbar` рабочей CRM; оформление наше.
* Меню рисуется вне полосы (`position: fixed`): у полосы `overflow-x: auto`,
* и внутри неё список обрезался бы.
*/
/** Сколько этапов держим видимыми; остальные уходят под «…». */
var VISIBLE_COUNT = 6;
/** disabled — карточка только для чтения (например, проигранный лид). */
function StageBar({ stages = [], currentId, onSelect, disabled = false }) {
	const [open, setOpen] = useState(null);
	const [position, setPosition] = useState({
		top: 0,
		left: 0
	});
	const menuRef = useRef(null);
	const count = Math.max(1, Math.min(VISIBLE_COUNT, stages.length));
	const currentIndex = Math.max(stages.findIndex((stage) => stage.id === currentId), 0);
	const maxStart = Math.max(stages.length - count, 0);
	const start = Math.min(Math.max(currentIndex - Math.floor(count / 2), 0), maxStart);
	const before = stages.slice(0, start);
	const visible = stages.slice(start, start + count);
	const after = stages.slice(start + count);
	const hidden = open === "before" ? before : after;
	function close() {
		setOpen(null);
	}
	function toggle(event, side) {
		const rect = event.currentTarget.getBoundingClientRect();
		setPosition({
			top: rect.bottom + 6,
			left: Math.max(8, Math.min(rect.left, window.innerWidth - 236 - 8))
		});
		setOpen((value) => value === side ? null : side);
	}
	function pick(stageId) {
		close();
		onSelect(stageId);
	}
	useEffect(() => {
		if (!open) return void 0;
		const handle = (event) => {
			if (event.type === "keydown" && event.key === "Escape") {
				close();
				return;
			}
			if (menuRef.current?.contains(event.target)) return;
			close();
		};
		window.addEventListener("scroll", handle, true);
		window.addEventListener("resize", handle);
		window.addEventListener("keydown", handle);
		return () => {
			window.removeEventListener("scroll", handle, true);
			window.removeEventListener("resize", handle);
			window.removeEventListener("keydown", handle);
		};
	}, [open]);
	function more(side, items) {
		return /* @__PURE__ */ jsxs("button", {
			type: "button",
			className: "stage-strip__more",
			disabled,
			"aria-haspopup": "menu",
			"aria-expanded": open === side,
			"aria-label": `${side === "before" ? "Предыдущие этапы" : "Следующие этапы"}: ${items.length}`,
			title: side === "before" ? "Предыдущие этапы" : "Следующие этапы",
			onClick: (event) => toggle(event, side),
			children: [/* @__PURE__ */ jsx("span", {
				"aria-hidden": "true",
				children: "…"
			}), /* @__PURE__ */ jsx("span", {
				className: "stage-strip__count",
				children: items.length
			})]
		});
	}
	return /* @__PURE__ */ jsxs(Fragment$1, { children: [/* @__PURE__ */ jsxs("div", {
		className: `stage-strip${disabled ? " stage-strip--disabled" : ""}`,
		role: "group",
		"aria-label": "Этапы лида",
		children: [
			before.length > 0 && more("before", before),
			visible.map((stage) => /* @__PURE__ */ jsxs("button", {
				type: "button",
				"aria-pressed": stage.id === currentId,
				disabled,
				onClick: () => pick(stage.id),
				children: [/* @__PURE__ */ jsx("span", {
					className: "stage-strip__dot",
					style: { background: stage.color }
				}), stage.name]
			}, stage.id)),
			after.length > 0 && more("after", after)
		]
	}), open && /* @__PURE__ */ jsxs(Fragment$1, { children: [/* @__PURE__ */ jsx("button", {
		type: "button",
		className: "stage-menu__scrim",
		"aria-label": "Закрыть",
		onClick: close
	}), /* @__PURE__ */ jsx("div", {
		ref: menuRef,
		role: "menu",
		className: "stage-menu",
		style: {
			top: position.top,
			left: position.left
		},
		"aria-label": open === "before" ? "Предыдущие этапы" : "Следующие этапы",
		children: hidden.map((stage) => /* @__PURE__ */ jsxs("button", {
			type: "button",
			role: "menuitem",
			className: "stage-menu__item",
			"aria-current": stage.id === currentId ? "true" : void 0,
			onClick: () => pick(stage.id),
			children: [/* @__PURE__ */ jsx("span", {
				className: "stage-strip__dot",
				style: { background: stage.color }
			}), /* @__PURE__ */ jsx("span", {
				className: "stage-menu__name",
				children: stage.name
			})]
		}, stage.id))
	})] })] });
}
// src/ui/Toast.jsx
/**
* Всплывающее уведомление внизу справа: показывается одно за раз,
* гаснет само через несколько секунд, закрывается крестиком.
* Живёт вне ленты и меню, поэтому `position: fixed` — под перенос
* в основную CRM подходит без изменений.
*/
var ICONS$1 = {
	warn: AlertTriangle,
	ok: CheckCircle2,
	info: Info
};
function Toast({ message, tone = "info", onClose, duration = 4500 }) {
	useEffect(() => {
		if (!onClose) return void 0;
		const timer = window.setTimeout(onClose, duration);
		return () => window.clearTimeout(timer);
	}, [
		message,
		duration,
		onClose
	]);
	const Icon = ICONS$1[tone] ?? Info;
	return /* @__PURE__ */ jsxs("div", {
		className: `toast toast--${tone}`,
		role: "status",
		"aria-live": "polite",
		children: [
			/* @__PURE__ */ jsx("span", {
				className: "toast__icon",
				children: /* @__PURE__ */ jsx(Icon, {
					size: 15,
					strokeWidth: 2.1
				})
			}),
			/* @__PURE__ */ jsx("span", {
				className: "toast__text",
				children: message
			}),
			/* @__PURE__ */ jsx("button", {
				type: "button",
				className: "toast__close",
				onClick: onClose,
				"aria-label": "Закрыть уведомление",
				children: /* @__PURE__ */ jsx(X, {
					size: 13,
					strokeWidth: 2.2
				})
			})
		]
	});
}
// src/ui/QuickCreateShipmentDialog.jsx
/**
* Быстрое создание заявки из карточки лида.
* Повторяет сценарий основной CRM: лид уже известен, нужны только маршрутные
* данные и перевозчик, а адреса, груз и деньги заполняются в карточке позже.
*/
var EMPTY_DRAFT = {
	loadingCity: "",
	unloadingCity: "",
	loadingDate: "",
	unloadingDate: "",
	carrierName: "",
	carrierInn: "",
	carrierContact: ""
};
function QuickCreateShipmentDialog({ lead, onCreate, onClose }) {
	const navigate = useNavigate();
	const [draft, setDraft] = useState(EMPTY_DRAFT);
	const [error, setError] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const set = (key) => (event) => {
		setDraft((prev) => ({
			...prev,
			[key]: event.target.value
		}));
		if (error) setError("");
	};
	function submit() {
		if (submitting) return;
		if ([
			draft.loadingCity,
			draft.unloadingCity,
			draft.loadingDate,
			draft.unloadingDate,
			draft.carrierName
		].some((value) => !value.trim())) {
			setError("Заполните все обязательные поля.");
			return;
		}
		setSubmitting(true);
		const shipment = onCreate({
			lead,
			loadingCity: draft.loadingCity.trim(),
			unloadingCity: draft.unloadingCity.trim(),
			loadingDate: draft.loadingDate,
			unloadingDate: draft.unloadingDate,
			carrierName: draft.carrierName.trim(),
			carrierInn: draft.carrierInn.replace(/\D/g, "").slice(0, 12),
			carrierContact: draft.carrierContact.trim()
		});
		navigate(`/shipments/${shipment.id}`);
	}
	return /* @__PURE__ */ jsx(Modal, {
		open: true,
		title: "Новая заявка",
		onClose,
		footer: /* @__PURE__ */ jsxs(Fragment$1, { children: [/* @__PURE__ */ jsx(Button, {
			variant: "ghost",
			onClick: onClose,
			children: "Отмена"
		}), /* @__PURE__ */ jsx(Button, {
			variant: "primary",
			onClick: submit,
			disabled: submitting,
			children: submitting ? "Создаём…" : "Создать заявку"
		})] }),
		children: /* @__PURE__ */ jsxs("form", {
			className: "stack",
			style: { gap: 13 },
			onSubmit: (event) => {
				event.preventDefault();
				submit();
			},
			children: [
				/* @__PURE__ */ jsxs("p", {
					className: "modal-copy",
					children: [
						"Заявка будет связана с лидом «",
						lead.name,
						"». В карточке можно указать цены; адрес, груз и машина в этом упрощённом макете останутся пустыми."
					]
				}),
				/* @__PURE__ */ jsx(Field, {
					label: "Город погрузки",
					children: /* @__PURE__ */ jsx(Input, {
						autoFocus: true,
						required: true,
						placeholder: "Например, Челябинск",
						value: draft.loadingCity,
						onChange: set("loadingCity")
					})
				}),
				/* @__PURE__ */ jsx(Field, {
					label: "Город выгрузки",
					children: /* @__PURE__ */ jsx(Input, {
						required: true,
						placeholder: "Например, Москва",
						value: draft.unloadingCity,
						onChange: set("unloadingCity")
					})
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "grid grid--1-1",
					style: { gap: 12 },
					children: [/* @__PURE__ */ jsx(Field, {
						label: "Дата погрузки",
						children: /* @__PURE__ */ jsx(Input, {
							required: true,
							type: "date",
							value: draft.loadingDate,
							onChange: set("loadingDate")
						})
					}), /* @__PURE__ */ jsx(Field, {
						label: "Дата выгрузки",
						children: /* @__PURE__ */ jsx(Input, {
							required: true,
							type: "date",
							value: draft.unloadingDate,
							onChange: set("unloadingDate")
						})
					})]
				}),
				/* @__PURE__ */ jsx(Field, {
					label: "Перевозчик",
					children: /* @__PURE__ */ jsx(Input, {
						required: true,
						placeholder: "Название компании",
						value: draft.carrierName,
						onChange: set("carrierName")
					})
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "grid grid--1-1",
					style: { gap: 12 },
					children: [/* @__PURE__ */ jsx(Field, {
						label: "ИНН перевозчика",
						hint: "Необязательно",
						children: /* @__PURE__ */ jsx(Input, {
							inputMode: "numeric",
							maxLength: 12,
							placeholder: "10 или 12 цифр",
							value: draft.carrierInn,
							onChange: set("carrierInn")
						})
					}), /* @__PURE__ */ jsx(Field, {
						label: "Контакт перевозчика",
						hint: "Необязательно",
						children: /* @__PURE__ */ jsx(Input, {
							placeholder: "Фамилия Имя",
							value: draft.carrierContact,
							onChange: set("carrierContact")
						})
					})]
				}),
				error && /* @__PURE__ */ jsx("p", {
					className: "modal-error",
					role: "alert",
					children: error
				})
			]
		})
	});
}
// src/ui/TagsField.jsx
/**
* Поле тегов карточки лида — как виджет тегов рабочей CRM:
* выбранные теги пилюлями с крестиком, в выпадающем списке — выбор, поиск
* и создание нового тега с цветом. Удалить общий тег может только
* администратор: тег снимается со всех карточек компании.
*/
function TagsField({ tags, value = [], onChange, onCreate, onDelete, canDelete = false, disabled = false }) {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [color, setColor] = useState(STAGE_COLORS[0]);
	const rootRef = useRef(null);
	useEffect(() => {
		if (!open) return void 0;
		const onDown = (event) => {
			if (!rootRef.current?.contains(event.target)) setOpen(false);
		};
		const onKey = (event) => {
			if (event.key === "Escape") {
				event.stopPropagation();
				setOpen(false);
			}
		};
		document.addEventListener("mousedown", onDown);
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("mousedown", onDown);
			document.removeEventListener("keydown", onKey);
		};
	}, [open]);
	useEffect(() => {
		if (disabled) setOpen(false);
	}, [disabled]);
	const selected = value.map((id) => tags.find((tag) => tag.id === id)).filter(Boolean);
	const q = query.trim().toLowerCase();
	const found = tags.filter((tag) => !q || tag.name.toLowerCase().includes(q));
	const exact = tags.some((tag) => tag.name.toLowerCase() === q);
	const toggle = (id) => onChange(value.includes(id) ? value.filter((item) => item !== id) : [...value, id]);
	function create() {
		if (!q || exact) return;
		const tag = onCreate(query, color);
		if (tag && !value.includes(tag.id)) onChange([...value, tag.id]);
		setQuery("");
	}
	return /* @__PURE__ */ jsxs("div", {
		ref: rootRef,
		className: `tags-field${disabled ? " is-disabled" : ""}`,
		children: [/* @__PURE__ */ jsxs("div", {
			className: "tags-field__value",
			children: [
				selected.map((tag) => /* @__PURE__ */ jsx(TagChip, {
					name: tag.name,
					color: tag.color,
					size: "md",
					children: !disabled && /* @__PURE__ */ jsx("button", {
						type: "button",
						className: "tag-chip__remove",
						"aria-label": `Убрать тег «${tag.name}»`,
						onClick: () => toggle(tag.id),
						children: /* @__PURE__ */ jsx(X, {
							size: 11,
							strokeWidth: 2.4
						})
					})
				}, tag.id)),
				!disabled && /* @__PURE__ */ jsxs("button", {
					type: "button",
					className: "tags-field__add",
					"aria-haspopup": "listbox",
					"aria-expanded": open,
					onClick: () => setOpen((v) => !v),
					children: [/* @__PURE__ */ jsx(Plus, {
						size: 12,
						strokeWidth: 2.2
					}), selected.length ? "Тег" : "Добавить тег"]
				}),
				disabled && selected.length === 0 && /* @__PURE__ */ jsx("span", {
					className: "tags-field__empty",
					children: "—"
				})
			]
		}), open && /* @__PURE__ */ jsxs("div", {
			className: "tags-field__pop",
			children: [
				/* @__PURE__ */ jsx("input", {
					autoFocus: true,
					className: "tags-field__search",
					value: query,
					placeholder: "Найти или создать тег",
					"aria-label": "Найти или создать тег",
					onChange: (event) => setQuery(event.target.value),
					onKeyDown: (event) => {
						if (event.key === "Enter") {
							event.preventDefault();
							event.stopPropagation();
							if (found.length === 1 && exact) toggle(found[0].id);
							else create();
						}
					}
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "tags-field__list",
					role: "listbox",
					"aria-multiselectable": "true",
					children: [found.map((tag) => {
						const on = value.includes(tag.id);
						return /* @__PURE__ */ jsxs("div", {
							className: "tags-field__row",
							children: [/* @__PURE__ */ jsxs("button", {
								type: "button",
								role: "option",
								"aria-selected": on,
								className: "tags-field__option",
								onClick: () => toggle(tag.id),
								children: [/* @__PURE__ */ jsx("span", {
									className: "tags-field__check",
									children: on && /* @__PURE__ */ jsx(Check, {
										size: 12,
										strokeWidth: 2.6
									})
								}), /* @__PURE__ */ jsx(TagChip, {
									name: tag.name,
									color: tag.color
								})]
							}), canDelete && /* @__PURE__ */ jsx("button", {
								type: "button",
								className: "tags-field__delete",
								"aria-label": `Удалить тег «${tag.name}» у всех карточек`,
								title: "Удалить тег у всех карточек (администратор)",
								onClick: () => onDelete(tag.id),
								children: /* @__PURE__ */ jsx(Trash2, {
									size: 12,
									strokeWidth: 2
								})
							})]
						}, tag.id);
					}), found.length === 0 && !q && /* @__PURE__ */ jsx("p", {
						className: "tags-field__hint",
						children: "Тегов пока нет"
					})]
				}),
				q && !exact && /* @__PURE__ */ jsxs("div", {
					className: "tags-field__create",
					children: [/* @__PURE__ */ jsx("div", {
						className: "swatches tags-field__colors",
						role: "group",
						"aria-label": "Цвет нового тега",
						children: STAGE_COLORS.map((item) => /* @__PURE__ */ jsx("button", {
							type: "button",
							"aria-pressed": color === item,
							"aria-label": `Цвет ${item}`,
							className: "swatch-dot",
							style: {
								background: item,
								color: item
							},
							onClick: () => setColor(item)
						}, item))
					}), /* @__PURE__ */ jsxs("button", {
						type: "button",
						className: "tags-field__create-btn",
						onClick: create,
						children: [
							/* @__PURE__ */ jsx(Plus, {
								size: 12,
								strokeWidth: 2.2
							}),
							"Создать «",
							query.trim(),
							"»"
						]
					})]
				})
			]
		})]
	});
}
// src/ui/LeadDialogs.jsx
/**
* Диалоги действий над лидом — по образцу рабочей CRM:
* проигрыш с обязательной причиной, передача коллеге в два шага
* (выбор → подтверждение) и безвозвратное удаление.
*/
function LoseLeadDialog({ leadName, onCancel, onConfirm }) {
	const [reason, setReason] = useState(null);
	return /* @__PURE__ */ jsxs(Modal, {
		open: true,
		title: "Отметить проигрышем?",
		onClose: onCancel,
		footer: /* @__PURE__ */ jsxs(Fragment$1, { children: [/* @__PURE__ */ jsx(Button, {
			variant: "ghost",
			onClick: onCancel,
			children: "Отмена"
		}), /* @__PURE__ */ jsx(Button, {
			variant: "danger",
			disabled: !reason,
			onClick: () => onConfirm(reason),
			children: "Отметить проигрышем"
		})] }),
		children: [/* @__PURE__ */ jsxs("p", {
			className: "modal-copy",
			children: [
				"Карточка «",
				leadName,
				"» уйдёт с доски. Она останется в базе — любой сотрудник сможет посмотреть причину и забрать её себе."
			]
		}), /* @__PURE__ */ jsxs("fieldset", {
			className: "choice-list",
			children: [/* @__PURE__ */ jsx("legend", {
				className: "choice-list__legend",
				children: "Причина"
			}), LOSS_REASONS.map((item) => /* @__PURE__ */ jsxs("label", {
				className: `choice${reason === item ? " is-checked" : ""}`,
				children: [/* @__PURE__ */ jsx("input", {
					type: "radio",
					name: "loss-reason",
					checked: reason === item,
					onChange: () => setReason(item)
				}), item]
			}, item))]
		})]
	});
}
function TransferLeadDialog({ leadName, ownerId, leadIsLost = false, onCancel, onConfirm }) {
	const [query, setQuery] = useState("");
	const [chosen, setChosen] = useState(null);
	const colleagues = useMemo(() => {
		const q = query.trim().toLowerCase();
		return TEAM.filter((user) => user.id !== ownerId && (!q || user.name.toLowerCase().includes(q)));
	}, [ownerId, query]);
	if (chosen) return /* @__PURE__ */ jsx(Modal, {
		open: true,
		title: "Передать лид?",
		onClose: onCancel,
		footer: /* @__PURE__ */ jsxs(Fragment$1, { children: [/* @__PURE__ */ jsx(Button, {
			variant: "ghost",
			onClick: () => setChosen(null),
			children: "Назад"
		}), /* @__PURE__ */ jsx(Button, {
			variant: "primary",
			onClick: () => onConfirm(chosen.id),
			children: "Передать"
		})] }),
		children: /* @__PURE__ */ jsxs("p", {
			className: "modal-copy",
			children: [
				"Карточка «",
				leadName,
				"» перейдёт к сотруднику ",
				/* @__PURE__ */ jsx("b", { children: chosen.name }),
				" вместе с заявками, документами и перепиской. С вашей доски она исчезнет.",
				leadIsLost && " Лид также выйдет из проигрыша и вернётся на доску."
			]
		})
	});
	return /* @__PURE__ */ jsxs(Modal, {
		open: true,
		title: "Кому передать лид",
		onClose: onCancel,
		footer: /* @__PURE__ */ jsx(Button, {
			variant: "ghost",
			onClick: onCancel,
			children: "Отмена"
		}),
		children: [
			/* @__PURE__ */ jsx("p", {
				className: "modal-copy",
				children: "Начните вводить фамилию коллеги."
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "search picker-search",
				children: [/* @__PURE__ */ jsx(Search, {
					size: 15,
					strokeWidth: 2
				}), /* @__PURE__ */ jsx("input", {
					autoFocus: true,
					type: "search",
					value: query,
					placeholder: "Фамилия или имя",
					"aria-label": "Поиск сотрудника",
					onChange: (event) => setQuery(event.target.value)
				})]
			}),
			/* @__PURE__ */ jsx("div", {
				className: "picker-list",
				role: "listbox",
				"aria-label": "Сотрудники",
				children: colleagues.length === 0 ? /* @__PURE__ */ jsx("p", {
					className: "picker-list__empty",
					children: "Никого не нашли. Сотрудников заводит администратор."
				}) : colleagues.map((user) => /* @__PURE__ */ jsxs("button", {
					type: "button",
					role: "option",
					"aria-selected": "false",
					className: "picker-list__item",
					onClick: () => setChosen(user),
					children: [
						/* @__PURE__ */ jsx(Avatar, {
							initials: user.initials,
							color: user.color,
							size: "sm"
						}),
						/* @__PURE__ */ jsx("span", {
							className: "picker-list__name",
							children: user.name
						}),
						/* @__PURE__ */ jsx("span", {
							className: "picker-list__role",
							children: user.role
						})
					]
				}, user.id))
			})
		]
	});
}
function DeleteLeadDialog({ leadName, onCancel, onConfirm }) {
	return /* @__PURE__ */ jsx(Modal, {
		open: true,
		title: "Удалить лид без возврата?",
		onClose: onCancel,
		footer: /* @__PURE__ */ jsxs(Fragment$1, { children: [/* @__PURE__ */ jsx(Button, {
			variant: "ghost",
			onClick: onCancel,
			children: "Отмена"
		}), /* @__PURE__ */ jsx(Button, {
			variant: "danger",
			onClick: onConfirm,
			children: "Удалить навсегда"
		})] }),
		children: /* @__PURE__ */ jsxs("p", {
			className: "modal-copy",
			children: [
				"Карточка «",
				leadName,
				"», её заявки, документы и переписка будут удалены навсегда. Восстановить их будет невозможно."
			]
		})
	});
}
// src/mock/chatter.js
/**
* Демо-лента карточки лида. Повторяет форму записи рабочей CRM
* (`TimelineEntry`): type, body, fieldLabel/oldValue/newValue, attachments,
* createdAt, автор. При переносе источника не будет — останется только
* разметка и стили.
*/
var MINUTE = 6e4;
var HOUR = 60 * MINUTE;
var DAY = 24 * HOUR;
/** Метка времени «столько-то назад» от текущего момента. */
function ago({ days = 0, hours = 0, minutes = 0 }) {
	return (/* @__PURE__ */ new Date(Date.now() - days * DAY - hours * HOUR - minutes * MINUTE)).toISOString();
}
var USERS = Object.fromEntries(TEAM.map((user) => [user.id, user]));
function author(id) {
	if (id === null) return {
		id: null,
		name: "Система",
		initials: "—"
	};
	if (id === ME.id) return ME;
	return USERS[id] ?? TEAM[0];
}
var nextId = 1;
function entry({ type = "note", body = "", who = ME.id, at, fieldLabel = null, oldValue = null, newValue = null, attachments = [] }) {
	const person = author(who);
	return {
		id: nextId++,
		type,
		body,
		fieldLabel,
		oldValue,
		newValue,
		attachments,
		createdAt: at,
		authorId: person.id,
		authorName: person.name,
		authorInitials: person.initials
	};
}
var STAGE_NAME = (id) => STAGES$1.find((stage) => stage.id === id)?.name ?? "Без этапа";
/**
* Лента конкретного лида: создание, переводы по этапам, заметки,
* созданная заявка и вложение. Набор собирается из данных лида, поэтому
* выглядит правдоподобно на любой карточке.
*/
function leadChatter(lead) {
	if (!lead) return [];
	const stageName = STAGE_NAME(lead.stageId);
	const contact = lead.contact ?? "контакт";
	const route = lead.route ?? "маршрут";
	return [
		entry({
			type: "history",
			body: "Лид создан из формы на сайте",
			who: null,
			at: ago({
				days: 12,
				hours: 3
			})
		}),
		entry({
			type: "history",
			fieldLabel: "Этап",
			oldValue: STAGE_NAME(1),
			newValue: STAGE_NAME(2),
			who: 2,
			at: ago({
				days: 10,
				hours: 1
			})
		}),
		entry({
			body: `Дозвонилась: ${contact}. Запрос актуальный, работают с нами впервые. Просят ставку по маршруту ${route}.`,
			who: 2,
			at: ago({
				days: 9,
				hours: 5
			})
		}),
		entry({
			type: "history",
			body: `Создана заявка ЗВ-2026-0148 · ${route}`,
			who: 3,
			at: ago({
				days: 6,
				hours: 2
			})
		}),
		entry({
			body: "Скинул проект договора и карточку компании. Ждём подтверждение реквизитов от бухгалтерии клиента.",
			attachments: [{
				id: 1,
				name: "Договор-2026-148.pdf",
				size: 1258291
			}],
			at: ago({
				days: 4,
				hours: 6
			})
		}),
		entry({
			type: "history",
			fieldLabel: "Этап",
			oldValue: STAGE_NAME(2),
			newValue: stageName,
			at: ago({
				days: 2,
				hours: 2
			})
		}),
		entry({
			body: `Созвонились: ${contact}. Готовы работать, ждут наш ответ по срокам погрузки.`,
			at: ago({ hours: 4 })
		}),
		entry({
			body: "Клиент просил пересчитать ставку: рассматривает ещё одного перевозчика. Держу на контроле до пятницы.",
			who: 2,
			at: ago({ minutes: 38 })
		})
	];
}
/**
* Лента заявки: создание из лида, смены статуса, заметка логиста и
* вложение — как таймлайн заявки в рабочей CRM.
*/
function shipmentChatter(shipment) {
	if (!shipment) return [];
	const steps = [
		"Новая",
		"Проверена и подписана заявка",
		"Машина загрузилась",
		"Машина выгрузилась"
	];
	const index = Math.max(0, [
		"new",
		"checked",
		"loaded",
		"unloaded"
	].indexOf(shipment.status));
	const list = [entry({
		type: "history",
		body: `Заявка ${shipment.number} создана из карточки лида «${shipment.client}»`,
		who: shipment.ownerId,
		at: ago({
			days: 5,
			hours: 4
		})
	})];
	for (let step = 1; step <= index; step += 1) list.push(entry({
		type: "history",
		fieldLabel: "Статус",
		oldValue: steps[step - 1],
		newValue: steps[step],
		who: shipment.ownerId,
		at: ago({
			days: 5 - step,
			hours: 2
		})
	}));
	list.push(entry({
		body: shipment.carrierName ? `Перевозчик ${shipment.carrierName} подтвердил машину. Скан заявки подписан с двух сторон.` : "Ищем перевозчика: две ставки на рассмотрении, решим до вечера.",
		attachments: shipment.carrierName ? [{
			id: 1,
			name: `Заявка-${shipment.number}.pdf`,
			size: 482133
		}] : [],
		who: shipment.ownerId,
		at: ago({ hours: 6 })
	}));
	return list;
}
// src/lib/mail.js
/**
* Письмо клиенту: проверка адреса и ссылка на форму письма в Яндекс Почте.
* Без React — этот файл переносится в основную CRM как есть.
*/
/** Простая проверка: есть «@», домен и точка в нём, без пробелов. */
var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
function isEmail(value) {
	return EMAIL_RE.test(String(value ?? "").trim());
}
/**
* Форма письма в Яндекс Почте с заполненным получателем.
* Яндекс принимает адрес в параметре `mailto` в виде «mailto:client@example.ru».
* Тема и тело намеренно не передаются — поля остаются пустыми.
*/
function yandexComposeUrl(email) {
	return `https://mail.yandex.ru/compose?mailto=${encodeURIComponent(`mailto:${String(email).trim()}`)}`;
}
/**
* Открывает Яндекс Почту в новой вкладке.
* Возвращает false, если браузер заблокировал вкладку.
*/
function openYandexCompose(email) {
	const win = window.open(yandexComposeUrl(email), "_blank");
	if (!win) return false;
	win.opener = null;
	return true;
}
// src/pages/LeadPage.jsx
/**
* Карточка лида: этапы воронки, клиент, заявки, файлы и история.
* Лид коллеги открывается менеджеру усечённо — только название, ИНН и продавец;
* администратор видит карточку целиком. Проигранный лид — только для чтения,
* с причиной, плашкой «Проигрыш» и кнопкой «Восстановить» / «Взять себе».
*/
var FILES = [
	{
		name: "Договор-2026-148.pdf",
		size: "1,2 МБ",
		date: "05.11.2026"
	},
	{
		name: "Заявка-ЗВ-0148.pdf",
		size: "340 КБ",
		date: "05.11.2026"
	},
	{
		name: "Доверенность.jpg",
		size: "820 КБ",
		date: "04.11.2026"
	}
];
/** Бухгалтеры, из которых выбирают в карточке. В рабочей CRM приходят с сервера. */
var ACCOUNTANTS = [
	"Смирнова О. П.",
	"Ольга Белова",
	"Пётр Ершов"
];
/** Поля карточки, которые менеджер правит руками. */
function draftOf$1(lead) {
	return {
		name: lead?.name ?? "",
		inn: lead?.inn ?? "",
		contact: lead?.contact ?? "",
		phone: lead?.phone ?? "",
		email: lead?.email ?? "",
		edo: lead?.edo ?? "",
		accountant: lead?.accountant ?? ACCOUNTANTS[0],
		priority: lead?.priority ?? 0,
		tagIds: lead?.tagIds ?? []
	};
}
/** Поля черновика сравниваются по значению: теги — массив. */
var sameValue = (a, b) => Array.isArray(a) || Array.isArray(b) ? JSON.stringify(a) === JSON.stringify(b) : a === b;
function LeadPage() {
	const { id } = useParams();
	const navigate = useNavigate();
	const { leads, stages, tags, shipments: allShipments, moveLead, updateLead, addShipment, addTag, removeTag, loseLead, restoreLead, transferLead, deleteLead } = useLeads();
	const lead = leads.find((item) => item.id === Number(id));
	const [tab, setTab] = useState("shipments");
	const [shipmentCreateOpen, setShipmentCreateOpen] = useState(false);
	const [dialog, setDialog] = useState(null);
	const [stageId, setStageId] = useState(lead?.stageId ?? 1);
	const chatter = useMemo(() => leadChatter(lead), [lead?.id, lead?.stageId]);
	const [draft, setDraft] = useState(() => draftOf$1(lead));
	const [saved, setSaved] = useState(() => draftOf$1(lead));
	useEffect(() => {
		const next = draftOf$1(lead);
		setDraft(next);
		setSaved(next);
	}, [lead?.id]);
	useEffect(() => {
		setStageId(lead?.stageId ?? 1);
	}, [lead?.id, lead?.stageId]);
	const dirty = Object.keys(saved).some((key) => !sameValue(draft[key], saved[key]));
	const readOnly = Boolean(lead?.lost);
	const set = (key) => (event) => setDraft((prev) => ({
		...prev,
		[key]: event.target.value
	}));
	const [saving, setSaving] = useState(false);
	const persist = (next = draft) => {
		updateLead(lead.id, next);
		setDraft(next);
		setSaved(next);
		setSaving(true);
		window.setTimeout(() => setSaving(false), 350);
	};
	function saveCard() {
		if (!dirty || !draft.name.trim()) return;
		persist({
			...draft,
			name: draft.name.trim()
		});
	}
	function discardCard() {
		setDraft(saved);
		setSaving(false);
	}
	/** Enter — сохранить правку, Esc — вернуть последнюю сохранённую. */
	function onFieldKeyDown(event) {
		if (event.key === "Enter") {
			event.preventDefault();
			saveCard();
			event.target.blur();
		} else if (event.key === "Escape") {
			event.preventDefault();
			discardCard();
			event.target.blur();
		}
	}
	useEffect(() => {
		if (!dirty || !draft.name.trim() || readOnly) return void 0;
		const timer = window.setTimeout(() => persist(draft), 3e3);
		return () => window.clearTimeout(timer);
	}, [
		draft,
		dirty,
		lead?.id
	]);
	const latest = useRef({
		id: null,
		dirty: false,
		draft: null,
		update: updateLead
	});
	latest.current = {
		id: lead?.id,
		dirty,
		draft,
		update: updateLead
	};
	useEffect(() => () => {
		const state = latest.current;
		if (state.dirty && state.draft?.name?.trim()) state.update(state.id, state.draft);
	}, []);
	const [toast, setToast] = useState(null);
	const dismissToast = useCallback(() => setToast(null), []);
	const showToast = useCallback((text, tone = "warn") => {
		setToast({
			text,
			tone
		});
	}, []);
	const emailRef = useRef(null);
	const [emailHint, setEmailHint] = useState(false);
	function pointToEmail() {
		const node = emailRef.current;
		if (node) {
			node.scrollIntoView?.({
				block: "center",
				behavior: "smooth"
			});
			node.focus({ preventScroll: true });
		}
		setEmailHint(true);
		window.setTimeout(() => setEmailHint(false), 2200);
	}
	/**
	* «Письмо» открывает Яндекс Почту с готовым получателем.
	* Адрес берём только сохранённый: несохранённую правку не отправляем,
	* иначе письмо уйдёт на адрес, которого в карточке ещё нет.
	*/
	function writeEmail() {
		const email = String(saved.email ?? "").trim();
		if (!email) {
			showToast("Почта не указана. Заполните E-mail в информации о клиенте.");
			pointToEmail();
			return;
		}
		if (!isEmail(email)) {
			showToast(`«${email}» не похоже на адрес почты. Проверьте E-mail в карточке.`);
			pointToEmail();
			return;
		}
		if (!openYandexCompose(email)) showToast("Браузер заблокировал вкладку. Разрешите всплывающие окна для сайта.");
	}
	const sameInn = draft.inn.trim().length >= 10 ? leads.filter((item) => item.id !== lead?.id && item.inn === draft.inn.trim()) : [];
	if (!lead) return /* @__PURE__ */ jsx(Shell, {
		title: "Карточка лида",
		children: /* @__PURE__ */ jsxs("div", {
			className: "card",
			style: {
				padding: 40,
				textAlign: "center"
			},
			children: [
				/* @__PURE__ */ jsx("h2", {
					style: { marginBottom: 8 },
					children: "Лид не найден"
				}),
				/* @__PURE__ */ jsx("p", {
					className: "muted",
					style: { marginBottom: 16 },
					children: "Возможно, ссылка устарела."
				}),
				/* @__PURE__ */ jsx(Link, {
					to: "/crm",
					className: "btn",
					children: "Вернуться к воронке"
				})
			]
		})
	});
	if (lead.ownerId !== ME.id && !ME.isAdmin) {
		const colleague = OWNER(lead.ownerId);
		return /* @__PURE__ */ jsxs(Shell, {
			title: "Карточка лида",
			crumb: `Воронка · ${lead.name}`,
			children: [
				/* @__PURE__ */ jsxs(Link, {
					to: "/crm",
					className: "back-link",
					children: [/* @__PURE__ */ jsx(ArrowLeft, {
						size: 14,
						strokeWidth: 2
					}), "К воронке"]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "lead-head",
					children: [
						/* @__PURE__ */ jsx("span", {
							className: "lead-head__logo",
							children: /* @__PURE__ */ jsx(Building2, {
								size: 24,
								strokeWidth: 1.8
							})
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "grow",
							children: [/* @__PURE__ */ jsx("h1", {
								className: "lead-head__name",
								children: lead.name
							}), /* @__PURE__ */ jsxs("div", {
								className: "lead-head__meta",
								children: [/* @__PURE__ */ jsxs("span", {
									className: "mono",
									children: ["ИНН ", lead.inn]
								}), /* @__PURE__ */ jsx("span", { children: lead.city })]
							})]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "lead-head__actions",
							children: [/* @__PURE__ */ jsx(Avatar, {
								initials: colleague.initials,
								color: colleague.color,
								size: "lg",
								title: colleague.name
							}), /* @__PURE__ */ jsx("span", {
								style: {
									fontSize: 12,
									color: "var(--ink-2)"
								},
								children: colleague.name
							})]
						})
					]
				}),
				lead.lost ? /* @__PURE__ */ jsxs("div", {
					className: "record-alert record-alert--warn lead-lost-note",
					children: [/* @__PURE__ */ jsxs("span", { children: [
						/* @__PURE__ */ jsx("b", { children: "Лид проигран." }),
						" Причина: ",
						lead.lossReason || "не указана",
						". Проигранную карточку коллеги может забрать любой сотрудник."
					] }), /* @__PURE__ */ jsx(Button, {
						size: "sm",
						variant: "primary",
						icon: UserPlus,
						onClick: () => restoreLead(lead.id, { takeOver: true }),
						children: "Взять себе"
					})]
				}) : /* @__PURE__ */ jsx("div", {
					className: "stub",
					children: /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("b", { children: "Лид коллеги." }), " Активный лид другого менеджера открыт только для просмотра: название, ИНН и продавец. Заявки, контакты и деньги доступны владельцу лида и администратору."] })
				})
			]
		});
	}
	const shipments = allShipments.filter((item) => item.leadId === lead.id);
	const owner = OWNER(lead.ownerId);
	const isOwner = lead.ownerId === ME.id;
	const stageOrder = new Map(stages.map((stage, index) => [stage.id, index]));
	const siblings = leads.filter((item) => item.ownerId === lead.ownerId && !item.lost).sort((a, b) => (stageOrder.get(a.stageId) ?? 0) - (stageOrder.get(b.stageId) ?? 0) || (a.position ?? 0) - (b.position ?? 0));
	const pagerIndex = siblings.findIndex((item) => item.id === lead.id);
	const prevLead = pagerIndex > 0 ? siblings[pagerIndex - 1] : null;
	const nextLead = pagerIndex >= 0 && pagerIndex < siblings.length - 1 ? siblings[pagerIndex + 1] : null;
	const actions = [
		!lead.lost && {
			label: "Отметить проигрышем",
			icon: XCircle,
			onSelect: () => setDialog("lose")
		},
		{
			label: "Передать коллеге",
			icon: ArrowRightLeft,
			disabled: readOnly && !ME.isAdmin,
			onSelect: () => setDialog("transfer")
		},
		ME.isAdmin && {
			label: "Удалить лид",
			icon: Trash2,
			danger: true,
			onSelect: () => setDialog("delete")
		}
	];
	return /* @__PURE__ */ jsx(Shell, {
		title: "Карточка лида",
		crumb: `Воронка · ${lead.name}`,
		children: /* @__PURE__ */ jsxs("div", {
			className: "lead-page",
			children: [
				/* @__PURE__ */ jsxs(Link, {
					to: "/crm",
					className: "back-link",
					children: [/* @__PURE__ */ jsx(ArrowLeft, {
						size: 14,
						strokeWidth: 2
					}), "К воронке"]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "lead-head",
					children: [
						/* @__PURE__ */ jsx("span", {
							className: "lead-head__logo",
							children: /* @__PURE__ */ jsx(Building2, {
								size: 24,
								strokeWidth: 1.8
							})
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "grow",
							children: [/* @__PURE__ */ jsx("h1", {
								className: "lead-head__title",
								children: /* @__PURE__ */ jsx("input", {
									className: "lead-title-input",
									disabled: readOnly,
									value: draft.name,
									onChange: set("name"),
									onKeyDown: onFieldKeyDown,
									"aria-label": "Название лида",
									placeholder: "Название компании",
									autoComplete: "off"
								})
							}), /* @__PURE__ */ jsx("div", {
								className: "lead-head__meta",
								children: /* @__PURE__ */ jsxs("span", {
									className: "mono",
									children: ["ИНН ", draft.inn || "—"]
								})
							})]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "lead-head__actions",
							children: [
								readOnly ? null : saving ? /* @__PURE__ */ jsx("span", {
									className: "lead-save__state lead-save__state--saving",
									children: "Сохранение…"
								}) : dirty ? /* @__PURE__ */ jsxs("div", {
									className: "lead-save",
									children: [
										/* @__PURE__ */ jsx("span", {
											className: "lead-save__state",
											children: draft.name.trim() ? "Изменено" : "Введите название"
										}),
										/* @__PURE__ */ jsx(Button, {
											size: "sm",
											variant: "ghost",
											onClick: discardCard,
											children: "Отменить"
										}),
										/* @__PURE__ */ jsx(Button, {
											size: "sm",
											variant: "primary",
											icon: Check,
											onClick: saveCard,
											disabled: !draft.name.trim(),
											children: "Сохранить"
										})
									]
								}) : /* @__PURE__ */ jsxs("span", {
									className: "lead-save__ok",
									children: [/* @__PURE__ */ jsx(Check, {
										size: 13,
										strokeWidth: 2.2
									}), " Сохранено"]
								}),
								/* @__PURE__ */ jsx(Button, {
									variant: "success",
									icon: Phone,
									children: "Позвонить"
								}),
								/* @__PURE__ */ jsx(Button, {
									variant: "info",
									icon: Mail,
									onClick: writeEmail,
									children: "Письмо"
								}),
								/* @__PURE__ */ jsx(Menu$1, {
									label: "Действия",
									icon: MoreHorizontal,
									items: actions
								}),
								pagerIndex >= 0 && /* @__PURE__ */ jsxs("div", {
									className: "pager",
									role: "group",
									"aria-label": "Соседние лиды",
									children: [
										/* @__PURE__ */ jsx(IconButton, {
											icon: ChevronLeft,
											label: prevLead ? `Предыдущий лид: ${prevLead.name}` : "Это первый лид",
											disabled: !prevLead,
											onClick: () => prevLead && navigate(`/crm/leads/${prevLead.id}`)
										}),
										/* @__PURE__ */ jsxs("span", {
											className: "pager__count",
											children: [
												pagerIndex + 1,
												" из ",
												siblings.length
											]
										}),
										/* @__PURE__ */ jsx(IconButton, {
											icon: ChevronRight,
											label: nextLead ? `Следующий лид: ${nextLead.name}` : "Это последний лид",
											disabled: !nextLead,
											onClick: () => nextLead && navigate(`/crm/leads/${nextLead.id}`)
										})
									]
								})
							]
						})
					]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "lead-layout",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "stack",
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "lead-stagebar",
								children: [/* @__PURE__ */ jsx(StageBar, {
									stages,
									currentId: stageId,
									disabled: readOnly,
									onSelect: (nextId) => {
										setStageId(nextId);
										moveLead(lead.id, nextId);
									}
								}), lead.lost ? /* @__PURE__ */ jsx(Button, {
									variant: "primary",
									size: "sm",
									icon: isOwner ? RotateCcw : UserPlus,
									onClick: () => restoreLead(lead.id, { takeOver: !isOwner }),
									children: isOwner ? "Восстановить" : "Взять себе"
								}) : /* @__PURE__ */ jsxs(Fragment$1, { children: [/* @__PURE__ */ jsx(Button, {
									variant: "primary",
									size: "sm",
									icon: Truck,
									onClick: () => setShipmentCreateOpen(true),
									children: "Создать заявку"
								}), /* @__PURE__ */ jsx(Button, {
									variant: "ghost",
									size: "sm",
									icon: XCircle,
									className: "btn--lose",
									onClick: () => setDialog("lose"),
									children: "Проигрыш"
								})] })]
							}),
							lead.lost && /* @__PURE__ */ jsx("div", {
								className: "record-alert record-alert--warn",
								role: "status",
								children: "Лид проигран. Чтобы менять его данные, сначала восстановите карточку."
							}),
							/* @__PURE__ */ jsxs("div", {
								className: `card${lead.lost ? " card--lost" : ""}`,
								children: [
									lead.lost && /* @__PURE__ */ jsx("div", {
										className: "lost-ribbon",
										"aria-label": "Лид проигран",
										children: "Проигрыш"
									}),
									/* @__PURE__ */ jsx("div", {
										className: "card__head",
										children: /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", {
											className: "card__title",
											children: "Клиент"
										}), /* @__PURE__ */ jsx("div", {
											className: "card__sub",
											children: "Реквизиты и контакты"
										})] })
									}),
									/* @__PURE__ */ jsxs("fieldset", {
										className: "card__body lead-form",
										style: { paddingTop: 4 },
										onKeyDown: onFieldKeyDown,
										disabled: readOnly,
										children: [
											/* @__PURE__ */ jsxs("label", {
												className: "lead-field",
												children: [/* @__PURE__ */ jsx("span", {
													className: "lead-field__label",
													children: "Компания"
												}), /* @__PURE__ */ jsx("input", {
													className: "lead-input",
													value: draft.name,
													onChange: set("name"),
													placeholder: "ООО «Ромашка»"
												})]
											}),
											/* @__PURE__ */ jsxs("label", {
												className: "lead-field",
												children: [/* @__PURE__ */ jsx("span", {
													className: "lead-field__label",
													children: "ИНН"
												}), /* @__PURE__ */ jsx("input", {
													className: "lead-input lead-input--mono",
													value: draft.inn,
													inputMode: "numeric",
													autoComplete: "off",
													maxLength: 12,
													placeholder: "10 или 12 цифр",
													onChange: (event) => setDraft((prev) => ({
														...prev,
														inn: event.target.value.replace(/\D/g, "")
													}))
												})]
											}),
											sameInn.length > 0 && /* @__PURE__ */ jsxs("p", {
												className: "lead-note lead-note--warn",
												role: "alert",
												children: [
													"Лид с таким ИНН уже есть: «",
													sameInn[0].name,
													"». Это предупреждение, сохранить можно."
												]
											}),
											/* @__PURE__ */ jsxs("label", {
												className: "lead-field",
												children: [/* @__PURE__ */ jsx("span", {
													className: "lead-field__label",
													children: "Контакт"
												}), /* @__PURE__ */ jsx("input", {
													className: "lead-input",
													value: draft.contact,
													onChange: set("contact"),
													placeholder: "Фамилия Имя"
												})]
											}),
											/* @__PURE__ */ jsxs("label", {
												className: "lead-field",
												children: [/* @__PURE__ */ jsx("span", {
													className: "lead-field__label",
													children: "Телефон"
												}), /* @__PURE__ */ jsx("input", {
													className: "lead-input lead-input--mono",
													value: draft.phone,
													inputMode: "tel",
													onChange: set("phone"),
													placeholder: "+7 900 000-00-00"
												})]
											}),
											/* @__PURE__ */ jsxs("label", {
												className: "lead-field",
												children: [/* @__PURE__ */ jsx("span", {
													className: "lead-field__label",
													children: "E-mail"
												}), /* @__PURE__ */ jsx("input", {
													ref: emailRef,
													className: `lead-input${emailHint ? " lead-input--attention" : ""}`,
													type: "email",
													value: draft.email,
													onChange: set("email"),
													placeholder: "name@example.ru"
												})]
											}),
											/* @__PURE__ */ jsxs("div", {
												className: "lead-field",
												children: [/* @__PURE__ */ jsx("span", {
													className: "lead-field__label",
													children: "Приоритет"
												}), /* @__PURE__ */ jsx("span", {
													className: "lead-field__value",
													"aria-label": "Приоритет лида",
													children: /* @__PURE__ */ jsx(StarRating, {
														value: draft.priority,
														onChange: readOnly ? void 0 : (priority) => setDraft((prev) => ({
															...prev,
															priority
														}))
													})
												})]
											}),
											/* @__PURE__ */ jsxs("div", {
												className: "lead-field lead-field--top",
												children: [/* @__PURE__ */ jsx("span", {
													className: "lead-field__label",
													children: "Теги"
												}), /* @__PURE__ */ jsx("span", {
													className: "lead-field__value",
													children: /* @__PURE__ */ jsx(TagsField, {
														tags,
														value: draft.tagIds,
														disabled: readOnly,
														canDelete: ME.isAdmin,
														onChange: (tagIds) => setDraft((prev) => ({
															...prev,
															tagIds
														})),
														onCreate: addTag,
														onDelete: removeTag
													})
												})]
											}),
											/* @__PURE__ */ jsxs("div", {
												className: "lead-field",
												children: [/* @__PURE__ */ jsx("span", {
													className: "lead-field__label",
													children: "Продавец"
												}), /* @__PURE__ */ jsx("span", {
													className: "lead-field__value",
													children: /* @__PURE__ */ jsxs("button", {
														type: "button",
														className: "owner-btn",
														disabled: readOnly && !ME.isAdmin,
														title: readOnly && !ME.isAdmin ? "Сначала восстановите лид, чтобы передать его" : "Передать лид другому сотруднику",
														onClick: () => setDialog("transfer"),
														children: [/* @__PURE__ */ jsx(Avatar, {
															initials: owner.initials,
															color: owner.color,
															size: "sm"
														}), /* @__PURE__ */ jsx("span", {
															className: "truncate",
															children: owner.name
														})]
													})
												})]
											}),
											lead.lost && /* @__PURE__ */ jsxs("div", {
												className: "lead-field",
												children: [/* @__PURE__ */ jsx("span", {
													className: "lead-field__label",
													children: "Причина проигрыша"
												}), /* @__PURE__ */ jsx("span", {
													className: "lead-field__value lead-field__text",
													children: lead.lossReason || "—"
												})]
											}),
											/* @__PURE__ */ jsxs("label", {
												className: "lead-field",
												children: [/* @__PURE__ */ jsx("span", {
													className: "lead-field__label",
													children: "Оператор ЭДО"
												}), /* @__PURE__ */ jsx("select", {
													className: "lead-input lead-input--select",
													value: draft.edo,
													onChange: set("edo"),
													"aria-label": "Оператор ЭДО",
													children: EDO_OPERATORS.map((operator) => /* @__PURE__ */ jsx("option", {
														value: operator.value,
														title: operator.vendor,
														children: operator.label
													}, operator.value))
												})]
											}),
											/* @__PURE__ */ jsxs("label", {
												className: "lead-field",
												children: [/* @__PURE__ */ jsx("span", {
													className: "lead-field__label",
													children: "Бухгалтер"
												}), /* @__PURE__ */ jsxs("select", {
													className: "lead-input lead-input--select",
													value: draft.accountant,
													onChange: set("accountant"),
													children: [ACCOUNTANTS.map((person) => /* @__PURE__ */ jsx("option", {
														value: person,
														children: person
													}, person)), /* @__PURE__ */ jsx("option", {
														value: "",
														children: "Не назначен"
													})]
												})]
											})
										]
									})
								]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "card",
								children: [/* @__PURE__ */ jsxs("div", {
									className: "tabbar",
									role: "tablist",
									children: [/* @__PURE__ */ jsxs("button", {
										type: "button",
										role: "tab",
										"aria-selected": tab === "shipments",
										onClick: () => setTab("shipments"),
										children: [
											"Заявки (",
											shipments.length,
											")"
										]
									}), /* @__PURE__ */ jsxs("button", {
										type: "button",
										role: "tab",
										"aria-selected": tab === "files",
										onClick: () => setTab("files"),
										children: [
											"Файлы (",
											FILES.length,
											")"
										]
									})]
								}), /* @__PURE__ */ jsxs("div", {
									className: "card__body",
									children: [tab === "shipments" && (shipments.length === 0 ? /* @__PURE__ */ jsxs("div", {
										className: "empty",
										children: [
											/* @__PURE__ */ jsx("span", {
												className: "empty__icon",
												children: /* @__PURE__ */ jsx(Truck, {
													size: 20,
													strokeWidth: 1.8
												})
											}),
											/* @__PURE__ */ jsx("span", {
												className: "empty__title",
												children: "Заявок пока нет"
											}),
											/* @__PURE__ */ jsx("p", {
												className: "empty__text",
												children: "Создайте первую заявку — она появится здесь и в общем списке."
											}),
											/* @__PURE__ */ jsx(Button, {
												size: "sm",
												variant: "primary",
												icon: Truck,
												onClick: () => setShipmentCreateOpen(true),
												children: "Создать заявку"
											})
										]
									}) : /* @__PURE__ */ jsx("div", {
										className: "stack",
										style: { gap: 8 },
										children: shipments.map((item) => /* @__PURE__ */ jsxs(Link, {
											to: `/shipments/${item.id}`,
											className: "row",
											style: {
												padding: "10px 12px",
												borderRadius: 10,
												background: "var(--surface-2)"
											},
											children: [
												/* @__PURE__ */ jsx(Package, {
													size: 16,
													strokeWidth: 1.9,
													style: { color: "var(--ink-3)" }
												}),
												/* @__PURE__ */ jsx("span", {
													className: "mono",
													style: { fontSize: 12 },
													children: item.number
												}),
												/* @__PURE__ */ jsx("span", {
													className: "truncate",
													style: { fontSize: 12.5 },
													children: item.route
												}),
												/* @__PURE__ */ jsx("span", {
													style: {
														marginLeft: "auto",
														fontWeight: 600,
														fontSize: 12.5
													},
													children: money(item.customerPrice)
												})
											]
										}, item.id))
									})), tab === "files" && /* @__PURE__ */ jsxs("div", {
										className: "stack",
										style: { gap: 8 },
										children: [FILES.map((file) => /* @__PURE__ */ jsxs("div", {
											className: "row",
											style: {
												padding: "9px 12px",
												borderRadius: 10,
												background: "var(--surface-2)"
											},
											children: [
												/* @__PURE__ */ jsx(FileText, {
													size: 16,
													strokeWidth: 1.9,
													style: { color: "var(--ink-3)" }
												}),
												/* @__PURE__ */ jsx("span", {
													style: { fontSize: 12.5 },
													children: file.name
												}),
												/* @__PURE__ */ jsxs("span", {
													className: "muted",
													style: {
														marginLeft: "auto",
														fontSize: 11.5
													},
													children: [
														file.size,
														" · ",
														file.date
													]
												})
											]
										}, file.name)), /* @__PURE__ */ jsx(Button, {
											size: "sm",
											icon: Paperclip,
											variant: "soft",
											children: "Прикрепить файл"
										})]
									})]
								})]
							})
						]
					}), /* @__PURE__ */ jsx(Chatter, {
						entries: chatter,
						authorInitials: ME.initials,
						currentUserId: ME.id
					}, lead.id)]
				}),
				dialog === "lose" && /* @__PURE__ */ jsx(LoseLeadDialog, {
					leadName: lead.name,
					onCancel: () => setDialog(null),
					onConfirm: (reason) => {
						if (dirty && draft.name.trim()) persist(draft);
						loseLead(lead.id, reason);
						setDialog(null);
					}
				}),
				dialog === "transfer" && /* @__PURE__ */ jsx(TransferLeadDialog, {
					leadName: lead.name,
					ownerId: lead.ownerId,
					leadIsLost: lead.lost,
					onCancel: () => setDialog(null),
					onConfirm: (userId) => {
						if (dirty && draft.name.trim()) persist(draft);
						transferLead(lead.id, userId);
						setDialog(null);
						if (!ME.isAdmin) navigate("/crm");
					}
				}),
				dialog === "delete" && /* @__PURE__ */ jsx(DeleteLeadDialog, {
					leadName: lead.name,
					onCancel: () => setDialog(null),
					onConfirm: () => {
						setDialog(null);
						deleteLead(lead.id);
						navigate("/crm");
					}
				}),
				shipmentCreateOpen && /* @__PURE__ */ jsx(QuickCreateShipmentDialog, {
					lead,
					onCreate: addShipment,
					onClose: () => setShipmentCreateOpen(false)
				}),
				toast && /* @__PURE__ */ jsx(Toast, {
					message: toast.text,
					tone: toast.tone,
					onClose: dismissToast
				})
			]
		})
	});
}
// src/ui/States.jsx
/** Пустое состояние: иконка, заголовок, пояснение, действие. */
function Empty({ icon: Icon = Inbox, title, text, action }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "empty",
		children: [
			/* @__PURE__ */ jsx("span", {
				className: "empty__icon",
				children: /* @__PURE__ */ jsx(Icon, {
					size: 19,
					strokeWidth: 1.7
				})
			}),
			title && /* @__PURE__ */ jsx("span", {
				className: "empty__title",
				children: title
			}),
			text && /* @__PURE__ */ jsx("p", {
				className: "empty__text",
				children: text
			}),
			action
		]
	});
}
/** Скелетон загрузки. */
function Skeleton({ width = "100%", height = 12, radius = 4, style }) {
	return /* @__PURE__ */ jsx("span", {
		className: "skeleton",
		style: {
			display: "block",
			width,
			height,
			borderRadius: radius,
			...style
		}
	});
}
/** Скелетон таблицы: серые строки той же геометрии. */
function TableSkeleton({ rows = 5, cols = 5 }) {
	return /* @__PURE__ */ jsx("div", {
		className: "skeleton-table",
		"aria-hidden": "true",
		children: Array.from({ length: rows }).map((_, rowIndex) => /* @__PURE__ */ jsx("div", {
			className: "skeleton-table__row",
			children: Array.from({ length: cols }).map((__, colIndex) => /* @__PURE__ */ jsx("span", {
				className: "skeleton",
				style: {
					height: 11,
					width: colIndex === 0 ? "70%" : "85%"
				}
			}, colIndex))
		}, rowIndex))
	});
}
// src/ui/ShowMore.jsx
/**
* Догрузка длинного списка — «Показать ещё N из M», как в рабочей CRM.
* Пока подгружается следующая порция, кнопка пишет «Загрузка…».
*/
function ShowMore({ shown, total, step, onMore, loading = false }) {
	if (shown >= total) return null;
	const next = Math.min(step, total - shown);
	return /* @__PURE__ */ jsx("div", {
		className: "show-more",
		children: /* @__PURE__ */ jsx("button", {
			type: "button",
			className: "btn btn--sm",
			disabled: loading,
			onClick: onMore,
			children: loading ? "Загрузка…" : `Показать ещё ${next} из ${total}`
		})
	});
}
// src/pages/ClientsPage.jsx
/**
* Клиенты компании: поиск и сегменты «Все / Мои / Проигранные»; вид —
* плитки, как в рабочей CRM (`CustomerTile`), или таблица.
* Свои лиды открываются по клику, активные лиды коллег закрыты замком
* (администратору открыты все). «Все» и «Мои» — активные лиды; проигранные
* живут в своём сегменте, их может открыть и забрать себе любой сотрудник.
*/
var PAGE_SIZE$1 = 24;
var VIEW_KEY = "crm.customers.view";
/** Две буквы названия без формы собственности: «ООО «Гринлайн»» → «ГР». */
function monogram(name = "") {
	return name.replace(/^(ООО|АО|ПАО|ЗАО|ИП|ГК)\s+/i, "").replace(/[«»"']/g, "").trim().slice(0, 2).toUpperCase() || "—";
}
/** Плитка клиента: монограмма, название, ИНН, этап или проигрыш, продавец. */
function ClientTile({ client, tags, locked, onOpen }) {
	const owner = client.ownerId ? OWNER(client.ownerId) : null;
	return /* @__PURE__ */ jsxs(locked ? "div" : "button", {
		...locked ? {} : {
			type: "button",
			onClick: onOpen
		},
		className: `client-tile${locked ? " client-tile--locked" : ""}${client.lost ? " client-tile--lost" : ""}`,
		title: locked ? "Активный лид коллеги — доступны только название, ИНН и продавец" : void 0,
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "client-tile__head",
				children: [
					/* @__PURE__ */ jsx("span", {
						className: "client-tile__mark",
						children: monogram(client.name)
					}),
					/* @__PURE__ */ jsxs("span", {
						className: "client-tile__title",
						children: [/* @__PURE__ */ jsx("span", {
							className: "client-tile__name",
							children: client.name
						}), /* @__PURE__ */ jsxs("span", {
							className: "client-tile__inn mono",
							children: ["ИНН ", client.inn || "—"]
						})]
					}),
					locked && /* @__PURE__ */ jsx(Lock, {
						size: 14,
						strokeWidth: 2,
						className: "client-tile__lock",
						"aria-label": "Лид коллеги"
					})
				]
			}),
			client.lost ? /* @__PURE__ */ jsxs("span", {
				className: "client-tile__lost",
				children: [/* @__PURE__ */ jsx("span", {
					className: "status client-tile__lost-chip",
					children: "Проигрыш"
				}), /* @__PURE__ */ jsx("span", {
					className: "client-tile__reason",
					children: client.lossReason || "без причины"
				})]
			}) : !locked && /* @__PURE__ */ jsx("span", {
				className: "client-tile__stage",
				children: client.stageName
			}),
			!locked && (client.tagIds?.length > 0 || client.priority > 0) && /* @__PURE__ */ jsxs("div", {
				className: "client-tile__meta",
				children: [/* @__PURE__ */ jsx(TagList, {
					ids: client.tagIds,
					tags
				}), client.priority > 0 && /* @__PURE__ */ jsx(StarRating, {
					value: client.priority,
					size: "sm"
				})]
			}),
			/* @__PURE__ */ jsx("div", {
				className: "client-tile__owner",
				children: owner ? /* @__PURE__ */ jsxs(Fragment$1, { children: [/* @__PURE__ */ jsx(Avatar, {
					initials: owner.initials,
					color: owner.color,
					className: "avatar--xs"
				}), owner.name] }) : /* @__PURE__ */ jsx("span", {
					className: "muted",
					children: "Не назначен"
				})
			})
		]
	});
}
function ClientsPage() {
	const navigate = useNavigate();
	const { leads, stages, shipments, tags } = useLeads();
	const clients = useMemo(() => leads.map((lead) => ({
		...lead,
		stageName: stages.find((stage) => stage.id === lead.stageId)?.name ?? "Без этапа"
	})), [leads, stages]);
	const active = clients.filter((client) => !client.lost);
	const segments = [
		{
			value: "all",
			label: "Все",
			count: active.length
		},
		{
			value: "mine",
			label: "Мои",
			count: active.filter((client) => client.ownerId === ME.id).length
		},
		{
			value: "lost",
			label: "Проигранные",
			count: clients.length - active.length
		}
	];
	const [segment, setSegment] = useState("all");
	const [search, setSearch] = useState("");
	const [loading, setLoading] = useState(true);
	const [limit, setLimit] = useState(PAGE_SIZE$1);
	const [view, setView] = useState(() => {
		try {
			return window.localStorage.getItem(VIEW_KEY) ?? "tiles";
		} catch {
			return "tiles";
		}
	});
	function switchView(next) {
		setView(next);
		try {
			window.localStorage.setItem(VIEW_KEY, next);
		} catch {}
	}
	useEffect(() => setLimit(PAGE_SIZE$1), [segment, search]);
	useEffect(() => {
		const timer = window.setTimeout(() => setLoading(false), 260);
		return () => window.clearTimeout(timer);
	}, []);
	const rows = useMemo(() => {
		const query = search.trim().toLowerCase();
		return clients.filter((client) => {
			if (segment === "lost" !== Boolean(client.lost)) return false;
			if (segment === "mine" && client.ownerId !== ME.id) return false;
			if (!query) return true;
			return [
				client.name,
				client.inn,
				client.contact,
				client.city,
				client.route,
				client.cargo
			].join(" ").toLowerCase().includes(query);
		});
	}, [
		clients,
		segment,
		search
	]);
	const shown = rows.slice(0, limit);
	const isLocked = (client) => client.ownerId !== ME.id && !client.lost && !ME.isAdmin;
	return /* @__PURE__ */ jsxs(Shell, {
		search,
		onSearch: setSearch,
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "toolbar",
				children: [segments.map((item) => /* @__PURE__ */ jsxs("button", {
					type: "button",
					className: "chip",
					"aria-pressed": segment === item.value,
					onClick: () => setSegment(item.value),
					children: [item.label, /* @__PURE__ */ jsx("span", {
						className: "chip__count",
						children: item.count
					})]
				}, item.value)), /* @__PURE__ */ jsxs("div", {
					className: "toolbar__right",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "search",
						style: { width: 280 },
						children: [/* @__PURE__ */ jsx(Search, {
							size: 15,
							strokeWidth: 2
						}), /* @__PURE__ */ jsx("input", {
							type: "search",
							placeholder: "Компания, ИНН, контакт, город",
							value: search,
							onChange: (event) => setSearch(event.target.value)
						})]
					}), /* @__PURE__ */ jsxs("div", {
						className: "view-switch",
						role: "group",
						"aria-label": "Вид списка клиентов",
						children: [/* @__PURE__ */ jsx("button", {
							type: "button",
							"aria-pressed": view === "tiles",
							onClick: () => switchView("tiles"),
							title: "Плитки",
							children: /* @__PURE__ */ jsx(LayoutGrid, {
								size: 15,
								strokeWidth: 1.9
							})
						}), /* @__PURE__ */ jsx("button", {
							type: "button",
							"aria-pressed": view === "table",
							onClick: () => switchView("table"),
							title: "Таблица",
							children: /* @__PURE__ */ jsx(List, {
								size: 15,
								strokeWidth: 1.9
							})
						})]
					})]
				})]
			}),
			view === "tiles" && /* @__PURE__ */ jsxs("div", {
				className: "client-tiles-wrap",
				children: [loading ? /* @__PURE__ */ jsx("div", {
					className: "client-tiles",
					children: Array.from({ length: 8 }, (_, index) => /* @__PURE__ */ jsx("div", { className: "client-tile client-tile--skeleton skeleton" }, index))
				}) : /* @__PURE__ */ jsx("div", {
					className: "client-tiles",
					children: shown.map((client) => /* @__PURE__ */ jsx(ClientTile, {
						client,
						tags,
						locked: isLocked(client),
						onOpen: () => navigate(`/crm/leads/${client.id}`)
					}, client.id))
				}), !loading && /* @__PURE__ */ jsx(ShowMore, {
					shown: shown.length,
					total: rows.length,
					step: PAGE_SIZE$1,
					onMore: () => setLimit((n) => n + PAGE_SIZE$1)
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "table-wrap",
				hidden: view !== "table",
				children: [/* @__PURE__ */ jsxs("table", {
					className: "table",
					children: [/* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
						/* @__PURE__ */ jsx("th", { children: "Компания" }),
						/* @__PURE__ */ jsx("th", { children: "Контакт" }),
						/* @__PURE__ */ jsx("th", { children: "Направление" }),
						/* @__PURE__ */ jsx("th", { children: "Этап" }),
						/* @__PURE__ */ jsx("th", { children: "Менеджер" }),
						/* @__PURE__ */ jsx("th", {
							style: { textAlign: "right" },
							children: "Маржа"
						}),
						/* @__PURE__ */ jsx("th", { children: "Создан" })
					] }) }), /* @__PURE__ */ jsxs("tbody", { children: [loading && /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx("td", {
						colSpan: 7,
						style: { padding: 0 },
						children: /* @__PURE__ */ jsx(TableSkeleton, {
							rows: 6,
							cols: 6
						})
					}) }), !loading && shown.map((client) => {
						const owner = OWNER(client.ownerId);
						const locked = isLocked(client);
						return /* @__PURE__ */ jsxs("tr", {
							style: {
								cursor: locked ? "default" : "pointer",
								opacity: locked ? .72 : 1
							},
							title: locked ? "Активный лид коллеги — доступны только название, ИНН и продавец" : void 0,
							onClick: () => !locked && navigate(`/crm/leads/${client.id}`),
							children: [
								/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsxs("div", {
									className: "cell-company",
									children: [/* @__PURE__ */ jsx("span", {
										className: "cell-logo",
										children: locked ? /* @__PURE__ */ jsx(Lock, {
											size: 14,
											strokeWidth: 1.9
										}) : /* @__PURE__ */ jsx(Building2, {
											size: 16,
											strokeWidth: 1.9
										})
									}), /* @__PURE__ */ jsxs("div", {
										style: { minWidth: 0 },
										children: [/* @__PURE__ */ jsx("div", {
											className: "cell-company__name",
											children: client.name
										}), /* @__PURE__ */ jsxs("div", {
											className: "cell-company__sub",
											children: [client.city, locked ? " · лид коллеги" : client.lost && client.ownerId !== ME.id ? " · можно взять себе" : ""]
										})]
									})]
								}) }),
								/* @__PURE__ */ jsxs("td", { children: [/* @__PURE__ */ jsx("div", {
									className: "cell-main",
									children: client.contact
								}), /* @__PURE__ */ jsx("div", {
									className: "cell-sub mono",
									children: client.phone
								})] }),
								/* @__PURE__ */ jsxs("td", { children: [/* @__PURE__ */ jsx("div", {
									className: "cell-main",
									children: client.route
								}), /* @__PURE__ */ jsxs("div", {
									className: "cell-sub",
									children: [
										client.cargo,
										" · ",
										client.weight
									]
								})] }),
								/* @__PURE__ */ jsx("td", { children: client.lost ? /* @__PURE__ */ jsxs("span", {
									className: "status",
									style: {
										background: "var(--danger-soft)",
										color: "var(--danger)"
									},
									title: "Причина проигрыша",
									children: ["Проигрыш · ", client.lossReason || "без причины"]
								}) : /* @__PURE__ */ jsx("span", {
									className: "status status--progress",
									style: {
										background: "var(--surface-3)",
										color: "var(--ink-2)"
									},
									children: client.stageName
								}) }),
								/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsxs("div", {
									className: "row",
									style: { gap: 8 },
									children: [/* @__PURE__ */ jsx(Avatar, {
										initials: owner.initials,
										color: owner.color,
										size: "sm"
									}), /* @__PURE__ */ jsx("span", {
										style: { fontSize: 12.5 },
										children: owner.name.split(" ")[0]
									})]
								}) }),
								/* @__PURE__ */ jsx("td", {
									className: "cell-money",
									children: money(leadShipmentMargin(client.id, shipments))
								}),
								/* @__PURE__ */ jsx("td", {
									className: "cell-sub",
									children: client.created
								})
							]
						}, client.id);
					})] })]
				}), !loading && /* @__PURE__ */ jsx(ShowMore, {
					shown: shown.length,
					total: rows.length,
					step: PAGE_SIZE$1,
					onMore: () => setLimit((n) => n + PAGE_SIZE$1)
				})]
			}),
			!loading && rows.length === 0 && /* @__PURE__ */ jsx("div", {
				className: "table-wrap",
				children: /* @__PURE__ */ jsxs("div", {
					className: "empty",
					children: [
						/* @__PURE__ */ jsx("span", {
							className: "empty__icon",
							children: /* @__PURE__ */ jsx(Building2, {
								size: 20,
								strokeWidth: 1.8
							})
						}),
						/* @__PURE__ */ jsx("span", {
							className: "empty__title",
							children: segment === "lost" ? "Проигранных клиентов нет" : "Ничего не найдено"
						}),
						/* @__PURE__ */ jsx("p", {
							className: "empty__text",
							children: segment === "lost" ? "Когда лид проигран, он останется здесь — с причиной и историей." : "Попробуйте изменить запрос или сбросить фильтр."
						})
					]
				})
			})
		]
	});
}
// src/pages/ShipmentsPage.jsx
/**
* Заявки: таблица как в рабочей CRM — Номер, Дата создания, Продавец, Клиент,
* Перевозчик, Статус, Маржа, Всего — и строка «Итого» по текущему отбору.
* Поиск — в верхней строке, фильтр — чипы статусов. Менеджер видит свои
* заявки; администратор — все, и может оставить заявки одного сотрудника
* (`?employee=N`, плашка «Заявки сотрудника»). Список догружается кнопкой
* «Показать ещё N из M».
*/
var FILTERS = [
	{
		value: "all",
		label: "Все"
	},
	{
		value: "new",
		label: "Новые"
	},
	{
		value: "checked",
		label: "Проверены"
	},
	{
		value: "loaded",
		label: "Загружены"
	},
	{
		value: "unloaded",
		label: "Выгружены"
	}
];
var signedMoney$1 = (value) => value == null ? "—" : `${value >= 0 ? "" : "−"}${money(Math.abs(value))}`;
function ShipmentsPage() {
	const navigate = useNavigate();
	const { shipments } = useLeads();
	const [params, setParams] = useSearchParams();
	const [filter, setFilter] = useState("all");
	const [search, setSearch] = useState("");
	const [limit, setLimit] = useState(20);
	const [loading, setLoading] = useState(true);
	const employeeParam = Number(params.get("employee"));
	const employee = ME.isAdmin && employeeParam ? TEAM.find((user) => user.id === employeeParam) : null;
	useEffect(() => {
		const timer = window.setTimeout(() => setLoading(false), 260);
		return () => window.clearTimeout(timer);
	}, []);
	useEffect(() => setLimit(20), [
		filter,
		search,
		employee?.id
	]);
	const scoped = useMemo(() => {
		const q = search.trim().toLowerCase();
		return shipments.filter((item) => employee ? item.ownerId === employee.id : ME.isAdmin || item.ownerId === ME.id).filter((item) => !q || [
			item.number,
			item.client,
			item.carrierName,
			item.route
		].join(" ").toLowerCase().includes(q)).sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
	}, [
		shipments,
		employee,
		search
	]);
	const rows = scoped.filter((item) => filter === "all" || item.status === filter);
	const shown = rows.slice(0, limit);
	const totalMargin = rows.reduce((sum, item) => sum + (shipmentMargin(item) ?? 0), 0);
	const totalCustomer = rows.reduce((sum, item) => sum + (Number(item.customerPrice) || 0), 0);
	function setEmployee(userId) {
		const next = new URLSearchParams(params);
		if (userId) next.set("employee", String(userId));
		else next.delete("employee");
		setParams(next);
	}
	return /* @__PURE__ */ jsxs(Shell, {
		search,
		onSearch: setSearch,
		searchSuggestions: /* @__PURE__ */ jsx(EmployeeSuggestions, {
			query: search,
			excludeUserId: employee?.id,
			actionLabel: "показать заявки",
			onPick: (userId) => {
				setSearch("");
				setEmployee(userId);
			}
		}),
		children: [
			employee && /* @__PURE__ */ jsxs("div", {
				className: "board-banner",
				role: "status",
				children: [
					/* @__PURE__ */ jsx(Avatar, {
						initials: employee.initials,
						color: employee.color
					}),
					/* @__PURE__ */ jsxs("span", { children: ["Заявки сотрудника: ", /* @__PURE__ */ jsx("b", { children: employee.name })] }),
					/* @__PURE__ */ jsxs("button", {
						type: "button",
						className: "board-banner__leave",
						onClick: () => setEmployee(null),
						children: [/* @__PURE__ */ jsx(X, {
							size: 13,
							strokeWidth: 2.2
						}), "Показать все"]
					})
				]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "toolbar",
				children: [FILTERS.map((item) => {
					const count = item.value === "all" ? scoped.length : scoped.filter((s) => s.status === item.value).length;
					return /* @__PURE__ */ jsxs("button", {
						type: "button",
						className: "chip",
						"aria-pressed": filter === item.value,
						onClick: () => setFilter(item.value),
						children: [item.label, /* @__PURE__ */ jsx("span", {
							className: "chip__count",
							children: count
						})]
					}, item.value);
				}), /* @__PURE__ */ jsx("div", {
					className: "toolbar__right",
					children: ME.isAdmin ? /* @__PURE__ */ jsxs("label", {
						className: "board-picker",
						children: [/* @__PURE__ */ jsx("span", {
							className: "board-picker__label",
							children: "Сотрудник"
						}), /* @__PURE__ */ jsxs("select", {
							className: "board-picker__select",
							value: employee?.id ?? "",
							onChange: (event) => setEmployee(Number(event.target.value) || null),
							"aria-label": "Чьи заявки показать",
							children: [/* @__PURE__ */ jsx("option", {
								value: "",
								children: "Все сотрудники"
							}), TEAM.map((user) => /* @__PURE__ */ jsx("option", {
								value: user.id,
								children: user.name
							}, user.id))]
						})]
					}) : /* @__PURE__ */ jsx("span", {
						className: "muted",
						style: { fontSize: 11.5 },
						children: "Только мои заявки"
					})
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "table-wrap",
				children: [
					/* @__PURE__ */ jsxs("table", {
						className: "table shipments-table",
						children: [
							/* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
								/* @__PURE__ */ jsx("th", { children: "Номер" }),
								/* @__PURE__ */ jsx("th", { children: "Дата создания" }),
								/* @__PURE__ */ jsx("th", { children: "Продавец" }),
								/* @__PURE__ */ jsx("th", { children: "Клиент" }),
								/* @__PURE__ */ jsx("th", { children: "Перевозчик" }),
								/* @__PURE__ */ jsx("th", { children: "Статус" }),
								/* @__PURE__ */ jsx("th", {
									style: { textAlign: "right" },
									children: "Маржа"
								}),
								/* @__PURE__ */ jsx("th", {
									style: { textAlign: "right" },
									children: "Всего"
								})
							] }) }),
							/* @__PURE__ */ jsxs("tbody", { children: [loading && /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx("td", {
								colSpan: 8,
								style: { padding: 0 },
								children: /* @__PURE__ */ jsx(TableSkeleton, {
									rows: 5,
									cols: 8
								})
							}) }), !loading && shown.map((item) => {
								const margin = shipmentMargin(item);
								const seller = OWNER(item.ownerId);
								return /* @__PURE__ */ jsxs("tr", {
									style: { cursor: "pointer" },
									onClick: () => navigate(`/shipments/${item.id}`),
									children: [
										/* @__PURE__ */ jsx("td", {
											className: "mono",
											style: { fontSize: 12 },
											children: /* @__PURE__ */ jsx(Link, {
												to: `/shipments/${item.id}`,
												className: "table-link",
												onClick: (event) => event.stopPropagation(),
												children: item.number
											})
										}),
										/* @__PURE__ */ jsx("td", {
											className: "cell-sub mono",
											children: formatShipmentDate(item.createdAt)
										}),
										/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsxs("span", {
											className: "seller-cell",
											children: [/* @__PURE__ */ jsx(Avatar, {
												initials: seller.initials,
												color: seller.color,
												className: "avatar--square"
											}), seller.name]
										}) }),
										/* @__PURE__ */ jsxs("td", { children: [/* @__PURE__ */ jsx("div", {
											className: "cell-main",
											children: item.client
										}), /* @__PURE__ */ jsx("div", {
											className: "cell-sub",
											children: item.route
										})] }),
										/* @__PURE__ */ jsx("td", {
											className: "cell-sub",
											children: item.carrierName || "—"
										}),
										/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("span", {
											className: `status status--${SHIPMENT_STATUS[item.status].tone}`,
											children: SHIPMENT_STATUS[item.status].label
										}) }),
										/* @__PURE__ */ jsx("td", {
											className: `cell-money ${margin == null || margin >= 0 ? "cell-money--plus" : "cell-money--minus"}`,
											children: signedMoney$1(margin)
										}),
										/* @__PURE__ */ jsx("td", {
											className: "cell-money",
											children: money(item.customerPrice)
										})
									]
								}, item.id);
							})] }),
							!loading && rows.length > 0 && /* @__PURE__ */ jsx("tfoot", { children: /* @__PURE__ */ jsxs("tr", {
								className: "table-total",
								children: [
									/* @__PURE__ */ jsxs("td", {
										colSpan: 6,
										children: ["Итого · ", rows.length]
									}),
									/* @__PURE__ */ jsx("td", {
										className: `cell-money ${totalMargin >= 0 ? "cell-money--plus" : "cell-money--minus"}`,
										children: signedMoney$1(totalMargin)
									}),
									/* @__PURE__ */ jsx("td", {
										className: "cell-money",
										children: money(totalCustomer)
									})
								]
							}) })
						]
					}),
					!loading && /* @__PURE__ */ jsx(ShowMore, {
						shown: shown.length,
						total: rows.length,
						step: 20,
						onMore: () => setLimit((n) => n + 20)
					}),
					!loading && rows.length === 0 && /* @__PURE__ */ jsxs("div", {
						className: "empty",
						children: [
							/* @__PURE__ */ jsx("span", {
								className: "empty__icon",
								children: /* @__PURE__ */ jsx(Package, {
									size: 20,
									strokeWidth: 1.8
								})
							}),
							/* @__PURE__ */ jsx("span", {
								className: "empty__title",
								children: search ? "Ничего не найдено" : "Заявок нет"
							}),
							/* @__PURE__ */ jsx("p", {
								className: "empty__text",
								children: search ? "Попробуйте изменить запрос: ищем по номеру, клиенту, перевозчику и маршруту." : "Выберите другой статус или создайте новую заявку из карточки лида."
							})
						]
					})
				]
			})
		]
	});
}
// src/ui/TokenField.jsx
/**
* Поле-список значений чипами: города погрузки, тип кузова, способ погрузки.
* Enter или запятая добавляют значение, Backspace в пустом поле убирает
* последнее, крестик — конкретное. Как `TokenField` рабочей CRM.
*/
function TokenField({ value = [], onChange, placeholder, label, disabled = false }) {
	const [text, setText] = useState("");
	function add() {
		const next = text.trim().replace(/,$/, "").trim();
		if (next && !value.some((item) => item.toLowerCase() === next.toLowerCase())) onChange([...value, next]);
		setText("");
	}
	return /* @__PURE__ */ jsxs("div", {
		className: `token-field${disabled ? " is-disabled" : ""}`,
		children: [value.map((item) => /* @__PURE__ */ jsxs("span", {
			className: "token",
			children: [item, !disabled && /* @__PURE__ */ jsx("button", {
				type: "button",
				className: "token__remove",
				"aria-label": `Убрать «${item}»`,
				onClick: () => onChange(value.filter((v) => v !== item)),
				children: /* @__PURE__ */ jsx(X, {
					size: 11,
					strokeWidth: 2.4
				})
			})]
		}, item)), !disabled && /* @__PURE__ */ jsx("input", {
			className: "token-field__input",
			value: text,
			"aria-label": label,
			placeholder: value.length ? "" : placeholder,
			onChange: (event) => setText(event.target.value),
			onKeyDown: (event) => {
				if (event.key === "Enter" || event.key === ",") {
					event.preventDefault();
					event.stopPropagation();
					add();
				} else if (event.key === "Backspace" && !text && value.length) onChange(value.slice(0, -1));
			},
			onBlur: add
		})]
	});
}
// src/pages/ShipmentPage.jsx
/**
* Карточка заявки — полная форма по образцу рабочей CRM (`ShipmentFormPage`):
* шапка с номером, статусы, блоки «Заявка», «Погрузка», «Выгрузка»,
* «Перевозчик», «Груз», вкладки «Позиции заказа» и «Прочая информация»,
* лента справа. Правки копятся в черновике и сохраняются сами через
* 3 секунды, по Enter или кнопкой; статус меняется сразу.
* «Копировать» создаёт новую заявку, «Удалить» — только администратор.
*/
/** Всё, что редактируется формой; статус меняется отдельно и сразу. */
function draftOf(shipment) {
	if (!shipment) return {};
	const { id: _id, status: _status, route: _route, ...rest } = shipment;
	return rest;
}
var signedMoney = (value) => value == null ? "—" : `${value >= 0 ? "+" : "−"} ${money(Math.abs(value))}`;
var innLooksWrong = (value) => Boolean(value) && !/^(\d{10}|\d{12})$/.test(value);
/** Строка поля: подпись слева, значение справа — те же классы, что в карточке лида. */
function Row({ label, htmlFor, top = false, children }) {
	return /* @__PURE__ */ jsxs("div", {
		className: `lead-field${top ? " lead-field--top" : ""}`,
		children: [/* @__PURE__ */ jsx("label", {
			className: "lead-field__label",
			htmlFor,
			children: label
		}), children]
	});
}
function Group({ title, children, extra }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "card ship-group",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "card__head",
			children: [/* @__PURE__ */ jsx("div", {
				className: "card__title",
				children: title
			}), extra]
		}), /* @__PURE__ */ jsx("div", {
			className: "card__body lead-form",
			children
		})]
	});
}
function DeleteShipmentDialog({ number, onCancel, onConfirm }) {
	return /* @__PURE__ */ jsxs(Modal, {
		open: true,
		title: "Удалить заявку безвозвратно?",
		onClose: onCancel,
		footer: /* @__PURE__ */ jsxs(Fragment$1, { children: [/* @__PURE__ */ jsx(Button, {
			variant: "ghost",
			onClick: onCancel,
			children: "Отмена"
		}), /* @__PURE__ */ jsx(Button, {
			variant: "danger",
			onClick: onConfirm,
			children: "Удалить навсегда"
		})] }),
		children: [/* @__PURE__ */ jsxs("p", {
			className: "modal-copy",
			children: [
				"Заявка №",
				number,
				", её история и документы будут удалены навсегда. Связанный лид и остальные его заявки останутся. Если в форме есть несохранённые правки, они тоже будут потеряны."
			]
		}), /* @__PURE__ */ jsx("p", {
			className: "modal-copy muted",
			children: "В системном журнале останется запись о факте удаления."
		})]
	});
}
function ShipmentPage() {
	const { id } = useParams();
	const navigate = useNavigate();
	const { shipments, leads, updateShipment, copyShipment, deleteShipment } = useLeads();
	const shipment = shipments.find((item) => item.id === Number(id));
	const lead = leads.find((item) => item.id === shipment?.leadId);
	const [draft, setDraft] = useState(() => draftOf(shipment));
	const [saved, setSaved] = useState(() => draftOf(shipment));
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const [tab, setTab] = useState("lines");
	const [moreCarrier, setMoreCarrier] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const chatter = useMemo(() => shipmentChatter(shipment), [shipment?.id]);
	useEffect(() => {
		const next = draftOf(shipment);
		setDraft(next);
		setSaved(next);
		setError("");
	}, [shipment?.id]);
	const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
	const persist = (next = draft) => {
		if (!String(next.number ?? "").trim()) {
			setError("Номер заявки не может быть пустым");
			return;
		}
		setError("");
		updateShipment(shipment.id, {
			...next,
			number: next.number.trim()
		});
		setSaved(next);
		setSaving(true);
		window.setTimeout(() => setSaving(false), 350);
	};
	const discard = () => {
		setDraft(saved);
		setError("");
	};
	useEffect(() => {
		if (!shipment || !dirty || deleteOpen) return void 0;
		const timer = window.setTimeout(() => persist(draft), 3e3);
		return () => window.clearTimeout(timer);
	}, [
		draft,
		dirty,
		deleteOpen,
		shipment?.id
	]);
	const latest = useRef(null);
	latest.current = {
		id: shipment?.id,
		dirty,
		draft,
		update: updateShipment,
		deleted: false
	};
	useEffect(() => () => {
		const state = latest.current;
		if (state?.dirty && !state.deleted && String(state.draft.number ?? "").trim()) state.update(state.id, state.draft);
	}, []);
	if (!shipment) return /* @__PURE__ */ jsx(Shell, {
		title: "Карточка заявки",
		children: /* @__PURE__ */ jsxs("div", {
			className: "card",
			style: {
				padding: 40,
				textAlign: "center"
			},
			children: [/* @__PURE__ */ jsx("h2", {
				style: { marginBottom: 8 },
				children: "Заявка не найдена"
			}), /* @__PURE__ */ jsx(Link, {
				to: "/shipments",
				className: "btn",
				children: "К списку заявок"
			})]
		})
	});
	const owner = OWNER(shipment.ownerId);
	const margin = shipmentMargin({
		customerPrice: draft.customerPrice,
		carrierPrice: draft.carrierPrice
	});
	const customerNet = netAmount(draft.customerPrice, draft.customerTax);
	const carrierNet = netAmount(draft.carrierPrice, draft.carrierTax);
	const set = (key) => (event) => setDraft((prev) => ({
		...prev,
		[key]: event.target.value
	}));
	const setValue = (key) => (value) => setDraft((prev) => ({
		...prev,
		[key]: value
	}));
	const setPrice = (key) => (event) => {
		const raw = event.target.value.trim();
		setDraft((prev) => ({
			...prev,
			[key]: raw === "" ? null : Number(raw)
		}));
	};
	/**
	* Enter — сохранить, Esc — вернуть сохранённое. Только в однострочных полях:
	* в комментарии Enter — перенос строки, на кнопках и галочках — их действие.
	*/
	function onFieldKeyDown(event) {
		const { tagName, type } = event.target;
		if (tagName !== "INPUT" || type === "checkbox") return;
		if (event.key === "Enter") {
			event.preventDefault();
			if (dirty) persist(draft);
			event.target.blur?.();
		} else if (event.key === "Escape") {
			event.preventDefault();
			discard();
			event.target.blur?.();
		}
	}
	function copy() {
		if (dirty) persist(draft);
		const created = copyShipment(shipment.id, dirty ? draft : null);
		if (created) navigate(`/shipments/${created.id}`);
	}
	function removeForever() {
		latest.current.deleted = true;
		setDeleteOpen(false);
		deleteShipment(shipment.id);
		navigate("/shipments");
	}
	const input = (key, props = {}) => /* @__PURE__ */ jsx("input", {
		id: `ship-${key}`,
		className: "lead-input",
		value: draft[key] ?? "",
		onChange: set(key),
		autoComplete: "off",
		...props
	});
	return /* @__PURE__ */ jsxs(Shell, {
		title: "Карточка заявки",
		crumb: `Заявки · ${draft.number || shipment.number}`,
		children: [/* @__PURE__ */ jsxs("div", {
			className: "lead-page",
			children: [
				/* @__PURE__ */ jsxs(Link, {
					to: "/shipments",
					className: "back-link",
					children: [/* @__PURE__ */ jsx(ArrowLeft, {
						size: 14,
						strokeWidth: 2
					}), "К списку заявок"]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "lead-head",
					children: [
						/* @__PURE__ */ jsx("span", {
							className: "lead-head__logo",
							children: /* @__PURE__ */ jsx(Truck, {
								size: 24,
								strokeWidth: 1.8
							})
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "grow",
							children: [/* @__PURE__ */ jsx("h1", {
								className: "lead-head__title",
								children: /* @__PURE__ */ jsx("input", {
									className: "lead-title-input",
									value: draft.number ?? "",
									onChange: set("number"),
									onKeyDown: onFieldKeyDown,
									"aria-label": "Номер заявки",
									placeholder: "Номер заявки",
									autoComplete: "off"
								})
							}), /* @__PURE__ */ jsxs("div", {
								className: "lead-head__meta",
								children: [
									/* @__PURE__ */ jsx(Status, {
										tone: SHIPMENT_STATUS[shipment.status].tone,
										children: SHIPMENT_STATUS[shipment.status].label
									}),
									/* @__PURE__ */ jsx("span", { children: shipment.client }),
									/* @__PURE__ */ jsx("span", { children: "·" }),
									/* @__PURE__ */ jsx("span", {
										className: "mono",
										children: formatShipmentDate(draft.createdAt)
									}),
									/* @__PURE__ */ jsx("span", { children: "·" }),
									/* @__PURE__ */ jsxs("span", {
										className: margin == null || margin >= 0 ? "money-plus" : "money-minus",
										children: ["Маржа ", signedMoney(margin)]
									})
								]
							})]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "lead-head__actions",
							children: [
								saving ? /* @__PURE__ */ jsx("span", {
									className: "lead-save__state lead-save__state--saving",
									children: "Сохранение…"
								}) : dirty ? /* @__PURE__ */ jsxs("div", {
									className: "lead-save",
									children: [
										/* @__PURE__ */ jsx("span", {
											className: "lead-save__state",
											children: "Изменено"
										}),
										/* @__PURE__ */ jsx(Button, {
											size: "sm",
											variant: "ghost",
											onClick: discard,
											children: "Отменить"
										}),
										/* @__PURE__ */ jsx(Button, {
											size: "sm",
											variant: "primary",
											icon: Check,
											onClick: () => persist(draft),
											children: "Сохранить"
										})
									]
								}) : /* @__PURE__ */ jsxs("span", {
									className: "lead-save__ok",
									children: [/* @__PURE__ */ jsx(Check, {
										size: 13,
										strokeWidth: 2.2
									}), " Сохранено"]
								}),
								lead && /* @__PURE__ */ jsxs(Link, {
									to: `/crm/leads/${lead.id}`,
									className: "btn btn--sm",
									children: [/* @__PURE__ */ jsx(FileText, {
										size: 14,
										strokeWidth: 2
									}), "Открыть лид"]
								}),
								/* @__PURE__ */ jsx(Button, {
									size: "sm",
									icon: Copy,
									onClick: copy,
									title: "Создать новую заявку на основе этой",
									children: "Копировать"
								}),
								ME.isAdmin && /* @__PURE__ */ jsx(Button, {
									size: "sm",
									variant: "danger",
									icon: Trash2,
									onClick: () => setDeleteOpen(true),
									title: "Безвозвратно удалить заявку",
									children: "Удалить"
								})
							]
						})
					]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "lead-layout",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "stack",
						children: [
							/* @__PURE__ */ jsx("div", {
								className: "lead-stagebar",
								children: /* @__PURE__ */ jsx(StageBar, {
									stages: SHIPMENT_STEPS,
									currentId: shipment.status,
									onSelect: (status) => updateShipment(shipment.id, { status })
								})
							}),
							error && /* @__PURE__ */ jsx("div", {
								className: "record-alert record-alert--danger",
								role: "alert",
								children: error
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "ship-grid",
								onKeyDown: onFieldKeyDown,
								children: [
									/* @__PURE__ */ jsxs(Group, {
										title: "Заявка",
										children: [
											/* @__PURE__ */ jsx(Row, {
												label: "Компания",
												children: /* @__PURE__ */ jsx("span", {
													className: "lead-field__value lead-field__text",
													children: OWN_COMPANY
												})
											}),
											/* @__PURE__ */ jsx(Row, {
												label: "Дата создания",
												htmlFor: "ship-createdAt",
												children: input("createdAt", { type: "datetime-local" })
											}),
											/* @__PURE__ */ jsx(Row, {
												label: "Заказчик",
												children: /* @__PURE__ */ jsx("span", {
													className: "lead-field__value lead-field__text",
													children: lead ? /* @__PURE__ */ jsx(Link, {
														to: `/crm/leads/${lead.id}`,
														className: "table-link",
														children: shipment.client
													}) : shipment.client
												})
											}),
											/* @__PURE__ */ jsx(Row, {
												label: "ИНН заказчика",
												children: /* @__PURE__ */ jsx("span", {
													className: "lead-field__value lead-field__text mono",
													children: lead?.inn || "—"
												})
											}),
											/* @__PURE__ */ jsx(Row, {
												label: "Контакт заказчика",
												htmlFor: "ship-customerContact",
												children: input("customerContact", { placeholder: "Фамилия Имя, телефон" })
											}),
											/* @__PURE__ */ jsx(Row, {
												label: "Продавец",
												children: /* @__PURE__ */ jsxs("span", {
													className: "lead-field__value lead-field__text seller-cell",
													children: [/* @__PURE__ */ jsx(Avatar, {
														initials: owner.initials,
														color: owner.color,
														className: "avatar--square"
													}), owner.name]
												})
											})
										]
									}),
									/* @__PURE__ */ jsxs(Group, {
										title: "Погрузка",
										children: [
											/* @__PURE__ */ jsx(Row, {
												label: "Города",
												top: true,
												children: /* @__PURE__ */ jsx(TokenField, {
													value: draft.loadingCities,
													onChange: setValue("loadingCities"),
													placeholder: "Город + Enter",
													label: "Города погрузки"
												})
											}),
											/* @__PURE__ */ jsx(Row, {
												label: "Адрес",
												htmlFor: "ship-loadingAddress",
												children: input("loadingAddress")
											}),
											/* @__PURE__ */ jsx(Row, {
												label: "Контакт и телефон",
												htmlFor: "ship-loadingContact",
												children: input("loadingContact", { placeholder: "Иванов Иван, +7 900 000-00-00" })
											}),
											/* @__PURE__ */ jsx(Row, {
												label: "Дата с",
												htmlFor: "ship-loadingDateFrom",
												children: input("loadingDateFrom", { type: "date" })
											}),
											/* @__PURE__ */ jsx(Row, {
												label: "Дата по",
												htmlFor: "ship-loadingDateTo",
												children: input("loadingDateTo", { type: "date" })
											}),
											/* @__PURE__ */ jsx(Row, {
												label: "Время",
												htmlFor: "ship-loadingTime",
												children: input("loadingTime", {
													placeholder: "09:00",
													className: "lead-input lead-input--mono"
												})
											})
										]
									}),
									/* @__PURE__ */ jsxs(Group, {
										title: "Выгрузка",
										children: [
											/* @__PURE__ */ jsx(Row, {
												label: "Города",
												top: true,
												children: /* @__PURE__ */ jsx(TokenField, {
													value: draft.unloadingCities,
													onChange: setValue("unloadingCities"),
													placeholder: "Город + Enter",
													label: "Города выгрузки"
												})
											}),
											/* @__PURE__ */ jsx(Row, {
												label: "Адрес",
												htmlFor: "ship-unloadingAddress",
												children: input("unloadingAddress")
											}),
											/* @__PURE__ */ jsx(Row, {
												label: "Контакт и телефон",
												htmlFor: "ship-unloadingContact",
												children: input("unloadingContact", { placeholder: "Иванов Иван, +7 900 000-00-00" })
											}),
											/* @__PURE__ */ jsx(Row, {
												label: "Дата с",
												htmlFor: "ship-unloadingDateFrom",
												children: input("unloadingDateFrom", { type: "date" })
											}),
											/* @__PURE__ */ jsx(Row, {
												label: "Дата по",
												htmlFor: "ship-unloadingDateTo",
												children: input("unloadingDateTo", { type: "date" })
											}),
											/* @__PURE__ */ jsx(Row, {
												label: "Время",
												htmlFor: "ship-unloadingTime",
												children: input("unloadingTime", {
													placeholder: "09:00",
													className: "lead-input lead-input--mono"
												})
											})
										]
									}),
									/* @__PURE__ */ jsxs(Group, {
										title: "Перевозчик",
										extra: /* @__PURE__ */ jsxs("button", {
											type: "button",
											className: "ship-more",
											"aria-expanded": moreCarrier,
											onClick: () => setMoreCarrier((value) => !value),
											children: ["Водитель и подписант", /* @__PURE__ */ jsx(ChevronDown, {
												size: 13,
												strokeWidth: 2,
												className: moreCarrier ? "is-open" : ""
											})]
										}),
										children: [
											/* @__PURE__ */ jsx(Row, {
												label: "Перевозчик",
												htmlFor: "ship-carrierName",
												children: input("carrierName", { placeholder: "Название компании" })
											}),
											/* @__PURE__ */ jsx(Row, {
												label: "ИНН",
												htmlFor: "ship-carrierInn",
												children: input("carrierInn", {
													placeholder: "10 или 12 цифр",
													inputMode: "numeric",
													className: `lead-input lead-input--mono${innLooksWrong(draft.carrierInn) ? " lead-input--error" : ""}`,
													"aria-invalid": innLooksWrong(draft.carrierInn) || void 0
												})
											}),
											innLooksWrong(draft.carrierInn) && /* @__PURE__ */ jsx("p", {
												className: "field-error",
												children: "ИНН должен содержать 10 или 12 цифр."
											}),
											/* @__PURE__ */ jsx(Row, {
												label: "Контакт",
												htmlFor: "ship-carrierContact",
												children: input("carrierContact")
											}),
											/* @__PURE__ */ jsx(Row, {
												label: "ТС (марка)",
												htmlFor: "ship-vehicle",
												children: input("vehicle")
											}),
											/* @__PURE__ */ jsx(Row, {
												label: "Номер ТС",
												htmlFor: "ship-vehicleNumber",
												children: input("vehicleNumber", { className: "lead-input lead-input--mono" })
											}),
											/* @__PURE__ */ jsx(Row, {
												label: "Прицеп",
												children: /* @__PURE__ */ jsxs("label", {
													className: "lead-field__value ship-check",
													children: [/* @__PURE__ */ jsx("input", {
														type: "checkbox",
														checked: Boolean(draft.hasTrailer),
														onChange: (event) => setDraft((prev) => ({
															...prev,
															hasTrailer: event.target.checked
														}))
													}), "Есть прицеп"]
												})
											}),
											draft.hasTrailer && /* @__PURE__ */ jsx(Row, {
												label: "Номер прицепа",
												htmlFor: "ship-trailerNumber",
												children: input("trailerNumber", { className: "lead-input lead-input--mono" })
											}),
											moreCarrier && /* @__PURE__ */ jsxs(Fragment$1, { children: [
												/* @__PURE__ */ jsx(Row, {
													label: "ФИО водителя",
													htmlFor: "ship-driverName",
													children: input("driverName")
												}),
												/* @__PURE__ */ jsx(Row, {
													label: "Телефон водителя",
													htmlFor: "ship-driverPhone",
													children: input("driverPhone", {
														placeholder: "+7 900 000-00-00",
														className: "lead-input lead-input--mono"
													})
												}),
												/* @__PURE__ */ jsx(Row, {
													label: "Паспорт водителя",
													htmlFor: "ship-driverPassport",
													children: input("driverPassport", { className: "lead-input lead-input--mono" })
												}),
												/* @__PURE__ */ jsx(Row, {
													label: "Кто подписывает",
													htmlFor: "ship-carrierSigner",
													children: input("carrierSigner")
												})
											] })
										]
									}),
									/* @__PURE__ */ jsxs(Group, {
										title: "Груз",
										children: [
											/* @__PURE__ */ jsx(Row, {
												label: "Тип груза",
												htmlFor: "ship-cargoType",
												children: input("cargoType")
											}),
											/* @__PURE__ */ jsx(Row, {
												label: "Упаковка",
												htmlFor: "ship-cargoPackaging",
												children: input("cargoPackaging")
											}),
											/* @__PURE__ */ jsx(Row, {
												label: "Объём кузова, м³",
												htmlFor: "ship-cargoVolume",
												children: input("cargoVolume", {
													inputMode: "decimal",
													className: "lead-input lead-input--mono"
												})
											}),
											/* @__PURE__ */ jsx(Row, {
												label: "Вес груза, т",
												htmlFor: "ship-cargoWeight",
												children: input("cargoWeight", {
													inputMode: "decimal",
													className: "lead-input lead-input--mono"
												})
											}),
											/* @__PURE__ */ jsx(Row, {
												label: "Грузоподъёмность, т",
												htmlFor: "ship-capacity",
												children: input("capacity", {
													inputMode: "decimal",
													className: "lead-input lead-input--mono"
												})
											}),
											/* @__PURE__ */ jsx(Row, {
												label: "Тип кузова",
												top: true,
												children: /* @__PURE__ */ jsx(TokenField, {
													value: draft.bodyType,
													onChange: setValue("bodyType"),
													placeholder: "Например: изотерм + Enter",
													label: "Тип кузова"
												})
											}),
											/* @__PURE__ */ jsx(Row, {
												label: "Способ погрузки",
												top: true,
												children: /* @__PURE__ */ jsx(TokenField, {
													value: draft.loadingMethod,
													onChange: setValue("loadingMethod"),
													placeholder: "Например: задняя + Enter",
													label: "Способ погрузки"
												})
											}),
											/* @__PURE__ */ jsx(Row, {
												label: "Тип транспорта",
												htmlFor: "ship-transportType",
												children: /* @__PURE__ */ jsx("select", {
													id: "ship-transportType",
													className: "lead-input lead-input--select",
													value: draft.transportType,
													onChange: set("transportType"),
													children: TRANSPORT_OPTIONS.map((option) => /* @__PURE__ */ jsx("option", {
														value: option.value,
														children: option.label
													}, option.value))
												})
											})
										]
									})
								]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "card",
								children: [/* @__PURE__ */ jsxs("div", {
									className: "tabbar",
									role: "tablist",
									children: [/* @__PURE__ */ jsx("button", {
										type: "button",
										role: "tab",
										"aria-selected": tab === "lines",
										onClick: () => setTab("lines"),
										children: "Позиции заказа"
									}), /* @__PURE__ */ jsx("button", {
										type: "button",
										role: "tab",
										"aria-selected": tab === "info",
										onClick: () => setTab("info"),
										children: "Прочая информация"
									})]
								}), /* @__PURE__ */ jsx("div", {
									className: "card__body",
									onKeyDown: onFieldKeyDown,
									children: tab === "lines" ? /* @__PURE__ */ jsxs(Fragment$1, { children: [
										/* @__PURE__ */ jsx("div", {
											className: "table-scroll",
											children: /* @__PURE__ */ jsxs("table", {
												className: "table order-lines",
												children: [/* @__PURE__ */ jsxs("thead", { children: [/* @__PURE__ */ jsxs("tr", { children: [
													/* @__PURE__ */ jsx("th", {
														rowSpan: 2,
														children: "Продукт"
													}),
													/* @__PURE__ */ jsx("th", {
														colSpan: 3,
														className: "order-lines__group",
														children: "Заказчик"
													}),
													/* @__PURE__ */ jsx("th", {
														colSpan: 3,
														className: "order-lines__group",
														children: "Перевозчик"
													})
												] }), /* @__PURE__ */ jsxs("tr", { children: [
													/* @__PURE__ */ jsx("th", {
														className: "order-lines__split",
														children: "Цена"
													}),
													/* @__PURE__ */ jsx("th", { children: "Налог" }),
													/* @__PURE__ */ jsx("th", { children: "Налог исключён." }),
													/* @__PURE__ */ jsx("th", {
														className: "order-lines__split",
														children: "Цена"
													}),
													/* @__PURE__ */ jsx("th", { children: "Налог" }),
													/* @__PURE__ */ jsx("th", { children: "Налог исключён." })
												] })] }), /* @__PURE__ */ jsx("tbody", { children: /* @__PURE__ */ jsxs("tr", { children: [
													/* @__PURE__ */ jsx("td", { children: SERVICE_NAME }),
													/* @__PURE__ */ jsx("td", {
														className: "order-lines__split",
														children: /* @__PURE__ */ jsx("input", {
															className: "lead-input lead-input--mono",
															type: "number",
															min: "0",
															step: "0.01",
															placeholder: "0,00",
															"aria-label": "Цена для заказчика",
															value: draft.customerPrice ?? "",
															onChange: setPrice("customerPrice")
														})
													}),
													/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("select", {
														className: "lead-input lead-input--select",
														"aria-label": "Налог заказчика",
														value: draft.customerTax,
														onChange: set("customerTax"),
														children: TAX_OPTIONS.map((option) => /* @__PURE__ */ jsx("option", {
															value: option.value,
															children: option.label
														}, option.value))
													}) }),
													/* @__PURE__ */ jsx("td", {
														className: "cell-money muted",
														children: customerNet == null ? "" : money(customerNet)
													}),
													/* @__PURE__ */ jsx("td", {
														className: "order-lines__split",
														children: /* @__PURE__ */ jsx("input", {
															className: "lead-input lead-input--mono",
															type: "number",
															min: "0",
															step: "0.01",
															placeholder: "0,00",
															"aria-label": "Цена для перевозчика",
															value: draft.carrierPrice ?? "",
															onChange: setPrice("carrierPrice")
														})
													}),
													/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("select", {
														className: "lead-input lead-input--select",
														"aria-label": "Налог перевозчика",
														value: draft.carrierTax,
														onChange: set("carrierTax"),
														children: TAX_OPTIONS.map((option) => /* @__PURE__ */ jsx("option", {
															value: option.value,
															children: option.label
														}, option.value))
													}) }),
													/* @__PURE__ */ jsx("td", {
														className: "cell-money muted",
														children: carrierNet == null ? "" : money(carrierNet)
													})
												] }) })]
											})
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "order-lines__total",
											children: [/* @__PURE__ */ jsx("span", { children: "Маржа" }), /* @__PURE__ */ jsx("b", {
												className: margin == null || margin >= 0 ? "money-plus" : "money-minus",
												children: signedMoney(margin)
											})]
										}),
										/* @__PURE__ */ jsx("p", {
											className: "order-lines__note",
											children: "В макете маржа — цена заказчика минус цена перевозчика. В рабочей CRM её считает сервер: без НДС и с вычетом доли расходов."
										})
									] }) : /* @__PURE__ */ jsx("textarea", {
										className: "lead-input ship-comment",
										rows: 4,
										placeholder: "Дополнительные условия, комментарии…",
										"aria-label": "Прочая информация",
										value: draft.comment ?? "",
										onChange: set("comment")
									})
								})]
							})
						]
					}), /* @__PURE__ */ jsx(Chatter, {
						entries: chatter,
						authorInitials: ME.initials,
						currentUserId: ME.id
					}, shipment.id)]
				})
			]
		}), deleteOpen && /* @__PURE__ */ jsx(DeleteShipmentDialog, {
			number: shipment.number,
			onCancel: () => setDeleteOpen(false),
			onConfirm: removeForever
		})]
	});
}
// src/pages/AdminPage.jsx
/**
* Панель управления (только администратор) — разделы как в рабочей CRM:
* «Пользователи», «Бухгалтеры», «Безопасность». Раздел живёт в адресе
* (`?section=`), слева — меню разделов. Диалоги и тексты повторяют CRM.
*
* Сверх CRM (пометка в PARITY J): сводка KPI сверху, переключатели
* «Счета / Банк» у бухгалтеров, двухфакторный вход и «одна сессия».
* Данные — локальные, в рамках открытой страницы.
*/
var SECTIONS = [
	{
		id: "users",
		label: "Пользователи",
		icon: Users
	},
	{
		id: "accountants",
		label: "Бухгалтеры",
		icon: Calculator
	},
	{
		id: "security",
		label: "Безопасность",
		icon: ShieldCheck
	}
];
var ROLE_LABEL = {
	admin: "Администратор",
	manager: "Менеджер"
};
var START_USERS = TEAM.map((person, index) => {
	const [firstName = "", lastName = ""] = person.name.split(" ");
	return {
		id: person.id,
		email: [
			"gromov",
			"sokolova",
			"levchenko",
			"kim"
		][index] + "@detroid.ru",
		firstName,
		lastName,
		role: person.id === 1 ? "admin" : "manager",
		isActive: person.online || index !== 3
	};
});
var START_ACCOUNTANTS = [
	{
		id: 1,
		name: "Ольга Белова",
		isActive: true,
		invoices: true,
		bank: true
	},
	{
		id: 2,
		name: "Пётр Ершов",
		isActive: true,
		invoices: true,
		bank: false
	},
	{
		id: 3,
		name: "Наталья Куликова",
		isActive: false,
		invoices: false,
		bank: false
	}
];
var START_BACKUPS = [
	{
		name: "crm-2026-11-16_0300.sql.gz",
		size: 186204160
	},
	{
		name: "crm-2026-11-15_0300.sql.gz",
		size: 185729024
	},
	{
		name: "crm-2026-11-14_0300.sql.gz",
		size: 185110528
	}
];
var FAILED_LOGINS = [{
	user: "kim@detroid.ru",
	ip: "185.12.40.7",
	last: "16.11.2026 08:41",
	count: 3
}, {
	user: "admin",
	ip: "91.204.18.122",
	last: "15.11.2026 23:05",
	count: 12
}];
/** Объём диска: гигабайты с одним знаком, как в блоке «Вложения» CRM. */
var diskSize = (bytes) => `${(bytes / 1024 ** 3).toFixed(1).replace(".", ",")} ГБ`;
var STORAGE = {
	files: 1284,
	used: 3865470566,
	free: 46170898022
};
function Switch({ checked, onChange, label }) {
	return /* @__PURE__ */ jsx("button", {
		type: "button",
		className: "switch",
		role: "switch",
		"aria-checked": checked,
		"aria-label": label,
		onClick: () => onChange(!checked),
		children: /* @__PURE__ */ jsx("span", { className: "switch__dot" })
	});
}
function ConfirmDialog({ title, children, confirmLabel, onCancel, onConfirm }) {
	return /* @__PURE__ */ jsx(Modal, {
		open: true,
		title,
		onClose: onCancel,
		footer: /* @__PURE__ */ jsxs(Fragment$1, { children: [/* @__PURE__ */ jsx(Button, {
			variant: "ghost",
			onClick: onCancel,
			children: "Отмена"
		}), /* @__PURE__ */ jsx(Button, {
			variant: "danger",
			onClick: onConfirm,
			children: confirmLabel
		})] }),
		children
	});
}
function UserDialog({ user, users, onCancel, onSave }) {
	const isNew = !user;
	const [form, setForm] = useState(user ? {
		...user,
		password: ""
	} : {
		email: "",
		firstName: "",
		lastName: "",
		password: "",
		role: "manager",
		isActive: true
	});
	const [error, setError] = useState("");
	const set = (key) => (event) => setForm((prev) => ({
		...prev,
		[key]: event.target.value
	}));
	function submit() {
		const email = form.email.trim().toLowerCase();
		const passwordOk = isNew ? form.password.length >= 8 : form.password === "" || form.password.length >= 8;
		if (!/^\S+@\S+\.\S+$/.test(email) || !passwordOk) {
			setError("Проверьте поля: email и пароль от 8 символов");
			return;
		}
		if (users.some((item) => item.email === email && item.id !== user?.id)) {
			setError("Пользователь с таким email уже существует");
			return;
		}
		const { password: _password, ...rest } = form;
		onSave({
			...rest,
			email,
			firstName: form.firstName.trim(),
			lastName: form.lastName.trim()
		});
	}
	return /* @__PURE__ */ jsx(Modal, {
		open: true,
		title: isNew ? "Новый пользователь" : "Изменить пользователя",
		onClose: onCancel,
		footer: /* @__PURE__ */ jsxs(Fragment$1, { children: [/* @__PURE__ */ jsx(Button, {
			variant: "ghost",
			onClick: onCancel,
			children: "Отмена"
		}), /* @__PURE__ */ jsx(Button, {
			variant: "primary",
			onClick: submit,
			children: "Сохранить"
		})] }),
		children: /* @__PURE__ */ jsxs("form", {
			className: "stack",
			style: { gap: 12 },
			onSubmit: (event) => {
				event.preventDefault();
				submit();
			},
			children: [
				/* @__PURE__ */ jsx(Field, {
					label: "Email",
					children: /* @__PURE__ */ jsx(Input, {
						type: "email",
						value: form.email,
						onChange: set("email"),
						autoComplete: "off"
					})
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "grid grid--1-1",
					style: { gap: 12 },
					children: [/* @__PURE__ */ jsx(Field, {
						label: "Имя",
						children: /* @__PURE__ */ jsx(Input, {
							value: form.firstName,
							onChange: set("firstName")
						})
					}), /* @__PURE__ */ jsx(Field, {
						label: "Фамилия",
						children: /* @__PURE__ */ jsx(Input, {
							value: form.lastName,
							onChange: set("lastName")
						})
					})]
				}),
				/* @__PURE__ */ jsx(Field, {
					label: isNew ? "Пароль" : "Новый пароль (пусто = не менять)",
					hint: "минимум 8 символов",
					children: /* @__PURE__ */ jsx(Input, {
						type: "password",
						value: form.password,
						onChange: set("password"),
						autoComplete: "new-password"
					})
				}),
				/* @__PURE__ */ jsx(Field, {
					label: "Роль",
					children: /* @__PURE__ */ jsxs(Select, {
						value: form.role,
						onChange: set("role"),
						children: [/* @__PURE__ */ jsx("option", {
							value: "admin",
							children: "Администратор"
						}), /* @__PURE__ */ jsx("option", {
							value: "manager",
							children: "Менеджер"
						})]
					})
				}),
				error && /* @__PURE__ */ jsx("p", {
					className: "modal-error",
					role: "alert",
					children: error
				}),
				/* @__PURE__ */ jsx("button", {
					type: "submit",
					hidden: true
				})
			]
		})
	});
}
function UsersSection() {
	const [users, setUsers] = useState(START_USERS);
	const [editing, setEditing] = useState(null);
	const [removing, setRemoving] = useState(null);
	const sorted = [...users].sort((a, b) => a.role === b.role ? a.id - b.id : a.role === "admin" ? -1 : 1);
	return /* @__PURE__ */ jsxs("div", {
		className: "card",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "card__head",
				children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", {
					className: "card__title",
					children: "Пользователи"
				}), /* @__PURE__ */ jsx("div", {
					className: "card__sub",
					children: "Учётные записи и роли сотрудников"
				})] }), /* @__PURE__ */ jsx(Button, {
					size: "sm",
					variant: "primary",
					icon: UserPlus,
					onClick: () => setEditing("new"),
					children: "Добавить"
				})]
			}),
			/* @__PURE__ */ jsxs("table", {
				className: "table",
				children: [/* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
					/* @__PURE__ */ jsx("th", {
						style: { width: 48 },
						children: "№"
					}),
					/* @__PURE__ */ jsx("th", { children: "Email" }),
					/* @__PURE__ */ jsx("th", { children: "ФИО" }),
					/* @__PURE__ */ jsx("th", { children: "Роль" }),
					/* @__PURE__ */ jsx("th", { children: "Активен" }),
					/* @__PURE__ */ jsx("th", {
						style: { textAlign: "right" },
						children: "Действия"
					})
				] }) }), /* @__PURE__ */ jsx("tbody", { children: sorted.map((user, index) => {
					const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
					return /* @__PURE__ */ jsxs("tr", { children: [
						/* @__PURE__ */ jsx("td", {
							className: "cell-sub mono",
							children: index + 1
						}),
						/* @__PURE__ */ jsx("td", {
							className: "cell-main",
							children: user.email
						}),
						/* @__PURE__ */ jsx("td", { children: fullName || /* @__PURE__ */ jsx("span", {
							className: "muted",
							children: "— не указано —"
						}) }),
						/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("span", {
							className: `status ${user.role === "admin" ? "status--progress" : "status--new"}`,
							children: ROLE_LABEL[user.role]
						}) }),
						/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx(Switch, {
							checked: user.isActive,
							label: `Активен: ${user.email}`,
							onChange: (next) => setUsers((prev) => prev.map((item) => item.id === user.id ? {
								...item,
								isActive: next
							} : item))
						}) }),
						/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsxs("div", {
							className: "row-actions",
							children: [/* @__PURE__ */ jsx(Button, {
								size: "sm",
								variant: "ghost",
								icon: Pencil,
								onClick: () => setEditing(user),
								children: "Изменить"
							}), /* @__PURE__ */ jsx(Button, {
								size: "sm",
								variant: "ghost",
								icon: Trash2,
								onClick: () => setRemoving(user),
								disabled: user.id === ME.id,
								title: user.id === ME.id ? "Себя удалить нельзя" : void 0,
								children: "Удалить"
							})]
						}) })
					] }, user.id);
				}) })]
			}),
			editing && /* @__PURE__ */ jsx(UserDialog, {
				user: editing === "new" ? null : editing,
				users,
				onCancel: () => setEditing(null),
				onSave: (saved) => {
					setUsers((prev) => editing === "new" ? [...prev, {
						...saved,
						id: Math.max(0, ...prev.map((u) => u.id)) + 1
					}] : prev.map((u) => u.id === saved.id ? saved : u));
					setEditing(null);
				}
			}),
			removing && /* @__PURE__ */ jsx(ConfirmDialog, {
				title: "Удалить пользователя?",
				confirmLabel: "Удалить",
				onCancel: () => setRemoving(null),
				onConfirm: () => {
					setUsers((prev) => prev.filter((u) => u.id !== removing.id));
					setRemoving(null);
				},
				children: /* @__PURE__ */ jsxs("p", {
					className: "modal-copy",
					children: [
						"Удалить ",
						removing.email,
						"?"
					]
				})
			})
		]
	});
}
function AccountantDialog({ accountant, onCancel, onSave }) {
	const [name, setName] = useState(accountant?.name ?? "");
	const [error, setError] = useState("");
	function submit() {
		if (!name.trim()) {
			setError("Укажите ФИО бухгалтера");
			return;
		}
		onSave(name.trim());
	}
	return /* @__PURE__ */ jsx(Modal, {
		open: true,
		title: accountant ? "Изменение ФИО бухгалтера" : "Новый бухгалтер",
		onClose: onCancel,
		footer: /* @__PURE__ */ jsxs(Fragment$1, { children: [/* @__PURE__ */ jsx(Button, {
			variant: "ghost",
			onClick: onCancel,
			children: "Отмена"
		}), /* @__PURE__ */ jsx(Button, {
			variant: "primary",
			onClick: submit,
			children: "Сохранить"
		})] }),
		children: /* @__PURE__ */ jsxs("form", {
			onSubmit: (event) => {
				event.preventDefault();
				submit();
			},
			children: [/* @__PURE__ */ jsx(Field, {
				label: "ФИО",
				children: /* @__PURE__ */ jsx(Input, {
					value: name,
					onChange: (event) => setName(event.target.value),
					placeholder: "Фамилия Имя Отчество",
					autoFocus: true
				})
			}), error && /* @__PURE__ */ jsx("p", {
				className: "modal-error",
				role: "alert",
				children: error
			})]
		})
	});
}
function AccountantsSection() {
	const [accountants, setAccountants] = useState(START_ACCOUNTANTS);
	const [editing, setEditing] = useState(null);
	const [removing, setRemoving] = useState(null);
	const patch = (id, next) => setAccountants((prev) => prev.map((item) => item.id === id ? {
		...item,
		...next
	} : item));
	return /* @__PURE__ */ jsxs("div", {
		className: "card",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "card__head",
				children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", {
					className: "card__title",
					children: "Доступ бухгалтеров"
				}), /* @__PURE__ */ jsx("div", {
					className: "card__sub",
					children: "Бухгалтеры для назначения в карточках; «Счета» и «Банк» — сверх CRM"
				})] }), /* @__PURE__ */ jsx(Button, {
					size: "sm",
					variant: "primary",
					icon: Plus,
					onClick: () => setEditing("new"),
					children: "Добавить"
				})]
			}),
			/* @__PURE__ */ jsxs("table", {
				className: "table",
				children: [/* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
					/* @__PURE__ */ jsx("th", {
						style: { width: 48 },
						children: "№"
					}),
					/* @__PURE__ */ jsx("th", { children: "ФИО" }),
					/* @__PURE__ */ jsx("th", { children: "Статус" }),
					/* @__PURE__ */ jsxs("th", { children: ["Счета ", /* @__PURE__ */ jsx("span", {
						className: "extra-mark",
						title: "Сверх рабочей CRM",
						children: "сверх CRM"
					})] }),
					/* @__PURE__ */ jsx("th", { children: "Банк" }),
					/* @__PURE__ */ jsx("th", {
						style: { textAlign: "right" },
						children: "Действия"
					})
				] }) }), /* @__PURE__ */ jsx("tbody", { children: accountants.map((person, index) => /* @__PURE__ */ jsxs("tr", {
					className: person.isActive ? void 0 : "is-muted",
					children: [
						/* @__PURE__ */ jsx("td", {
							className: "cell-sub mono",
							children: index + 1
						}),
						/* @__PURE__ */ jsx("td", {
							className: "cell-main",
							children: person.name
						}),
						/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("span", {
							className: `status ${person.isActive ? "status--done" : "status--new"}`,
							children: person.isActive ? "Активен" : "Неактивен"
						}) }),
						/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx(Switch, {
							checked: person.invoices,
							label: `Счета: ${person.name}`,
							onChange: (next) => patch(person.id, { invoices: next })
						}) }),
						/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx(Switch, {
							checked: person.bank,
							label: `Банк: ${person.name}`,
							onChange: (next) => patch(person.id, { bank: next })
						}) }),
						/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsxs("div", {
							className: "row-actions",
							children: [/* @__PURE__ */ jsx(Button, {
								size: "sm",
								variant: "ghost",
								icon: Pencil,
								onClick: () => setEditing(person),
								children: "Изменить ФИО"
							}), person.isActive ? /* @__PURE__ */ jsx(Button, {
								size: "sm",
								variant: "ghost",
								icon: Trash2,
								onClick: () => setRemoving(person),
								children: "Удалить"
							}) : /* @__PURE__ */ jsx(Button, {
								size: "sm",
								variant: "ghost",
								icon: RotateCcw,
								onClick: () => patch(person.id, { isActive: true }),
								children: "Восстановить"
							})]
						}) })
					]
				}, person.id)) })]
			}),
			editing && /* @__PURE__ */ jsx(AccountantDialog, {
				accountant: editing === "new" ? null : editing,
				onCancel: () => setEditing(null),
				onSave: (name) => {
					if (editing === "new") setAccountants((prev) => [...prev, {
						id: Math.max(0, ...prev.map((a) => a.id)) + 1,
						name,
						isActive: true,
						invoices: false,
						bank: false
					}]);
					else patch(editing.id, { name });
					setEditing(null);
				}
			}),
			removing && /* @__PURE__ */ jsx(ConfirmDialog, {
				title: "Удалить бухгалтера?",
				confirmLabel: "Удалить",
				onCancel: () => setRemoving(null),
				onConfirm: () => {
					patch(removing.id, { isActive: false });
					setRemoving(null);
				},
				children: /* @__PURE__ */ jsxs("p", {
					className: "modal-copy",
					children: [
						"«",
						removing.name,
						"» исчезнет из новых назначений, но останется в карточках, где уже выбран. Запись можно будет восстановить."
					]
				})
			})
		]
	});
}
function SecuritySection() {
	const [backups, setBackups] = useState(START_BACKUPS);
	const [queued, setQueued] = useState(false);
	const [removing, setRemoving] = useState(null);
	const [twoFactor, setTwoFactor] = useState(true);
	const [sessionLimit, setSessionLimit] = useState(true);
	const usedShare = Math.round(STORAGE.used / (STORAGE.used + STORAGE.free) * 100);
	function runBackup() {
		setQueued(true);
		window.setTimeout(() => {
			setBackups((prev) => [{
				name: `crm-manual-${Date.now()}.sql.gz`,
				size: 1864e5
			}, ...prev]);
			setQueued(false);
		}, 1800);
	}
	return /* @__PURE__ */ jsxs("div", {
		className: "stack",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "card",
				children: [/* @__PURE__ */ jsx("div", {
					className: "card__head",
					children: /* @__PURE__ */ jsx("div", {
						className: "card__title",
						children: "Вложения"
					})
				}), /* @__PURE__ */ jsxs("div", {
					className: "card__body",
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "admin-stats",
							children: [
								/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("span", {
									className: "admin-stats__label",
									children: "Файлов"
								}), /* @__PURE__ */ jsx("span", {
									className: "admin-stats__value",
									children: STORAGE.files.toLocaleString("ru-RU")
								})] }),
								/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("span", {
									className: "admin-stats__label",
									children: "Занято"
								}), /* @__PURE__ */ jsx("span", {
									className: "admin-stats__value",
									children: diskSize(STORAGE.used)
								})] }),
								/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("span", {
									className: "admin-stats__label",
									children: "Свободно"
								}), /* @__PURE__ */ jsx("span", {
									className: "admin-stats__value",
									children: diskSize(STORAGE.free)
								})] })
							]
						}),
						/* @__PURE__ */ jsx("div", {
							className: "admin-meter",
							"aria-label": `Занято ${usedShare}%`,
							children: /* @__PURE__ */ jsx("span", { style: { width: `${usedShare}%` } })
						}),
						/* @__PURE__ */ jsx("p", {
							className: "admin-note",
							children: "Старые вложения уходят в архив по воскресеньям; файлы из архива по-прежнему открываются из карточек."
						})
					]
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "card",
				children: [/* @__PURE__ */ jsx("div", {
					className: "card__head",
					children: /* @__PURE__ */ jsx("div", {
						className: "card__title",
						children: "Неудачные попытки входа"
					})
				}), FAILED_LOGINS.length === 0 ? /* @__PURE__ */ jsx("div", {
					className: "card__body muted",
					children: "Неудачных попыток не было"
				}) : /* @__PURE__ */ jsxs("table", {
					className: "table",
					children: [/* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
						/* @__PURE__ */ jsx("th", { children: "Пользователь" }),
						/* @__PURE__ */ jsx("th", { children: "IP" }),
						/* @__PURE__ */ jsx("th", { children: "Последняя попытка" }),
						/* @__PURE__ */ jsx("th", {
							style: { textAlign: "right" },
							children: "Неудач"
						})
					] }) }), /* @__PURE__ */ jsx("tbody", { children: FAILED_LOGINS.map((row) => /* @__PURE__ */ jsxs("tr", { children: [
						/* @__PURE__ */ jsx("td", {
							className: "cell-main",
							children: row.user
						}),
						/* @__PURE__ */ jsx("td", {
							className: "cell-sub mono",
							children: row.ip
						}),
						/* @__PURE__ */ jsx("td", {
							className: "cell-sub mono",
							children: row.last
						}),
						/* @__PURE__ */ jsx("td", {
							className: "cell-money",
							children: row.count
						})
					] }, `${row.user}-${row.ip}`)) })]
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "card",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "card__head",
					children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", {
						className: "card__title",
						children: "Бэкапы"
					}), /* @__PURE__ */ jsx("div", {
						className: "card__sub",
						children: "Ночная копия базы создаётся автоматически"
					})] }), /* @__PURE__ */ jsx(Button, {
						size: "sm",
						icon: Database,
						onClick: runBackup,
						disabled: queued,
						children: "Запустить бэкап"
					})]
				}), /* @__PURE__ */ jsxs("div", {
					className: "card__body stack",
					style: { gap: 8 },
					children: [queued && /* @__PURE__ */ jsx("p", {
						className: "admin-note admin-note--info",
						children: "Задача поставлена в очередь — файл появится через несколько секунд."
					}), backups.length === 0 ? /* @__PURE__ */ jsx("p", {
						className: "muted",
						children: "Файлов нет"
					}) : /* @__PURE__ */ jsx("ul", {
						className: "backup-list",
						children: backups.map((file) => /* @__PURE__ */ jsxs("li", { children: [
							/* @__PURE__ */ jsx(HardDrive, {
								size: 14,
								strokeWidth: 1.9
							}),
							/* @__PURE__ */ jsxs("span", {
								className: "mono grow",
								children: [
									file.name,
									" ",
									/* @__PURE__ */ jsxs("span", {
										className: "muted",
										children: [
											"(",
											Math.round(file.size / 1024).toLocaleString("ru-RU"),
											" КБ)"
										]
									})
								]
							}),
							/* @__PURE__ */ jsx("button", {
								type: "button",
								className: "icon-btn",
								"aria-label": `Удалить ${file.name}`,
								onClick: () => setRemoving(file),
								children: /* @__PURE__ */ jsx(Trash2, {
									size: 14,
									strokeWidth: 1.9
								})
							})
						] }, file.name))
					})]
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "card",
				children: [/* @__PURE__ */ jsx("div", {
					className: "card__head",
					children: /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("div", {
						className: "card__title",
						children: ["Вход и сессии ", /* @__PURE__ */ jsx("span", {
							className: "extra-mark",
							children: "сверх CRM"
						})]
					}), /* @__PURE__ */ jsx("div", {
						className: "card__sub",
						children: "В рабочей CRM этих настроек нет — идея на будущее"
					})] })
				}), /* @__PURE__ */ jsxs("div", {
					className: "card__body",
					style: {
						display: "flex",
						flexDirection: "column",
						gap: 14
					},
					children: [/* @__PURE__ */ jsxs("div", {
						className: "admin-row",
						children: [
							/* @__PURE__ */ jsx("span", {
								className: "tile",
								style: {
									background: "var(--accent-soft)",
									color: "var(--accent)"
								},
								children: /* @__PURE__ */ jsx(ShieldCheck, {
									size: 17,
									strokeWidth: 1.9
								})
							}),
							/* @__PURE__ */ jsxs("div", {
								style: { minWidth: 0 },
								children: [/* @__PURE__ */ jsx("div", {
									className: "cell-company__name",
									children: "Двухфакторный вход"
								}), /* @__PURE__ */ jsx("div", {
									className: "cell-company__sub",
									children: "Обязателен для администраторов"
								})]
							}),
							/* @__PURE__ */ jsx("div", {
								style: { marginLeft: "auto" },
								children: /* @__PURE__ */ jsx(Switch, {
									checked: twoFactor,
									onChange: setTwoFactor,
									label: "Двухфакторный вход"
								})
							})
						]
					}), /* @__PURE__ */ jsxs("div", {
						className: "admin-row",
						children: [
							/* @__PURE__ */ jsx("span", {
								className: "tile",
								style: {
									background: "var(--info-soft)",
									color: "var(--info)"
								},
								children: /* @__PURE__ */ jsx(Users, {
									size: 17,
									strokeWidth: 1.9
								})
							}),
							/* @__PURE__ */ jsxs("div", {
								style: { minWidth: 0 },
								children: [/* @__PURE__ */ jsx("div", {
									className: "cell-company__name",
									children: "Одна активная сессия"
								}), /* @__PURE__ */ jsx("div", {
									className: "cell-company__sub",
									children: "Новый вход закрывает прежний"
								})]
							}),
							/* @__PURE__ */ jsx("div", {
								style: { marginLeft: "auto" },
								children: /* @__PURE__ */ jsx(Switch, {
									checked: sessionLimit,
									onChange: setSessionLimit,
									label: "Одна активная сессия"
								})
							})
						]
					})]
				})]
			}),
			removing && /* @__PURE__ */ jsx(ConfirmDialog, {
				title: "Удалить резервную копию?",
				confirmLabel: "Удалить",
				onCancel: () => setRemoving(null),
				onConfirm: () => {
					setBackups((prev) => prev.filter((file) => file.name !== removing.name));
					setRemoving(null);
				},
				children: /* @__PURE__ */ jsxs("p", {
					className: "modal-copy",
					children: [
						"Файл «",
						removing.name,
						"» будет удалён с сервера безвозвратно. Новые копии ночная задача продолжит создавать как обычно."
					]
				})
			})
		]
	});
}
function AdminPage() {
	const { leads, shipments } = useLeads();
	const [params, setParams] = useSearchParams();
	const section = SECTIONS.some((item) => item.id === params.get("section")) ? params.get("section") : "users";
	if (!ME.isAdmin) return /* @__PURE__ */ jsx(Shell, {
		title: "Панель управления",
		crumb: "Раздел только для администратора",
		children: /* @__PURE__ */ jsxs("div", {
			className: "card",
			style: {
				padding: 28,
				textAlign: "center"
			},
			children: [
				/* @__PURE__ */ jsx("span", {
					className: "empty__icon",
					style: { margin: "0 auto 10px" },
					children: /* @__PURE__ */ jsx(Lock, {
						size: 20,
						strokeWidth: 1.8
					})
				}),
				/* @__PURE__ */ jsx("div", {
					className: "empty__title",
					children: "Доступ только у администратора"
				}),
				/* @__PURE__ */ jsx("p", {
					className: "empty__text",
					style: {
						margin: "6px auto 16px",
						maxWidth: 460
					},
					children: "В рабочей CRM не-администратора выкидывает из раздела. Чтобы посмотреть макет админки, включите роль «Администратор» в настройках."
				}),
				/* @__PURE__ */ jsx(Link, {
					to: "/settings",
					className: "btn btn--primary",
					children: "Открыть настройки"
				})
			]
		})
	});
	const totalMargin = leads.reduce((sum, lead) => sum + leadShipmentMargin(lead.id, shipments), 0);
	const kpi = [
		{
			label: "Сотрудников",
			value: String(TEAM.length),
			foot: "в отделе продаж",
			color: "var(--stage-1)"
		},
		{
			label: "Лидов в работе",
			value: String(leads.filter((lead) => !lead.lost).length),
			foot: `маржа ${shortMoney(totalMargin)}`,
			color: "var(--stage-4)"
		},
		{
			label: "Заявок",
			value: String(shipments.length),
			foot: "всего в системе",
			color: "var(--stage-3)"
		}
	];
	const current = SECTIONS.find((item) => item.id === section);
	return /* @__PURE__ */ jsxs(Shell, {
		title: "Панель управления",
		crumb: `Панель управления · ${current.label}`,
		children: [/* @__PURE__ */ jsx("div", {
			className: "kpi-grid kpi-grid--3",
			style: { marginBottom: 18 },
			children: kpi.map((item) => /* @__PURE__ */ jsxs("div", {
				className: "kpi",
				style: { "--kpi": item.color },
				children: [
					/* @__PURE__ */ jsx("span", {
						className: "kpi__label",
						children: item.label
					}),
					/* @__PURE__ */ jsx("span", {
						className: "kpi__value",
						children: item.value
					}),
					/* @__PURE__ */ jsx("span", {
						className: "kpi__foot",
						children: item.foot
					})
				]
			}, item.label))
		}), /* @__PURE__ */ jsxs("div", {
			className: "admin-layout",
			children: [/* @__PURE__ */ jsx("nav", {
				className: "admin-nav",
				"aria-label": "Разделы панели управления",
				children: SECTIONS.map(({ id, label, icon: Icon }) => /* @__PURE__ */ jsxs("button", {
					type: "button",
					className: "admin-nav__item",
					"aria-current": section === id ? "page" : void 0,
					onClick: () => setParams(id === "users" ? {} : { section: id }),
					children: [/* @__PURE__ */ jsx(Icon, {
						size: 15,
						strokeWidth: 1.9
					}), label]
				}, id))
			}), /* @__PURE__ */ jsxs("div", {
				className: "admin-content",
				children: [
					section === "users" && /* @__PURE__ */ jsx(UsersSection, {}),
					section === "accountants" && /* @__PURE__ */ jsx(AccountantsSection, {}),
					section === "security" && /* @__PURE__ */ jsx(SecuritySection, {})
				]
			})]
		})]
	});
}
// src/pages/SettingsPage.jsx
/** Настройки: тема, акцент, плотность, роль в макете и редактор этапов воронки. */
var ACCENTS = [
	{
		value: "indigo",
		color: "#6c5ce7",
		label: "Индиго"
	},
	{
		value: "violet",
		color: "#8b5cf6",
		label: "Фиолетовый"
	},
	{
		value: "emerald",
		color: "#0d9488",
		label: "Изумрудный"
	}
];
function readStored(key, fallback) {
	try {
		return window.localStorage.getItem(key) ?? fallback;
	} catch {
		return fallback;
	}
}
function persist(key, value) {
	try {
		window.localStorage.setItem(key, value);
	} catch {}
}
function SettingsPage() {
	const { stages, leads, addStage, updateStage, moveStage, removeStage, resetAll } = useLeads();
	const [theme, setTheme] = useState(() => readStored("crm.theme", "light"));
	const [accent, setAccent] = useState(() => readStored("crm.accent", "indigo"));
	const [density, setDensity] = useState(() => readStored("crm.density", "comfort"));
	const [role, setRole] = useState(() => readStored("crm.role", "manager"));
	const [saved, setSaved] = useState(false);
	useEffect(() => {
		document.documentElement.dataset.theme = theme;
		persist("crm.theme", theme);
	}, [theme]);
	useEffect(() => {
		document.documentElement.dataset.accent = accent;
		persist("crm.accent", accent);
	}, [accent]);
	useEffect(() => {
		document.documentElement.dataset.density = density;
		persist("crm.density", density);
	}, [density]);
	function flash() {
		setSaved(true);
		window.setTimeout(() => setSaved(false), 1600);
	}
	function switchRole(next) {
		setRole(next);
		persist("crm.role", next);
		window.setTimeout(() => window.location.reload(), 120);
	}
	function countFor(stageId) {
		return leads.filter((lead) => lead.ownerId === ME.id && !lead.lost && lead.stageId === stageId).length;
	}
	return /* @__PURE__ */ jsx(Shell, { children: /* @__PURE__ */ jsxs("div", {
		className: "grid grid--2-1",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "stack",
			children: [
				/* @__PURE__ */ jsxs("div", {
					className: "card",
					children: [/* @__PURE__ */ jsx("div", {
						className: "card__head",
						children: /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", {
							className: "card__title",
							children: "Оформление"
						}), /* @__PURE__ */ jsx("div", {
							className: "card__sub",
							children: "Выбор сохраняется в браузере"
						})] })
					}), /* @__PURE__ */ jsxs("div", {
						className: "card__body",
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "grid grid--1-1",
								children: [/* @__PURE__ */ jsxs("button", {
									type: "button",
									className: "theme-card",
									"aria-pressed": theme === "light",
									onClick: () => setTheme("light"),
									children: [/* @__PURE__ */ jsxs("div", {
										className: "theme-preview",
										children: [/* @__PURE__ */ jsx("div", { className: "theme-preview__bar" }), /* @__PURE__ */ jsx("div", { className: "theme-preview__card" })]
									}), /* @__PURE__ */ jsxs("div", {
										className: "theme-card__row",
										children: [
											/* @__PURE__ */ jsx(Sun, {
												size: 15,
												strokeWidth: 2
											}),
											"Светлая",
											theme === "light" && /* @__PURE__ */ jsx("span", {
												className: "theme-card__badge",
												children: "активна"
											})
										]
									})]
								}), /* @__PURE__ */ jsxs("button", {
									type: "button",
									className: "theme-card",
									"aria-pressed": theme === "dark",
									onClick: () => setTheme("dark"),
									children: [/* @__PURE__ */ jsxs("div", {
										className: "theme-preview theme-preview--dark",
										children: [/* @__PURE__ */ jsx("div", { className: "theme-preview__bar" }), /* @__PURE__ */ jsx("div", { className: "theme-preview__card" })]
									}), /* @__PURE__ */ jsxs("div", {
										className: "theme-card__row",
										children: [
											/* @__PURE__ */ jsx(Moon, {
												size: 15,
												strokeWidth: 2
											}),
											"Тёмная",
											theme === "dark" && /* @__PURE__ */ jsx("span", {
												className: "theme-card__badge",
												children: "активна"
											})
										]
									})]
								})]
							}),
							/* @__PURE__ */ jsxs("div", {
								style: { marginTop: 20 },
								children: [/* @__PURE__ */ jsx("div", {
									className: "field__label",
									style: { marginBottom: 8 },
									children: "Акцент"
								}), /* @__PURE__ */ jsx("div", {
									className: "row row--wrap",
									style: { gap: 8 },
									children: ACCENTS.map((item) => /* @__PURE__ */ jsx("button", {
										type: "button",
										className: "swatch-dot",
										style: {
											background: item.color,
											color: item.color,
											width: 26,
											height: 26
										},
										"aria-label": item.label,
										"aria-pressed": accent === item.value,
										onClick: () => setAccent(item.value)
									}, item.value))
								})]
							}),
							/* @__PURE__ */ jsxs("div", {
								style: { marginTop: 20 },
								children: [/* @__PURE__ */ jsx("div", {
									className: "field__label",
									style: { marginBottom: 8 },
									children: "Плотность"
								}), /* @__PURE__ */ jsxs("div", {
									className: "seg",
									role: "group",
									"aria-label": "Плотность",
									children: [/* @__PURE__ */ jsx("button", {
										type: "button",
										"aria-pressed": density === "comfort",
										onClick: () => setDensity("comfort"),
										children: "Просторно"
									}), /* @__PURE__ */ jsx("button", {
										type: "button",
										"aria-pressed": density === "compact",
										onClick: () => setDensity("compact"),
										children: "Компактно"
									})]
								})]
							})
						]
					})]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "card",
					children: [/* @__PURE__ */ jsx("div", {
						className: "card__head",
						children: /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", {
							className: "card__title",
							children: "Роль в макете"
						}), /* @__PURE__ */ jsx("div", {
							className: "card__sub",
							children: IS_ADMIN ? "Сейчас вы смотрите как администратор" : "Сейчас вы смотрите как менеджер"
						})] })
					}), /* @__PURE__ */ jsxs("div", {
						className: "card__body",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "seg",
							role: "group",
							"aria-label": "Роль в макете",
							children: [/* @__PURE__ */ jsx("button", {
								type: "button",
								"aria-pressed": role !== "admin",
								onClick: () => switchRole("manager"),
								children: "Менеджер"
							}), /* @__PURE__ */ jsx("button", {
								type: "button",
								"aria-pressed": role === "admin",
								onClick: () => switchRole("admin"),
								children: "Администратор"
							})]
						}), /* @__PURE__ */ jsx("div", {
							className: "muted",
							style: {
								fontSize: 11.5,
								marginTop: 10,
								lineHeight: 1.5
							},
							children: "Роль меняет только оформление макета: у администратора появляется раздел «Администрирование». Права в рабочей CRM проверяются на сервере."
						})]
					})]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "card",
					children: [/* @__PURE__ */ jsx("div", {
						className: "card__head",
						children: /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", {
							className: "card__title",
							children: "Демо-данные"
						}), /* @__PURE__ */ jsx("div", {
							className: "card__sub",
							children: "Вернуть стандартные этапы, лиды и заявки"
						})] })
					}), /* @__PURE__ */ jsx("div", {
						className: "card__body",
						children: /* @__PURE__ */ jsx(Button, {
							variant: "danger",
							icon: Trash2,
							onClick: () => {
								resetAll();
								flash();
							},
							children: "Сбросить мою воронку"
						})
					})]
				})
			]
		}), /* @__PURE__ */ jsxs("div", {
			className: "stack",
			children: [/* @__PURE__ */ jsxs("div", {
				className: "card",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "card__head",
					children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", {
						className: "card__title",
						children: "Моя воронка"
					}), /* @__PURE__ */ jsx("div", {
						className: "card__sub",
						children: "Этапы принадлежат менеджеру: название, цвет, подсказка и порядок"
					})] }), /* @__PURE__ */ jsx(Button, {
						size: "sm",
						icon: saved ? Check : Plus,
						onClick: () => addStage(),
						children: saved ? "Сохранено" : "Этап"
					})]
				}), /* @__PURE__ */ jsxs("div", {
					className: "card__body",
					style: {
						display: "flex",
						flexDirection: "column",
						gap: 10
					},
					children: [stages.map((stage, index) => /* @__PURE__ */ jsxs("div", {
						className: "stage-edit",
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "stage-edit__row",
								children: [
									/* @__PURE__ */ jsx("span", {
										className: "stage-edit__dot",
										style: { background: stage.color }
									}),
									/* @__PURE__ */ jsx("input", {
										className: "input",
										value: stage.name,
										"aria-label": `Название этапа ${index + 1}`,
										onChange: (event) => updateStage(stage.id, { name: event.target.value })
									}),
									/* @__PURE__ */ jsx("button", {
										type: "button",
										className: "col__btn",
										"aria-label": "Выше",
										disabled: index === 0,
										onClick: () => moveStage(stage.id, -1),
										children: /* @__PURE__ */ jsx(ArrowUp, {
											size: 15,
											strokeWidth: 2
										})
									}),
									/* @__PURE__ */ jsx("button", {
										type: "button",
										className: "col__btn",
										"aria-label": "Ниже",
										disabled: index === stages.length - 1,
										onClick: () => moveStage(stage.id, 1),
										children: /* @__PURE__ */ jsx(ArrowDown, {
											size: 15,
											strokeWidth: 2
										})
									}),
									/* @__PURE__ */ jsx("button", {
										type: "button",
										className: "col__btn",
										"aria-label": "Удалить этап",
										disabled: stages.length <= 1,
										title: stages.length <= 1 ? "Должен остаться хотя бы один этап" : countFor(stage.id) ? "Лиды этапа перейдут на соседний этап" : "Удалить этап",
										onClick: () => removeStage(stage.id),
										children: /* @__PURE__ */ jsx(Trash2, {
											size: 15,
											strokeWidth: 2,
											style: { color: "var(--danger)" }
										})
									})
								]
							}),
							/* @__PURE__ */ jsx("input", {
								className: "input input--sm",
								value: stage.hint,
								"aria-label": `Подсказка этапа ${index + 1}`,
								placeholder: "Подсказка под названием колонки",
								onChange: (event) => updateStage(stage.id, { hint: event.target.value })
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "row row--wrap",
								style: { gap: 6 },
								children: [STAGE_COLORS.map((color) => /* @__PURE__ */ jsx("button", {
									type: "button",
									className: "swatch-dot",
									style: {
										background: color,
										color
									},
									"aria-label": `Цвет ${color}`,
									"aria-pressed": stage.color === color,
									onClick: () => updateStage(stage.id, { color })
								}, color)), /* @__PURE__ */ jsxs("span", {
									className: "muted",
									style: {
										marginLeft: "auto",
										fontSize: 11
									},
									children: [countFor(stage.id), " лидов"]
								})]
							})
						]
					}, stage.id)), /* @__PURE__ */ jsx(Button, {
						variant: "soft",
						size: "sm",
						icon: Plus,
						onClick: () => addStage(),
						children: "Добавить этап"
					})]
				})]
			}), /* @__PURE__ */ jsx("div", {
				className: "stub",
				children: /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("b", { children: "Как работает." }), " Этапы сохраняются в браузере и применяются сразу: переименуйте колонку — она изменится на доске, перетащите карточку — лид перейдёт на другой этап. В рабочей CRM это те же действия, только через API сотрудника."] })
			})]
		})]
	}) });
}
// src/pages/TasksPage.jsx
/** Задачи менеджера: четыре колонки по срокам, фильтры, создание и отметка «выполнено». */
var COLUMNS = [
	{
		status: "overdue",
		title: "Просрочено",
		color: "var(--danger)"
	},
	{
		status: "today",
		title: "Сегодня",
		color: "var(--warn)"
	},
	{
		status: "upcoming",
		title: "Предстоящие",
		color: "var(--accent)"
	},
	{
		status: "done",
		title: "Выполнено",
		color: "var(--money)"
	}
];
var ICONS = {
	phone: Phone,
	mail: Mail,
	calendar: CalendarDays,
	file: FileText
};
var myTasks = TASKS.filter((task) => task.ownerId === ME.id);
function TasksPage() {
	const { shipments } = useLeads();
	const [tasks, setTasks] = useState(myTasks);
	const [type, setType] = useState("all");
	const [open, setOpen] = useState(false);
	const [draft, setDraft] = useState({
		title: "",
		company: "",
		type: "call"
	});
	const visible = useMemo(() => tasks.filter((task) => type === "all" ? true : task.type === type), [tasks, type]);
	function toggle(task) {
		setTasks((prev) => prev.map((item) => item.id === task.id ? {
			...item,
			status: item.status === "done" ? "upcoming" : "done"
		} : item));
	}
	function addTask() {
		if (!draft.title.trim()) return;
		setTasks((prev) => [{
			id: Math.max(...prev.map((item) => item.id)) + 1,
			type: draft.type,
			title: draft.title,
			company: draft.company || "Без компании",
			leadId: 1,
			time: "завтра 10:00",
			phone: "+7 900 000-00-00",
			ownerId: ME.id,
			status: "upcoming"
		}, ...prev]);
		setDraft({
			title: "",
			company: "",
			type: "call"
		});
		setOpen(false);
	}
	return /* @__PURE__ */ jsxs(Shell, { children: [
		/* @__PURE__ */ jsxs("div", {
			className: "toolbar",
			children: [
				/* @__PURE__ */ jsx(Chip, {
					active: type === "all",
					count: tasks.filter((task) => task.status !== "done").length,
					onClick: () => setType("all"),
					children: "Все"
				}),
				/* @__PURE__ */ jsx(Chip, {
					active: type === "call",
					count: tasks.filter((t) => t.type === "call").length,
					onClick: () => setType("call"),
					children: "Звонки"
				}),
				/* @__PURE__ */ jsx(Chip, {
					active: type === "email",
					count: tasks.filter((t) => t.type === "email").length,
					onClick: () => setType("email"),
					children: "Письма"
				}),
				/* @__PURE__ */ jsx(Chip, {
					active: type === "quote",
					count: tasks.filter((t) => t.type === "quote").length,
					onClick: () => setType("quote"),
					children: "Ставки"
				}),
				/* @__PURE__ */ jsx("div", {
					className: "toolbar__right",
					children: /* @__PURE__ */ jsx(Button, {
						variant: "primary",
						icon: Plus,
						onClick: () => setOpen(true),
						children: "Задача"
					})
				})
			]
		}),
		/* @__PURE__ */ jsx("div", {
			className: "task-board",
			children: COLUMNS.map((column) => {
				const items = visible.filter((task) => task.status === column.status);
				return /* @__PURE__ */ jsxs("section", {
					className: "task-col",
					"aria-label": column.title,
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "task-col__head",
							children: [
								/* @__PURE__ */ jsx("span", {
									className: "task-col__dot",
									style: { background: column.color }
								}),
								column.title,
								/* @__PURE__ */ jsx("span", {
									className: "task-col__count",
									children: items.length
								})
							]
						}),
						items.map((task) => {
							const meta = TASK_TYPES[task.type];
							const Icon = ICONS[meta.icon];
							const done = task.status === "done";
							return /* @__PURE__ */ jsxs("article", {
								className: `task-card${done ? " task-card--done" : ""}`,
								children: [
									/* @__PURE__ */ jsxs("div", {
										className: "task-card__top",
										children: [/* @__PURE__ */ jsx("span", {
											className: `task-card__type ${meta.cls}`,
											style: { background: "var(--surface-3)" },
											children: /* @__PURE__ */ jsx(Icon, {
												size: 14,
												strokeWidth: 1.9
											})
										}), /* @__PURE__ */ jsxs("div", {
											className: "grow",
											children: [/* @__PURE__ */ jsx("div", {
												className: "task-card__title",
												children: task.title
											}), /* @__PURE__ */ jsx("div", {
												className: "task-card__company",
												children: task.company
											})]
										})]
									}),
									/* @__PURE__ */ jsxs("div", {
										className: "task-card__meta",
										children: [/* @__PURE__ */ jsx("span", { children: task.time }), /* @__PURE__ */ jsx("span", {
											className: "mono",
											children: task.phone
										})]
									}),
									/* @__PURE__ */ jsxs("div", {
										className: "task-card__foot",
										children: [
											/* @__PURE__ */ jsx("button", {
												type: "button",
												className: "task-check",
												"aria-pressed": done,
												"aria-label": done ? "Вернуть в работу" : "Отметить выполненной",
												onClick: () => toggle(task),
												children: /* @__PURE__ */ jsx(Check, {
													size: 13,
													strokeWidth: 3
												})
											}),
											/* @__PURE__ */ jsxs(Link, {
												to: `/crm/leads/${task.leadId}`,
												className: "muted",
												style: {
													fontSize: 11,
													display: "inline-flex",
													alignItems: "center",
													gap: 4
												},
												children: [/* @__PURE__ */ jsx(Target, {
													size: 12,
													strokeWidth: 2
												}), "Открыть лид"]
											}),
											/* @__PURE__ */ jsx("span", {
												title: "Маржа заявок лида",
												style: {
													marginLeft: "auto",
													fontSize: 12,
													fontWeight: 650
												},
												children: shortMoney(leadShipmentMargin(task.leadId, shipments))
											}),
											/* @__PURE__ */ jsx(Avatar, {
												initials: ME.initials,
												size: "sm",
												title: ME.name
											})
										]
									})
								]
							}, task.id);
						}),
						items.length === 0 && /* @__PURE__ */ jsx("div", {
							className: "muted",
							style: {
								fontSize: 12,
								padding: "14px 6px"
							},
							children: "Пусто"
						}),
						/* @__PURE__ */ jsxs("button", {
							type: "button",
							className: "btn btn--ghost btn--sm",
							style: {
								justifyContent: "flex-start",
								color: "var(--ink-3)"
							},
							onClick: () => setOpen(true),
							children: [/* @__PURE__ */ jsx(Plus, {
								size: 14,
								strokeWidth: 2
							}), "Добавить задачу"]
						})
					]
				}, column.status);
			})
		}),
		/* @__PURE__ */ jsxs(Modal, {
			open,
			title: "Новая задача",
			onClose: () => setOpen(false),
			footer: /* @__PURE__ */ jsxs(Fragment$1, { children: [/* @__PURE__ */ jsx(Button, {
				variant: "ghost",
				onClick: () => setOpen(false),
				children: "Отмена"
			}), /* @__PURE__ */ jsx(Button, {
				variant: "primary",
				onClick: addTask,
				children: "Создать"
			})] }),
			children: [
				/* @__PURE__ */ jsx(Field, {
					label: "Что сделать",
					children: /* @__PURE__ */ jsx(Input, {
						autoFocus: true,
						placeholder: "Например: перезвонить и уточнить маршрут",
						value: draft.title,
						onChange: (event) => setDraft({
							...draft,
							title: event.target.value
						})
					})
				}),
				/* @__PURE__ */ jsx(Field, {
					label: "Компания",
					children: /* @__PURE__ */ jsx(Input, {
						placeholder: "ООО «…»",
						value: draft.company,
						onChange: (event) => setDraft({
							...draft,
							company: event.target.value
						})
					})
				}),
				/* @__PURE__ */ jsx(Field, {
					label: "Тип",
					hint: `Ответственный — ${ME.name}, задачи создаются на себя`,
					children: /* @__PURE__ */ jsxs(Select, {
						value: draft.type,
						onChange: (event) => setDraft({
							...draft,
							type: event.target.value
						}),
						children: [
							/* @__PURE__ */ jsx("option", {
								value: "call",
								children: "Звонок"
							}),
							/* @__PURE__ */ jsx("option", {
								value: "email",
								children: "Письмо"
							}),
							/* @__PURE__ */ jsx("option", {
								value: "meeting",
								children: "Встреча"
							}),
							/* @__PURE__ */ jsx("option", {
								value: "quote",
								children: "Ставка"
							})
						]
					})
				})
			]
		})
	] });
}
// src/ui/Segmented.jsx
/** Сегментированный переключатель: вид, плотность, сегменты. */
function Segmented({ value, options, onChange, label }) {
	return /* @__PURE__ */ jsx("div", {
		className: "seg",
		role: "group",
		"aria-label": label,
		children: options.map((option) => /* @__PURE__ */ jsx("button", {
			type: "button",
			"aria-pressed": value === option.value,
			onClick: () => onChange?.(option.value),
			children: option.label
		}, option.value))
	});
}
// src/pages/AnalyticsPage.jsx
/** Личная аналитика: период, своя воронка, поступление лидов, крупные сделки, источники. */
var PERIODS = [
	{
		value: "week",
		label: "Неделя"
	},
	{
		value: "month",
		label: "Месяц"
	},
	{
		value: "quarter",
		label: "Квартал"
	}
];
/** Период влияет на поступление лидов и конверсию, но не на фактическую маржу заявок. */
var PERIOD_INFO = {
	week: {
		label: "за неделю",
		conversion: 19
	},
	month: {
		label: "за месяц",
		conversion: 24
	},
	quarter: {
		label: "за квартал",
		conversion: 27
	}
};
function InflowChart({ data }) {
	const width = 640;
	const height = 170;
	const pad = 8;
	const max = Math.max(...data) || 1;
	const stepX = 624 / (data.length - 1);
	const points = data.map((value, index) => {
		return [pad + index * stepX, 162 - value / max * 154];
	});
	const line = points.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
	const area = `${line} L632,162 L${pad},162 Z`;
	return /* @__PURE__ */ jsxs("svg", {
		className: "chart",
		viewBox: `0 0 ${width} ${height}`,
		preserveAspectRatio: "none",
		role: "img",
		"aria-label": "Поступление моих лидов",
		children: [
			/* @__PURE__ */ jsx("defs", { children: /* @__PURE__ */ jsxs("linearGradient", {
				id: "inflow",
				x1: "0",
				y1: "0",
				x2: "0",
				y2: "1",
				children: [/* @__PURE__ */ jsx("stop", {
					offset: "0%",
					stopColor: "var(--accent)",
					stopOpacity: "0.28"
				}), /* @__PURE__ */ jsx("stop", {
					offset: "100%",
					stopColor: "var(--accent)",
					stopOpacity: "0"
				})]
			}) }),
			[
				.25,
				.5,
				.75
			].map((ratio) => /* @__PURE__ */ jsx("line", {
				x1: pad,
				x2: 632,
				y1: height * ratio,
				y2: height * ratio,
				stroke: "var(--line)",
				strokeWidth: "1",
				strokeDasharray: "4 6"
			}, ratio)),
			/* @__PURE__ */ jsx("path", {
				d: area,
				fill: "url(#inflow)"
			}),
			/* @__PURE__ */ jsx("path", {
				d: line,
				fill: "none",
				stroke: "var(--accent)",
				strokeWidth: "2.5",
				strokeLinecap: "round"
			}),
			points.map(([x, y], index) => /* @__PURE__ */ jsx("circle", {
				cx: x,
				cy: y,
				r: "3",
				fill: "var(--surface)",
				stroke: "var(--accent)",
				strokeWidth: "2"
			}, index))
		]
	});
}
function AnalyticsPage() {
	const { leads, stages, shipments } = useLeads();
	const [period, setPeriod] = useState("month");
	const myLeads = useMemo(() => leads.filter((lead) => lead.ownerId === ME.id && !lead.lost), [leads]);
	const myLeadIds = useMemo(() => new Set(myLeads.map((lead) => lead.id)), [myLeads]);
	const myShipments = useMemo(() => shipments.filter((shipment) => myLeadIds.has(shipment.leadId)), [myLeadIds, shipments]);
	const marginOf = (lead) => leadShipmentMargin(lead.id, shipments);
	const stats = useMemo(() => {
		const margin = myLeads.reduce((total, lead) => total + marginOf(lead), 0);
		return {
			margin,
			potential: myLeads.filter((lead) => lead.stageId === stages[3]?.id).length,
			marginLeads: myLeads.filter((lead) => marginOf(lead) !== 0).length,
			avg: myLeads.length ? Math.round(margin / myLeads.length) : 0
		};
	}, [
		myLeads,
		shipments,
		stages
	]);
	const funnel = useMemo(() => {
		const max = Math.max(...stages.map((stage) => myLeads.filter((lead) => lead.stageId === stage.id).length)) || 1;
		return stages.map((stage) => {
			const stageLeads = myLeads.filter((lead) => lead.stageId === stage.id);
			return {
				name: stage.name,
				color: stage.color,
				count: stageLeads.length,
				margin: stageLeads.reduce((total, lead) => total + marginOf(lead), 0),
				width: Math.round(stageLeads.length / max * 92) + 8
			};
		});
	}, [
		myLeads,
		shipments,
		stages
	]);
	const topDeals = useMemo(() => [...myLeads].filter((lead) => marginOf(lead) !== 0).sort((a, b) => marginOf(b) - marginOf(a)).slice(0, 4), [myLeads, shipments]);
	const maxDeal = topDeals.length ? marginOf(topDeals[0]) || 1 : 1;
	const inflow = ANALYTICS[period].inflow;
	const sources = ANALYTICS[period].sources;
	const periodInfo = PERIOD_INFO[period] ?? PERIOD_INFO.month;
	const kpi = [
		{
			label: "Маржа заявок",
			value: shortMoney(stats.margin),
			foot: `${myShipments.length} ${myShipments.length === 1 ? "заявка" : "заявок"} по моим лидам`,
			color: "var(--stage-4)"
		},
		{
			label: "Конверсия",
			value: `${periodInfo.conversion}%`,
			foot: `в потенциальных ${periodInfo.label}`,
			color: "var(--stage-5)"
		},
		{
			label: "Средняя маржа",
			value: shortMoney(stats.avg),
			foot: "на один лид",
			color: "var(--stage-1)"
		},
		{
			label: "Лиды с заявками",
			value: String(stats.marginLeads),
			foot: `${myLeads.length ? Math.round(stats.marginLeads / myLeads.length * 100) : 0}% моей воронки`,
			color: "var(--stage-2)"
		}
	];
	return /* @__PURE__ */ jsxs(Shell, { children: [
		/* @__PURE__ */ jsxs("div", {
			className: "toolbar",
			children: [/* @__PURE__ */ jsx(Segmented, {
				label: "Период",
				value: period,
				onChange: setPeriod,
				options: PERIODS
			}), /* @__PURE__ */ jsx("div", {
				className: "toolbar__right",
				children: /* @__PURE__ */ jsx("span", {
					className: "muted",
					style: { fontSize: 11.5 },
					children: "Только мои лиды"
				})
			})]
		}),
		/* @__PURE__ */ jsx("div", {
			className: "kpi-grid",
			style: { marginBottom: 14 },
			children: kpi.map((item) => /* @__PURE__ */ jsxs("div", {
				className: "kpi",
				style: { "--kpi": item.color },
				children: [
					/* @__PURE__ */ jsx("span", {
						className: "kpi__label",
						children: item.label
					}),
					/* @__PURE__ */ jsx("span", {
						className: "kpi__value",
						children: item.value
					}),
					/* @__PURE__ */ jsxs("span", {
						className: "kpi__foot",
						children: [/* @__PURE__ */ jsx(ArrowUpRight, {
							size: 12,
							strokeWidth: 2.4,
							style: { color: "var(--money)" }
						}), item.foot]
					})
				]
			}, item.label))
		}),
		/* @__PURE__ */ jsxs("div", {
			className: "grid grid--2-1",
			children: [/* @__PURE__ */ jsxs("div", {
				className: "stack",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "card",
					children: [/* @__PURE__ */ jsx("div", {
						className: "card__head",
						children: /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", {
							className: "card__title",
							children: "Моя воронка"
						}), /* @__PURE__ */ jsx("div", {
							className: "card__sub",
							children: "Лиды и маржа заявок по этапам"
						})] })
					}), /* @__PURE__ */ jsx("div", {
						className: "card__body",
						children: funnel.map((stage) => /* @__PURE__ */ jsxs("div", {
							className: "bar-row",
							children: [
								/* @__PURE__ */ jsxs("span", {
									className: "bar-row__name",
									children: [/* @__PURE__ */ jsx("span", {
										className: "bar-row__dot",
										style: { background: stage.color }
									}), stage.name]
								}),
								/* @__PURE__ */ jsx("span", {
									className: "bar-row__track",
									children: /* @__PURE__ */ jsx("span", {
										className: "bar-row__fill",
										style: {
											width: `${stage.width}%`,
											background: stage.color
										}
									})
								}),
								/* @__PURE__ */ jsxs("span", {
									className: "bar-row__value",
									children: [
										stage.count,
										" · ",
										shortMoney(stage.margin)
									]
								})
							]
						}, stage.name))
					})]
				}), /* @__PURE__ */ jsxs("div", {
					className: "card",
					children: [/* @__PURE__ */ jsx("div", {
						className: "card__head",
						children: /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", {
							className: "card__title",
							children: "Поступление лидов"
						}), /* @__PURE__ */ jsx("div", {
							className: "card__sub",
							children: "Динамика за 8 недель"
						})] })
					}), /* @__PURE__ */ jsxs("div", {
						className: "card__body",
						children: [/* @__PURE__ */ jsx(InflowChart, { data: inflow }), /* @__PURE__ */ jsxs("div", {
							className: "chart-legend",
							children: [/* @__PURE__ */ jsxs("span", { children: [/* @__PURE__ */ jsx("span", {
								className: "bar-row__dot",
								style: { background: "var(--accent)" }
							}), "Мои новые лиды"] }), /* @__PURE__ */ jsxs("span", {
								style: { marginLeft: "auto" },
								children: ["Всего: ", /* @__PURE__ */ jsx("b", {
									style: { color: "var(--ink)" },
									children: inflow.reduce((a, b) => a + b, 0)
								})]
							})]
						})]
					})]
				})]
			}), /* @__PURE__ */ jsxs("div", {
				className: "stack",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "card",
					children: [/* @__PURE__ */ jsx("div", {
						className: "card__head",
						children: /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", {
							className: "card__title",
							children: "Лиды с заявками"
						}), /* @__PURE__ */ jsx("div", {
							className: "card__sub",
							children: "Мои лиды по марже заявок"
						})] })
					}), /* @__PURE__ */ jsx("div", {
						className: "card__body",
						style: { paddingTop: 6 },
						children: topDeals.map((deal) => {
							const margin = marginOf(deal);
							return /* @__PURE__ */ jsxs("div", {
								className: "mgr-row",
								children: [
									/* @__PURE__ */ jsx(Avatar, {
										initials: deal.name.replace(/[^А-Яа-яA-Za-z]/g, "").slice(0, 2),
										size: "sm"
									}),
									/* @__PURE__ */ jsxs("div", {
										style: { minWidth: 0 },
										children: [/* @__PURE__ */ jsx("div", {
											className: "mgr-row__name truncate",
											children: deal.name
										}), /* @__PURE__ */ jsx("div", {
											className: "mgr-row__sub truncate",
											children: deal.route
										})]
									}),
									/* @__PURE__ */ jsx("span", {
										className: "mgr-bar",
										children: /* @__PURE__ */ jsx("span", {
											className: "mgr-bar__fill",
											style: { width: `${Math.round(margin / maxDeal * 100)}%` }
										})
									}),
									/* @__PURE__ */ jsx("span", {
										className: "mgr-row__sum",
										children: shortMoney(margin)
									})
								]
							}, deal.id);
						})
					})]
				}), /* @__PURE__ */ jsxs("div", {
					className: "card",
					children: [/* @__PURE__ */ jsx("div", {
						className: "card__head",
						children: /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", {
							className: "card__title",
							children: "Мои источники"
						}), /* @__PURE__ */ jsx("div", {
							className: "card__sub",
							children: "Откуда приходят клиенты"
						})] })
					}), /* @__PURE__ */ jsx("div", {
						className: "card__body",
						style: { paddingTop: 8 },
						children: sources.map((source) => /* @__PURE__ */ jsxs("div", {
							className: "bar-row",
							children: [
								/* @__PURE__ */ jsx("span", {
									className: "bar-row__name",
									children: source.name
								}),
								/* @__PURE__ */ jsx("span", {
									className: "bar-row__track",
									children: /* @__PURE__ */ jsx("span", {
										className: "bar-row__fill",
										style: { width: `${source.width}%` }
									})
								}),
								/* @__PURE__ */ jsx("span", {
									className: "bar-row__value",
									children: source.count
								})
							]
						}, source.name))
					})]
				})]
			})]
		})
	] });
}
// src/pages/KitPage.jsx
/** Витрина дизайн-системы (/kit): токены, кнопки, поля, статусы, таблицы, состояния. */
var PALETTE = [
	["Бумага", "--paper"],
	["Поверхность", "--surface"],
	["Поверхность 2", "--surface-2"],
	["Поверхность 3", "--surface-3"],
	["Чернила", "--ink"],
	["Текст 2", "--ink-2"],
	["Текст 3", "--ink-3"],
	["Линия", "--line"],
	["Линия сильная", "--line-strong"],
	["Сигнал", "--signal"],
	["Сигнал мягкий", "--signal-soft"],
	["Деньги", "--money"],
	["Деньги мягкий", "--money-soft"],
	["Внимание", "--warn"],
	["Опасность", "--danger"]
];
var STAGES = [
	["Этап 1", "--stage-1"],
	["Этап 2", "--stage-2"],
	["Этап 3", "--stage-3"],
	["Этап 4", "--stage-4"],
	["Этап 5", "--stage-5"]
];
/** Пересчитываем hex при смене темы, чтобы витрина не врала. */
function useComputedColors(vars) {
	const [colors, setColors] = useState({});
	useEffect(() => {
		function read() {
			const style = getComputedStyle(document.documentElement);
			const next = {};
			for (const [, name] of vars) next[name] = style.getPropertyValue(name).trim();
			setColors(next);
		}
		read();
		const observer = new MutationObserver(read);
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["data-theme"]
		});
		return () => observer.disconnect();
	}, []);
	return colors;
}
function Section({ title, note, children }) {
	return /* @__PURE__ */ jsxs("section", {
		className: "kit-section",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "kit-section__head",
			children: [/* @__PURE__ */ jsx("h2", {
				className: "kit-section__title",
				children: title
			}), note && /* @__PURE__ */ jsx("span", {
				className: "kit-section__note",
				children: note
			})]
		}), children]
	});
}
function KitPage() {
	const colors = useComputedColors([...PALETTE, ...STAGES]);
	const [view, setView] = useState("kanban");
	const [density, setDensity] = useState("comfort");
	const [modal, setModal] = useState(false);
	const [stars, setStars] = useState(2);
	const [search, setSearch] = useState("");
	return /* @__PURE__ */ jsxs(Shell, {
		title: "Дизайн-система",
		crumb: "Служебная витрина · шаг 1",
		actions: null,
		search,
		onSearch: setSearch,
		children: [
			/* @__PURE__ */ jsx("div", {
				className: "page__head",
				children: /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h1", {
					className: "page__title",
					children: "Дизайн-система"
				}), /* @__PURE__ */ jsx("p", {
					className: "page__sub",
					children: "Токены, типографика и элементы, из которых собираются экраны CRM."
				})] })
			}),
			/* @__PURE__ */ jsxs(Section, {
				title: "Палитра",
				note: "светлая и тёмная темы используют одни и те же роли",
				children: [/* @__PURE__ */ jsx("div", {
					className: "swatches",
					children: PALETTE.map(([label, variable]) => /* @__PURE__ */ jsxs("div", {
						className: "swatch",
						children: [/* @__PURE__ */ jsx("div", {
							className: "swatch__color",
							style: { background: `var(${variable})` }
						}), /* @__PURE__ */ jsxs("div", {
							className: "swatch__meta",
							children: [/* @__PURE__ */ jsx("span", {
								className: "swatch__name",
								children: label
							}), /* @__PURE__ */ jsx("span", {
								className: "swatch__hex",
								children: colors[variable] || variable
							})]
						})]
					}, variable))
				}), /* @__PURE__ */ jsx("div", {
					className: "swatches",
					style: {
						marginTop: 10,
						gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))"
					},
					children: STAGES.map(([label, variable]) => /* @__PURE__ */ jsxs("div", {
						className: "swatch",
						children: [/* @__PURE__ */ jsx("div", {
							className: "swatch__color",
							style: {
								background: `var(${variable})`,
								height: 34
							}
						}), /* @__PURE__ */ jsxs("div", {
							className: "swatch__meta",
							children: [/* @__PURE__ */ jsx("span", {
								className: "swatch__name",
								children: label
							}), /* @__PURE__ */ jsx("span", {
								className: "swatch__hex",
								children: colors[variable] || variable
							})]
						})]
					}, variable))
				})]
			}),
			/* @__PURE__ */ jsxs(Section, {
				title: "Типографика",
				note: "Inter Tight · Inter · JetBrains Mono",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "type-row",
						children: [/* @__PURE__ */ jsx("span", {
							className: "type-row__meta",
							children: "44 / display"
						}), /* @__PURE__ */ jsx("span", {
							className: "display",
							style: { fontSize: 44 },
							children: "₽ 2 431 900"
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "type-row",
						children: [/* @__PURE__ */ jsx("span", {
							className: "type-row__meta",
							children: "30 / h1"
						}), /* @__PURE__ */ jsx("span", {
							className: "page__title",
							children: "Лиды в работе"
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "type-row",
						children: [/* @__PURE__ */ jsx("span", {
							className: "type-row__meta",
							children: "17 / h2"
						}), /* @__PURE__ */ jsx("span", {
							style: {
								fontFamily: "var(--font-display)",
								fontSize: 17,
								fontWeight: 600
							},
							children: "Заявки на перевозку"
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "type-row",
						children: [/* @__PURE__ */ jsx("span", {
							className: "type-row__meta",
							children: "14 / text"
						}), /* @__PURE__ */ jsx("span", { children: "ООО «Северный путь» — 12 заявок, маржа 340 000 ₽" })]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "type-row",
						children: [/* @__PURE__ */ jsx("span", {
							className: "type-row__meta",
							children: "12 / secondary"
						}), /* @__PURE__ */ jsx("span", {
							style: { color: "var(--ink-2)" },
							children: "ИНН 7701234567 · логист Ирина Морозова"
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "type-row",
						children: [/* @__PURE__ */ jsx("span", {
							className: "type-row__meta",
							children: "10 / micro"
						}), /* @__PURE__ */ jsx("span", {
							className: "micro",
							children: "Без движения · 4 дня"
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "type-row",
						children: [/* @__PURE__ */ jsx("span", {
							className: "type-row__meta",
							children: "mono"
						}), /* @__PURE__ */ jsx("span", {
							className: "mono",
							style: { fontSize: 13 },
							children: "ЗВ-2026-0148"
						})]
					})
				]
			}),
			/* @__PURE__ */ jsxs(Section, {
				title: "Кнопки",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "kit-grid",
					children: [
						/* @__PURE__ */ jsx(Button, {
							variant: "primary",
							children: "Создать лид"
						}),
						/* @__PURE__ */ jsx(Button, {
							variant: "primary",
							children: "Начать обзвон"
						}),
						/* @__PURE__ */ jsx(Button, { children: "Копировать" }),
						/* @__PURE__ */ jsx(Button, {
							variant: "quiet",
							children: "Отмена"
						}),
						/* @__PURE__ */ jsx(Button, {
							variant: "danger",
							children: "Удалить"
						}),
						/* @__PURE__ */ jsx(Button, {
							variant: "primary",
							disabled: true,
							children: "Недоступно"
						})
					]
				}), /* @__PURE__ */ jsxs("div", {
					className: "kit-grid",
					style: { marginTop: 14 },
					children: [
						/* @__PURE__ */ jsx(Button, {
							size: "sm",
							variant: "primary",
							icon: ArrowUpRight,
							children: "Открыть"
						}),
						/* @__PURE__ */ jsx(Button, {
							size: "lg",
							variant: "primary",
							children: "Сохранить и выйти"
						}),
						/* @__PURE__ */ jsx(Button, {
							icon: Phone,
							children: "Позвонить"
						}),
						/* @__PURE__ */ jsx(IconButton, {
							icon: Package,
							label: "Заявки"
						})
					]
				})]
			}),
			/* @__PURE__ */ jsx(Section, {
				title: "Поля и поиск",
				children: /* @__PURE__ */ jsxs("div", {
					style: {
						display: "grid",
						gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
						gap: 16,
						maxWidth: 760
					},
					children: [
						/* @__PURE__ */ jsx(Field, {
							label: "Клиент",
							htmlFor: "kit-name",
							children: /* @__PURE__ */ jsx(Input, {
								id: "kit-name",
								defaultValue: "ООО «Северный путь»"
							})
						}),
						/* @__PURE__ */ jsx(Field, {
							label: "Этап",
							htmlFor: "kit-stage",
							children: /* @__PURE__ */ jsxs(Select, {
								id: "kit-stage",
								defaultValue: "2",
								children: [
									/* @__PURE__ */ jsx("option", {
										value: "1",
										children: "Новый"
									}),
									/* @__PURE__ */ jsx("option", {
										value: "2",
										children: "Перезвонить"
									}),
									/* @__PURE__ */ jsx("option", {
										value: "3",
										children: "Вышел на ЛПР"
									})
								]
							})
						}),
						/* @__PURE__ */ jsx(Field, {
							label: "Поиск",
							hint: "находим по названию, ИНН или номеру",
							children: /* @__PURE__ */ jsx(SearchInput, {
								value: search,
								onChange: setSearch,
								kbd: null,
								placeholder: "Начните вводить"
							})
						}),
						/* @__PURE__ */ jsx(Field, {
							label: "Комментарий",
							children: /* @__PURE__ */ jsx(Textarea, {
								placeholder: "Дополнительные условия, договорённости…",
								rows: 3
							})
						})
					]
				})
			}),
			/* @__PURE__ */ jsxs(Section, {
				title: "Метки, статусы, фильтры",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "kit-grid",
					children: [
						/* @__PURE__ */ jsx(Tag, {
							color: "var(--stage-3)",
							children: "Постоянный клиент"
						}),
						/* @__PURE__ */ jsx(Tag, {
							color: "var(--stage-2)",
							children: "Ждёт КП"
						}),
						/* @__PURE__ */ jsx(Tag, {
							color: "var(--stage-5)",
							children: "Оплата вовремя"
						}),
						/* @__PURE__ */ jsx(Status, {
							tone: "new",
							children: "Новая"
						}),
						/* @__PURE__ */ jsx(Status, {
							tone: "progress",
							children: "В работе"
						}),
						/* @__PURE__ */ jsx(Status, {
							tone: "done",
							children: "Выгружена"
						}),
						/* @__PURE__ */ jsx(Status, {
							tone: "lost",
							children: "Проигран"
						})
					]
				}), /* @__PURE__ */ jsxs("div", {
					className: "kit-grid",
					style: { marginTop: 14 },
					children: [
						/* @__PURE__ */ jsx(Chip, {
							active: true,
							count: 24,
							children: "Все"
						}),
						/* @__PURE__ */ jsx(Chip, {
							count: 9,
							children: "Новые"
						}),
						/* @__PURE__ */ jsx(Chip, {
							count: 12,
							children: "В работе"
						}),
						/* @__PURE__ */ jsx(Chip, {
							count: 3,
							children: "Требуют звонка"
						})
					]
				})]
			}),
			/* @__PURE__ */ jsx(Section, {
				title: "Переключатели, аватары, состояния",
				children: /* @__PURE__ */ jsxs("div", {
					className: "kit-grid",
					style: {
						alignItems: "flex-start",
						gap: 24
					},
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "kit-col",
							children: [
								/* @__PURE__ */ jsx(Segmented, {
									label: "Вид",
									value: view,
									onChange: setView,
									options: [{
										value: "kanban",
										label: "Канбан"
									}, {
										value: "list",
										label: "Список"
									}]
								}),
								/* @__PURE__ */ jsx(Segmented, {
									label: "Плотность",
									value: density,
									onChange: setDensity,
									options: [{
										value: "compact",
										label: "Компактно"
									}, {
										value: "comfort",
										label: "Просторно"
									}]
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "kit-grid",
									children: [
										/* @__PURE__ */ jsx(Avatar, { initials: "АК" }),
										/* @__PURE__ */ jsx(Avatar, { initials: "ИМ" }),
										/* @__PURE__ */ jsx(Avatar, {
											initials: "СД",
											size: "lg"
										})
									]
								}),
								/* @__PURE__ */ jsx(Button, {
									onClick: () => setModal(true),
									children: "Показать модалку"
								})
							]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "card",
							style: {
								flex: 1,
								minWidth: 280
							},
							children: [/* @__PURE__ */ jsx("div", {
								className: "card__head",
								children: /* @__PURE__ */ jsx("span", {
									className: "card__title",
									children: "Пустое состояние"
								})
							}), /* @__PURE__ */ jsx(Empty, {
								title: "Здесь пока никого",
								text: "Как только появится первый лид, карточка займёт своё место в колонке.",
								action: /* @__PURE__ */ jsx(Button, {
									size: "sm",
									variant: "primary",
									children: "Создать лид"
								})
							})]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "card",
							style: {
								flex: 1,
								minWidth: 280
							},
							children: [/* @__PURE__ */ jsx("div", {
								className: "card__head",
								children: /* @__PURE__ */ jsx("span", {
									className: "card__title",
									children: "Загрузка"
								})
							}), /* @__PURE__ */ jsxs("div", {
								className: "card__body",
								style: {
									display: "flex",
									flexDirection: "column",
									gap: 10
								},
								children: [
									/* @__PURE__ */ jsx(Skeleton, {
										width: "62%",
										height: 16
									}),
									/* @__PURE__ */ jsx(Skeleton, { width: "88%" }),
									/* @__PURE__ */ jsx(Skeleton, { width: "74%" }),
									/* @__PURE__ */ jsx(Skeleton, { width: "40%" })
								]
							})]
						})
					]
				})
			}),
			/* @__PURE__ */ jsxs(Section, {
				title: "Лид: приоритет, теги, ошибки",
				note: "образцы состояний для переноса в рабочую CRM",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "kit-grid",
					style: {
						alignItems: "flex-start",
						gap: 24
					},
					children: [/* @__PURE__ */ jsxs("div", {
						className: "kit-col",
						children: [
							/* @__PURE__ */ jsx("span", {
								className: "kit-section__note",
								children: "Приоритет 0–3: клик ставит, повторный клик снимает"
							}),
							/* @__PURE__ */ jsx(StarRating, {
								value: stars,
								onChange: setStars
							}),
							/* @__PURE__ */ jsx("div", {
								className: "kit-grid",
								children: [
									0,
									1,
									2,
									3
								].map((value) => /* @__PURE__ */ jsx(StarRating, {
									value,
									size: "sm"
								}, value))
							}),
							/* @__PURE__ */ jsx("span", {
								className: "lead-card__error",
								children: "Карточка уже изменена. Доска обновлена — выберите приоритет ещё раз."
							}),
							/* @__PURE__ */ jsx("span", {
								className: "lead-card__error",
								children: "Не удалось сохранить приоритет."
							})
						]
					}), /* @__PURE__ */ jsxs("div", {
						className: "kit-col",
						children: [
							/* @__PURE__ */ jsx("span", {
								className: "kit-section__note",
								children: "Теги: цвет задаёт фон и текст, в тёмной теме — свои оттенки"
							}),
							/* @__PURE__ */ jsx("div", {
								className: "tag-list",
								children: TAGS.map((tag) => /* @__PURE__ */ jsx(TagChip, {
									name: tag.name,
									color: tag.color,
									size: "md"
								}, tag.id))
							}),
							/* @__PURE__ */ jsx("div", {
								className: "tag-list",
								children: TAGS.map((tag) => /* @__PURE__ */ jsx(TagChip, {
									name: tag.name,
									color: tag.color
								}, tag.id))
							})
						]
					})]
				}), /* @__PURE__ */ jsxs("div", {
					className: "kit-col",
					style: {
						marginTop: 18,
						maxWidth: 620
					},
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "record-alert record-alert--danger",
							role: "alert",
							children: [/* @__PURE__ */ jsx("span", { children: "Карточку изменил другой сотрудник, пока вы её редактировали. Ваши правки не сохранены." }), /* @__PURE__ */ jsx("button", {
								type: "button",
								className: "record-alert__action",
								children: "Загрузить актуальную карточку"
							})]
						}),
						/* @__PURE__ */ jsx("div", {
							className: "record-alert record-alert--warn",
							children: "Лид проигран. Чтобы менять его данные, сначала восстановите карточку."
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "lead-form",
							children: [/* @__PURE__ */ jsxs("label", {
								className: "lead-field",
								children: [/* @__PURE__ */ jsx("span", {
									className: "lead-field__label",
									children: "ИНН"
								}), /* @__PURE__ */ jsx("input", {
									className: "lead-input lead-input--error",
									defaultValue: "77010",
									"aria-invalid": "true"
								})]
							}), /* @__PURE__ */ jsx("p", {
								className: "field-error",
								children: "ИНН должен содержать 10 или 12 цифр."
							})]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "card card--lost",
							style: {
								padding: "16px 20px",
								minHeight: 80
							},
							children: [
								/* @__PURE__ */ jsx("div", {
									className: "lost-ribbon",
									children: "Проигрыш"
								}),
								/* @__PURE__ */ jsx("div", {
									className: "card__title",
									children: "Клиент"
								}),
								/* @__PURE__ */ jsx("p", {
									className: "modal-copy",
									children: "Проигранная карточка: лента в углу, поля только для чтения."
								})
							]
						})
					]
				})]
			}),
			/* @__PURE__ */ jsx(Section, {
				title: "Таблица",
				children: /* @__PURE__ */ jsx("div", {
					className: "card",
					style: { overflow: "hidden" },
					children: /* @__PURE__ */ jsxs("table", {
						className: "table",
						children: [/* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
							/* @__PURE__ */ jsx("th", { children: "Номер" }),
							/* @__PURE__ */ jsx("th", { children: "Клиент" }),
							/* @__PURE__ */ jsx("th", { children: "Маршрут" }),
							/* @__PURE__ */ jsx("th", { children: "Статус" }),
							/* @__PURE__ */ jsx("th", {
								style: { textAlign: "right" },
								children: "Маржа"
							})
						] }) }), /* @__PURE__ */ jsxs("tbody", { children: [
							/* @__PURE__ */ jsxs("tr", { children: [
								/* @__PURE__ */ jsx("td", {
									className: "mono",
									children: "ЗВ-2026-0148"
								}),
								/* @__PURE__ */ jsx("td", { children: "ООО «Северный путь»" }),
								/* @__PURE__ */ jsx("td", { children: "Москва → Казань" }),
								/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx(Status, {
									tone: "done",
									children: "Выгружена"
								}) }),
								/* @__PURE__ */ jsx("td", {
									className: "mono",
									style: { color: "var(--money)" },
									children: "+48 000 ₽"
								})
							] }),
							/* @__PURE__ */ jsxs("tr", { children: [
								/* @__PURE__ */ jsx("td", {
									className: "mono",
									children: "ЗВ-2026-0147"
								}),
								/* @__PURE__ */ jsx("td", { children: "ООО «Балт-Транс»" }),
								/* @__PURE__ */ jsx("td", { children: "Санкт-Петербург → Москва" }),
								/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx(Status, {
									tone: "progress",
									children: "В пути"
								}) }),
								/* @__PURE__ */ jsx("td", {
									className: "mono",
									style: { color: "var(--money)" },
									children: "+31 500 ₽"
								})
							] }),
							/* @__PURE__ */ jsxs("tr", { children: [
								/* @__PURE__ */ jsx("td", {
									className: "mono",
									children: "ЗВ-2026-0146"
								}),
								/* @__PURE__ */ jsx("td", { children: "ИП Соколов" }),
								/* @__PURE__ */ jsx("td", { children: "Екатеринбург → Самара" }),
								/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx(Status, {
									tone: "new",
									children: "Новая"
								}) }),
								/* @__PURE__ */ jsx("td", {
									className: "mono",
									style: { color: "var(--danger)" },
									children: "−2 000 ₽"
								})
							] })
						] })]
					})
				})
			}),
			/* @__PURE__ */ jsx(Modal, {
				open: modal,
				title: "Передать лида",
				onClose: () => setModal(false),
				footer: /* @__PURE__ */ jsxs(Fragment$1, { children: [/* @__PURE__ */ jsx(Button, {
					variant: "quiet",
					onClick: () => setModal(false),
					children: "Отмена"
				}), /* @__PURE__ */ jsx(Button, {
					variant: "primary",
					onClick: () => setModal(false),
					children: "Передать"
				})] }),
				children: /* @__PURE__ */ jsx(Field, {
					label: "Сотрудник",
					hint: "Передача меняет ответственного у лида и всех его заявок.",
					children: /* @__PURE__ */ jsxs(Select, {
						defaultValue: "2",
						children: [
							/* @__PURE__ */ jsx("option", {
								value: "1",
								children: "Ирина Морозова"
							}),
							/* @__PURE__ */ jsx("option", {
								value: "2",
								children: "Сергей Дорохов"
							}),
							/* @__PURE__ */ jsx("option", {
								value: "3",
								children: "Алексей Ковалёв"
							})
						]
					})
				})
			})
		]
	});
}
// .cache/ui/harness.jsx
var loc = { path: "" };
function Probe() {
	const l = useLocation();
	loc.path = l.pathname + l.search;
	return null;
}
var root = null;
var host = null;
async function mount(path) {
	if (root) await unmount();
	host = document.createElement("div");
	document.body.appendChild(host);
	root = createRoot(host);
	await act(async () => {
		root.render(/* @__PURE__ */ jsx(MemoryRouter, {
			initialEntries: [path],
			children: /* @__PURE__ */ jsxs(LeadsProvider, { children: [/* @__PURE__ */ jsx(Probe, {}), /* @__PURE__ */ jsxs(Routes, { children: [
				/* @__PURE__ */ jsx(Route, {
					path: "/crm",
					element: /* @__PURE__ */ jsx(FunnelPage, {})
				}),
				/* @__PURE__ */ jsx(Route, {
					path: "/crm/leads/:id",
					element: /* @__PURE__ */ jsx(LeadPage, {})
				}),
				/* @__PURE__ */ jsx(Route, {
					path: "/customers",
					element: /* @__PURE__ */ jsx(ClientsPage, {})
				}),
				/* @__PURE__ */ jsx(Route, {
					path: "/shipments",
					element: /* @__PURE__ */ jsx(ShipmentsPage, {})
				}),
				/* @__PURE__ */ jsx(Route, {
					path: "/shipments/:id",
					element: /* @__PURE__ */ jsx(ShipmentPage, {})
				}),
				/* @__PURE__ */ jsx(Route, {
					path: "/admin",
					element: /* @__PURE__ */ jsx(AdminPage, {})
				}),
				/* @__PURE__ */ jsx(Route, {
					path: "/settings",
					element: /* @__PURE__ */ jsx(SettingsPage, {})
				}),
				/* @__PURE__ */ jsx(Route, {
					path: "/tasks",
					element: /* @__PURE__ */ jsx(TasksPage, {})
				}),
				/* @__PURE__ */ jsx(Route, {
					path: "/analytics",
					element: /* @__PURE__ */ jsx(AnalyticsPage, {})
				}),
				/* @__PURE__ */ jsx(Route, {
					path: "/kit",
					element: /* @__PURE__ */ jsx(KitPage, {})
				}),
				/* @__PURE__ */ jsx(Route, {
					path: "*",
					element: /* @__PURE__ */ jsx(Navigate, {
						to: "/crm",
						replace: true
					})
				})
			] })] })
		}));
	});
	await wait(320);
	return host;
}
async function unmount() {
	await act(async () => root.unmount());
	host.remove();
	root = null;
}
var wait = (ms) => act(() => new Promise((r) => setTimeout(r, ms)));
var $ = (sel) => document.querySelector(sel);
var $$ = (sel) => [...document.querySelectorAll(sel)];
var byText = (sel, text) => $$(sel).find((el) => el.textContent.trim().includes(text));
async function click(el) {
	if (!el) throw new Error("click: нет элемента");
	await act(async () => {
		el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
		el.click();
	});
}
async function type(el, value) {
	if (!el) throw new Error("type: нет элемента");
	const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : el.tagName === "SELECT" ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
	await act(async () => {
		Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value);
		el.dispatchEvent(new Event(el.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
	});
}
async function key(el, k) {
	await act(async () => {
		el.dispatchEvent(new KeyboardEvent("keydown", {
			key: k,
			bubbles: true,
			cancelable: true
		}));
	});
}
// .cache/ui/tests2.jsx
var tests = [];
var t = (name, fn) => tests.push([name, fn]);
var ADMIN = ME.isAdmin;
var leadsStored = () => JSON.parse(window.localStorage.getItem(`crm.leads.${ME.id}.v1`) ?? "[]");
var leadS = (id) => leadsStored().find((l) => l.id === id);
var shipsStored = () => JSON.parse(window.localStorage.getItem(`crm.shipments.${ME.id}.v1`) ?? "[]");
var modalBtn = (text) => [...document.querySelectorAll(".modal button")].find((b) => b.textContent.trim() === text);
var menuItem = async (text) => {
	await click($(".lead-head__actions .menu > button"));
	await click(byText("[role=\"menuitem\"]", text));
};
t("экраны: задачи, аналитика, витрина, список лидов открываются", async () => {
	window.localStorage.clear();
	window.localStorage.setItem("crm.role", ADMIN ? "admin" : "manager");
	for (const p of [
		"/tasks",
		"/analytics",
		"/kit"
	]) {
		await mount(p);
		assert.ok($("main.main"), p);
	}
	await mount("/crm");
	await click($("button[title=\"Список\"]"));
	assert.ok($(".leads-table tbody tr"));
	await click($("button[title=\"Канбан\"]"));
});
t("доска: звёзды сохраняются сразу, повторный клик снимает", async () => {
	await mount("/crm");
	const card = $(".lead-card");
	const id = Number(card.querySelector(".lead-card__link").getAttribute("href").split("/").pop());
	const before = STAGES$1.flatMap((s) => s.leads).find((l) => l.id === id).priority;
	const target = before === 2 ? 1 : 2;
	await click(card.querySelector(`[aria-label="Приоритет ${target} из 3"]`));
	assert.equal(leadS(id).priority, target, `было ${before}`);
	await click(card.querySelector("[aria-label=\"Приоритет 3 из 3\"]"));
	assert.equal(leadS(id).priority, 3);
	await click(card.querySelector("[aria-label=\"Снять приоритет 3\"]"));
	assert.equal(leadS(id).priority, 0);
});
t("доска: сворачивание этапа запоминается", async () => {
	await mount("/crm");
	const name = $(".col").getAttribute("aria-label");
	await click($(`button[aria-label="Свернуть этап «${name}»"]`));
	assert.ok($(`[aria-label^="Развернуть этап «${name}»"]`));
	await mount("/crm");
	const unfold = $(`[aria-label^="Развернуть этап «${name}»"]`);
	assert.ok(unfold, "не запомнилось");
	await click(unfold);
	assert.ok($(`button[aria-label="Свернуть этап «${name}»"]`));
});
t("лид: правка названия, автосохранение 3 с", async () => {
	await mount("/crm/leads/1");
	await type($(".lead-title-input"), "ООО «Тест-Имя»");
	await wait(3300);
	assert.equal(leadS(1).name, "ООО «Тест-Имя»");
	await mount("/crm");
	assert.ok(document.body.textContent.includes("Тест-Имя"));
});
t("лид: тег — выбрать и создать", async () => {
	await mount("/crm/leads/1");
	await click($(".tags-field__add"));
	const s = $(".tags-field__search");
	await type(s, "Проверочный");
	await key(s, "Enter");
	await wait(3300);
	const tag = JSON.parse(window.localStorage.getItem("crm.tags.v1") ?? "[]").find((x) => x.name === "Проверочный");
	assert.ok(tag, "тег не создан");
	assert.ok(leadS(1).tagIds.includes(tag.id), "тег не на лиде");
});
t("лид: проигрыш с причиной → только чтение → восстановить", async () => {
	await mount("/crm/leads/12");
	await menuItem("Отметить проигрышем");
	assert.ok(modalBtn("Отметить проигрышем").disabled, "без причины можно");
	await click($$(".choice input")[0]);
	await click(modalBtn("Отметить проигрышем"));
	assert.ok(leadS(12).lost);
	assert.ok($(".lost-ribbon"));
	assert.ok($(".lead-title-input").disabled);
	await mount("/crm");
	assert.ok(!$$(".lead-card__link").some((a) => a.getAttribute("href") === "/crm/leads/12"));
	await mount("/customers");
	await click(byText(".toolbar .chip", "Проигранные"));
	assert.ok($$(".client-tile").some((x) => x.textContent.includes(STAGES$1.flatMap((s) => s.leads).find((l) => l.id === 12).name)));
	await mount("/crm/leads/12");
	await click(byText("button", "Восстановить"));
	assert.ok(!leadS(12).lost);
	assert.ok(!$(".lost-ribbon"));
});
t("лид: передача коллеге уносит заявки", async () => {
	await mount("/crm/leads/16");
	await menuItem("Передать коллеге");
	await click(byText(".picker-list__item", "Мария"));
	await click(modalBtn("Передать"));
	assert.equal(leadS(16).ownerId, 2);
	assert.ok(shipsStored().filter((s) => s.leadId === 16).every((s) => s.ownerId === 2), "заявки остались у старого владельца");
});
if (ADMIN) t("лид (админ): удаление без возврата удаляет и заявки", async () => {
	await mount("/crm/leads/9");
	await menuItem("Удалить лид");
	await click([...document.querySelectorAll(".modal button")].pop());
	assert.ok(!leadS(9));
	assert.ok(!shipsStored().some((s) => s.leadId === 9));
	assert.ok(!loc.path.includes("/crm/leads/9"));
});
if (!ADMIN) t("лид (менеджер): лид коллеги только для чтения", async () => {
	await mount("/crm/leads/3");
	assert.ok(document.body.textContent.includes("Лид коллеги."));
});
t("воронка: маржа по заявкам на карточке лида 1", async () => {
	window.localStorage.removeItem(`crm.shipments.${ME.id}.v1`);
	await mount("/crm");
	const card = $$(".lead-card").find((c) => c.querySelector("a[href=\"/crm/leads/1\"]"));
	assert.ok(card.querySelector(".price").getAttribute("aria-label").includes("48"), card.querySelector(".price").getAttribute("aria-label"));
	await unmount();
});
export { tests };
