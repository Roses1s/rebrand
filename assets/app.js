/* ============================================================
   ТрансЛайн CRM — логика главной страницы (воронка лидов)
   ============================================================ */

(() => {
  'use strict';

  /* ---------------- Справочники ---------------- */
  const STAGES = [
    { id: 'new',       name: 'Новый',          color: '#4f7cff' },
    { id: 'callback',  name: 'Перезвонить',    color: '#f5a524' },
    { id: 'lpr',       name: 'Вышел на ЛПР',   color: '#a855f7' },
    { id: 'potential', name: 'Потенциальный',  color: '#10b981' },
    { id: 'shipped',   name: 'Уехали',         color: '#06b6d4' },
    { id: 'waiting',   name: 'Ждем заявку',    color: '#f43f5e' },
  ];

  const MANAGERS = [
    { id: 'as', name: 'Анна Смирнова',  short: 'АС', color: '#4560f0' },
    { id: 'dk', name: 'Дмитрий Ковалёв', short: 'ДК', color: '#8b5cf6' },
    { id: 'iv', name: 'Ирина Волкова',   short: 'ИВ', color: '#0ea47a' },
  ];

  const stageById = (id) => STAGES.find((s) => s.id === id) || STAGES[0];
  const managerById = (id) => MANAGERS.find((m) => m.id === id) || MANAGERS[0];

  /* ---------------- Данные лидов ---------------- */
  let leads = [
    { id: 'l1',  stage: 'new',       company: 'ООО «Северный путь»',  contact: 'Игорь Мельник',   phone: '+7 921 455-12-08', from: 'Санкт-Петербург', to: 'Москва',          cargo: 'Сборный груз', weight: '12 т / 46 м³',  price: 96000,  manager: 'as', date: '2026-11-06', tags: ['сборный', 'B2B'], hot: false },
    { id: 'l2',  stage: 'new',       company: 'ГК «АгроТрейд»',        contact: 'Марина Крылова',  phone: '+7 903 118-74-32', from: 'Воронеж',         to: 'Новороссийск',    cargo: 'Зерно',        weight: '20 т',          price: 148000, manager: 'dk', date: '2026-11-06', tags: ['фура', 'экспорт'], hot: true },
    { id: 'l3',  stage: 'new',       company: 'ООО «МебельГрад»',      contact: 'Павел Дорохов',   phone: '+7 918 220-45-19', from: 'Краснодар',       to: 'Москва',          cargo: 'Мебель',       weight: '18 т / 74 м³',  price: 172000, manager: 'iv', date: '2026-11-05', tags: ['сборный'], hot: false },
    { id: 'l4',  stage: 'new',       company: 'ООО «АкваМир»',         contact: 'Роман Тимофеев',  phone: '+7 909 512-33-70', from: 'Ростов-на-Дону',  to: 'Волгоград',       cargo: 'Реф. продукты', weight: '14 т',         price: 74000,  manager: 'iv', date: '2026-11-05', tags: ['реф'], hot: false },
    { id: 'l5',  stage: 'new',       company: 'ГК «Русмолоко»',        contact: 'Тимур Исаев',     phone: '+7 913 770-28-14', from: 'Барнаул',         to: 'Новосибирск',     cargo: 'Молочная продукция', weight: '16 т',    price: 78000,  manager: 'as', date: '2026-11-04', tags: ['реф', 'FMCG'], hot: false },

    { id: 'l6',  stage: 'callback',  company: 'ИП Сафин Р. Р.',         contact: 'Ринат Сафин',     phone: '+7 917 300-66-25', from: 'Казань',          to: 'Екатеринбург',    cargo: 'ТНП',          weight: '5 т / 20 м³',   price: 48000,  manager: 'as', date: '2026-11-04', tags: ['сборный'], hot: false },
    { id: 'l7',  stage: 'callback',  company: 'ООО «ХимПром»',         contact: 'Анна Белова',     phone: '+7 910 442-19-83', from: 'Дзержинск',       to: 'Санкт-Петербург', cargo: 'Химия, ADR',   weight: '20 т',          price: 210000, manager: 'dk', date: '2026-11-03', tags: ['ADR', 'фура'], hot: true },
    { id: 'l8',  stage: 'callback',  company: 'ООО «ТехноПарк»',       contact: 'Илья Громов',     phone: '+7 925 614-08-90', from: 'Москва',          to: 'Минск',           cargo: 'Электроника',  weight: '3 т / 12 м³',   price: 145000, manager: 'iv', date: '2026-11-03', tags: ['B2B', 'срочно'], hot: false },
    { id: 'l9',  stage: 'callback',  company: 'ООО «МедТек»',          contact: 'Светлана Юрьева', phone: '+7 916 208-55-41', from: 'Москва',          to: 'Краснодар',       cargo: 'Медоборудование', weight: '2 т',        price: 88000,  manager: 'as', date: '2026-11-02', tags: ['B2B'], hot: false },

    { id: 'l10', stage: 'lpr',       company: '«Балт-Строй»',          contact: 'Сергей Гущин',    phone: '+7 911 340-77-62', from: 'Калининград',     to: 'Смоленск',        cargo: 'Стройматериалы', weight: '20 т',        price: 265000, manager: 'iv', date: '2026-11-02', tags: ['фура'], hot: false },
    { id: 'l11', stage: 'lpr',       company: '«СибирьТрансСервис»',   contact: 'Оксана Панова',   phone: '+7 912 505-14-37', from: 'Тюмень',          to: 'Омск',            cargo: 'Нефтепродукты', weight: '20 т',        price: 132000, manager: 'as', date: '2026-11-01', tags: ['цистерна'], hot: true },

    { id: 'l12', stage: 'potential', company: 'ООО «ФрешЛогистик»',    contact: 'Ольга Ким',       phone: '+7 926 118-90-55', from: 'Москва',          to: 'Владивосток',     cargo: 'Реф. груз',    weight: '18 т',          price: 640000, manager: 'as', date: '2026-10-31', tags: ['реф', 'VIP'], hot: true },
    { id: 'l13', stage: 'potential', company: 'ООО «УралМеталл»',      contact: 'Артём Соколов',   phone: '+7 919 330-62-18', from: 'Челябинск',       to: 'Москва',          cargo: 'Металл',       weight: '22 т',          price: 320000, manager: 'dk', date: '2026-10-30', tags: ['фура'], hot: false },
    { id: 'l14', stage: 'potential', company: 'ООО «Гринлайн»',        contact: 'Максим Литвинов', phone: '+7 988 401-26-73', from: 'Сочи',            to: 'Москва',          cargo: 'Овощи, реф',   weight: '16 т',          price: 175000, manager: 'dk', date: '2026-10-30', tags: ['реф', 'FMCG'], hot: false },

    { id: 'l15', stage: 'shipped',   company: '«ТД Восток»',           contact: 'Елена Егорова',   phone: '+7 923 445-71-02', from: 'Новосибирск',     to: 'Иркутск',         cargo: 'Оборудование', weight: '15 т / 82 м³',  price: 285000, manager: 'iv', date: '2026-10-29', tags: ['фура'], hot: false },
    { id: 'l16', stage: 'shipped',   company: 'ООО «ПродСнаб»',        contact: 'Виктор Лазарев',  phone: '+7 903 771-38-24', from: 'Москва',          to: 'Тверь',           cargo: 'Продукты',     weight: '8 т',           price: 54000,  manager: 'as', date: '2026-10-28', tags: ['FMCG'], hot: false },
    { id: 'l17', stage: 'shipped',   company: '«Логистик Плюс»',       contact: 'Наталья Реброва', phone: '+7 927 812-44-16', from: 'Самара',          to: 'Казань',          cargo: 'Сборный груз', weight: '9 т',           price: 61000,  manager: 'as', date: '2026-10-27', tags: ['сборный'], hot: false },

    { id: 'l18', stage: 'waiting',   company: 'ООО «СтройБаза 24»',    contact: 'Дмитрий Орлов',   phone: '+7 902 118-63-09', from: 'Красноярск',      to: 'Кемерово',        cargo: 'Пиломатериалы', weight: '20 т',         price: 118000, manager: 'dk', date: '2026-10-27', tags: ['фура'], hot: false },
    { id: 'l19', stage: 'waiting',   company: '«Альфа Ритейл»',        contact: 'Ксения Ветрова',  phone: '+7 917 605-77-31', from: 'Москва',          to: 'Нижний Новгород', cargo: 'FMCG',         weight: '10 т / 40 м³',  price: 92000,  manager: 'iv', date: '2026-10-26', tags: ['FMCG', 'срочно'], hot: true },
    { id: 'l20', stage: 'waiting',   company: 'ООО «ПромСнаб Урал»',   contact: 'Кирилл Абрамов',  phone: '+7 922 340-55-87', from: 'Пермь',           to: 'Тюмень',          cargo: 'Трубы',        weight: '21 т',          price: 158000, manager: 'dk', date: '2026-10-25', tags: ['фура'], hot: false },
  ];

  /* ---------------- Хелперы ---------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

  function formatDate(iso) {
    const d = new Date(iso + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return iso;
    return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  }

  const moneyFmt = new Intl.NumberFormat('ru-RU');
  function money(n) {
    return `${moneyFmt.format(Math.round(n || 0))} \u20BD`;
  }
  function moneyShort(n) {
    if (n >= 1e6) return `${(n / 1e6).toFixed(2).replace('.', ',').replace(/,?0+$/, '')} млн ₽`;
    if (n >= 1e3) return `${Math.round(n / 1e3)} тыс ₽`;
    return money(n);
  }
  function escapeHtml(str = '') {
    return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  const normalize = (str = '') => String(str).toLowerCase().replace(/[«»"'`]/g, '').replace(/\s+/g, ' ').trim();

  const icon = (id, cls = 'ico') => `<svg viewBox="0 0 24 24" class="${cls}"><use href="#${id}"/></svg>`;

  /* ---------------- DOM ---------------- */
  const board = $('#board');
  const searchInput = $('#searchInput');
  const managerFilter = $('#managerFilter');
  const kpiTotal = $('#kpiTotal');
  const kpiSum = $('#kpiSum');
  const kpiAvg = $('#kpiAvg');
  const kpiConv = $('#kpiConv');
  const navLeadsCount = $('#navLeadsCount');
  const toasts = $('#toasts');
  const scrim = $('#scrim');
  const drawer = $('#drawer');
  const modal = $('#modal');
  const sidebar = $('#sidebar');
  const sidebarScrim = $('#sidebarScrim');

  let draggedId = null;
  let overBody = null;
  let openLeadId = null;

  /* ---------------- Тосты ---------------- */
  function toast(message, type = 'info') {
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.innerHTML = `${icon(type === 'success' ? 'i-check' : 'i-help')}<span>${escapeHtml(message)}</span>`;
    toasts.appendChild(el);
    setTimeout(() => {
      el.classList.add('is-out');
      el.addEventListener('animationend', () => el.remove(), { once: true });
    }, 2600);
  }

  /* ---------------- Рендер карточки ---------------- */
  function cardMarkup(lead) {
    const m = managerById(lead.manager);
    const stage = stageById(lead.stage);
    const tags = (lead.tags || []).map((t) => `<span class="chip">${escapeHtml(t)}</span>`).join('');
    return `
      <article class="card" draggable="true" data-id="${lead.id}" style="--stage:${stage.color}" tabindex="0" aria-label="Лид: ${escapeHtml(lead.company)}">
        <div class="card-top">
          <span class="card-company">${escapeHtml(lead.company)}</span>
          ${lead.hot ? `<span class="card-flag">${icon('i-bolt')}срочно</span>` : ''}
        </div>
        <div class="card-contact">
          <span class="name">${escapeHtml(lead.contact)}</span>
          <span class="sep"></span>
          <span class="phone">${escapeHtml(lead.phone)}</span>
        </div>
        <div class="card-route">
          <span class="route-point"><span class="route-dot"></span>${escapeHtml(lead.from)}</span>
          <span class="route-line"></span>
          <span class="route-point"><span class="route-dot end"></span>${escapeHtml(lead.to)}</span>
        </div>
        <div class="card-meta">${icon('i-box')}<span>${escapeHtml(lead.cargo)} · ${escapeHtml(lead.weight)}</span></div>
        ${tags ? `<div class="card-tags">${tags}</div>` : ''}
        <div class="card-foot">
          <span class="card-price">${money(lead.price)}</span>
          <span class="card-date">${formatDate(lead.date)}</span>
          <span class="avatar" style="--av:${m.color}" title="${escapeHtml(m.name)}">${m.short}</span>
        </div>
      </article>`;
  }

  /* ---------------- Рендер доски ---------------- */
  function getVisibleLeads() {
    const q = normalize(searchInput.value);
    const mgr = managerFilter.value;
    return leads.filter((lead) => {
      if (mgr !== 'all' && lead.manager !== mgr) return false;
      if (!q) return true;
      const haystack = normalize([lead.company, lead.contact, lead.phone, lead.from, lead.to, lead.cargo, ...(lead.tags || [])].join(' '));
      return haystack.includes(q);
    });
  }

  function renderBoard(flashId) {
    const visible = getVisibleLeads();
    const filtering = Boolean(normalize(searchInput.value)) || managerFilter.value !== 'all';

    board.innerHTML = STAGES.map((stage) => {
      const items = visible.filter((l) => l.stage === stage.id);
      const sum = items.reduce((acc, l) => acc + l.price, 0);
      const bodyClass = items.length ? '' : ` is-empty${filtering ? ' is-filtered-empty' : ''}`;

      return `
        <section class="column" data-stage="${stage.id}" style="--stage:${stage.color}" aria-label="${escapeHtml(stage.name)}">
          <header class="column-head">
            <span class="stage-dot"></span>
            <span class="column-title">${escapeHtml(stage.name)}</span>
            <span class="column-count">${items.length}</span>
            <span class="column-sum">${items.length ? moneyShort(sum) : '—'}</span>
            <button class="add-btn" data-add="${stage.id}" aria-label="Добавить лид в этап ${escapeHtml(stage.name)}">${icon('i-plus')}</button>
          </header>
          <div class="column-body${bodyClass}" data-drop="${stage.id}">
            ${items.map(cardMarkup).join('')}
          </div>
          <div class="column-footer">
            <button class="column-add" data-add="${stage.id}">${icon('i-plus')}Добавить лид</button>
          </div>
        </section>`;
    }).join('');

    if (flashId) {
      const card = board.querySelector(`.card[data-id="${flashId}"]`);
      if (card) {
        card.classList.add('is-flash');
        card.addEventListener('animationend', () => card.classList.remove('is-flash'), { once: true });
        card.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    }
  }

  function updateKpis() {
    const total = leads.length;
    const sum = leads.reduce((acc, l) => acc + l.price, 0);
    const avg = total ? sum / total : 0;
    const inRequests = leads.filter((l) => l.stage === 'shipped' || l.stage === 'waiting').length;
    const conv = total ? Math.round((inRequests / total) * 100) : 0;

    kpiTotal.textContent = total;
    kpiSum.textContent = moneyShort(sum);
    kpiAvg.textContent = money(avg);
    kpiConv.textContent = `${conv}%`;
    navLeadsCount.textContent = total;
  }

  function renderAll(flashId) {
    renderBoard(flashId);
    updateKpis();
  }

  /* ---------------- Drag & drop ---------------- */
  function clearOver() {
    $$('.column-body.is-over', board).forEach((el) => el.classList.remove('is-over'));
    overBody = null;
  }

  board.addEventListener('dragstart', (e) => {
    const card = e.target.closest('.card');
    if (!card) return;
    draggedId = card.dataset.id;
    card.classList.add('is-dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedId);
  });

  board.addEventListener('dragend', (e) => {
    const card = e.target.closest('.card');
    if (card) card.classList.remove('is-dragging');
    clearOver();
    draggedId = null;
  });

  board.addEventListener('dragover', (e) => {
    const body = e.target.closest('.column-body');
    if (!body || !draggedId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (overBody !== body) {
      clearOver();
      body.classList.add('is-over');
      overBody = body;
    }
  });

  board.addEventListener('dragleave', (e) => {
    if (!board.contains(e.relatedTarget)) clearOver();
  });

  board.addEventListener('drop', (e) => {
    const body = e.target.closest('.column-body');
    if (!body || !draggedId) return;
    e.preventDefault();

    const lead = leads.find((l) => l.id === draggedId);
    const stageId = body.dataset.drop;
    clearOver();
    draggedId = null;

    if (!lead || lead.stage === stageId) {
      renderAll();
      return;
    }
    lead.stage = stageId;
    lead.date = new Date().toISOString().slice(0, 10);
    renderAll(lead.id);
    toast(`«${lead.company}» → ${stageById(stageId).name}`, 'success');
  });

  /* ---------------- Клики по доске ---------------- */
  board.addEventListener('click', (e) => {
    const addBtn = e.target.closest('[data-add]');
    if (addBtn) {
      openModal(addBtn.dataset.add);
      return;
    }
    const card = e.target.closest('.card');
    if (card) openDrawer(card.dataset.id);
  });

  board.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const card = e.target.closest('.card');
    if (!card) return;
    e.preventDefault();
    openDrawer(card.dataset.id);
  });

  /* ---------------- Drawer ---------------- */
  const drawerStagePill = $('#drawerStagePill');
  const drawerCompany = $('#drawerCompany');
  const drawerContact = $('#drawerContact');
  const drawerRoute = $('#drawerRoute');
  const drawerFacts = $('#drawerFacts');
  const drawerStageSelect = $('#drawerStageSelect');
  const drawerCall = $('#drawerCall');
  const drawerTimeline = $('#drawerTimeline');

  function factMarkup(label, value) {
    return `<div class="fact"><span class="fact-label">${label}</span><span class="fact-value">${value}</span></div>`;
  }

  function buildTimeline(lead) {
    const stageIndex = STAGES.findIndex((s) => s.id === lead.stage);
    const items = [{ text: 'Лид создан из формы на сайте', time: formatDate(lead.date) }];
    if (stageIndex >= 1) items.push({ text: 'Звонок: обсудили маршрут и объём', time: `${formatDate(lead.date)}, 11:20` });
    if (stageIndex >= 2) items.push({ text: 'Вышли на ЛПР, отправили коммерческое предложение', time: `${formatDate(lead.date)}, 15:05` });
    if (stageIndex >= 3) items.push({ text: 'Подтвердили ставку, готовим заявку', time: `${formatDate(lead.date)}, 17:40` });
    if (stageIndex >= 4) items.push({ text: 'Машина загружена, груз в пути', time: formatDate(lead.date) });
    if (stageIndex >= 5) items.push({ text: 'Ждём заявку от клиента', time: formatDate(lead.date) });

    return items
      .slice()
      .reverse()
      .map((i) => `<li>${escapeHtml(i.text)}<time>${escapeHtml(i.time)}</time></li>`)
      .join('');
  }

  function openDrawer(id) {
    const lead = leads.find((l) => l.id === id);
    if (!lead) return;
    openLeadId = id;

    const stage = stageById(lead.stage);
    const m = managerById(lead.manager);

    drawerStagePill.textContent = stage.name;
    drawerStagePill.style.setProperty('--stage', stage.color);
    drawerCompany.textContent = lead.company;
    drawerContact.innerHTML = `${escapeHtml(lead.contact)} · <a href="tel:${lead.phone.replace(/[^+\d]/g, '')}">${escapeHtml(lead.phone)}</a>`;

    drawerRoute.innerHTML = `
      <span class="route-point"><span class="route-dot"></span>${escapeHtml(lead.from)}</span>
      <span class="route-line"></span>
      ${icon('i-truck')}
      <span class="route-line"></span>
      <span class="route-point"><span class="route-dot end" style="background:${stage.color}"></span>${escapeHtml(lead.to)}</span>`;

    drawerFacts.innerHTML = [
      factMarkup('Стоимость', money(lead.price)),
      factMarkup('Груз', escapeHtml(lead.cargo)),
      factMarkup('Вес / объём', escapeHtml(lead.weight)),
      factMarkup('Менеджер', `${m.short} · ${escapeHtml(m.name.split(' ')[0])}`),
    ].join('');

    drawerStageSelect.innerHTML = STAGES.map(
      (s) => `<option value="${s.id}"${s.id === lead.stage ? ' selected' : ''}>${escapeHtml(s.name)}</option>`
    ).join('');

    drawerCall.href = `tel:${lead.phone.replace(/[^+\d]/g, '')}`;
    drawerTimeline.innerHTML = buildTimeline(lead);

    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    updateScrim();
  }

  function closeDrawer() {
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    openLeadId = null;
    updateScrim();
  }

  drawerStageSelect.addEventListener('change', (e) => {
    const lead = leads.find((l) => l.id === openLeadId);
    if (!lead) return;
    const next = e.target.value;
    if (lead.stage === next) return;
    lead.stage = next;
    lead.date = new Date().toISOString().slice(0, 10);
    renderAll(lead.id);
    openDrawer(lead.id);
    toast(`«${lead.company}» → ${stageById(next).name}`, 'success');
  });

  $('#drawerClose').addEventListener('click', closeDrawer);

  /* ---------------- Модальное окно ---------------- */
  const leadForm = $('#leadForm');
  const formManager = $('#formManager');
  const formStage = $('#formStage');

  formManager.innerHTML = MANAGERS.map((m) => `<option value="${m.id}">${escapeHtml(m.name)}</option>`).join('');
  formStage.innerHTML = STAGES.map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');

  function openModal(stageId = 'new') {
    leadForm.reset();
    formStage.value = stageId;
    formManager.value = 'as';
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    updateScrim();
    setTimeout(() => $('#leadForm [name="company"]').focus(), 120);
  }

  function closeModal() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    updateScrim();
  }

  $('#addLeadBtn').addEventListener('click', () => openModal('new'));
  $('#modalClose').addEventListener('click', closeModal);
  $('#modalCancel').addEventListener('click', closeModal);

  leadForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(leadForm);
    const company = String(data.get('company') || '').trim();
    if (!company) return;

    const price = Number(data.get('price')) || 0;
    const lead = {
      id: `l-${Date.now()}`,
      stage: String(data.get('stage') || 'new'),
      company,
      contact: String(data.get('contact') || 'Контакт не указан').trim(),
      phone: String(data.get('phone') || '+7 900 000-00-00').trim(),
      from: String(data.get('from') || 'Не указано').trim(),
      to: String(data.get('to') || 'Не указано').trim(),
      cargo: String(data.get('cargo') || 'Уточняется').trim(),
      weight: 'уточняется',
      price,
      manager: String(data.get('manager') || 'as'),
      date: new Date().toISOString().slice(0, 10),
      tags: ['новый'],
      hot: false,
    };

    leads.unshift(lead);
    renderAll(lead.id);
    closeModal();
    toast(`Лид «${lead.company}» создан`, 'success');
  });

  /* ---------------- Скрим / оверлеи ---------------- */
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
      else closeSidebar();
    }
    if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
      e.preventDefault();
      searchInput.focus();
    }
  });

  /* ---------------- Фильтры ---------------- */
  managerFilter.innerHTML =
    `<option value="all">Все менеджеры</option>` +
    MANAGERS.map((m) => `<option value="${m.id}">${escapeHtml(m.name)}</option>`).join('');

  searchInput.addEventListener('input', () => renderBoard());
  managerFilter.addEventListener('change', () => renderBoard());

  /* ---------------- Тема ---------------- */
  const themeToggle = $('#themeToggle');
  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    themeToggle.setAttribute('aria-label', theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему');
    try { localStorage.setItem('tl-theme', theme); } catch (e) {}
  }
  themeToggle.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    toast(next === 'dark' ? 'Тёмная тема включена' : 'Светлая тема включена');
  });
  applyTheme(document.documentElement.dataset.theme || 'light');

  /* ---------------- Мобильный сайдбар ---------------- */
  const menuBtn = $('#menuBtn');
  function openSidebar() {
    sidebar.classList.add('is-open');
    sidebarScrim.classList.add('is-on');
  }
  function closeSidebar() {
    sidebar.classList.remove('is-open');
    sidebarScrim.classList.remove('is-on');
  }
  menuBtn.addEventListener('click', openSidebar);
  $('#sidebarClose').addEventListener('click', closeSidebar);
  sidebarScrim.addEventListener('click', closeSidebar);

  /* ---------------- Заглушки переходов ---------------- */
  document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-placeholder]');
    if (!target) return;
    e.preventDefault();
    const label = target.dataset.placeholder;
    toast(`«${label}» — раздел в разработке`, 'info');
    if (sidebar.contains(target)) closeSidebar();
  });

  /* ---------------- Инициализация ---------------- */
  renderAll();
})();
