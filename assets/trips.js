/* ============================================================
   ТрансЛайн CRM — страница «Грузы» (рейсы в работе)
   ============================================================ */

(() => {
  'use strict';

  const {
    $, icon, money, formatDate, formatDateFull,
    escapeHtml, normalize, toast, MANAGERS, managerById,
  } = window.TL;

  /* ---------------- Справочники ---------------- */
  const STATUSES = [
    { id: 'planned',   name: 'Запланирован', short: 'Запланирован', color: '#4f7cff' },
    { id: 'loading',   name: 'Погрузка',     short: 'Погрузка',     color: '#f5a524' },
    { id: 'transit',   name: 'В пути',       short: 'В пути',       color: '#06b6d4' },
    { id: 'unloading', name: 'Выгрузка',     short: 'Выгрузка',     color: '#a855f7' },
    { id: 'done',      name: 'Завершён',     short: 'Завершён',     color: '#10b981' },
    { id: 'problem',   name: 'Проблема',     short: 'Проблемы',     color: '#f43f5e' },
  ];

  const ORDER = ['planned', 'loading', 'transit', 'unloading', 'done'];
  const statusById = (id) => STATUSES.find((s) => s.id === id) || STATUSES[0];
  const isActive = (s) => s !== 'done';

  function plural(n, one, few, many) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
    return many;
  }

  function formatEta(iso) {
    if (!iso) return '—';
    const [date, time] = String(iso).split('T');
    return time ? `${formatDate(date)}, ${time.slice(0, 5)}` : formatDate(date);
  }

  /* ---------------- Данные рейсов ---------------- */
  let trips = [
    { id: 'Р-3082', requestId: 'З-1042', client: '«Альфа Ритейл»',      manager: 'iv', from: 'Москва',         to: 'Нижний Новгород', km: 410,  cargo: 'FMCG',              weight: '10 т / 40 м³', driver: 'Алексей Волков', driverPhone: '+7 910 220-11-45', carrier: 'ИП Волков А. С.',    truck: 'Volvo FH · А123ВС 77',    loadDate: '2026-11-05', unloadDate: '2026-11-06', status: 'transit',   progress: 62, eta: '2026-11-06T14:30', problem: '' },
    { id: 'Р-3081', requestId: 'З-1041', client: '«ТД Восток»',         manager: 'iv', from: 'Новосибирск',    to: 'Иркутск',         km: 1850, cargo: 'Оборудование',      weight: '15 т / 82 м³', driver: 'Пётр Ким',       driverPhone: '+7 913 118-90-24', carrier: 'ООО «СибирьЛог»',     truck: 'Scania R450 · О777КК 54', loadDate: '2026-11-04', unloadDate: '2026-11-07', status: 'transit',   progress: 45, eta: '2026-11-07T09:00', problem: '' },
    { id: 'Р-3080', requestId: 'З-1040', client: 'ООО «Гринлайн»',      manager: 'dk', from: 'Сочи',           to: 'Москва',          km: 1620, cargo: 'Овощи, реф',        weight: '16 т',         driver: 'Ринат Сафин',    driverPhone: '+7 917 300-66-25', carrier: 'ИП Сафин Р. Р.',      truck: 'MAN TGX · Т456РР 16',     loadDate: '2026-11-07', unloadDate: '2026-11-09', status: 'loading',   progress: 8,  eta: '2026-11-09T18:00', problem: '' },
    { id: 'Р-3079', requestId: 'З-1039', client: 'ООО «УралМеталл»',    manager: 'dk', from: 'Челябинск',      to: 'Москва',          km: 1790, cargo: 'Металл',            weight: '22 т',         driver: '',               driverPhone: '',                 carrier: '',                    truck: '',                        loadDate: '2026-11-08', unloadDate: '2026-11-10', status: 'planned',   progress: 0,  eta: '2026-11-10T12:00', problem: '' },
    { id: 'Р-3078', requestId: 'З-1030', client: 'ООО «ХимПром»',       manager: 'dk', from: 'Дзержинск',      to: 'Санкт-Петербург', km: 1100, cargo: 'Химия, ADR',        weight: '20 т',         driver: 'Михаил Егоров',  driverPhone: '+7 911 445-77-02', carrier: 'ООО «БалтХимТранс»',  truck: 'Scania R450 · В777АА 78', loadDate: '2026-11-05', unloadDate: '2026-11-07', status: 'problem',   progress: 35, eta: '2026-11-07T21:00', problem: 'Простой 4 ч на посту ДПС под Тверью — согласуем новое время выгрузки' },
    { id: 'Р-3077', requestId: 'З-1035', client: '«Балт-Строй»',        manager: 'iv', from: 'Калининград',    to: 'Смоленск',        km: 1180, cargo: 'Стройматериалы',    weight: '20 т',         driver: 'Павел Дорохов',  driverPhone: '+7 918 220-45-19', carrier: 'ИП Дорохов П. М.',    truck: 'DAF XF · К903МН 39',      loadDate: '2026-11-08', unloadDate: '2026-11-10', status: 'unloading', progress: 92, eta: '2026-11-10T10:30', problem: '' },
    { id: 'Р-3076', requestId: 'З-1034', client: 'ООО «ПродСнаб»',      manager: 'as', from: 'Москва',         to: 'Тверь',           km: 180,  cargo: 'Продукты',          weight: '8 т',          driver: 'Ирина Ветрова',  driverPhone: '+7 903 220-88-14', carrier: 'ООО «ТверьТранс»',    truck: 'ГАЗ Газон · М220АА 69',   loadDate: '2026-11-03', unloadDate: '2026-11-03', status: 'done',      progress: 100, eta: '', problem: '' },
    { id: 'Р-3075', requestId: 'З-1033', client: '«Логистик Плюс»',     manager: 'as', from: 'Самара',         to: 'Казань',          km: 440,  cargo: 'Сборный груз',      weight: '9 т',          driver: 'Ринат Сафин',    driverPhone: '+7 917 300-66-25', carrier: 'ИП Сафин Р. Р.',      truck: 'MAN TGX · Т456РР 16',     loadDate: '2026-11-02', unloadDate: '2026-11-03', status: 'done',      progress: 100, eta: '', problem: '' },
    { id: 'Р-3074', requestId: 'З-1032', client: 'ООО «МебельГрад»',    manager: 'iv', from: 'Краснодар',      to: 'Москва',          km: 1350, cargo: 'Мебель',            weight: '18 т / 74 м³', driver: 'Артём Соколов',  driverPhone: '+7 919 330-62-18', carrier: 'ООО «ЮгТранс»',       truck: 'Volvo FH · О815КК 23',    loadDate: '2026-11-01', unloadDate: '2026-11-03', status: 'done',      progress: 100, eta: '', problem: '' },
    { id: 'Р-3073', requestId: 'З-1036', client: 'ООО «ПромСнаб Урал»', manager: 'dk', from: 'Пермь',          to: 'Тюмень',          km: 780,  cargo: 'Трубы',             weight: '21 т',         driver: 'Сергей Гущин',   driverPhone: '+7 912 505-14-37', carrier: 'ООО «УралТрак»',      truck: 'КАМАЗ 5490 · Е501ТУ 66',  loadDate: '2026-11-06', unloadDate: '2026-11-07', status: 'transit',   progress: 78, eta: '2026-11-07T08:00', problem: '' },
    { id: 'Р-3072', requestId: 'З-1038', client: 'ООО «ФрешЛогистик»',  manager: 'as', from: 'Москва',         to: 'Владивосток',     km: 9100, cargo: 'Реф. груз',         weight: '18 т',         driver: '',               driverPhone: '',                 carrier: '',                    truck: '',                        loadDate: '2026-11-10', unloadDate: '2026-11-18', status: 'planned',   progress: 0,  eta: '2026-11-18T20:00', problem: '' },
    { id: 'Р-3071', requestId: 'З-1037', client: 'ГК «АгроТрейд»',      manager: 'dk', from: 'Воронеж',        to: 'Новороссийск',    km: 1120, cargo: 'Зерно',             weight: '20 т',         driver: 'Тимур Исаев',    driverPhone: '+7 913 770-28-14', carrier: 'ООО «ЮгТранс»',       truck: 'Scania R450 · С404ТТ 72', loadDate: '2026-11-09', unloadDate: '2026-11-10', status: 'loading',   progress: 12, eta: '2026-11-10T16:00', problem: '' },
    { id: 'Р-3070', requestId: 'З-1029', client: '«СибирьТрансСервис»', manager: 'as', from: 'Тюмень',         to: 'Омск',            km: 640,  cargo: 'Нефтепродукты',     weight: '20 т',         driver: 'Тимур Исаев',    driverPhone: '+7 913 770-28-14', carrier: 'ООО «НефтеЛог»',      truck: 'КАМАЗ 5490 · С404ТТ 72',  loadDate: '2026-10-30', unloadDate: '2026-10-31', status: 'done',      progress: 100, eta: '', problem: '' },
    { id: 'Р-3069', requestId: 'З-1028', client: 'ООО «СтройБаза 24»',  manager: 'dk', from: 'Красноярск',     to: 'Кемерово',        km: 520,  cargo: 'Пиломатериалы',     weight: '20 т',         driver: '',               driverPhone: '',                 carrier: 'ООО «УралТрак»',      truck: '',                        loadDate: '2026-11-07', unloadDate: '2026-11-08', status: 'problem',   progress: 0,  eta: '2026-11-08T18:00', problem: 'Нет свободной машины под погрузку — ищем замену у партнёров' },
    { id: 'Р-3068', requestId: 'З-1027', client: 'ООО «АкваМир»',       manager: 'iv', from: 'Ростов-на-Дону', to: 'Волгоград',       km: 480,  cargo: 'Реф. продукты',     weight: '14 т',         driver: 'Алексей Волков', driverPhone: '+7 910 220-11-45', carrier: 'ИП Волков А. С.',    truck: 'Volvo FH · А123ВС 77',    loadDate: '2026-10-29', unloadDate: '2026-10-30', status: 'done',      progress: 100, eta: '', problem: '' },
  ];

  /* ---------------- DOM ---------------- */
  const tableBody = $('#tripsBody');
  const tabsBox = $('#statusTabs');
  const searchInput = $('#searchInput');
  const managerFilter = $('#managerFilter');
  const tableSummary = $('#tableSummary');
  const scrim = $('#scrim');
  const drawer = $('#drawer');
  const modal = $('#modal');
  const tripForm = $('#tripForm');
  const formManager = $('#formManager');
  const formStatus = $('#formStatus');
  const formLoadDate = $('#formLoadDate');
  const formUnloadDate = $('#formUnloadDate');

  const kpiActive = $('#kpiActive');
  const kpiTransit = $('#kpiTransit');
  const kpiTransitHint = $('#kpiTransitHint');
  const kpiProblem = $('#kpiProblem');
  const kpiDone = $('#kpiDone');

  let activeTab = 'all';
  let openId = null;

  /* ---------------- Фильтры ---------------- */
  function visibleTrips() {
    const q = normalize(searchInput.value);
    const mgr = managerFilter.value;

    return trips.filter((t) => {
      if (activeTab !== 'all' && t.status !== activeTab) return false;
      if (mgr !== 'all' && t.manager !== mgr) return false;
      if (!q) return true;
      const hay = normalize([
        t.id, t.requestId, t.client, t.from, t.to, t.cargo,
        t.driver, t.carrier, t.truck, statusById(t.status).name,
      ].join(' '));
      return hay.includes(q);
    });
  }

  /* ---------------- Табы ---------------- */
  function renderTabs() {
    const items = [{ id: 'all', name: 'Все рейсы', count: trips.length }].concat(
      STATUSES.map((s) => ({ id: s.id, name: s.short, count: trips.filter((t) => t.status === s.id).length }))
    );

    tabsBox.innerHTML = items.map((t) => `
      <button class="tab${activeTab === t.id ? ' is-active' : ''}" role="tab"
              aria-selected="${activeTab === t.id}" data-tab="${t.id}">
        ${escapeHtml(t.name)}<span class="tab-count">${t.count}</span>
      </button>`).join('');
  }

  /* ---------------- Строка таблицы ---------------- */
  function rowMarkup(t) {
    const st = statusById(t.status);
    const m = managerById(t.manager);
    const progress = Math.max(0, Math.min(100, t.progress));
    const left = Math.max(0, Math.round(t.km * (1 - progress / 100)));

    return `
      <tr class="req-row" data-id="${t.id}" tabindex="0">
        <td class="cell-id">
          ${escapeHtml(t.id)}
          <div class="muted">${escapeHtml(t.requestId)}</div>
        </td>
        <td>
          <div class="client-name">${escapeHtml(t.client)}</div>
          <div class="client-sub">${escapeHtml(t.cargo)}</div>
        </td>
        <td>
          <div class="route-mini">
            <span>${escapeHtml(t.from)}</span>
            ${icon('i-arrow')}
            <span>${escapeHtml(t.to)}</span>
          </div>
          <div class="progress-mini"><span style="width:${progress}%;background:${st.color}"></span></div>
          <div class="muted">${t.km} км${progress < 100 ? ` · осталось ${left} км` : ''}</div>
        </td>
        <td class="col-driver">
          <div class="driver-name">${t.driver ? escapeHtml(t.driver) : '<span class="muted">не назначен</span>'}</div>
          <div class="muted">${t.truck ? escapeHtml(t.truck) : escapeHtml(t.carrier || '—')}</div>
        </td>
        <td class="col-dates">
          ${formatDate(t.loadDate)}
          <div class="muted">→ ${formatDate(t.unloadDate)}</div>
        </td>
        <td class="col-eta">${t.status === 'done' ? '<span class="muted">—</span>' : formatEta(t.eta)}</td>
        <td class="col-weight">${escapeHtml(t.weight)}</td>
        <td><span class="status-pill status--${st.id}">${escapeHtml(st.name)}</span></td>
        <td class="col-manager">
          <span class="row-manager">
            <span class="avatar" style="--av:${m.color}" title="${escapeHtml(m.name)}">${m.short}</span>
            <span class="row-manager-name">${escapeHtml(m.name.split(' ')[0])}</span>
          </span>
        </td>
      </tr>`;
  }

  /* ---------------- Рендер ---------------- */
  function renderTable() {
    const rows = visibleTrips();

    tableBody.innerHTML = rows.length
      ? rows.map(rowMarkup).join('')
      : `<tr><td colspan="9" class="table-empty">Ничего не найдено. Измените запрос или сбросьте фильтры.</td></tr>`;

    const active = rows.filter((t) => isActive(t.status)).length;
    const word = plural(rows.length, 'рейс', 'рейса', 'рейсов');
    tableSummary.textContent = `Показано ${rows.length} ${word} из ${trips.length} · в работе ${active}`;
  }

  function renderKpis() {
    const active = trips.filter((t) => isActive(t.status));
    const transit = trips.filter((t) => t.status === 'transit').length;
    const problems = trips.filter((t) => t.status === 'problem').length;
    const done = trips.filter((t) => t.status === 'done').length;

    kpiActive.textContent = active.length;
    kpiTransit.textContent = transit;
    kpiTransitHint.textContent = `${transit} ${plural(transit, 'машина', 'машины', 'машин')} на линии`;
    kpiProblem.textContent = problems;
    kpiDone.textContent = done;
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
  const drawerCargo = $('#drawerCargo');
  const drawerProgress = $('#drawerProgress');
  const drawerDriver = $('#drawerDriver');
  const drawerFacts = $('#drawerFacts');
  const drawerStatusSelect = $('#drawerStatusSelect');
  const drawerCall = $('#drawerCall');
  const drawerHeadCall = $('#drawerHeadCall');
  const drawerNote = $('#drawerNote');
  const drawerCheckpoints = $('#drawerCheckpoints');

  const fact = (label, value) =>
    `<div class="fact"><span class="fact-label">${label}</span><span class="fact-value">${value}</span></div>`;

  function progressBlock(t, color) {
    const progress = Math.max(0, Math.min(100, t.progress));
    const left = Math.max(0, Math.round(t.km * (1 - progress / 100)));

    return `
      <div class="progress-head">
        <span>${escapeHtml(t.from)}</span>
        <span>${escapeHtml(t.to)}</span>
      </div>
      <div class="progress-track">
        <div class="progress-fill" style="width:${progress}%;background:${color}"></div>
        <span class="progress-truck" style="left:calc(${progress}% - 11px);color:${color}">${icon('i-truck')}</span>
      </div>
      <div class="progress-meta">
        <span>${t.km} км · ${progress}%</span>
        <span>${progress >= 100 ? 'рейс завершён' : `осталось ${left} км`}</span>
      </div>
      ${t.status !== 'done' && t.eta ? `<div class="progress-eta">${icon('i-clock')} Прибытие: ${formatEta(t.eta)}</div>` : ''}`;
  }

  function buildCheckpoints(t) {
    let idx = ORDER.indexOf(t.status);
    if (t.status === 'problem') idx = t.progress >= 30 ? 3 : 2;
    if (idx < 0) idx = 0;

    const steps = [
      { title: 'Заявка принята', time: formatDateFull(t.loadDate) },
      { title: t.driver ? 'Машина назначена' : 'Машина не назначена', time: t.driver ? formatDateFull(t.loadDate) : '—' },
      { title: 'Погрузка', time: formatDateFull(t.loadDate) },
      { title: 'В пути', time: t.eta ? `ETA ${formatEta(t.eta)}` : '—' },
      { title: 'Выгрузка', time: formatDateFull(t.unloadDate) },
      { title: 'Рейс завершён', time: t.status === 'done' ? formatDateFull(t.unloadDate) : '—' },
    ];

    return steps.map((s, i) => {
      const state = i < idx ? 'is-done' : i === idx ? 'is-current' : '';
      return `<li class="checkpoint ${state}">
                <span class="checkpoint-title">${escapeHtml(s.title)}</span>
                <span class="checkpoint-time">${escapeHtml(s.time)}</span>
              </li>`;
    }).join('');
  }

  function openDrawer(id) {
    const t = trips.find((x) => x.id === id);
    if (!t) return;
    openId = id;

    const st = statusById(t.status);
    const m = managerById(t.manager);

    drawerStatusPill.textContent = st.name;
    drawerStatusPill.style.setProperty('--st', st.color);
    drawerId.textContent = `Рейс ${t.id} · заявка ${t.requestId} · ${m.short}`;
    drawerClient.textContent = t.client;
    drawerCargo.textContent = `${t.cargo} · ${t.weight}`;

    drawerProgress.innerHTML = progressBlock(t, st.color);

    drawerDriver.innerHTML = t.driver
      ? `<div class="carrier-card">
           <span class="carrier-ico">${icon('i-user')}</span>
           <div class="carrier-info">
             <div class="carrier-name">${escapeHtml(t.driver)}</div>
             <div class="carrier-sub">${escapeHtml(t.truck || t.carrier)}${t.carrier && t.truck ? ` · ${escapeHtml(t.carrier)}` : ''}</div>
             ${t.driverPhone ? `<a class="carrier-phone" href="tel:${t.driverPhone.replace(/[^+\d]/g, '')}">${escapeHtml(t.driverPhone)}</a>` : ''}
           </div>
         </div>`
      : `<div class="carrier-empty">
           <span>Водитель не назначен</span>
           <button class="btn btn-ghost" data-placeholder="Подбор машины">
             ${icon('i-search')} Подобрать
           </button>
         </div>`;

    drawerFacts.innerHTML = [
      fact('Погрузка', formatDateFull(t.loadDate)),
      fact('Выгрузка', formatDateFull(t.unloadDate)),
      fact('Перевозчик', t.carrier ? escapeHtml(t.carrier) : '—'),
      fact('Расстояние', `${t.km} км`),
      fact('Груз', escapeHtml(t.cargo)),
      fact('Вес / объём', escapeHtml(t.weight)),
    ].join('');

    drawerStatusSelect.innerHTML = STATUSES.map(
      (s) => `<option value="${s.id}"${s.id === t.status ? ' selected' : ''}>${escapeHtml(s.name)}</option>`
    ).join('');

    const tel = t.driverPhone ? `tel:${t.driverPhone.replace(/[^+\d]/g, '')}` : '#';
    drawerCall.href = tel;
    drawerHeadCall.href = tel;

    drawerNote.classList.toggle('is-warn', Boolean(t.problem));
    drawerNote.innerHTML = t.problem
      ? `${icon('i-bolt')}<p><b>Проблема:</b> ${escapeHtml(t.problem)}</p>`
      : `${icon('i-clock')}<p>GPS-трекинг, сканы ТТН и чат с водителем появятся в следующих версиях.</p>`;

    drawerCheckpoints.innerHTML = buildCheckpoints(t);

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
    const t = trips.find((x) => x.id === openId);
    if (!t) return;
    const next = e.target.value;
    if (t.status === next) return;

    t.status = next;
    if (next === 'done') t.progress = 100;
    if (next === 'planned') t.progress = 0;
    if (next === 'problem') { t.progress = Math.max(t.progress, 5); }
    if (!t.problem) t.problem = '';

    renderAll(t.id);
    openDrawer(t.id);
    toast(`Рейс ${t.id} — ${statusById(next).name}`, 'success');
  });

  $('#drawerClose').addEventListener('click', closeDrawer);

  /* ---------------- Модальное окно ---------------- */
  formManager.innerHTML = MANAGERS.map((m) => `<option value="${m.id}">${escapeHtml(m.name)}</option>`).join('');
  formStatus.innerHTML = STATUSES.map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');

  function openModal() {
    tripForm.reset();
    formStatus.value = 'planned';
    formManager.value = 'as';
    formLoadDate.value = new Date().toISOString().slice(0, 10);
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    updateScrim();
    setTimeout(() => $('#tripForm [name="client"]').focus(), 120);
  }

  function closeModal() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    updateScrim();
  }

  $('#addTripBtn').addEventListener('click', openModal);
  $('#modalClose').addEventListener('click', closeModal);
  $('#modalCancel').addEventListener('click', closeModal);

  function nextId() {
    const numbers = trips
      .map((t) => parseInt(String(t.id).replace(/\D/g, ''), 10))
      .filter((n) => !Number.isNaN(n));
    return `Р-${(numbers.length ? Math.max(...numbers) : 3082) + 1}`;
  }

  tripForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(tripForm);
    const client = String(data.get('client') || '').trim();
    if (!client) return;

    const status = String(data.get('status') || 'planned');
    const progressByStatus = { planned: 0, loading: 8, transit: 50, unloading: 92, done: 100, problem: 20 };

    const item = {
      id: nextId(),
      requestId: String(data.get('requestId') || '—').trim(),
      client,
      manager: String(data.get('manager') || 'as'),
      from: String(data.get('from') || 'Не указано').trim(),
      to: String(data.get('to') || 'Не указано').trim(),
      km: Number(data.get('km')) || 0,
      cargo: String(data.get('cargo') || 'Уточняется').trim(),
      weight: String(data.get('weight') || 'уточняется').trim(),
      driver: String(data.get('driver') || '').trim(),
      driverPhone: String(data.get('driverPhone') || '').trim(),
      carrier: String(data.get('carrier') || '').trim(),
      truck: String(data.get('truck') || '').trim(),
      loadDate: String(data.get('loadDate') || new Date().toISOString().slice(0, 10)),
      unloadDate: String(data.get('unloadDate') || ''),
      status,
      progress: progressByStatus[status] ?? 0,
      eta: '',
      problem: '',
    };

    trips.unshift(item);
    activeTab = 'all';
    renderAll(item.id);
    closeModal();
    toast(`Рейс ${item.id} создан`, 'success');
  });

  /* ---------------- Скрим / клавиши ---------------- */
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

  /* ---------------- События ---------------- */
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
