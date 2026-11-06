import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Check, Moon, Sun, Trash2 } from "lucide-react";

import { Shell } from "../app/Shell";
import { Button } from "../ui/Button";
import { STAGES } from "../mock/data";

const COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#14b8a6", "#ec4899", "#64748b", "#ef4444"];
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
  const [theme, setTheme] = useState(() => readStored("crm.theme", "light"));
  const [accent, setAccent] = useState(() => readStored("crm.accent", "indigo"));
  const [density, setDensity] = useState(() => readStored("crm.density", "comfort"));
  const [stages, setStages] = useState(() =>
    STAGES.map((stage) => ({ id: stage.id, name: stage.name, color: stage.color })),
  );
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

  function move(index, direction) {
    const next = [...stages];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setStages(next);
  }

  function save() {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
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
                <div className="card__title">Демо-данные</div>
                <div className="card__sub">Вернуть стандартные этапы моей доски</div>
              </div>
            </div>
            <div className="card__body">
              <Button variant="danger" icon={Trash2}>
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
                <div className="card__sub">Название, цвет и порядок колонок — как у меня</div>
              </div>
              <Button size="sm" onClick={save} icon={saved ? Check : undefined}>
                {saved ? "Сохранено" : "Сохранить"}
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
                      onChange={(event) =>
                        setStages((prev) =>
                          prev.map((item) => (item.id === stage.id ? { ...item, name: event.target.value } : item)),
                        )
                      }
                    />
                    <button type="button" className="col__btn" aria-label="Выше" onClick={() => move(index, -1)}>
                      <ArrowUp size={15} strokeWidth={2} />
                    </button>
                    <button type="button" className="col__btn" aria-label="Ниже" onClick={() => move(index, 1)}>
                      <ArrowDown size={15} strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      className="col__btn"
                      aria-label="Удалить этап"
                      onClick={() => setStages((prev) => prev.filter((item) => item.id !== stage.id))}
                    >
                      <Trash2 size={15} strokeWidth={2} style={{ color: "var(--danger)" }} />
                    </button>
                  </div>

                  <div className="row row--wrap" style={{ gap: 6 }}>
                    {COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className="swatch-dot"
                        style={{ background: color, color }}
                        aria-label={color}
                        aria-pressed={stage.color === color}
                        onClick={() =>
                          setStages((prev) =>
                            prev.map((item) => (item.id === stage.id ? { ...item, color } : item)),
                          )
                        }
                      />
                    ))}
                  </div>
                </div>
              ))}

              <Button variant="soft" size="sm" onClick={() => setStages((prev) => [...prev, { id: Date.now(), name: "Новый этап", color: "#64748b" }])}>
                + Добавить этап
              </Button>
            </div>
          </div>

          <div className="stub">
            <div>
              <b>Почему так.</b> В рабочей CRM этапы принадлежат сотруднику: у каждого менеджера своя воронка, и её правки
              не затрагивают доски коллег. Переименование, цвет и порядок уже поддерживаются API.
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
