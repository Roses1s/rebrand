/* ============================================================
   ТрансЛайн CRM — общие утилиты для всех страниц
   (темы, тосты, сайдбар, заглушки, форматирование)
   ============================================================ */

window.TL = (function () {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  const MONTHS_FULL = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

  const MANAGERS = [
    { id: 'as', name: 'Анна Смирнова',  short: 'АС', color: '#4560f0' },
    { id: 'dk', name: 'Дмитрий Ковалёв', short: 'ДК', color: '#8b5cf6' },
    { id: 'iv', name: 'Ирина Волкова',   short: 'ИВ', color: '#0ea47a' },
  ];
  const managerById = (id) => MANAGERS.find((m) => m.id === id) || MANAGERS[0];

  const moneyFmt = new Intl.NumberFormat('ru-RU');

  function money(n) {
    return `${moneyFmt.format(Math.round(n || 0))} \u20BD`;
  }

  function moneyShort(n) {
    if (n >= 1e6) return `${(n / 1e6).toFixed(2).replace('.', ',').replace(/,?0+$/, '')} млн ₽`;
    if (n >= 1e3) return `${Math.round(n / 1e3)} тыс ₽`;
    return money(n);
  }

  function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(d.getTime())) return iso;
    return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  }

  function formatDateFull(iso) {
    if (!iso) return '—';
    const d = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(d.getTime())) return iso;
    return `${d.getDate()} ${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`;
  }

  function escapeHtml(str = '') {
    return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  const normalize = (str = '') =>
    String(str).toLowerCase().replace(/[«»"'`]/g, '').replace(/\s+/g, ' ').trim();

  const icon = (id, cls = 'ico') => `<svg viewBox="0 0 24 24" class="${cls}"><use href="#${id}"/></svg>`;

  /* ---------------- Тосты ---------------- */
  function toast(message, type = 'info') {
    const box = $('#toasts');
    if (!box) return;
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.innerHTML = `${icon(type === 'success' ? 'i-check' : 'i-help')}<span>${escapeHtml(message)}</span>`;
    box.appendChild(el);
    setTimeout(() => {
      el.classList.add('is-out');
      el.addEventListener('animationend', () => el.remove(), { once: true });
    }, 2600);
  }

  /* ---------------- Тема ---------------- */
  function initTheme() {
    const toggle = $('#themeToggle');
    if (!toggle) return;

    function apply(theme) {
      document.documentElement.dataset.theme = theme;
      toggle.setAttribute('aria-label', theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему');
      try { localStorage.setItem('tl-theme', theme); } catch (e) {}
    }

    apply(document.documentElement.dataset.theme || 'light');

    toggle.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      apply(next);
      toast(next === 'dark' ? 'Тёмная тема включена' : 'Светлая тема включена');
    });
  }

  /* ---------------- Мобильный сайдбар ---------------- */
  function initSidebar() {
    const sidebar = $('#sidebar');
    const scrim = $('#sidebarScrim');
    const menuBtn = $('#menuBtn');
    const closeBtn = $('#sidebarClose');
    if (!sidebar || !scrim) return;

    function open() {
      sidebar.classList.add('is-open');
      scrim.classList.add('is-on');
    }
    function close() {
      sidebar.classList.remove('is-open');
      scrim.classList.remove('is-on');
    }

    if (menuBtn) menuBtn.addEventListener('click', open);
    if (closeBtn) closeBtn.addEventListener('click', close);
    scrim.addEventListener('click', close);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && sidebar.classList.contains('is-open')) close();
    });

    sidebar.addEventListener('click', (e) => {
      if (e.target.closest('.nav-item')) close();
    });
  }

  /* ---------------- Заглушки переходов ---------------- */
  function initPlaceholders() {
    document.addEventListener('click', (e) => {
      const target = e.target.closest('[data-placeholder]');
      if (!target) return;
      e.preventDefault();
      toast(`«${target.dataset.placeholder}» — раздел в разработке`, 'info');
    });
  }

  /* ---------------- Инициализация ---------------- */
  function init() {
    initTheme();
    initSidebar();
    initPlaceholders();
  }

  return {
    MANAGERS, managerById,
    $, $$, money, moneyShort, formatDate, formatDateFull,
    escapeHtml, normalize, icon, toast,
    initTheme, initSidebar, initPlaceholders, init,
  };
})();
