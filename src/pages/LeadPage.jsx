/**
 * Карточка лида: этапы воронки, клиент, заявки, файлы и история.
 * Лид коллеги открывается менеджеру усечённо — только название, ИНН и продавец;
 * администратор видит карточку целиком. Проигранный лид — только для чтения,
 * с причиной, плашкой «Проигрыш» и кнопкой «Восстановить» / «Взять себе».
 * Передача, проигрыш и удаление — в меню «Действия»; «Создать заявку» стоит
 * перед полосой этапов.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRightLeft,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  Mail,
  MoreHorizontal,
  Package,
  Paperclip,
  Phone,
  RotateCcw,
  Trash2,
  Truck,
  UserPlus,
  XCircle,
} from "lucide-react";

import { Shell } from "../app/Shell";
import { useLeads } from "../app/store";
import { Button, IconButton } from "../ui/Button";
import { Avatar } from "../ui/Tag";
import { Chatter } from "../ui/Chatter";
import { StageBar } from "../ui/StageBar";
import { Toast } from "../ui/Toast";
import { QuickCreateShipmentDialog } from "../ui/QuickCreateShipmentDialog";
import { Menu } from "../ui/Menu";
import { StarRating } from "../ui/StarRating";
import { TagsField } from "../ui/TagsField";
import { DeleteLeadDialog, LoseLeadDialog, TransferLeadDialog } from "../ui/LeadDialogs";
import { leadChatter } from "../mock/chatter";
import { EDO_OPERATORS, ME, OWNER } from "../mock/data";
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
    priority: lead?.priority ?? 0,
    tagIds: lead?.tagIds ?? [],
  };
}

/** Поля черновика сравниваются по значению: теги — массив. */
const sameValue = (a, b) => (Array.isArray(a) || Array.isArray(b) ? JSON.stringify(a) === JSON.stringify(b) : a === b);

export function LeadPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    leads,
    stages,
    tags,
    shipments: allShipments,
    moveLead,
    updateLead,
    addShipment,
    addTag,
    removeTag,
    loseLead,
    restoreLead,
    transferLead,
    deleteLead,
  } = useLeads();
  // Только живой список: удалённый лид должен открываться как «Лид не найден».
  const lead = leads.find((item) => item.id === Number(id));
  const [tab, setTab] = useState("shipments");
  const [shipmentCreateOpen, setShipmentCreateOpen] = useState(false);
  // Открытый диалог действия: "lose" | "transfer" | "delete" | null.
  const [dialog, setDialog] = useState(null);
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

  // Этап меняется и снаружи: передача ставит лид на первый этап.
  useEffect(() => {
    setStageId(lead?.stageId ?? 1);
  }, [lead?.id, lead?.stageId]);

  const dirty = Object.keys(saved).some((key) => !sameValue(draft[key], saved[key]));
  const readOnly = Boolean(lead?.lost);
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
    if (!dirty || !draft.name.trim() || readOnly) return undefined;
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

  // Администратор видит лид коллеги целиком; менеджер — только усечённо.
  if (lead.ownerId !== ME.id && !ME.isAdmin) {
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

        {lead.lost ? (
          <div className="record-alert record-alert--warn lead-lost-note">
            <span>
              <b>Лид проигран.</b> Причина: {lead.lossReason || "не указана"}. Проигранную карточку коллеги может забрать
              любой сотрудник.
            </span>
            <Button size="sm" variant="primary" icon={UserPlus} onClick={() => restoreLead(lead.id, { takeOver: true })}>
              Взять себе
            </Button>
          </div>
        ) : (
          <div className="stub">
            <div>
              <b>Лид коллеги.</b> Активный лид другого менеджера открыт только для просмотра: название, ИНН и продавец.
              Заявки, контакты и деньги доступны владельцу лида и администратору.
            </div>
          </div>
        )}
      </Shell>
    );
  }

  const shipments = allShipments.filter((item) => item.leadId === lead.id);
  const owner = OWNER(lead.ownerId);
  const isOwner = lead.ownerId === ME.id;

  // Листалка соседних лидов: порядок доски владельца — этапы слева направо,
  // внутри этапа сверху вниз. Проигранные лиды в неё не входят.
  const stageOrder = new Map(stages.map((stage, index) => [stage.id, index]));
  const siblings = leads
    .filter((item) => item.ownerId === lead.ownerId && !item.lost)
    .sort(
      (a, b) =>
        (stageOrder.get(a.stageId) ?? 0) - (stageOrder.get(b.stageId) ?? 0) || (a.position ?? 0) - (b.position ?? 0),
    );
  const pagerIndex = siblings.findIndex((item) => item.id === lead.id);
  const prevLead = pagerIndex > 0 ? siblings[pagerIndex - 1] : null;
  const nextLead = pagerIndex >= 0 && pagerIndex < siblings.length - 1 ? siblings[pagerIndex + 1] : null;

  const actions = [
    !lead.lost && { label: "Отметить проигрышем", icon: XCircle, onSelect: () => setDialog("lose") },
    // Проигранный лид менеджер сначала восстанавливает, администратор передаёт сразу.
    { label: "Передать коллеге", icon: ArrowRightLeft, disabled: readOnly && !ME.isAdmin, onSelect: () => setDialog("transfer") },
    ME.isAdmin && { label: "Удалить лид", icon: Trash2, danger: true, onSelect: () => setDialog("delete") },
  ];

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
              disabled={readOnly}
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
          {readOnly ? null : saving ? (
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
          <Menu label="Действия" icon={MoreHorizontal} items={actions} />

          {pagerIndex >= 0 && (
            <div className="pager" role="group" aria-label="Соседние лиды">
              <IconButton
                icon={ChevronLeft}
                label={prevLead ? `Предыдущий лид: ${prevLead.name}` : "Это первый лид"}
                disabled={!prevLead}
                onClick={() => prevLead && navigate(`/crm/leads/${prevLead.id}`)}
              />
              <span className="pager__count">
                {pagerIndex + 1} из {siblings.length}
              </span>
              <IconButton
                icon={ChevronRight}
                label={nextLead ? `Следующий лид: ${nextLead.name}` : "Это последний лид"}
                disabled={!nextLead}
                onClick={() => nextLead && navigate(`/crm/leads/${nextLead.id}`)}
              />
            </div>
          )}
        </div>
      </div>

      <div className="lead-layout">
        <div className="stack">
          {/* «Создать заявку» — перед этапами; проигрыш — только в «Действия»
              (решение владельца 16.11). У проигранного лида справа «Восстановить». */}
          <div className="lead-stagebar">
            {!lead.lost && (
              <Button variant="primary" size="sm" icon={Truck} onClick={() => setShipmentCreateOpen(true)}>
                Создать заявку
              </Button>
            )}
            <StageBar
              stages={stages}
              currentId={stageId}
              disabled={readOnly}
              onSelect={(nextId) => {
                setStageId(nextId);
                moveLead(lead.id, nextId);
              }}
            />
            {lead.lost && (
              <Button
                variant="primary"
                size="sm"
                icon={isOwner ? RotateCcw : UserPlus}
                onClick={() => restoreLead(lead.id, { takeOver: !isOwner })}
              >
                {isOwner ? "Восстановить" : "Взять себе"}
              </Button>
            )}
          </div>

          {lead.lost && (
            <div className="record-alert record-alert--warn" role="status">
              Лид проигран. Чтобы менять его данные, сначала восстановите карточку.
            </div>
          )}

          <div className={`card${lead.lost ? " card--lost" : ""}`}>
            {lead.lost && (
              <div className="lost-ribbon" aria-label="Лид проигран">
                Проигрыш
              </div>
            )}
            <div className="card__head">
              <div>
                <div className="card__title">Клиент</div>
                <div className="card__sub">Реквизиты и контакты</div>
              </div>
            </div>
            <fieldset className="card__body lead-form" style={{ paddingTop: 4 }} onKeyDown={onFieldKeyDown} disabled={readOnly}>
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

              <div className="lead-field">
                <span className="lead-field__label">Приоритет</span>
                <span className="lead-field__value" aria-label="Приоритет лида">
                  <StarRating
                    value={draft.priority}
                    onChange={readOnly ? undefined : (priority) => setDraft((prev) => ({ ...prev, priority }))}
                  />
                </span>
              </div>

              <div className="lead-field lead-field--top">
                <span className="lead-field__label">Теги</span>
                <span className="lead-field__value">
                  <TagsField
                    tags={tags}
                    value={draft.tagIds}
                    disabled={readOnly}
                    canDelete={ME.isAdmin}
                    onChange={(tagIds) => setDraft((prev) => ({ ...prev, tagIds }))}
                    onCreate={addTag}
                    onDelete={removeTag}
                  />
                </span>
              </div>

              <div className="lead-field">
                <span className="lead-field__label">Продавец</span>
                <span className="lead-field__value">
                  <button
                    type="button"
                    className="owner-btn"
                    disabled={readOnly && !ME.isAdmin}
                    title={readOnly && !ME.isAdmin ? "Сначала восстановите лид, чтобы передать его" : "Передать лид другому сотруднику"}
                    onClick={() => setDialog("transfer")}
                  >
                    <Avatar initials={owner.initials} color={owner.color} size="sm" />
                    <span className="truncate">{owner.name}</span>
                  </button>
                </span>
              </div>

              {lead.lost && (
                <div className="lead-field">
                  <span className="lead-field__label">Причина проигрыша</span>
                  <span className="lead-field__value lead-field__text">{lead.lossReason || "—"}</span>
                </div>
              )}

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
            </fieldset>
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
                    <Button size="sm" variant="primary" icon={Truck} onClick={() => setShipmentCreateOpen(true)}>
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

      {dialog === "lose" && (
        <LoseLeadDialog
          leadName={lead.name}
          onCancel={() => setDialog(null)}
          onConfirm={(reason) => {
            // Несохранённые правки дописываем до блокировки карточки.
            if (dirty && draft.name.trim()) persist(draft);
            loseLead(lead.id, reason);
            setDialog(null);
          }}
        />
      )}
      {dialog === "transfer" && (
        <TransferLeadDialog
          leadName={lead.name}
          ownerId={lead.ownerId}
          leadIsLost={lead.lost}
          onCancel={() => setDialog(null)}
          onConfirm={(userId) => {
            if (dirty && draft.name.trim()) persist(draft);
            transferLead(lead.id, userId);
            setDialog(null);
            // Карточка больше не наша — возвращаемся на доску.
            if (!ME.isAdmin) navigate("/crm");
          }}
        />
      )}
      {dialog === "delete" && (
        <DeleteLeadDialog
          leadName={lead.name}
          onCancel={() => setDialog(null)}
          onConfirm={() => {
            setDialog(null);
            deleteLead(lead.id);
            navigate("/crm");
          }}
        />
      )}
      {shipmentCreateOpen && (
        <QuickCreateShipmentDialog
          lead={lead}
          onCreate={addShipment}
          onClose={() => setShipmentCreateOpen(false)}
        />
      )}
      {toast && <Toast message={toast.text} tone={toast.tone} onClose={dismissToast} />}
      </div>
    </Shell>
  );
}
