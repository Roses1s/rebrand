/**
 * Правая колонка карточки лида — лента событий и заметок.
 *
 * Повторяет чаттер рабочей CRM: панель режима, поиск, вложения, редактор
 * записи и лента с группировкой по дням. Данные приходят готовыми
 * (`entries`), своих запросов нет. Добавление, правка и удаление заметок
 * живут в состоянии компонента: в макете это демонстрация поведения,
 * после перезагрузки страницы лента возвращается к демо-набору.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, Paperclip, Pencil, Search, Trash2, X } from "lucide-react";

import { absoluteTime, dayLabel, fileSize, relativeTime } from "../lib/format";
import { Avatar } from "./Tag";

let localId = 1;

export function Chatter({
  entries = [],
  authorInitials = "Я",
  currentUserId,
  readOnly = false,
}) {
  const [list, setList] = useState(entries);
  const [text, setText] = useState("");
  const [pending, setPending] = useState([]);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [filesOpen, setFilesOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");

  const feedRef = useRef(null);
  const scrollPending = useRef(false);
  const composerRef = useRef(null);
  const composerInput = useRef(null);
  const filesInput = useRef(null);
  const editInput = useRef(null);

  // Поле растёт по тексту, но сначала сбрасываем высоту, иначе после
  // удаления строки оно остаётся слишком высоким.
  useLayoutEffect(() => {
    const field = composerRef.current;
    if (!field) return;
    field.style.height = "auto";
    field.style.height = `${field.scrollHeight}px`;
  }, [text]);

  // Новая запись появляется внизу ленты: подводим к ней, но не дёргаем
  // прокрутку при открытии карточки и при удалении.
  useEffect(() => {
    if (!scrollPending.current) return;
    scrollPending.current = false;
    const feed = feedRef.current;
    if (feed) feed.scrollTo({ top: feed.scrollHeight, behavior: "smooth" });
  }, [list]);

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const rows = needle
      ? list.filter((entry) =>
          `${entry.authorName} ${entry.body} ${entry.fieldLabel ?? ""} ${entry.oldValue ?? ""} ${entry.newValue ?? ""}`
            .toLowerCase()
            .includes(needle),
        )
      : list;

    const byDay = new Map();
    for (const entry of rows) {
      const key = dayLabel(entry.createdAt);
      byDay.set(key, [...(byDay.get(key) ?? []), entry]);
    }
    return [...byDay.entries()];
  }, [list, query]);

  const allFiles = useMemo(
    () => list.flatMap((entry) => entry.attachments ?? []),
    [list],
  );

  function attach(chosen) {
    if (!chosen.length) return;
    setPending((files) => [
      ...files,
      ...chosen.map((file) => ({
        id: `pending-${localId++}`,
        name: file.name,
        size: file.size,
        kind: file.type.startsWith("image/") ? "image" : "file",
        url: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
      })),
    ]);
  }

  function submit(event) {
    event.preventDefault();
    if (readOnly) return;
    const body = text.trim();
    if (!body && pending.length === 0) return;

    setList((rows) => [
      ...rows,
      {
        id: `local-${localId++}`,
        type: "note",
        body,
        fieldLabel: null,
        oldValue: null,
        newValue: null,
        attachments: pending,
        createdAt: new Date().toISOString(),
        authorId: currentUserId,
        authorName: "Вы",
        authorInitials,
      },
    ]);
    setText("");
    setPending([]);
    scrollPending.current = true;
  }

  function startEdit(entry) {
    setEditingId(entry.id);
    setEditText(entry.body);
  }

  function saveEdit(entry) {
    const body = editText.trim();
    if (body && body !== entry.body) {
      setList((rows) => rows.map((row) => (row.id === entry.id ? { ...row, body } : row)));
    }
    setEditingId(null);
    setEditText("");
  }

  function attachToEntry(entry, chosen) {
    if (!chosen.length) return;
    const files = chosen.map((file) => ({
      id: `entry-${localId++}`,
      name: file.name,
      size: file.size,
      url: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
    }));
    setList((rows) =>
      rows.map((row) =>
        row.id === entry.id ? { ...row, attachments: [...(row.attachments ?? []), ...files] } : row,
      ),
    );
  }

  function remove(entry) {
    setList((rows) => rows.filter((row) => row.id !== entry.id));
    if (editingId === entry.id) setEditingId(null);
  }

  return (
    <aside className="chatter" aria-label="Лента лида">
      <div className="chatter__head">
        <button type="button" className="chatter__mode" aria-pressed="true">
          Лог примечания
        </button>

        <div className="chatter__tools">
          <button
            type="button"
            className="chatter__tool"
            aria-label="Поиск по ленте"
            title="Поиск по ленте"
            aria-pressed={searchOpen}
            onClick={() => {
              setSearchOpen((open) => !open);
              if (searchOpen) setQuery("");
            }}
          >
            <Search size={15} strokeWidth={2} />
          </button>
          <button
            type="button"
            className="chatter__tool"
            aria-label={`Вложения: ${allFiles.length}`}
            title="Вложения"
            aria-pressed={filesOpen}
            onClick={() => setFilesOpen((open) => !open)}
          >
            <Paperclip size={15} strokeWidth={2} />
            {allFiles.length > 0 && <span className="chatter__count">{allFiles.length}</span>}
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="chatter__search">
          <Search size={13} strokeWidth={2} />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Искать в ленте…"
            aria-label="Поиск по ленте"
          />
          {query && (
            <button type="button" aria-label="Очистить поиск" onClick={() => setQuery("")}>
              <X size={13} strokeWidth={2} />
            </button>
          )}
        </div>
      )}

      {filesOpen && (
        <div className="chatter__files">
          <input
            ref={filesInput}
            type="file"
            multiple
            hidden
            aria-label="Файлы карточки"
            onChange={(event) => {
              attach(Array.from(event.target.files ?? []));
              event.target.value = "";
            }}
          />
          <button
            type="button"
            className="chatter__attach"
            disabled={readOnly}
            onClick={() => filesInput.current?.click()}
          >
            <Paperclip size={13} strokeWidth={2} />
            Прикрепить файл
          </button>

          {allFiles.length === 0 ? (
            <p className="chatter__hint">Вложений пока нет</p>
          ) : (
            <ul className="chatter__filelist">
              {allFiles.map((file) => (
                <li key={file.id}>
                  <Paperclip size={13} strokeWidth={2} />
                  <span className="chatter__filename" title={file.name}>
                    {file.name}
                  </span>
                  <span className="chatter__filesize">{fileSize(file.size)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <form className="chatter__composer" onSubmit={submit}>
        <Avatar initials={authorInitials} size="sm" title="Вы" />
        <div className="chatter__box">
          <textarea
            ref={composerRef}
            rows={1}
            value={text}
            disabled={readOnly}
            aria-label="Текст внутреннего примечания"
            placeholder={readOnly ? "Карточка только для чтения" : "Запишите внутреннюю запись…"}
            onChange={(event) => setText(event.target.value)}
            onPaste={(event) => {
              const images = Array.from(event.clipboardData.files).filter((file) =>
                file.type.startsWith("image/"),
              );
              if (images.length) {
                event.preventDefault();
                attach(images);
              }
            }}
          />

          {pending.length > 0 && (
            <ul className="chatter__pending">
              {pending.map((file) => (
                <li key={file.id} className="chatter__chip">
                  <Paperclip size={11} strokeWidth={2} />
                  <span className="chatter__chipname" title={file.name}>
                    {file.name}
                  </span>
                  <span className="chatter__filesize">{fileSize(file.size)}</span>
                  <button
                    type="button"
                    aria-label={`Убрать ${file.name}`}
                    onClick={() => setPending((files) => files.filter((item) => item.id !== file.id))}
                  >
                    <X size={11} strokeWidth={2.4} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="chatter__bar">
            <input
              ref={composerInput}
              type="file"
              multiple
              hidden
              aria-label="Файлы записи"
              onChange={(event) => {
                attach(Array.from(event.target.files ?? []));
                event.target.value = "";
              }}
            />
            <button
              type="button"
              className="chatter__attach"
              aria-label="Прикрепить файл к записи"
              title="Прикрепить файл к записи"
              disabled={readOnly}
              onClick={() => composerInput.current?.click()}
            >
              <Paperclip size={14} strokeWidth={2} />
            </button>
            <button
              type="submit"
              className="chatter__send"
              disabled={readOnly || (!text.trim() && pending.length === 0)}
            >
              Лог
            </button>
          </div>
        </div>
      </form>

      <div className="chatter__feed" ref={feedRef}>
        {groups.length === 0 && (
          <p className="chatter__empty">{query ? "Ничего не найдено" : "Пока нет записей"}</p>
        )}

        {groups.map(([day, rows]) => (
          <section key={day} className="chatter__day">
            <div className="chatter__day-label">
              <span />
              {day}
              <span />
            </div>

            {rows.map((entry) => (
              <article key={entry.id} className="chatter__entry">
                <Avatar initials={entry.authorInitials} size="sm" title={entry.authorName} />

                <div className="chatter__entry-body">
                  <div className="chatter__entry-head">
                    <span className="chatter__author">{entry.authorName}</span>
                    <span className="chatter__time" title={absoluteTime(entry.createdAt)}>
                      · {relativeTime(entry.createdAt)}
                    </span>

                    {!readOnly && entry.type === "note" && entry.authorId === currentUserId && (
                      <span className="chatter__actions">
                        <button
                          type="button"
                          aria-label="Изменить запись"
                          title="Изменить"
                          onClick={() => startEdit(entry)}
                        >
                          <Pencil size={12} strokeWidth={2} />
                        </button>
                        <button
                          type="button"
                          aria-label="Удалить запись"
                          title="Удалить"
                          onClick={() => remove(entry)}
                        >
                          <Trash2 size={12} strokeWidth={2} />
                        </button>
                      </span>
                    )}
                  </div>

                  {entry.fieldLabel ? (
                    <p className="chatter__delta">
                      <span className="chatter__bullet">•</span>
                      <span className="chatter__old">{entry.oldValue || "—"}</span>
                      <ArrowRight size={12} strokeWidth={2} />
                      <span className="chatter__new">{entry.newValue || "—"}</span>
                      <span className="chatter__field">({entry.fieldLabel})</span>
                    </p>
                  ) : editingId === entry.id ? (
                    <div className="chatter__edit">
                      <textarea
                        autoFocus
                        rows={2}
                        value={editText}
                        onChange={(event) => setEditText(event.target.value)}
                        aria-label="Изменить примечание"
                      />
                      <div className="chatter__bar">
                        <input
                          ref={editInput}
                          type="file"
                          multiple
                          hidden
                          aria-label="Файлы примечания"
                          onChange={(event) => {
                            attachToEntry(entry, Array.from(event.target.files ?? []));
                            event.target.value = "";
                          }}
                        />
                        <button
                          type="button"
                          className="chatter__attach"
                          aria-label="Прикрепить файл"
                          title="Прикрепить файл"
                          onClick={() => editInput.current?.click()}
                        >
                          <Paperclip size={14} strokeWidth={2} />
                        </button>
                        <button
                          type="button"
                          className="chatter__send chatter__send--sm"
                          disabled={!editText.trim()}
                          onClick={() => saveEdit(entry)}
                        >
                          <Check size={12} strokeWidth={2.4} /> Сохранить
                        </button>
                        <button
                          type="button"
                          className="chatter__cancel"
                          onClick={() => {
                            setEditingId(null);
                            setEditText("");
                          }}
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  ) : (
                    entry.body && <p className="chatter__text">{entry.body}</p>
                  )}

                  {entry.attachments?.length > 0 && (
                    <ul className="chatter__attachments">
                      {entry.attachments.map((file) =>
                        file.url ? (
                          <li key={file.id} className="chatter__thumb">
                            <img src={file.url} alt={file.name} />
                          </li>
                        ) : (
                          <li key={file.id} className="chatter__attach-chip">
                            <Paperclip size={11} strokeWidth={2} />
                            <span title={file.name}>{file.name}</span>
                            <span className="chatter__filesize">{fileSize(file.size)}</span>
                          </li>
                        ),
                      )}
                    </ul>
                  )}
                </div>
              </article>
            ))}
          </section>
        ))}
      </div>
    </aside>
  );
}
