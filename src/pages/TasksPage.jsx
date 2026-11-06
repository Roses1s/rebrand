import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Check, FileText, Mail, Phone, Plus, Target } from "lucide-react";

import { Shell } from "../app/Shell";
import { Button } from "../ui/Button";
import { Avatar, Chip } from "../ui/Tag";
import { Field, Input, Select } from "../ui/Field";
import { Modal } from "../ui/Modal";
import { ME, TASKS, TASK_TYPES } from "../mock/data";
import { shortMoney } from "../lib/format";

const COLUMNS = [
  { status: "overdue", title: "Просрочено", color: "var(--danger)" },
  { status: "today", title: "Сегодня", color: "var(--warn)" },
  { status: "upcoming", title: "Предстоящие", color: "var(--accent)" },
  { status: "done", title: "Выполнено", color: "var(--money)" },
];

const ICONS = { phone: Phone, mail: Mail, calendar: CalendarDays, file: FileText };

const myTasks = TASKS.filter((task) => task.ownerId === ME.id);

export function TasksPage() {
  const [tasks, setTasks] = useState(myTasks);
  const [type, setType] = useState("all");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ title: "", company: "", type: "call" });

  const visible = useMemo(
    () => tasks.filter((task) => (type === "all" ? true : task.type === type)),
    [tasks, type],
  );

  function toggle(task) {
    setTasks((prev) =>
      prev.map((item) =>
        item.id === task.id ? { ...item, status: item.status === "done" ? "upcoming" : "done" } : item,
      ),
    );
  }

  function addTask() {
    if (!draft.title.trim()) return;
    setTasks((prev) => [
      {
        id: Math.max(...prev.map((item) => item.id)) + 1,
        type: draft.type,
        title: draft.title,
        company: draft.company || "Без компании",
        leadId: 1,
        time: "завтра 10:00",
        phone: "+7 900 000-00-00",
        amount: 0,
        ownerId: ME.id,
        status: "upcoming",
      },
      ...prev,
    ]);
    setDraft({ title: "", company: "", type: "call" });
    setOpen(false);
  }

  return (
    <Shell>
      <div className="toolbar">
        <Chip
          active={type === "all"}
          count={tasks.filter((task) => task.status !== "done").length}
          onClick={() => setType("all")}
        >
          Все
        </Chip>
        <Chip active={type === "call"} count={tasks.filter((t) => t.type === "call").length} onClick={() => setType("call")}>
          Звонки
        </Chip>
        <Chip
          active={type === "email"}
          count={tasks.filter((t) => t.type === "email").length}
          onClick={() => setType("email")}
        >
          Письма
        </Chip>
        <Chip
          active={type === "quote"}
          count={tasks.filter((t) => t.type === "quote").length}
          onClick={() => setType("quote")}
        >
          Ставки
        </Chip>

        <div className="toolbar__right">
          <Button variant="primary" icon={Plus} onClick={() => setOpen(true)}>
            Задача
          </Button>
        </div>
      </div>

      <div className="task-board">
        {COLUMNS.map((column) => {
          const items = visible.filter((task) => task.status === column.status);
          return (
            <section key={column.status} className="task-col" aria-label={column.title}>
              <div className="task-col__head">
                <span className="task-col__dot" style={{ background: column.color }} />
                {column.title}
                <span className="task-col__count">{items.length}</span>
              </div>

              {items.map((task) => {
                const meta = TASK_TYPES[task.type];
                const Icon = ICONS[meta.icon];
                const done = task.status === "done";

                return (
                  <article key={task.id} className={`task-card${done ? " task-card--done" : ""}`}>
                    <div className="task-card__top">
                      <span className={`task-card__type ${meta.cls}`} style={{ background: "var(--surface-3)" }}>
                        <Icon size={14} strokeWidth={1.9} />
                      </span>
                      <div className="grow">
                        <div className="task-card__title">{task.title}</div>
                        <div className="task-card__company">{task.company}</div>
                      </div>
                    </div>

                    <div className="task-card__meta">
                      <span>{task.time}</span>
                      <span className="mono">{task.phone}</span>
                    </div>

                    <div className="task-card__foot">
                      <button
                        type="button"
                        className="task-check"
                        aria-pressed={done}
                        aria-label={done ? "Вернуть в работу" : "Отметить выполненной"}
                        onClick={() => toggle(task)}
                      >
                        <Check size={13} strokeWidth={3} />
                      </button>

                      <Link
                        to={`/crm/leads/${task.leadId}`}
                        className="muted"
                        style={{ fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4 }}
                      >
                        <Target size={12} strokeWidth={2} />
                        Открыть лид
                      </Link>

                      <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 650 }}>
                        {task.amount ? shortMoney(task.amount) : "—"}
                      </span>
                      <Avatar initials={ME.initials} size="sm" title={ME.name} />
                    </div>
                  </article>
                );
              })}

              {items.length === 0 && (
                <div className="muted" style={{ fontSize: 12, padding: "14px 6px" }}>
                  Пусто
                </div>
              )}

              <button
                type="button"
                className="btn btn--ghost btn--sm"
                style={{ justifyContent: "flex-start", color: "var(--ink-3)" }}
                onClick={() => setOpen(true)}
              >
                <Plus size={14} strokeWidth={2} />
                Добавить задачу
              </button>
            </section>
          );
        })}
      </div>

      <Modal
        open={open}
        title="Новая задача"
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button variant="primary" onClick={addTask}>
              Создать
            </Button>
          </>
        }
      >
        <Field label="Что сделать">
          <Input
            autoFocus
            placeholder="Например: перезвонить и уточнить маршрут"
            value={draft.title}
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
          />
        </Field>
        <Field label="Компания">
          <Input
            placeholder="ООО «…»"
            value={draft.company}
            onChange={(event) => setDraft({ ...draft, company: event.target.value })}
          />
        </Field>
        <Field label="Тип" hint={`Ответственный — ${ME.name}, задачи создаются на себя`}>
          <Select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value })}>
            <option value="call">Звонок</option>
            <option value="email">Письмо</option>
            <option value="meeting">Встреча</option>
            <option value="quote">Ставка</option>
          </Select>
        </Field>
      </Modal>
    </Shell>
  );
}
