/**
 * Карточка лида: этапы воронки, клиент, заявки, файлы и история.
 * Лид коллеги открывается усечённо — только название, ИНН и продавец.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Check,
  FileText,
  Mail,
  MoreHorizontal,
  Package,
  Paperclip,
  Phone,
  Truck,
} from "lucide-react";

import { Shell } from "../app/Shell";
import { useLeads } from "../app/store";
import { Button, IconButton } from "../ui/Button";
import { Avatar } from "../ui/Tag";
import { Chatter } from "../ui/Chatter";
import { StageBar } from "../ui/StageBar";
import { Toast } from "../ui/Toast";
import { leadChatter } from "../mock/chatter";
import { ALL_LEADS, EDO_OPERATORS, ME, OWNER, PRIORITY, SHIPMENTS } from "../mock/data";
import { money } from "../lib/format";
import { isEmail, openYandexCompose } from "../lib/mail";

const FILES = [
  { name: "Договор-2026-148.pdf", size: "1,2 МБ", date: "05.11.2026" },
  { name: "Заявка-ЗВ-0148.pdf", size: "340 КБ", date: "05.11.2026" },
  { name: "Доверенность.jpg", size: "820 КБ", date: "04.11.2026" },
];

/** Бухгалтеры, из которых выбирают в карточке. В рабочей CRM приходят с сервера. */
const ACCOUNTANTS = ["Смирнова О. П.", "Ольга Белова", "Пётр Ершов"];

/** Поля карточки, которые менеджер правит руками. */
function draftOf(lead) {
  return {
    name: lead?.name ?? "",
    inn: lead?.inn ?? "",
    contact: lead?.contact ?? "",
    phone: lead?.phone ?? "",
    email: lead?.email ?? "",
    edo: lead?.edo ?? "",
    accountant: lead?.accountant ?? ACCOUNTANTS[0],
    priority: lead?.priority ?? "mid",
  };
}

export function LeadPage() {
  const { id } = useParams();
  const { leads, stages, moveLead, updateLead } = useLeads();
  const lead = leads.find((item) => item.id === Number(id)) ?? ALL_LEADS.find((item) => item.id === Number(id));
  const [tab, setTab] = useState("shipments");
  const [stageId, setStageId] = useState(lead?.stageId ?? 1);
  const chatter = useMemo(() => leadChatter(lead), [lead?.id, lead?.stageId]);

  // Правки живут в черновике: пока их не сохранили, лид и доска не меняются.
  const [draft, setDraft] = useState(() => draftOf(lead));
  const [saved, setSaved] = useState(() => draftOf(lead));
  useEffect(() => {
    const next = draftOf(lead);
    setDraft(next);
    setSaved(next);
  }, [lead?.id]);

  const dirty = Object.keys(saved).some((key) => draft[key] !== saved[key]);
  const set = (key) => (event) => setDraft((prev) => ({ ...prev, [key]: event.target.value }));

  // Состояние «Сохранение…» живёт ровно столько, сколько нужно, чтобы его
  // заметили: данные пишутся мгновенно, индикатор гаснет сам.
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
    persist({ ...draft, name: draft.name.trim() });
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

  // Автосохранение через 3 секунды после последней правки — как в рабочей CRM.
  useEffect(() => {
    if (!dirty || !draft.name.trim()) return undefined;
    const timer = window.setTimeout(() => persist(draft), 3000);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, dirty, lead?.id]);

  // Уходим со страницы с несохранёнными правками — дописываем их сразу,
  // чтобы переход на доску не «съел» ввод.
  const latest = useRef({ id: null, dirty: false, draft: null, update: updateLead });
  latest.current = { id: lead?.id, dirty, draft, update: updateLead };
  useEffect(
    () => () => {
      const state = latest.current;
      if (state.dirty && state.draft?.name?.trim()) state.update(state.id, state.draft);
    },
    [],
  );

  // Уведомление внизу экрана: сейчас это только «почта не указана».
  const [toast, setToast] = useState(null);
  const dismissToast = useCallback(() => setToast(null), []);
  const showToast = useCallback((text, tone = "warn") => {
    setToast({ text, tone });
  }, []);

  // Поле E-mail подсвечиваем и фокусируем, когда письмо отправить некуда.
  const emailRef = useRef(null);
  const [emailHint, setEmailHint] = useState(false);
  function pointToEmail() {
    const node = emailRef.current;
    if (node) {
      node.scrollIntoView?.({ block: "center", behavior: "smooth" });
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

    if (!openYandexCompose(email)) {
      showToast("Браузер заблокировал вкладку. Разрешите всплывающие окна для сайта.");
    }
  }

  // Предупреждение о дубле ИНН: как в рабочей CRM, сохранять не мешает.
  const sameInn =
    draft.inn.trim().length >= 10
      ? leads.filter((item) => item.id !== lead?.id && item.inn === draft.inn.trim())
      : [];

  if (!lead) {
    return (
      <Shell title="Карточка лида">
        <div className="card" style={{ padding: 40, textAlign: "center" }}>
          <h2 style={{ marginBottom: 8 }}>Лид не найден</h2>
          <p className="muted" style={{ marginBottom: 16 }}>
            Возможно, ссылка устарела.
          </p>
          <Link to="/crm" className="btn">
            Вернуться к воронке
          </Link>
        </div>
      </Shell>
    );
  }

  if (lead.ownerId !== ME.id) {
    const colleague = OWNER(lead.ownerId);
    return (
      <Shell title="Карточка лида" crumb={`Воронка · ${lead.name}`}>
        <Link to="/crm" className="back-link">
          <ArrowLeft size={14} strokeWidth={2} />К воронке
        </Link>

        <div className="lead-head">
          <span className="lead-head__logo">
            <Building2 size={24} strokeWidth={1.8} />
          </span>
          <div className="grow">
            <h1 className="lead-head__name">{lead.name}</h1>
            <div className="lead-head__meta">
              <span className="mono">ИНН {lead.inn}</span>
              <span>{lead.city}</span>
            </div>
          </div>
          <div className="lead-head__actions">
            <Avatar initials={colleague.initials} color={colleague.color} size="lg" title={colleague.name} />
            <span style={{ fontSize: 12, color: "var(--ink-2)" }}>{colleague.name}</span>
          </div>
        </div>

        <div className="stub">
          <div>
            <b>Лид коллеги.</b> Активный лид другого менеджера открыт только для просмотра: название, ИНН и продавец.
            Заявки, контакты и деньги доступны владельцу лида и администратору.
          </div>
        </div>
      </Shell>
    );
  }

  const shipments = SHIPMENTS.filter((item) => item.leadId === lead.id);

  return (
    <Shell title="Карточка лида" crumb={`Воронка · ${lead.name}`}>
      <div className="lead-page">
        <Link to="/crm" className="back-link">
        <ArrowLeft size={14} strokeWidth={2} />
        К воронке
      </Link>

      <div className="lead-head">
        <span className="lead-head__logo">
          <Building2 size={24} strokeWidth={1.8} />
        </span>

        <div className="grow">
          <h1 className="lead-head__title">
            <input
              className="lead-title-input"
              value={draft.name}
              onChange={set("name")}
              onKeyDown={onFieldKeyDown}
              aria-label="Название лида"
              placeholder="Название компании"
              autoComplete="off"
            />
          </h1>
          <div className="lead-head__meta">
            <span className="mono">ИНН {draft.inn || "—"}</span>
          </div>
        </div>

        <div className="lead-head__actions">
          {saving ? (
            <span className="lead-save__state lead-save__state--saving">Сохранение…</span>
          ) : dirty ? (
            <div className="lead-save">
              <span className="lead-save__state">
                {draft.name.trim() ? "Изменено" : "Введите название"}
              </span>
              <Button size="sm" variant="ghost" onClick={discardCard}>
                Отменить
              </Button>
              <Button
                size="sm"
                variant="primary"
                icon={Check}
                onClick={saveCard}
                disabled={!draft.name.trim()}
              >
                Сохранить
              </Button>
            </div>
          ) : (
            <span className="lead-save__ok">
              <Check size={13} strokeWidth={2.2} /> Сохранено
            </span>
          )}

          <Button variant="success" icon={Phone}>
            Позвонить
          </Button>
          <Button variant="info" icon={Mail} onClick={writeEmail}>
            Письмо
          </Button>
          <IconButton icon={MoreHorizontal} label="Ещё" />
        </div>
      </div>

      <div className="lead-layout">
        <div className="stack">
          <StageBar
            stages={stages}
            currentId={stageId}
            onSelect={(nextId) => {
              setStageId(nextId);
              moveLead(lead.id, nextId);
            }}
          />

          <div className="card">
            <div className="card__head">
              <div>
                <div className="card__title">Клиент</div>
                <div className="card__sub">Реквизиты и контакты</div>
              </div>
            </div>
            <div className="card__body lead-form" style={{ paddingTop: 4 }} onKeyDown={onFieldKeyDown}>
              <label className="lead-field">
                <span className="lead-field__label">Компания</span>
                <input className="lead-input" value={draft.name} onChange={set("name")} placeholder="ООО «Ромашка»" />
              </label>

              <label className="lead-field">
                <span className="lead-field__label">ИНН</span>
                <input
                  className="lead-input lead-input--mono"
                  value={draft.inn}
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={12}
                  placeholder="10 или 12 цифр"
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, inn: event.target.value.replace(/\D/g, "") }))
                  }
                />
              </label>

              {sameInn.length > 0 && (
                <p className="lead-note lead-note--warn" role="alert">
                  Лид с таким ИНН уже есть: «{sameInn[0].name}». Это предупреждение, сохранить можно.
                </p>
              )}

              <label className="lead-field">
                <span className="lead-field__label">Контакт</span>
                <input className="lead-input" value={draft.contact} onChange={set("contact")} placeholder="Фамилия Имя" />
              </label>

              <label className="lead-field">
                <span className="lead-field__label">Телефон</span>
                <input
                  className="lead-input lead-input--mono"
                  value={draft.phone}
                  inputMode="tel"
                  onChange={set("phone")}
                  placeholder="+7 900 000-00-00"
                />
              </label>

              <label className="lead-field">
                <span className="lead-field__label">E-mail</span>
                <input
                  ref={emailRef}
                  className={`lead-input${emailHint ? " lead-input--attention" : ""}`}
                  type="email"
                  value={draft.email}
                  onChange={set("email")}
                  placeholder="name@example.ru"
                />
              </label>

              <label className="lead-field">
                <span className="lead-field__label">Приоритет</span>
                <select
                  className="lead-input lead-input--select"
                  value={draft.priority}
                  onChange={set("priority")}
                  aria-label="Приоритет лида"
                >
                  {Object.entries(PRIORITY).map(([value, priority]) => (
                    <option key={value} value={value}>
                      {priority.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="lead-field">
                <span className="lead-field__label">Оператор ЭДО</span>
                <select
                  className="lead-input lead-input--select"
                  value={draft.edo}
                  onChange={set("edo")}
                  aria-label="Оператор ЭДО"
                >
                  {EDO_OPERATORS.map((operator) => (
                    <option key={operator.value} value={operator.value} title={operator.vendor}>
                      {operator.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="lead-field">
                <span className="lead-field__label">Бухгалтер</span>
                <select className="lead-input lead-input--select" value={draft.accountant} onChange={set("accountant")}>
                  {ACCOUNTANTS.map((person) => (
                    <option key={person} value={person}>
                      {person}
                    </option>
                  ))}
                  <option value="">Не назначен</option>
                </select>
              </label>
            </div>
          </div>

          <div className="card">
            <div className="tabbar" role="tablist">
              <button type="button" role="tab" aria-selected={tab === "shipments"} onClick={() => setTab("shipments")}>
                Заявки ({shipments.length})
              </button>
              <button type="button" role="tab" aria-selected={tab === "files"} onClick={() => setTab("files")}>
                Файлы ({FILES.length})
              </button>
            </div>

            <div className="card__body">
              {tab === "shipments" &&
                (shipments.length === 0 ? (
                  <div className="empty">
                    <span className="empty__icon">
                      <Truck size={20} strokeWidth={1.8} />
                    </span>
                    <span className="empty__title">Заявок пока нет</span>
                    <p className="empty__text">Создайте первую заявку — она появится здесь и в общем списке.</p>
                    <Button size="sm" variant="primary">
                      Создать заявку
                    </Button>
                  </div>
                ) : (
                  <div className="stack" style={{ gap: 8 }}>
                    {shipments.map((item) => (
                      <Link
                        key={item.id}
                        to={`/shipments/${item.id}`}
                        className="row"
                        style={{ padding: "10px 12px", borderRadius: 10, background: "var(--surface-2)" }}
                      >
                        <Package size={16} strokeWidth={1.9} style={{ color: "var(--ink-3)" }} />
                        <span className="mono" style={{ fontSize: 12 }}>
                          {item.number}
                        </span>
                        <span className="truncate" style={{ fontSize: 12.5 }}>
                          {item.route}
                        </span>
                        <span style={{ marginLeft: "auto", fontWeight: 600, fontSize: 12.5 }}>
                          {money(item.customerPrice)}
                        </span>
                      </Link>
                    ))}
                  </div>
                ))}

              {tab === "files" && (
                <div className="stack" style={{ gap: 8 }}>
                  {FILES.map((file) => (
                    <div key={file.name} className="row" style={{ padding: "9px 12px", borderRadius: 10, background: "var(--surface-2)" }}>
                      <FileText size={16} strokeWidth={1.9} style={{ color: "var(--ink-3)" }} />
                      <span style={{ fontSize: 12.5 }}>{file.name}</span>
                      <span className="muted" style={{ marginLeft: "auto", fontSize: 11.5 }}>
                        {file.size} · {file.date}
                      </span>
                    </div>
                  ))}
                  <Button size="sm" icon={Paperclip} variant="soft">
                    Прикрепить файл
                  </Button>
                </div>
              )}

            </div>
          </div>
        </div>

        <Chatter
          key={lead.id}
          entries={chatter}
          authorInitials={ME.initials}
          currentUserId={ME.id}
        />
      </div>

      {toast && <Toast message={toast.text} tone={toast.tone} onClose={dismissToast} />}
      </div>
    </Shell>
  );
}
