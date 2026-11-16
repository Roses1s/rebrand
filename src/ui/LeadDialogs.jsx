/**
 * Диалоги действий над лидом — по образцу рабочей CRM:
 * проигрыш с обязательной причиной, передача коллеге в два шага
 * (выбор → подтверждение) и безвозвратное удаление.
 */
import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { Modal } from "./Modal";
import { Button } from "./Button";
import { Avatar } from "./Tag";
import { LOSS_REASONS, TEAM } from "../mock/data";

export function LoseLeadDialog({ leadName, onCancel, onConfirm }) {
  const [reason, setReason] = useState(null);

  return (
    <Modal
      open
      title="Отметить проигрышем?"
      onClose={onCancel}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            Отмена
          </Button>
          <Button variant="danger" disabled={!reason} onClick={() => onConfirm(reason)}>
            Отметить проигрышем
          </Button>
        </>
      }
    >
      <p className="modal-copy">
        Карточка «{leadName}» уйдёт с доски. Она останется в базе — любой сотрудник сможет посмотреть причину
        и забрать её себе.
      </p>
      <fieldset className="choice-list">
        <legend className="choice-list__legend">Причина</legend>
        {LOSS_REASONS.map((item) => (
          <label key={item} className={`choice${reason === item ? " is-checked" : ""}`}>
            <input type="radio" name="loss-reason" checked={reason === item} onChange={() => setReason(item)} />
            {item}
          </label>
        ))}
      </fieldset>
    </Modal>
  );
}

export function TransferLeadDialog({ leadName, ownerId, leadIsLost = false, onCancel, onConfirm }) {
  const [query, setQuery] = useState("");
  const [chosen, setChosen] = useState(null);

  const colleagues = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TEAM.filter((user) => user.id !== ownerId && (!q || user.name.toLowerCase().includes(q)));
  }, [ownerId, query]);

  if (chosen) {
    return (
      <Modal
        open
        title="Передать лид?"
        onClose={onCancel}
        footer={
          <>
            <Button variant="ghost" onClick={() => setChosen(null)}>
              Назад
            </Button>
            <Button variant="primary" onClick={() => onConfirm(chosen.id)}>
              Передать
            </Button>
          </>
        }
      >
        <p className="modal-copy">
          Карточка «{leadName}» перейдёт к сотруднику <b>{chosen.name}</b> вместе с заявками, документами и
          перепиской. С вашей доски она исчезнет.
          {leadIsLost && " Лид также выйдет из проигрыша и вернётся на доску."}
        </p>
      </Modal>
    );
  }

  return (
    <Modal
      open
      title="Кому передать лид"
      onClose={onCancel}
      footer={
        <Button variant="ghost" onClick={onCancel}>
          Отмена
        </Button>
      }
    >
      <p className="modal-copy">Начните вводить фамилию коллеги.</p>
      <div className="search picker-search">
        <Search size={15} strokeWidth={2} />
        <input
          autoFocus
          type="search"
          value={query}
          placeholder="Фамилия или имя"
          aria-label="Поиск сотрудника"
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <div className="picker-list" role="listbox" aria-label="Сотрудники">
        {colleagues.length === 0 ? (
          <p className="picker-list__empty">Никого не нашли. Сотрудников заводит администратор.</p>
        ) : (
          colleagues.map((user) => (
            <button key={user.id} type="button" role="option" aria-selected="false" className="picker-list__item" onClick={() => setChosen(user)}>
              <Avatar initials={user.initials} size="sm" />
              <span className="picker-list__name">{user.name}</span>
              <span className="picker-list__role">{user.role}</span>
            </button>
          ))
        )}
      </div>
    </Modal>
  );
}

export function DeleteLeadDialog({ leadName, onCancel, onConfirm }) {
  return (
    <Modal
      open
      title="Удалить лид без возврата?"
      onClose={onCancel}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            Отмена
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            Удалить навсегда
          </Button>
        </>
      }
    >
      <p className="modal-copy">
        Карточка «{leadName}», её заявки, документы и переписка будут удалены навсегда. Восстановить их будет
        невозможно.
      </p>
    </Modal>
  );
}
