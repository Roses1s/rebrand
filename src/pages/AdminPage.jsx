/**
 * Панель управления (только администратор) — разделы как в рабочей CRM:
 * «Пользователи», «Бухгалтеры», «Безопасность». Раздел живёт в адресе
 * (`?section=`), слева — меню разделов. Диалоги и тексты повторяют CRM.
 *
 * Сверх CRM (пометка в PARITY J): сводка KPI сверху, переключатели
 * «Счета / Банк» у бухгалтеров, двухфакторный вход и «одна сессия».
 * Данные — локальные, в рамках открытой страницы.
 */
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Calculator, Database, HardDrive, Lock, Pencil, Plus, RotateCcw, ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";

import { Shell } from "../app/Shell";
import { useLeads } from "../app/store";
import { Button } from "../ui/Button";
import { Field, Input, Select } from "../ui/Field";
import { Modal } from "../ui/Modal";
import { ME, TEAM } from "../mock/data";
import { shortMoney } from "../lib/format";
import { leadShipmentMargin } from "../lib/margin";

const SECTIONS = [
  { id: "users", label: "Пользователи", icon: Users },
  { id: "accountants", label: "Бухгалтеры", icon: Calculator },
  { id: "security", label: "Безопасность", icon: ShieldCheck },
];

const ROLE_LABEL = { admin: "Администратор", manager: "Менеджер" };

const START_USERS = TEAM.map((person, index) => {
  const [firstName = "", lastName = ""] = person.name.split(" ");
  return {
    id: person.id,
    email: ["gromov", "sokolova", "levchenko", "kim"][index] + "@detroid.ru",
    firstName,
    lastName,
    role: person.id === 1 ? "admin" : "manager",
    isActive: person.online || index !== 3,
  };
});

const START_ACCOUNTANTS = [
  { id: 1, name: "Ольга Белова", isActive: true, invoices: true, bank: true },
  { id: 2, name: "Пётр Ершов", isActive: true, invoices: true, bank: false },
  { id: 3, name: "Наталья Куликова", isActive: false, invoices: false, bank: false },
];

const START_BACKUPS = [
  { name: "crm-2026-11-16_0300.sql.gz", size: 186_204_160 },
  { name: "crm-2026-11-15_0300.sql.gz", size: 185_729_024 },
  { name: "crm-2026-11-14_0300.sql.gz", size: 185_110_528 },
];

const FAILED_LOGINS = [
  { user: "kim@detroid.ru", ip: "185.12.40.7", last: "16.11.2026 08:41", count: 3 },
  { user: "admin", ip: "91.204.18.122", last: "15.11.2026 23:05", count: 12 },
];

/** Объём диска: гигабайты с одним знаком, как в блоке «Вложения» CRM. */
const diskSize = (bytes) => `${(bytes / 1024 ** 3).toFixed(1).replace(".", ",")} ГБ`;

const STORAGE = { files: 1284, used: 3_865_470_566, free: 46_170_898_022 };

function Switch({ checked, onChange, label }) {
  return (
    <button type="button" className="switch" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}>
      <span className="switch__dot" />
    </button>
  );
}

function ConfirmDialog({ title, children, confirmLabel, onCancel, onConfirm }) {
  return (
    <Modal
      open
      title={title}
      onClose={onCancel}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            Отмена
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  );
}

/* --- Пользователи -------------------------------------------------------- */

export function UserDialog({ user, users, onCancel, onSave }) {
  const isNew = !user;
  const [form, setForm] = useState(
    user ? { ...user, password: "" } : { email: "", firstName: "", lastName: "", password: "", role: "manager", isActive: true },
  );
  const [error, setError] = useState("");
  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

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
    onSave({ ...rest, email, firstName: form.firstName.trim(), lastName: form.lastName.trim() });
  }

  return (
    <Modal
      open
      title={isNew ? "Новый пользователь" : "Изменить пользователя"}
      onClose={onCancel}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            Отмена
          </Button>
          <Button variant="primary" onClick={submit}>
            Сохранить
          </Button>
        </>
      }
    >
      <form
        className="stack"
        style={{ gap: 12 }}
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <Field label="Email">
          <Input type="email" value={form.email} onChange={set("email")} autoComplete="off" />
        </Field>
        <div className="grid grid--1-1" style={{ gap: 12 }}>
          <Field label="Имя">
            <Input value={form.firstName} onChange={set("firstName")} />
          </Field>
          <Field label="Фамилия">
            <Input value={form.lastName} onChange={set("lastName")} />
          </Field>
        </div>
        <Field label={isNew ? "Пароль" : "Новый пароль (пусто = не менять)"} hint="минимум 8 символов">
          <Input type="password" value={form.password} onChange={set("password")} autoComplete="new-password" />
        </Field>
        <Field label="Роль">
          <Select value={form.role} onChange={set("role")}>
            <option value="admin">Администратор</option>
            <option value="manager">Менеджер</option>
          </Select>
        </Field>
        {error && (
          <p className="modal-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

function UsersSection() {
  const [users, setUsers] = useState(START_USERS);
  const [editing, setEditing] = useState(null); // null | "new" | user
  const [removing, setRemoving] = useState(null);
  const sorted = [...users].sort((a, b) => (a.role === b.role ? a.id - b.id : a.role === "admin" ? -1 : 1));

  return (
    <div className="card">
      <div className="card__head">
        <div>
          <div className="card__title">Пользователи</div>
          <div className="card__sub">Учётные записи и роли сотрудников</div>
        </div>
        <Button size="sm" variant="primary" icon={UserPlus} onClick={() => setEditing("new")}>
          Добавить
        </Button>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th style={{ width: 48 }}>№</th>
            <th>Email</th>
            <th>ФИО</th>
            <th>Роль</th>
            <th>Активен</th>
            <th style={{ textAlign: "right" }}>Действия</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((user, index) => {
            const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
            return (
              <tr key={user.id}>
                <td className="cell-sub mono">{index + 1}</td>
                <td className="cell-main">{user.email}</td>
                <td>{fullName || <span className="muted">— не указано —</span>}</td>
                <td>
                  <span className={`status ${user.role === "admin" ? "status--progress" : "status--new"}`}>{ROLE_LABEL[user.role]}</span>
                </td>
                <td>
                  <Switch
                    checked={user.isActive}
                    label={`Активен: ${user.email}`}
                    onChange={(next) => setUsers((prev) => prev.map((item) => (item.id === user.id ? { ...item, isActive: next } : item)))}
                  />
                </td>
                <td>
                  <div className="row-actions">
                    <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing(user)}>
                      Изменить
                    </Button>
                    <Button size="sm" variant="ghost" icon={Trash2} onClick={() => setRemoving(user)} disabled={user.id === ME.id} title={user.id === ME.id ? "Себя удалить нельзя" : undefined}>
                      Удалить
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {editing && (
        <UserDialog
          user={editing === "new" ? null : editing}
          users={users}
          onCancel={() => setEditing(null)}
          onSave={(saved) => {
            setUsers((prev) =>
              editing === "new" ? [...prev, { ...saved, id: Math.max(0, ...prev.map((u) => u.id)) + 1 }] : prev.map((u) => (u.id === saved.id ? saved : u)),
            );
            setEditing(null);
          }}
        />
      )}
      {removing && (
        <ConfirmDialog
          title="Удалить пользователя?"
          confirmLabel="Удалить"
          onCancel={() => setRemoving(null)}
          onConfirm={() => {
            setUsers((prev) => prev.filter((u) => u.id !== removing.id));
            setRemoving(null);
          }}
        >
          <p className="modal-copy">Удалить {removing.email}?</p>
        </ConfirmDialog>
      )}
    </div>
  );
}

/* --- Бухгалтеры ---------------------------------------------------------- */

export function AccountantDialog({ accountant, onCancel, onSave }) {
  const [name, setName] = useState(accountant?.name ?? "");
  const [error, setError] = useState("");
  function submit() {
    if (!name.trim()) {
      setError("Укажите ФИО бухгалтера");
      return;
    }
    onSave(name.trim());
  }
  return (
    <Modal
      open
      title={accountant ? "Изменение ФИО бухгалтера" : "Новый бухгалтер"}
      onClose={onCancel}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            Отмена
          </Button>
          <Button variant="primary" onClick={submit}>
            Сохранить
          </Button>
        </>
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <Field label="ФИО">
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Фамилия Имя Отчество" autoFocus />
        </Field>
        {error && (
          <p className="modal-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}

function AccountantsSection() {
  const [accountants, setAccountants] = useState(START_ACCOUNTANTS);
  const [editing, setEditing] = useState(null); // null | "new" | accountant
  const [removing, setRemoving] = useState(null);
  const patch = (id, next) => setAccountants((prev) => prev.map((item) => (item.id === id ? { ...item, ...next } : item)));

  return (
    <div className="card">
      <div className="card__head">
        <div>
          <div className="card__title">Доступ бухгалтеров</div>
          <div className="card__sub">Бухгалтеры для назначения в карточках; «Счета» и «Банк» — сверх CRM</div>
        </div>
        <Button size="sm" variant="primary" icon={Plus} onClick={() => setEditing("new")}>
          Добавить
        </Button>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th style={{ width: 48 }}>№</th>
            <th>ФИО</th>
            <th>Статус</th>
            <th>
              Счета <span className="extra-mark" title="Сверх рабочей CRM">сверх CRM</span>
            </th>
            <th>Банк</th>
            <th style={{ textAlign: "right" }}>Действия</th>
          </tr>
        </thead>
        <tbody>
          {accountants.map((person, index) => (
            <tr key={person.id} className={person.isActive ? undefined : "is-muted"}>
              <td className="cell-sub mono">{index + 1}</td>
              <td className="cell-main">{person.name}</td>
              <td>
                <span className={`status ${person.isActive ? "status--done" : "status--new"}`}>{person.isActive ? "Активен" : "Неактивен"}</span>
              </td>
              <td>
                <Switch checked={person.invoices} label={`Счета: ${person.name}`} onChange={(next) => patch(person.id, { invoices: next })} />
              </td>
              <td>
                <Switch checked={person.bank} label={`Банк: ${person.name}`} onChange={(next) => patch(person.id, { bank: next })} />
              </td>
              <td>
                <div className="row-actions">
                  <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing(person)}>
                    Изменить ФИО
                  </Button>
                  {person.isActive ? (
                    <Button size="sm" variant="ghost" icon={Trash2} onClick={() => setRemoving(person)}>
                      Удалить
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" icon={RotateCcw} onClick={() => patch(person.id, { isActive: true })}>
                      Восстановить
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editing && (
        <AccountantDialog
          accountant={editing === "new" ? null : editing}
          onCancel={() => setEditing(null)}
          onSave={(name) => {
            if (editing === "new") {
              setAccountants((prev) => [...prev, { id: Math.max(0, ...prev.map((a) => a.id)) + 1, name, isActive: true, invoices: false, bank: false }]);
            } else {
              patch(editing.id, { name });
            }
            setEditing(null);
          }}
        />
      )}
      {removing && (
        <ConfirmDialog
          title="Удалить бухгалтера?"
          confirmLabel="Удалить"
          onCancel={() => setRemoving(null)}
          onConfirm={() => {
            patch(removing.id, { isActive: false });
            setRemoving(null);
          }}
        >
          <p className="modal-copy">
            «{removing.name}» исчезнет из новых назначений, но останется в карточках, где уже выбран. Запись можно будет
            восстановить.
          </p>
        </ConfirmDialog>
      )}
    </div>
  );
}

/* --- Безопасность -------------------------------------------------------- */

function SecuritySection() {
  const [backups, setBackups] = useState(START_BACKUPS);
  const [queued, setQueued] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [twoFactor, setTwoFactor] = useState(true);
  const [sessionLimit, setSessionLimit] = useState(true);
  const usedShare = Math.round((STORAGE.used / (STORAGE.used + STORAGE.free)) * 100);

  function runBackup() {
    setQueued(true);
    window.setTimeout(() => {
      setBackups((prev) => [{ name: `crm-manual-${Date.now()}.sql.gz`, size: 186_400_000 }, ...prev]);
      setQueued(false);
    }, 1800);
  }

  return (
    <div className="stack">
      <div className="card">
        <div className="card__head">
          <div className="card__title">Вложения</div>
        </div>
        <div className="card__body">
          <div className="admin-stats">
            <div>
              <span className="admin-stats__label">Файлов</span>
              <span className="admin-stats__value">{STORAGE.files.toLocaleString("ru-RU")}</span>
            </div>
            <div>
              <span className="admin-stats__label">Занято</span>
              <span className="admin-stats__value">{diskSize(STORAGE.used)}</span>
            </div>
            <div>
              <span className="admin-stats__label">Свободно</span>
              <span className="admin-stats__value">{diskSize(STORAGE.free)}</span>
            </div>
          </div>
          <div className="admin-meter" aria-label={`Занято ${usedShare}%`}>
            <span style={{ width: `${usedShare}%` }} />
          </div>
          <p className="admin-note">Старые вложения уходят в архив по воскресеньям; файлы из архива по-прежнему открываются из карточек.</p>
        </div>
      </div>

      <div className="card">
        <div className="card__head">
          <div className="card__title">Неудачные попытки входа</div>
        </div>
        {FAILED_LOGINS.length === 0 ? (
          <div className="card__body muted">Неудачных попыток не было</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Пользователь</th>
                <th>IP</th>
                <th>Последняя попытка</th>
                <th style={{ textAlign: "right" }}>Неудач</th>
              </tr>
            </thead>
            <tbody>
              {FAILED_LOGINS.map((row) => (
                <tr key={`${row.user}-${row.ip}`}>
                  <td className="cell-main">{row.user}</td>
                  <td className="cell-sub mono">{row.ip}</td>
                  <td className="cell-sub mono">{row.last}</td>
                  <td className="cell-money">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <div className="card__head">
          <div>
            <div className="card__title">Бэкапы</div>
            <div className="card__sub">Ночная копия базы создаётся автоматически</div>
          </div>
          <Button size="sm" icon={Database} onClick={runBackup} disabled={queued}>
            Запустить бэкап
          </Button>
        </div>
        <div className="card__body stack" style={{ gap: 8 }}>
          {queued && <p className="admin-note admin-note--info">Задача поставлена в очередь — файл появится через несколько секунд.</p>}
          {backups.length === 0 ? (
            <p className="muted">Файлов нет</p>
          ) : (
            <ul className="backup-list">
              {backups.map((file) => (
                <li key={file.name}>
                  <HardDrive size={14} strokeWidth={1.9} />
                  <span className="mono grow">
                    {file.name} <span className="muted">({Math.round(file.size / 1024).toLocaleString("ru-RU")} КБ)</span>
                  </span>
                  <button type="button" className="icon-btn" aria-label={`Удалить ${file.name}`} onClick={() => setRemoving(file)}>
                    <Trash2 size={14} strokeWidth={1.9} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card__head">
          <div>
            <div className="card__title">
              Вход и сессии <span className="extra-mark">сверх CRM</span>
            </div>
            <div className="card__sub">В рабочей CRM этих настроек нет — идея на будущее</div>
          </div>
        </div>
        <div className="card__body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="admin-row">
            <span className="tile" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
              <ShieldCheck size={17} strokeWidth={1.9} />
            </span>
            <div style={{ minWidth: 0 }}>
              <div className="cell-company__name">Двухфакторный вход</div>
              <div className="cell-company__sub">Обязателен для администраторов</div>
            </div>
            <div style={{ marginLeft: "auto" }}>
              <Switch checked={twoFactor} onChange={setTwoFactor} label="Двухфакторный вход" />
            </div>
          </div>
          <div className="admin-row">
            <span className="tile" style={{ background: "var(--info-soft)", color: "var(--info)" }}>
              <Users size={17} strokeWidth={1.9} />
            </span>
            <div style={{ minWidth: 0 }}>
              <div className="cell-company__name">Одна активная сессия</div>
              <div className="cell-company__sub">Новый вход закрывает прежний</div>
            </div>
            <div style={{ marginLeft: "auto" }}>
              <Switch checked={sessionLimit} onChange={setSessionLimit} label="Одна активная сессия" />
            </div>
          </div>
        </div>
      </div>

      {removing && (
        <ConfirmDialog
          title="Удалить резервную копию?"
          confirmLabel="Удалить"
          onCancel={() => setRemoving(null)}
          onConfirm={() => {
            setBackups((prev) => prev.filter((file) => file.name !== removing.name));
            setRemoving(null);
          }}
        >
          <p className="modal-copy">
            Файл «{removing.name}» будет удалён с сервера безвозвратно. Новые копии ночная задача продолжит создавать как
            обычно.
          </p>
        </ConfirmDialog>
      )}
    </div>
  );
}

export function AdminPage() {
  const { leads, shipments } = useLeads();
  const [params, setParams] = useSearchParams();
  const section = SECTIONS.some((item) => item.id === params.get("section")) ? params.get("section") : "users";

  if (!ME.isAdmin) {
    return (
      <Shell title="Панель управления" crumb="Раздел только для администратора">
        <div className="card" style={{ padding: 28, textAlign: "center" }}>
          <span className="empty__icon" style={{ margin: "0 auto 10px" }}>
            <Lock size={20} strokeWidth={1.8} />
          </span>
          <div className="empty__title">Доступ только у администратора</div>
          <p className="empty__text" style={{ margin: "6px auto 16px", maxWidth: 460 }}>
            В рабочей CRM не-администратора выкидывает из раздела. Чтобы посмотреть макет админки, включите роль
            «Администратор» в настройках.
          </p>
          <Link to="/settings" className="btn btn--primary">
            Открыть настройки
          </Link>
        </div>
      </Shell>
    );
  }

  const totalMargin = leads.reduce((sum, lead) => sum + leadShipmentMargin(lead.id, shipments), 0);
  const kpi = [
    { label: "Сотрудников", value: String(TEAM.length), foot: "в отделе продаж", color: "var(--stage-1)" },
    { label: "Лидов в работе", value: String(leads.filter((lead) => !lead.lost).length), foot: `маржа ${shortMoney(totalMargin)}`, color: "var(--stage-4)" },
    { label: "Заявок", value: String(shipments.length), foot: "всего в системе", color: "var(--stage-3)" },
  ];
  const current = SECTIONS.find((item) => item.id === section);

  return (
    <Shell title="Панель управления" crumb={`Панель управления · ${current.label}`}>
      {/* Сводка — сверх рабочей CRM. */}
      <div className="kpi-grid kpi-grid--3" style={{ marginBottom: 18 }}>
        {kpi.map((item) => (
          <div key={item.label} className="kpi" style={{ "--kpi": item.color }}>
            <span className="kpi__label">{item.label}</span>
            <span className="kpi__value">{item.value}</span>
            <span className="kpi__foot">{item.foot}</span>
          </div>
        ))}
      </div>

      <div className="admin-layout">
        <nav className="admin-nav" aria-label="Разделы панели управления">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className="admin-nav__item"
              aria-current={section === id ? "page" : undefined}
              onClick={() => setParams(id === "users" ? {} : { section: id })}
            >
              <Icon size={15} strokeWidth={1.9} />
              {label}
            </button>
          ))}
        </nav>

        <div className="admin-content">
          {section === "users" && <UsersSection />}
          {section === "accountants" && <AccountantsSection />}
          {section === "security" && <SecuritySection />}
        </div>
      </div>
    </Shell>
  );
}
