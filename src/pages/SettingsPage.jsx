import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Check, Moon, Plus, Sun, Trash2 } from "lucide-react";

import { Shell } from "../app/Shell";
import { Button } from "../ui/Button";
import { STAGE_COLORS, useLeads } from "../app/store";
import { IS_ADMIN, ME } from "../mock/data";

const ACCENTS = [
  { value: "indigo", color: "#6c5ce7", label: "Индиго" },
  { value: "violet", color: "#8b5cf6", label: "Фиолетовый" },
  { value: "emerald", color: "#0d9488", label: "Изумрудный" },
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
  } catch {
    /* приватный режим */
  }
}

export function SettingsPage() {
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
    return leads.filter((lead) => lead.ownerId === ME.id && lead.stageId === stageId).length;
  }

  return (
    <Shell>
      <div className="grid grid--2-1">
        <div className="stack">
          <div className="card">
            <div className="card__head">
              <div>
                <div className="card__title">Оформление</div>
                <div className="card__sub">Выбор сохраняется в браузере</div>
              </div>
            </div>
            <div className="card__body">
              <div className="grid grid--1-1">
                <button type="button" className="theme-card" aria-pressed={theme === "light"} onClick={() => setTheme("light")}>
                  <div className="theme-preview">
                    <div className="theme-preview__bar" />
                    <div className="theme-preview__card" />
                  </div>
                  <div className="theme-card__row">
                    <Sun size={15} strokeWidth={2} />
                    Светлая
                    {theme === "light" && <span className="theme-card__badge">активна</span>}
                  </div>
                </button>

                <button type="button" className="theme-card" aria-pressed={theme === "dark"} onClick={() => setTheme("dark")}>
                  <div className="theme-preview theme-preview--dark">
                    <div className="theme-preview__bar" />
                    <div className="theme-preview__card" />
                  </div>
                  <div className="theme-card__row">
                    <Moon size={15} strokeWidth={2} />
                    Тёмная
                    {theme === "dark" && <span className="theme-card__badge">активна</span>}
                  </div>
                </button>
              </div>

              <div style={{ marginTop: 20 }}>
                <div className="field__label" style={{ marginBottom: 8 }}>
                  Акцент
                </div>
                <div className="row row--wrap" style={{ gap: 8 }}>
                  {ACCENTS.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      className="swatch-dot"
                      style={{ background: item.color, color: item.color, width: 26, height: 26 }}
                      aria-label={item.label}
                      aria-pressed={accent === item.value}
                      onClick={() => setAccent(item.value)}
                    />
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 20 }}>
                <div className="field__label" style={{ marginBottom: 8 }}>
                  Плотность
                </div>
                <div className="seg" role="group" aria-label="Плотность">
                  <button type="button" aria-pressed={density === "comfort"} onClick={() => setDensity("comfort")}>
                    Просторно
                  </button>
                  <button type="button" aria-pressed={density === "compact"} onClick={() => setDensity("compact")}>
                    Компактно
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card__head">
              <div>
                <div className="card__title">Роль в макете</div>
                <div className="card__sub">
                  {IS_ADMIN ? "Сейчас вы смотрите как администратор" : "Сейчас вы смотрите как менеджер"}
                </div>
              </div>
            </div>
            <div className="card__body">
              <div className="seg" role="group" aria-label="Роль в макете">
                <button type="button" aria-pressed={role !== "admin"} onClick={() => switchRole("manager")}>
                  Менеджер
                </button>
                <button type="button" aria-pressed={role === "admin"} onClick={() => switchRole("admin")}>
                  Администратор
                </button>
              </div>
              <div className="muted" style={{ fontSize: 11.5, marginTop: 10, lineHeight: 1.5 }}>
                Роль меняет только оформление макета: у администратора появляется раздел
                «Администрирование». Права в рабочей CRM проверяются на сервере.
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card__head">
              <div>
                <div className="card__title">Демо-данные</div>
                <div className="card__sub">Вернуть стандартные этапы и лиды моей доски</div>
              </div>
            </div>
            <div className="card__body">
              <Button
                variant="danger"
                icon={Trash2}
                onClick={() => {
                  resetAll();
                  flash();
                }}
              >
                Сбросить мою воронку
              </Button>
            </div>
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <div className="card__head">
              <div>
                <div className="card__title">Моя воронка</div>
                <div className="card__sub">Этапы принадлежат менеджеру: название, цвет, подсказка и порядок</div>
              </div>
              <Button size="sm" icon={saved ? Check : Plus} onClick={addStage}>
                {saved ? "Сохранено" : "Этап"}
              </Button>
            </div>
            <div className="card__body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {stages.map((stage, index) => (
                <div key={stage.id} className="stage-edit">
                  <div className="stage-edit__row">
                    <span className="stage-edit__dot" style={{ background: stage.color }} />
                    <input
                      className="input"
                      value={stage.name}
                      aria-label={`Название этапа ${index + 1}`}
                      onChange={(event) => updateStage(stage.id, { name: event.target.value })}
                    />
                    <button
                      type="button"
                      className="col__btn"
                      aria-label="Выше"
                      disabled={index === 0}
                      onClick={() => moveStage(stage.id, -1)}
                    >
                      <ArrowUp size={15} strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      className="col__btn"
                      aria-label="Ниже"
                      disabled={index === stages.length - 1}
                      onClick={() => moveStage(stage.id, 1)}
                    >
                      <ArrowDown size={15} strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      className="col__btn"
                      aria-label="Удалить этап"
                      disabled={stages.length <= 1}
                      title={
                        stages.length <= 1
                          ? "Должен остаться хотя бы один этап"
                          : countFor(stage.id)
                            ? "Лиды этапа перейдут на соседний этап"
                            : "Удалить этап"
                      }
                      onClick={() => removeStage(stage.id)}
                    >
                      <Trash2 size={15} strokeWidth={2} style={{ color: "var(--danger)" }} />
                    </button>
                  </div>

                  <input
                    className="input input--sm"
                    value={stage.hint}
                    aria-label={`Подсказка этапа ${index + 1}`}
                    placeholder="Подсказка под названием колонки"
                    onChange={(event) => updateStage(stage.id, { hint: event.target.value })}
                  />

                  <div className="row row--wrap" style={{ gap: 6 }}>
                    {STAGE_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className="swatch-dot"
                        style={{ background: color, color }}
                        aria-label={`Цвет ${color}`}
                        aria-pressed={stage.color === color}
                        onClick={() => updateStage(stage.id, { color })}
                      />
                    ))}
                    <span className="muted" style={{ marginLeft: "auto", fontSize: 11 }}>
                      {countFor(stage.id)} лидов
                    </span>
                  </div>
                </div>
              ))}

              <Button variant="soft" size="sm" icon={Plus} onClick={addStage}>
                Добавить этап
              </Button>
            </div>
          </div>

          <div className="stub">
            <div>
              <b>Как работает.</b> Этапы сохраняются в браузере и применяются сразу: переименуйте колонку — она изменится
              на доске, перетащите карточку — лид перейдёт на другой этап. В рабочей CRM это те же действия, только через
              API сотрудника.
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
