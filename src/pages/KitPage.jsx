/** Витрина дизайн-системы (/kit): токены, кнопки, поля, статусы, таблицы, состояния. */
import { useEffect, useState } from "react";
import { ArrowUpRight, Package, Phone } from "lucide-react";

import { Shell } from "../app/Shell";
import { Button, IconButton } from "../ui/Button";
import { Field, Input, SearchInput, Select, Textarea } from "../ui/Field";
import { Avatar, Chip, Status, Tag } from "../ui/Tag";
import { Segmented } from "../ui/Segmented";
import { Empty, Skeleton } from "../ui/States";
import { Modal } from "../ui/Modal";
import { StarRating } from "../ui/StarRating";
import { TagChip } from "../ui/TagChip";
import { ShowMore } from "../ui/ShowMore";
import { TAGS } from "../mock/data";

const PALETTE = [
  ["Бумага", "--paper"],
  ["Поверхность", "--surface"],
  ["Поверхность 2", "--surface-2"],
  ["Поверхность 3", "--surface-3"],
  ["Чернила", "--ink"],
  ["Текст 2", "--ink-2"],
  ["Текст 3", "--ink-3"],
  ["Линия", "--line"],
  ["Линия сильная", "--line-strong"],
  ["Сигнал", "--signal"],
  ["Сигнал мягкий", "--signal-soft"],
  ["Деньги", "--money"],
  ["Деньги мягкий", "--money-soft"],
  ["Внимание", "--warn"],
  ["Опасность", "--danger"],
];

const STAGES = [
  ["Этап 1", "--stage-1"],
  ["Этап 2", "--stage-2"],
  ["Этап 3", "--stage-3"],
  ["Этап 4", "--stage-4"],
  ["Этап 5", "--stage-5"],
];

/** Пересчитываем hex при смене темы, чтобы витрина не врала. */
function useComputedColors(vars) {
  const [colors, setColors] = useState({});

  useEffect(() => {
    function read() {
      const style = getComputedStyle(document.documentElement);
      const next = {};
      for (const [, name] of vars) next[name] = style.getPropertyValue(name).trim();
      setColors(next);
    }
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return colors;
}

function Section({ title, note, children }) {
  return (
    <section className="kit-section">
      <div className="kit-section__head">
        <h2 className="kit-section__title">{title}</h2>
        {note && <span className="kit-section__note">{note}</span>}
      </div>
      {children}
    </section>
  );
}

export function KitPage() {
  const colors = useComputedColors([...PALETTE, ...STAGES]);
  const [view, setView] = useState("kanban");
  const [density, setDensity] = useState("comfort");
  const [modal, setModal] = useState(false);
  const [stars, setStars] = useState(2);
  const [search, setSearch] = useState("");

  return (
    <Shell title="Дизайн-система" crumb="Служебная витрина · шаг 1" actions={null} search={search} onSearch={setSearch}>
      <div className="page__head">
        <div>
          <h1 className="page__title">Дизайн-система</h1>
          <p className="page__sub">Токены, типографика и элементы, из которых собираются экраны CRM.</p>
        </div>
      </div>

      <Section title="Палитра" note="светлая и тёмная темы используют одни и те же роли">
        <div className="swatches">
          {PALETTE.map(([label, variable]) => (
            <div key={variable} className="swatch">
              <div className="swatch__color" style={{ background: `var(${variable})` }} />
              <div className="swatch__meta">
                <span className="swatch__name">{label}</span>
                <span className="swatch__hex">{colors[variable] || variable}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="swatches" style={{ marginTop: 10, gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))" }}>
          {STAGES.map(([label, variable]) => (
            <div key={variable} className="swatch">
              <div className="swatch__color" style={{ background: `var(${variable})`, height: 34 }} />
              <div className="swatch__meta">
                <span className="swatch__name">{label}</span>
                <span className="swatch__hex">{colors[variable] || variable}</span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Типографика" note="Inter · JetBrains Mono">
        <div className="type-row">
          <span className="type-row__meta">44 / display</span>
          <span className="display" style={{ fontSize: 44 }}>₽ 2 431 900</span>
        </div>
        <div className="type-row">
          <span className="type-row__meta">30 / h1</span>
          <span className="page__title">Лиды в работе</span>
        </div>
        <div className="type-row">
          <span className="type-row__meta">17 / h2</span>
          <span style={{ fontSize: 17, fontWeight: 600 }}>
            Заявки на перевозку
          </span>
        </div>
        <div className="type-row">
          <span className="type-row__meta">14 / text</span>
          <span>ООО «Северный путь» — 12 заявок, маржа 340 000 ₽</span>
        </div>
        <div className="type-row">
          <span className="type-row__meta">12 / secondary</span>
          <span style={{ color: "var(--ink-2)" }}>ИНН 7701234567 · логист Ирина Морозова</span>
        </div>
        <div className="type-row">
          <span className="type-row__meta">10 / micro</span>
          <span className="micro">Без движения · 4 дня</span>
        </div>
        <div className="type-row">
          <span className="type-row__meta">mono</span>
          <span className="mono" style={{ fontSize: 13 }}>ЗВ-2026-0148</span>
        </div>
      </Section>

      <Section title="Кнопки">
        <div className="kit-grid">
          <Button variant="primary">Создать лид</Button>
          <Button variant="primary">Начать обзвон</Button>
          <Button>Копировать</Button>
          <Button variant="quiet">Отмена</Button>
          <Button variant="danger">Удалить</Button>
          <Button variant="primary" disabled>
            Недоступно
          </Button>
        </div>
        <div className="kit-grid" style={{ marginTop: 14 }}>
          <Button size="sm" variant="primary" icon={ArrowUpRight}>
            Открыть
          </Button>
          <Button size="lg" variant="primary">
            Сохранить и выйти
          </Button>
          <Button icon={Phone}>Позвонить</Button>
          <IconButton icon={Package} label="Заявки" />
        </div>
      </Section>

      <Section title="Поля и поиск">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, maxWidth: 760 }}>
          <Field label="Клиент" htmlFor="kit-name">
            <Input id="kit-name" defaultValue="ООО «Северный путь»" />
          </Field>
          <Field label="Этап" htmlFor="kit-stage">
            <Select id="kit-stage" defaultValue="2">
              <option value="1">Новый</option>
              <option value="2">Перезвонить</option>
              <option value="3">Вышел на ЛПР</option>
            </Select>
          </Field>
          <Field label="Поиск" hint="находим по названию, ИНН или номеру">
            <SearchInput value={search} onChange={setSearch} kbd={null} placeholder="Начните вводить" />
          </Field>
          <Field label="Комментарий">
            <Textarea placeholder="Дополнительные условия, договорённости…" rows={3} />
          </Field>
        </div>
      </Section>

      <Section title="Метки, статусы, фильтры">
        <div className="kit-grid">
          <Tag color="var(--stage-3)">Постоянный клиент</Tag>
          <Tag color="var(--stage-2)">Ждёт КП</Tag>
          <Tag color="var(--stage-5)">Оплата вовремя</Tag>
          <Status tone="new">Новая</Status>
          <Status tone="progress">В работе</Status>
          <Status tone="done">Выгружена</Status>
          <Status tone="lost">Проигран</Status>
        </div>
        <div className="kit-grid" style={{ marginTop: 14 }}>
          <Chip active count={24}>
            Все
          </Chip>
          <Chip count={9}>Новые</Chip>
          <Chip count={12}>В работе</Chip>
          <Chip count={3}>Требуют звонка</Chip>
        </div>
      </Section>

      <Section title="Переключатели, аватары, состояния">
        <div className="kit-grid" style={{ alignItems: "flex-start", gap: 24 }}>
          <div className="kit-col">
            <Segmented
              label="Вид"
              value={view}
              onChange={setView}
              options={[
                { value: "kanban", label: "Канбан" },
                { value: "list", label: "Список" },
              ]}
            />
            <Segmented
              label="Плотность"
              value={density}
              onChange={setDensity}
              options={[
                { value: "compact", label: "Компактно" },
                { value: "comfort", label: "Просторно" },
              ]}
            />
            <div className="kit-grid">
              <Avatar initials="АК" />
              <Avatar initials="ИМ" />
              <Avatar initials="СД" size="lg" />
            </div>
            <Button onClick={() => setModal(true)}>Показать модалку</Button>
          </div>

          <div className="card" style={{ flex: 1, minWidth: 280 }}>
            <div className="card__head">
              <span className="card__title">Пустое состояние</span>
            </div>
            <Empty
              title="Здесь пока никого"
              text="Как только появится первый лид, карточка займёт своё место в колонке."
              action={
                <Button size="sm" variant="primary">
                  Создать лид
                </Button>
              }
            />
          </div>

          <div className="card" style={{ flex: 1, minWidth: 280 }}>
            <div className="card__head">
              <span className="card__title">Загрузка</span>
            </div>
            <div className="card__body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Skeleton width="62%" height={16} />
              <Skeleton width="88%" />
              <Skeleton width="74%" />
              <Skeleton width="40%" />
            </div>
          </div>
        </div>
      </Section>

      <Section title="Лид: приоритет, теги, ошибки" note="образцы состояний для переноса в рабочую CRM">
        <div className="kit-grid" style={{ alignItems: "flex-start", gap: 24 }}>
          <div className="kit-col">
            <span className="kit-section__note">Приоритет 0–3: клик ставит, повторный клик снимает</span>
            <StarRating value={stars} onChange={setStars} />
            <div className="kit-grid">
              {[0, 1, 2, 3].map((value) => (
                <StarRating key={value} value={value} size="sm" />
              ))}
            </div>
            <span className="lead-card__error">Карточка уже изменена. Доска обновлена — выберите приоритет ещё раз.</span>
            <span className="lead-card__error">Не удалось сохранить приоритет.</span>
          </div>
          <div className="kit-col">
            <span className="kit-section__note">Теги: цвет задаёт фон и текст, в тёмной теме — свои оттенки</span>
            <div className="tag-list">
              {TAGS.map((tag) => (
                <TagChip key={tag.id} name={tag.name} color={tag.color} size="md" />
              ))}
            </div>
            <div className="tag-list">
              {TAGS.map((tag) => (
                <TagChip key={tag.id} name={tag.name} color={tag.color} />
              ))}
            </div>
          </div>
        </div>
        <div className="kit-col" style={{ marginTop: 18, maxWidth: 620 }}>
          <div className="record-alert record-alert--danger" role="alert">
            <span>Карточку изменил другой сотрудник, пока вы её редактировали. Ваши правки не сохранены.</span>
            <button type="button" className="record-alert__action">
              Загрузить актуальную карточку
            </button>
          </div>
          <div className="record-alert record-alert--warn">
            Лид проигран. Чтобы менять его данные, сначала восстановите карточку.
          </div>
          <div className="lead-form">
            <label className="lead-field">
              <span className="lead-field__label">ИНН</span>
              <input className="lead-input lead-input--error" defaultValue="77010" aria-invalid="true" />
            </label>
            <p className="field-error">ИНН должен содержать 10 или 12 цифр.</p>
          </div>
          <div className="card card--lost" style={{ padding: "16px 20px", minHeight: 80 }}>
            <div className="lost-ribbon">Проигрыш</div>
            <div className="card__title">Клиент</div>
            <p className="modal-copy">Проигранная карточка: лента в углу, поля только для чтения.</p>
          </div>
        </div>
      </Section>

      <Section title="Догрузка" note="«Показать ещё» появляется, когда записей больше порции: 20 в колонке, 80 в списке">
        <div className="kit-grid" style={{ alignItems: "flex-start", gap: 24 }}>
          <div className="kit-col" style={{ width: 260 }}>
            <span className="kit-section__note">Внизу колонки доски</span>
            <button type="button" className="col__more">
              Показать ещё 20 из 47
            </button>
          </div>
          <div className="kit-col">
            <span className="kit-section__note">Под списком лидов и заявок</span>
            <ShowMore shown={80} total={95} step={80} onMore={() => {}} />
          </div>
        </div>
      </Section>

      <Section title="Таблица">
        <div className="card" style={{ overflow: "hidden" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Номер</th>
                <th>Клиент</th>
                <th>Маршрут</th>
                <th>Статус</th>
                <th style={{ textAlign: "right" }}>Маржа</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="mono">ЗВ-2026-0148</td>
                <td>ООО «Северный путь»</td>
                <td>Москва → Казань</td>
                <td>
                  <Status tone="done">Выгружена</Status>
                </td>
                <td className="mono" style={{ color: "var(--money)" }}>+48 000 ₽</td>
              </tr>
              <tr>
                <td className="mono">ЗВ-2026-0147</td>
                <td>ООО «Балт-Транс»</td>
                <td>Санкт-Петербург → Москва</td>
                <td>
                  <Status tone="progress">В пути</Status>
                </td>
                <td className="mono" style={{ color: "var(--money)" }}>+31 500 ₽</td>
              </tr>
              <tr>
                <td className="mono">ЗВ-2026-0146</td>
                <td>ИП Соколов</td>
                <td>Екатеринбург → Самара</td>
                <td>
                  <Status tone="new">Новая</Status>
                </td>
                <td className="mono" style={{ color: "var(--danger)" }}>−2 000 ₽</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Modal
        open={modal}
        title="Передать лида"
        onClose={() => setModal(false)}
        footer={
          <>
            <Button variant="quiet" onClick={() => setModal(false)}>
              Отмена
            </Button>
            <Button variant="primary" onClick={() => setModal(false)}>
              Передать
            </Button>
          </>
        }
      >
        <Field label="Сотрудник" hint="Передача меняет ответственного у лида и всех его заявок.">
          <Select defaultValue="2">
            <option value="1">Ирина Морозова</option>
            <option value="2">Сергей Дорохов</option>
            <option value="3">Алексей Ковалёв</option>
          </Select>
        </Field>
      </Modal>
    </Shell>
  );
}
