/**
 * Маржа заявки: сумма клиента минус сумма перевозчика. Налог заявки
 * (НДС 22 % / без НДС / 0 %) в марже не участвует — та же формула показана
 * в списке и карточке заявки. Пока одна из сумм пуста, маржи нет (null).
 */
export function shipmentMargin(shipment) {
  if (shipment.customerPrice == null || shipment.carrierPrice == null) return null;
  const customerPrice = Number(shipment.customerPrice);
  const carrierPrice = Number(shipment.carrierPrice);

  if (!Number.isFinite(customerPrice) || !Number.isFinite(carrierPrice)) return null;
  return customerPrice - carrierPrice;
}

/**
 * Итоговая маржа только тех заявок, которые напрямую связаны с лидом.
 * Заявки с незаполненными суммами не искажают результат; у лида без заявок
 * итог остаётся нулём.
 */
export function leadShipmentMargin(leadId, shipments) {
  return shipments
    .filter((shipment) => shipment.leadId === leadId)
    .reduce((total, shipment) => total + (shipmentMargin(shipment) ?? 0), 0);
}
