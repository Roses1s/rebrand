/**
 * Быстрое создание заявки из карточки лида.
 * Повторяет сценарий основной CRM: лид уже известен, нужны только маршрутные
 * данные и перевозчик, а адреса, груз и деньги заполняются в карточке позже.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "./Button";
import { Field, Input } from "./Field";
import { Modal } from "./Modal";

const EMPTY_DRAFT = {
  loadingCity: "",
  unloadingCity: "",
  loadingDate: "",
  unloadingDate: "",
  carrierName: "",
  carrierInn: "",
  carrierContact: "",
};

export function QuickCreateShipmentDialog({ lead, onCreate, onClose }) {
  const navigate = useNavigate();
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const set = (key) => (event) => {
    setDraft((prev) => ({ ...prev, [key]: event.target.value }));
    if (error) setError("");
  };

  function submit() {
    if (submitting) return;
    const required = [draft.loadingCity, draft.unloadingCity, draft.loadingDate, draft.unloadingDate, draft.carrierName];
    if (required.some((value) => !value.trim())) {
      setError("Заполните все обязательные поля.");
      return;
    }

    setSubmitting(true);
    const shipment = onCreate({
      lead,
      loadingCity: draft.loadingCity.trim(),
      unloadingCity: draft.unloadingCity.trim(),
      loadingDate: draft.loadingDate,
      unloadingDate: draft.unloadingDate,
      carrierName: draft.carrierName.trim(),
      carrierInn: draft.carrierInn.replace(/\D/g, "").slice(0, 12),
      carrierContact: draft.carrierContact.trim(),
    });
    navigate(`/shipments/${shipment.id}`);
  }

  return (
    <Modal
      open
      title="Новая заявка"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button variant="primary" onClick={submit} disabled={submitting}>
            {submitting ? "Создаём…" : "Создать заявку"}
          </Button>
        </>
      }
    >
      <form
        className="stack"
        style={{ gap: 13 }}
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <p className="modal-copy">
          Заявка будет связана с лидом «{lead.name}». В карточке можно указать цены; адрес, груз и машина в этом упрощённом макете останутся пустыми.
        </p>

        <Field label="Город погрузки">
          <Input autoFocus required placeholder="Например, Челябинск" value={draft.loadingCity} onChange={set("loadingCity")} />
        </Field>
        <Field label="Город выгрузки">
          <Input required placeholder="Например, Москва" value={draft.unloadingCity} onChange={set("unloadingCity")} />
        </Field>

        <div className="grid grid--1-1" style={{ gap: 12 }}>
          <Field label="Дата погрузки">
            <Input required type="date" value={draft.loadingDate} onChange={set("loadingDate")} />
          </Field>
          <Field label="Дата выгрузки">
            <Input required type="date" value={draft.unloadingDate} onChange={set("unloadingDate")} />
          </Field>
        </div>

        <Field label="Перевозчик">
          <Input required placeholder="Название компании" value={draft.carrierName} onChange={set("carrierName")} />
        </Field>

        <div className="grid grid--1-1" style={{ gap: 12 }}>
          <Field label="ИНН перевозчика" hint="Необязательно">
            <Input
              inputMode="numeric"
              maxLength={12}
              placeholder="10 или 12 цифр"
              value={draft.carrierInn}
              onChange={set("carrierInn")}
            />
          </Field>
          <Field label="Контакт перевозчика" hint="Необязательно">
            <Input placeholder="Фамилия Имя" value={draft.carrierContact} onChange={set("carrierContact")} />
          </Field>
        </div>

        {error && <p className="modal-error" role="alert">{error}</p>}
      </form>
    </Modal>
  );
}
