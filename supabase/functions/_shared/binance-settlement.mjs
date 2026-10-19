import { exactDecimal } from "./binance-merchant-client.mjs";
// Solo datos de consulta autenticada a Binance cuentan como evidencia de cobro.
// Nunca se usan montos o ids que mande el comprador.
export function validateBinanceSettlement(event,info,expectedMerchantId) {
  if (!event || !info || String(info.merchantId)!==expectedMerchantId)
    throw Error("Merchant no coincide");
  if (info.merchantTradeNo!==event.orderKey || info.status!=="PAID")
    throw Error("Orden no confirmada como PAID");
  if (info.currency!=="USDT"||event.currency!=="USDT"||
      exactDecimal(info.totalFee)!==event.amountMicros)
    throw Error("Importe USDT no coincide con Binance");
  if (!info.prepayId || !/^\d{1,32}$/.test(String(info.prepayId)))
    throw Error("PrepayId incorrecto");
  if (!info.transactionId || String(info.transactionId)!==event.transactionId)
    throw Error("Transaccion no coincide");
  if(!Number.isSafeInteger(Number(info.transactTime)) || Number(info.transactTime)<1500000000000)
    throw Error("Hora de pago no verificable");
  return {
    p_trade_no:event.orderKey,
    p_merchant_id:expectedMerchantId,
    p_prepay_id:String(info.prepayId),
    p_transaction_id:String(info.transactionId),
    p_usdt:String(info.totalFee),
    p_paid_at:new Date(Number(info.transactTime)).toISOString()
  };
}
