/* ============================================================
   ТрансЛайн CRM — страница «Заявки» (реестр перевозок)
   ============================================================ */

(() => {
  'use strict';

  const {
    $, icon, money, moneyShort, formatDate, formatDateFull,
    escapeHtml, normalize, toast, MANAGERS, managerById,
  } = window.TL;

  /* ---------------- Справочники ---------------- */
  const STATUSES = [
    { id: 'new',      name: 'Новая',             short: 'Новые',    color: '#4f7cff' },
    { id: 'work',     name: 'В работе',          short: 'В работе', color: '#f5a524' },
    { id: 'assigned', name: 'Машина назначена',  short: 'Назначена', color: '#a855f7' },
    { id: 'transit',  name: 'В пути',            short: 'В пути',   color: '#06b6d4' },
    { id: 'done',     name: 'Выгружено',         short: 'Выгружено', color: '#10b981' },
    { id: 'canceled', name: 'Отменена',          short: 'Отменена', color: '#f43f5e' },
  ];

  const ACTIVE_STATUSES = ['new', 'work', 'assigned', 'transit'];
  const statusById = (id) => STATUSES.find((s) => s.id === id) || STATUSES[0];

  function plural(n, one, few, many) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
    return many;
  }

  /* ---------------- Данные заявок ---------------- */
  let requests = [
    { id: 'З-1042', status: 'transit',  client: '«Альфа Ритейл»',       contact: 'Ксения Ветрова',  phone: '+7 917 605-77-31', from: 'Москва',          to: 'Нижний Новгород', km: 410,  cargo: 'FMCG',              weight: '10 т / 40 м³', body: 'Тент',      loadDate: '2026-11-05', unloadDate: '2026-11-06', clientRate: 92000,  carrier: 'ИП Волков А. С.',      driver: 'Алексей Волков',  carrierPhone: '+7 910 220-11-45', truck: 'Volvo FH · А123ВС 77',     carrierRate: 74000,  manager: 'iv' },
    { id: 'З-1041', status: 'transit',  client: '«ТД Восток»',          contact: 'Елена Егорова',   phone: '+7 923 445-71-02', from: 'Новосибирск',     to: 'Иркутск',         km: 1850, cargo: 'Оборудование',      weight: '15 т / 82 м³', body: 'Тент',      loadDate: '2026-11-04', unloadDate: '2026-11-07', clientRate: 285000, carrier: 'ООО «СибирьЛог»',      driver: 'Пётр Ким',        carrierPhone: '+7 913 118-90-24', truck: 'Scania R450 · О777КК 54',  carrierRate: 238000, manager: 'iv' },
    { id: 'З-1040', status: 'assigned', client: 'ООО «Гринлайн»',       contact: 'Максим Литвинов', phone: '+7 988 401-26-73', from: 'Сочи',            to: 'Москва',          km: 1620, cargo: 'Овощи, реф',        weight: '16 т',         body: 'Реф',       loadDate: '2026-11-07', unloadDate: '2026-11-09', clientRate: 175000, carrier: 'ИП Сафин Р. Р.',       driver: 'Ринат Сафин',     carrierPhone: '+7 917 300-66-25', truck: 'MAN TGX · Т456РР 16',      carrierRate: 141000, manager: 'dk' },
    { id: 'З-1039', status: 'work',     client: 'ООО «УралМеталл»',     contact: 'Артём Соколов',   phone: '+7 919 330-62-18', from: 'Челябинск',       to: 'Москва',          km: 1790, cargo: 'Металл',            weight: '22 т',         body: 'Борт',      loadDate: '2026-11-08', unloadDate: '2026-11-10', clientRate: 320000, carrier: '',                     driver: '',                carrierPhone: '',                 truck: '',                         carrierRate: 0,      manager: 'dk' },
    { id: 'З-1038', status: 'new',      client: 'ООО «ФрешЛогистик»',  contact: 'Ольга Ким',       phone: '+7 926 118-90-55', from: 'Москва',          to: 'Владивосток',     km: 9100, cargo: 'Реф. груз',         weight: '18 т',         body: 'Реф',       loadDate: '2026-11-10', unloadDate: '2026-11-18', clientRate: 640000, carrier: '',                     driver: '',                carrierPhone: '',                 truck: '',                         carrierRate: 0,      manager: 'as' },
    { id: 'З-1037', status: 'new',      client: 'ГК «АгроТрейд»',       contact: 'Марина Крылова',  phone: '+7 903 118-74-32', from: 'Воронеж',         to: 'Новороссийск',    km: 1120, cargo: 'Зерно',             weight: '20 т',         body: 'Тент',      loadDate: '2026-11-09', unloadDate: '2026-11-10', clientRate: 148000, carrier: '',                     driver: '',                carrierPhone: '',                 truck: '',                         carrierRate: 0,      manager: 'dk' },
    { id: 'З-1036', status: 'work',     client: 'ООО «ПромСнаб Урал»',  contact: 'Кирилл Абрамов',  phone: '+7 922 340-55-87', from: 'Пермь',           to: 'Тюмень',          km: 780,  cargo: 'Трубы',             weight: '21 т',         body: 'Борт',      loadDate: '2026-11-06', unloadDate: '2026-11-07', clientRate: 158000, carrier: 'ООО «УралТрак»',       driver: 'Сергей Гущин',    carrierPhone: '+7 912 505-14-37', truck: 'КАМАЗ 5490 · Е501ТУ 66',   carrierRate: 129000, manager: 'dk' },
    { id: 'З-1035', status: 'assigned', client: '«Балт-Строй»',        contact: 'Сергей Гущин',    phone: '+7 911 340-77-62', from: 'Калининград',     to: 'Смоленск',        km: 1180, cargo: 'Стройматериалы',    weight: '20 т',         body: 'Тент',      loadDate: '2026-11-08', unloadDate: '2026-11-10', clientRate: 265000, carrier: 'ИП Дорохов П. М.',     driver: 'Павел Дорохов',   carrierPhone: '+7 918 220-45-19', truck: 'DAF XF · К903МН 39',       carrierRate: 214000, manager: 'iv' },
    { id: 'З-1034', status: 'done',     client: 'ООО «ПродСнаб»',      contact: 'Виктор Лазарев',  phone: '+7 903 771-38-24', from: 'Москва',          to: 'Тверь',           km: 180,  cargo: 'Продукты',          weight: '8 т',          body: 'Тент',      loadDate: '2026-11-03', unloadDate: '2026-11-03', clientRate: 54000,  carrier: 'ООО «ТверьТранс»',     driver: 'Ирина Ветрова',   carrierPhone: '+7 903 220-88-14', truck: 'ГАЗ Газон · М220АА 69',    carrierRate: 41000,  manager: 'as' },
    { id: 'З-1033', status: 'done',     client: '«Логистик Плюс»',     contact: 'Наталья Реброва', phone: '+7 927 812-44-16', from: 'Самара',          to: 'Казань',          km: 440,  cargo: 'Сборный груз',      weight: '9 т',          body: 'Тент',      loadDate: '2026-11-02', unloadDate: '2026-11-03', clientRate: 61000,  carrier: 'ИП Сафин Р. Р.',       driver: 'Ринат Сафин',     carrierPhone: '+7 917 300-66-25', truck: 'MAN TGX · Т456РР 16',      carrierRate: 47000,  manager: 'as' },
    { id: 'З-1032', status: 'done',     client: 'ООО «МебельГрад»',    contact: 'Павел Дорохов',   phone: '+7 918 220-45-19', from: 'Краснодар',       to: 'Москва',          km: 1350, cargo: 'Мебель',            weight: '18 т / 74 м³', body: 'Тент',      loadDate: '2026-11-01', unloadDate: '2026-11-03', clientRate: 172000, carrier: 'ООО «ЮгТранс»',        driver: 'Артём Соколов',   carrierPhone: '+7 919 330-62-18', truck: 'Volvo FH · О815КК 23',     carrierRate: 138000, manager: 'iv' },
    { id: 'З-1031', status: 'canceled', client: 'ООО «ТехноПарк»',    contact: 'Илья Громов',     phone: '+7 925 614-08-90', from: 'Москва',          to: 'Минск',           km: 720,  cargo: 'Электроника',       weight: '3 т',          body: 'Тент',      loadDate: '2026-10-31', unloadDate: '',           clientRate: 145000, carrier: '',                     driver: '',                carrierPhone: '',                 truck: '',                         carrierRate: 0,      manager: 'iv' },
    { id: 'З-1030', status: 'transit',  client: 'ООО «ХимПром»',       contact: 'Анна Белова',     phone: '+7 910 442-19-83', from: 'Дзержинск',       to: 'Санкт-Петербург', km: 1100, cargo: 'Химия, ADR',        weight: '20 т',         body: 'Тент',      loadDate: '2026-11-05', unloadDate: '2026-11-07', clientRate: 210000, carrier: 'ООО «БалтХимТранс»',   driver: 'Михаил Егоров',   carrierPhone: '+7 911 445-77-02', truck: 'Scania R450 · В777АА 78',  carrierRate: 176000, manager: 'dk' },
    { id: 'З-1029', status: 'done',     client: '«СибирьТрансСервис»', contact: 'Оксана Панова',   phone: '+7 912 505-14-37', from: 'Тюмень',          to: 'Омск',            km: 640,  cargo: 'Нефтепродукты',     weight: '20 т',         body: 'Цистерна',  loadDate: '2026-10-30', unloadDate: '2026-10-31', clientRate: 132000, carrier: 'ООО «НефтеЛог»',       driver: 'Тимур Исаев',     carrierPhone: '+7 913 770-28-14', truck: 'КАМАЗ 5490 · С404ТТ 72',   carrierRate: 108000, manager: 'as' },
    { id: 'З-1028', status: 'work',     client: 'ООО «СтройБаза 24»',  contact: 'Дмитрий Орлов',   phone: '+7 902 118-63-09', from: 'Красноярск',      to: 'Кемерово',        km: 520,  cargo: 'Пиломатериалы',     weight: '20 т',         body: 'Борт',      loadDate: '2026-11-07', unloadDate: '2026-11-08', clientRate: 118000, carrier: '',                     driver: '',                carrierPhone: '',                 truck: '',                         carrierRate: 0,      manager: 'dk' },
    { id: 'З-1027', status: 'done',     client: 'ООО «АкваМир»',       contact: 'Роман Тимофеев',  phone: '+7 909 512-33-70', from: 'Ростов-на-Дону',  to: 'Волгоград',       km: 480,  cargo: 'Реф. продукты',     weight: '14 т',         body: 'Реф',       loadDate: '2026-10-29', unloadDate: '2026-10-30', clientRate: 74000,  carrier: 'ИП Волков А. С.',      driver: 'Алексей Волков',  carrierPhone: '+7 910 220-11-45', truck: 'Volvo FH · А123ВС 77',     carrierRate: 58000,  manager: 'iv' },
  ];

  /* ---------------- DOM ---------------- */
  const tableBody = $('#requestsBody');
  const tabsBox = $('#statusTabs');
  const searchInput = $('#searchInput');
  const managerFilter = $('#managerFilter');
  const tableSummary = $('#tableSummary');
  const scrim = $('#scrim');
  const drawer = $('#drawer');
  const modal = $('#modal');
  const requestForm = $('#requestForm');
  const formManager = $('#formManager');
  const formStatus = $('#formStatus');
  const formLoadDate = $('#formLoadDate');

  const kpiActive = $('#kpiActive');
  const kpiSum = $('#kpiSum');
  const kpiMargin = $('#kpiMargin');
  const kpiTransit = $('#kpiTransit');
  const kpiMarginHint = $('#kpiMarginHint');

  let activeTab = 'all';
  let openId = null;

  /* ---------------- Фильтры ---------------- */
  function visibleRequests() {
    const q = normalize(searchInput.value);
    const mgr = managerFilter.value;

    return requests.filter((r) => {
      if (activeTab !== 'all' && r.status !== activeTab) return false;
      if (mgr !== 'all' && r.manager !== mgr) return false;
      if (!q) return true;
      const hay = normalize([
        r.id, r.client, r.contact, r.from, r.to, r.cargo, r.body,
        r.carrier, r.driver, r.truck, statusById(r.status).name,
      ].join(' '));
      return hay.includes(q);
    });
  }

  /* ---------------- Табы ---------------- */
  function renderTabs() {
    const items = [{ id: 'all', name: 'Все заявки', count: requests.length }].concat(
      STATUSES.map((s) => ({ id: s.id, name: s.short, count: requests.filter((r) => r.status === s.id).length }))
    );

    tabsBox.innerHTML = items.map((t) => `
      <button class="tab${activeTab === t.id ? ' is-active' : ''}" role="tab"
              aria-selected="${activeTab === t.id}" data-tab="${t.id}">
        ${escapeHtml(t.name)}<span class="tab-count">${t.count}</span>
      </button>`).join('');
  }

  /* ---------------- Строка таблицы ---------------- */
  function rowMarkup(r) {
    const st = statusById(r.status);
    const m = managerById(r.manager);
    const margin = r.carrierRate > 0 ? r.clientRate - r.carrierRate : null;

    return `
      <tr class="req-row" data-id="${r.id}" tabindex="0">
        <td class="cell-id">${escapeHtml(r.id)}</td>
        <td>
          <div class="client-name">${escapeHtml(r.client)}</div>
          <div class="client-sub">${escapeHtml(r.contact)}</div>
        </td>
        <td>
          <div class="route-mini">
            <span>${escapeHtml(r.from)}</span>
            ${icon('i-arrow')}
            <span>${escapeHtml(r.to)}</span>
          </div>
          <div class="muted">${r.km > 0 ? `${r.km} км` : '—'}</div>
        </td>
        <td class="col-cargo">
          <div class="cargo-name">${escapeHtml(r.cargo)}</div>
          <div class="muted">${escapeHtml(r.weight)} · ${escapeHtml(r.body)}</div>
        </td>
        <td class="col-date">
          ${formatDate(r.loadDate)}
          <div class="muted">${r.unloadDate ? `выгр. ${formatDate(r.unloadDate)}` : '—'}</div>
        </td>
        <td class="num">${money(r.clientRate)}</td>
        <td class="num col-carrier">${r.carrierRate > 0 ? money(r.carrierRate) : '<span class="muted">не назначен</span>'}</td>
        <td class="num col-margin">${margin === null ? '<span class="muted">—</span>' : `<span class="margin">+${money(margin)}</span>`}</td>
        <td><span class="status-pill status--${st.id}">${escapeHtml(st.name)}</span></td>
        <td class="col-manager">
          <span class="row-manager">
            <span class="avatar" style="--av:${m.color}" title="${escapeHtml(m.name)}">${m.short}</span>
            <span class="row-manager-name">${escapeHtml(m.name.split(' ')[0])}</span>
          </span>
        </td>
      </tr>`;
  }

  /* ---------------- Рендер таблицы ---------------- */
  function renderTable() {
    const rows = visibleRequests();

    tableBody.innerHTML = rows.length
      ? rows.map(rowMarkup).join('')
      : `<tr><td colspan="10" class="table-empty">Ничего не найдено. Измените запрос или сбросьте фильтры.</td></tr>`;

    const sum = rows.reduce((acc, r) => acc + r.clientRate, 0);
    const word = plural(rows.length, 'заявка', 'заявки', 'заявок');
    tableSummary.textContent = `Показано ${rows.length} ${word} из ${requests.length} · ${money(sum)}`;
  }

  /* ---------------- KPI ---------------- */
  function renderKpis() {
    const active = requests.filter((r) => ACTIVE_STATUSES.includes(r.status));
    const sum = active.reduce((acc, r) => acc + r.clientRate, 0);
    const withCarrier = active.filter((r) => r.carrierRate > 0);
    const margin = withCarrier.reduce((acc, r) => acc + (r.clientRate - r.carrierRate), 0);
    const transit = requests.filter((r) => r.status === 'transit').length;

    kpiActive.textContent = active.length;
    kpiSum.textContent = moneyShort(sum);
    kpiMargin.textContent = money(margin);
    kpiMarginHint.textContent = `${withCarrier.length} ${plural(withCarrier.length, 'рейс', 'рейса', 'рейсов')} с перевозчиком`;
    kpiTransit.textContent = transit;
  }

  function renderAll(flashId) {
    renderTabs();
    renderTable();
    renderKpis();

    if (flashId) {
      const row = tableBody.querySelector(`.req-row[data-id="${flashId}"]`);
      if (row) {
        row.classList.add('is-flash');
        row.addEventListener('animationend', () => row.classList.remove('is-flash'), { once: true });
        row.scrollIntoView({ block: 'nearest' });
      }
    }
  }

  /* ---------------- Drawer ---------------- */
  const drawerStatusPill = $('#drawerStatusPill');
  const drawerId = $('#drawerId');
  const drawerClient = $('#drawerClient');
  const drawerContact = $('#drawerContact');
  const drawerRoute = $('#drawerRoute');
  const drawerMoney = $('#drawerMoney');
  const drawerCargo = $('#drawerCargo');
  const drawerCarrier = $('#drawerCarrier');
  const drawerStatusSelect = $('#drawerStatusSelect');
  const drawerCall = $('#drawerCall');
  const drawerTimeline = $('#drawerTimeline');

  const fact = (label, value, cls = '') =>
    `<div class="fact"><span class="fact-label">${label}</span><span class="fact-value ${cls}">${value}</span></div>`;

  function buildTimeline(r) {
    const items = [];
    items.push({ text: 'Заявка создана', time: formatDateFull(r.loadDate) });

    if (['work', 'assigned', 'transit', 'done'].includes(r.status)) {
      items.push({ text: 'Клиент подтвердил условия перевозки', time: formatDateFull(r.loadDate) });
    }
    if (['assigned', 'transit', 'done'].includes(r.status)) {
      items.push({ text: `Назначен перевозчик${r.carrier ? ` — ${r.carrier}` : ''}`, time: formatDateFull(r.loadDate) });
    }
    if (['transit', 'done'].includes(r.status)) {
      items.push({ text: 'Машина загружена, рейс начат', time: formatDateFull(r.loadDate) });
    }
    if (r.status === 'done') {
      items.push({ text: 'Выгрузка выполнена, заявка закрыта', time: formatDateFull(r.unloadDate) });
    }
    if (r.status === 'canceled') {
      items.push({ text: 'Заявка отменена по инициативе клиента', time: formatDateFull(r.loadDate) });
    }

    return items
      .slice()
      .reverse()
      .map((i) => `<li>${escapeHtml(i.text)}<time>${escapeHtml(i.time)}</time></li>`)
      .join('');
  }

  function openDrawer(id) {
    const r = requests.find((x) => x.id === id);
    if (!r) return;
    openId = id;

    const st = statusById(r.status);
    const m = managerById(r.manager);
    const margin = r.carrierRate > 0 ? r.clientRate - r.carrierRate : null;
    const marginPct = margin !== null && r.clientRate > 0 ? Math.round((margin / r.clientRate) * 100) : null;

    drawerStatusPill.textContent = st.name;
    drawerStatusPill.style.setProperty('--st', st.color);
    drawerId.textContent = `Заявка ${r.id} · ${m.short}, ${m.name.split(' ')[0]}`;
    drawerClient.textContent = r.client;
    drawerContact.innerHTML = r.phone
      ? `${escapeHtml(r.contact)} · <a href="tel:${r.phone.replace(/[^+\d]/g, '')}">${escapeHtml(r.phone)}</a>`
      : escapeHtml(r.contact);

    drawerRoute.innerHTML = `
      <span class="route-point"><span class="route-dot"></span>${escapeHtml(r.from)}</span>
      <span class="route-line"></span>
      ${icon('i-truck')}
      <span class="route-line"></span>
      <span class="route-point"><span class="route-dot end" style="background:${st.color}"></span>${escapeHtml(r.to)}</span>
      ${r.km > 0 ? `<span class="drawer-km">${r.km} км</span>` : ''}`;

    drawerMoney.innerHTML = [
      fact('Ставка клиенту', money(r.clientRate)),
      fact('Ставка перевозчику', r.carrierRate > 0 ? money(r.carrierRate) : '—', r.carrierRate > 0 ? '' : 'is-zero'),
      fact('Маржа', margin === null ? '—' : `+${money(margin)}`, margin === null ? 'is-zero' : 'is-pos'),
      fact('Рентабельность', marginPct === null ? '—' : `${marginPct}%`, marginPct === null ? 'is-zero' : 'is-pos'),
    ].join('');

    drawerCargo.innerHTML = [
      fact('Груз', escapeHtml(r.cargo)),
      fact('Вес / объём', escapeHtml(r.weight)),
      fact('Тип кузова', escapeHtml(r.body)),
      fact('Расстояние', r.km > 0 ? `${r.km} км` : '—'),
      fact('Погрузка', formatDateFull(r.loadDate)),
      fact('Выгрузка', formatDateFull(r.unloadDate)),
    ].join('');

    drawerCarrier.innerHTML = r.carrier
      ? `<div class="carrier-card">
           <span class="carrier-ico">${icon('i-truck')}</span>
           <div class="carrier-info">
             <div class="carrier-name">${escapeHtml(r.carrier)}</div>
             <div class="carrier-sub">${escapeHtml(r.driver)} · ${escapeHtml(r.truck)}</div>
             ${r.carrierPhone ? `<a class="carrier-phone" href="tel:${r.carrierPhone.replace(/[^+\d]/g, '')}">${escapeHtml(r.carrierPhone)}</a>` : ''}
           </div>
         </div>`
      : `<div class="carrier-empty">
           <span>Перевозчик не назначен</span>
           <button class="btn btn-ghost" data-placeholder="Подбор перевозчика">
             ${icon('i-search')} Подобрать
           </button>
         </div>`;

    drawerStatusSelect.innerHTML = STATUSES.map(
      (s) => `<option value="${s.id}"${s.id === r.status ? ' selected' : ''}>${escapeHtml(s.name)}</option>`
    ).join('');

    drawerCall.href = r.phone ? `tel:${r.phone.replace(/[^+\d]/g, '')}` : '#';
    drawerTimeline.innerHTML = buildTimeline(r);

    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    updateScrim();
  }

  function closeDrawer() {
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    openId = null;
    updateScrim();
  }

  drawerStatusSelect.addEventListener('change', (e) => {
    const r = requests.find((x) => x.id === openId);
    if (!r) return;
    const next = e.target.value;
    if (r.status === next) return;
    r.status = next;
    renderAll(r.id);
    openDrawer(r.id);
    toast(`Заявка ${r.id} — ${statusById(next).name}`, 'success');
  });

  $('#drawerClose').addEventListener('click', closeDrawer);

  /* ---------------- Модальное окно ---------------- */
  formManager.innerHTML = MANAGERS.map((m) => `<option value="${m.id}">${escapeHtml(m.name)}</option>`).join('');
  formStatus.innerHTML = STATUSES.map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');

  function openModal() {
    requestForm.reset();
    formStatus.value = 'new';
    formManager.value = 'as';
    formLoadDate.value = new Date().toISOString().slice(0, 10);
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    updateScrim();
    setTimeout(() => $('#requestForm [name="client"]').focus(), 120);
  }

  function closeModal() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    updateScrim();
  }

  $('#addRequestBtn').addEventListener('click', openModal);
  $('#modalClose').addEventListener('click', closeModal);
  $('#modalCancel').addEventListener('click', closeModal);

  function nextId() {
    const numbers = requests
      .map((r) => parseInt(String(r.id).replace(/\D/g, ''), 10))
      .filter((n) => !Number.isNaN(n));
    const next = (numbers.length ? Math.max(...numbers) : 1042) + 1;
    return `З-${next}`;
  }

  requestForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(requestForm);
    const client = String(data.get('client') || '').trim();
    if (!client) return;

    const clientRate = Number(data.get('clientRate')) || 0;
    const carrierRate = Number(data.get('carrierRate')) || 0;
    const carrier = String(data.get('carrier') || '').trim();

    const item = {
      id: nextId(),
      status: String(data.get('status') || 'new'),
      client,
      contact: String(data.get('contact') || 'Контакт не указан').trim(),
      phone: String(data.get('phone') || '').trim(),
      from: String(data.get('from') || 'Не указано').trim(),
      to: String(data.get('to') || 'Не указано').trim(),
      km: 0,
      cargo: String(data.get('cargo') || 'Уточняется').trim(),
      weight: 'уточняется',
      body: 'уточняется',
      loadDate: String(data.get('loadDate') || new Date().toISOString().slice(0, 10)),
      unloadDate: '',
      clientRate,
      carrier,
      carrierRate,
      driver: '',
      carrierPhone: '',
      truck: '',
      manager: String(data.get('manager') || 'as'),
    };

    requests.unshift(item);
    activeTab = 'all';
    renderAll(item.id);
    closeModal();
    toast(`Заявка ${item.id} создана`, 'success');
  });

  /* ---------------- Скрим / горячие клавиши ---------------- */
  function updateScrim() {
    const on = modal.classList.contains('is-open') || drawer.classList.contains('is-open');
    scrim.classList.toggle('is-on', on);
  }

  scrim.addEventListener('click', () => {
    if (modal.classList.contains('is-open')) closeModal();
    else closeDrawer();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (modal.classList.contains('is-open')) closeModal();
      else if (drawer.classList.contains('is-open')) closeDrawer();
    }
    if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
      e.preventDefault();
      searchInput.focus();
    }
  });

  /* ---------------- События таблицы и фильтров ---------------- */
  tableBody.addEventListener('click', (e) => {
    const row = e.target.closest('.req-row');
    if (row) openDrawer(row.dataset.id);
  });

  tableBody.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const row = e.target.closest('.req-row');
    if (!row) return;
    e.preventDefault();
    openDrawer(row.dataset.id);
  });

  tabsBox.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-tab]');
    if (!tab) return;
    activeTab = tab.dataset.tab;
    renderTable();
    renderTabs();
  });

  managerFilter.innerHTML =
    `<option value="all">Все менеджеры</option>` +
    MANAGERS.map((m) => `<option value="${m.id}">${escapeHtml(m.name)}</option>`).join('');

  searchInput.addEventListener('input', renderTable);
  managerFilter.addEventListener('change', renderTable);

  /* ---------------- Инициализация ---------------- */
  const navLeadsCount = $('#navLeadsCount');
  if (navLeadsCount) navLeadsCount.textContent = '20';

  window.TL.init();
  renderAll();
})();
