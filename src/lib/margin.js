/**
 * Маржа заявки в границах макета: разница между суммой клиента и суммой
 * перевозчика. В демо-данных нет отдельных ставок НДС и ставки вычета,
 * поэтому это та же формула, которая показывается на экранах заявок.
 */
export function shipmentMargin(shipment) {
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
