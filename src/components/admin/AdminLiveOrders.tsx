/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Clock,
  Truck,
  Store,
  Printer,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
  MapPin,
  DollarSign,
  ChevronRight,
  Eye,
  X,
  RefreshCw,
  Send,
} from 'lucide-react';
import {
  Order,
  OrderStatus,
  OrderModality,
  formatCurrencyBRL,
  formatEpsonReceiptText,
} from '../../utils/orderRules.ts';
import { epsonPrinter } from '../../services/epsonPrinter.ts';
import { RestaurantSettings } from '../../../server/db';

interface Props {
  orders: Order[];
  settings: RestaurantSettings;
  onUpdateStatus: (orderId: string, status: OrderStatus, note?: string) => Promise<void>;
  onSetDeliveryFee: (orderId: string, fee: number) => Promise<void>;
  onReprintOrder: (orderId: string) => Promise<void>;
}

export const AdminLiveOrders: React.FC<Props> = ({
  orders,
  settings,
  onUpdateStatus,
  onSetDeliveryFee,
  onReprintOrder,
}) => {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [feeModalOrder, setFeeModalOrder] = useState<Order | null>(null);
  const [feeInput, setFeeInput] = useState<string>('');
  const [feeError, setFeeError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [isReprintingId, setIsReprintingId] = useState<string | null>(null);
  const [reprintSuccessMsg, setReprintSuccessMsg] = useState<string | null>(null);

  // Filter orders: active (not yet delivered/picked/cancelled) or specific status
  const filteredOrders = orders.filter((order) => {
    if (statusFilter === 'active') {
      return !['ENTREGUE', 'RETIRADO', 'CANCELADO'].includes(order.status);
    }
    if (statusFilter === 'all') return true;
    return order.status === statusFilter;
  });

  const handleOpenFeeModal = (order: Order) => {
    setFeeModalOrder(order);
    setFeeError(null);
    setFeeInput(order.deliveryFee !== null ? String(order.deliveryFee) : '7.00');
  };

  const handleConfirmFee = async () => {
    if (!feeModalOrder) return;
    setFeeError(null);
    const num = parseFloat(feeInput.replace(',', '.'));
    if (isNaN(num) || num < 0) {
      setFeeError('Informe um valor de taxa numérico válido (ex: 7.50).');
      return;
    }
    await onSetDeliveryFee(feeModalOrder.id, num);
    setFeeModalOrder(null);
  };

  const handleReprint = async (order: Order) => {
    setIsReprintingId(order.id);
    try {
      await onReprintOrder(order.id);

      // Also trigger direct local browser / WebSerial / QZ Tray print
      const receipt = formatEpsonReceiptText(order, {
        width: settings.paperWidth,
        restaurantName: settings.restaurantName,
        isSecondCopy: true,
        reprintDate: new Date().toLocaleString('pt-BR'),
      });
      await epsonPrinter.printReceipt(receipt, {
        printerName: settings.printerName,
        logoUrl: settings.printLogoUrl || '/assets/aistudio/IMG_0848-Photoroomm_42d628da.png',
      });

      setReprintSuccessMsg(`Comanda do pedido #${order.formattedNumber} enviada para reimpressão (2ª VIA)!`);
      setTimeout(() => setReprintSuccessMsg(null), 4000);
    } finally {
      setIsReprintingId(null);
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'RECEBIDO':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-black bg-orange-600 text-white animate-pulse shadow-md shadow-orange-600/30">
            NOVO PEDIDO
          </span>
        );
      case 'EM_PREPARO':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
            Em Preparo
          </span>
        );
      case 'PRONTO':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
            Pronto p/ Saída
          </span>
        );
      case 'SAIU_PARA_ENTREGA':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
            Saiu p/ Entrega
          </span>
        );
      case 'ENTREGUE':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            Entregue
          </span>
        );
      case 'RETIRADO':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-teal-500/20 text-teal-400 border border-teal-500/30">
            Retirado
          </span>
        );
      case 'CANCELADO':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">
            Cancelado
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 text-white pb-12">
      {/* Success alert message */}
      {reprintSuccessMsg && (
        <div className="bg-emerald-950/80 border border-emerald-500/40 rounded-2xl p-4 text-xs text-emerald-200 flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>{reprintSuccessMsg}</span>
          </div>
          <button onClick={() => setReprintSuccessMsg(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#141417] border border-zinc-800 p-5 rounded-3xl">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-500 animate-ping" />
            Pedidos em Tempo Real (KDS & Balcão)
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Recebimento automático com alerta sonoro e impressão direta na impressora Epson USB
          </p>
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { id: 'active', label: 'Em Andamento' },
            { id: 'all', label: 'Todos' },
            { id: 'RECEBIDO', label: 'Novos' },
            { id: 'EM_PREPARO', label: 'Em Preparo' },
            { id: 'PRONTO', label: 'Prontos' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                statusFilter === f.id
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20'
                  : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Grid */}
      {filteredOrders.length === 0 ? (
        <div className="bg-[#141417] border border-zinc-800 rounded-3xl p-16 text-center text-zinc-400">
          <p className="font-bold text-base text-zinc-300">
            Nenhum pedido ativo no momento.
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            Assim que um cliente fizer um pedido, ele aparecerá aqui automaticamente com aviso sonoro e será impresso na Epson USB.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredOrders.map((order) => {
            const isEntrega = order.modality === 'ENTREGA';
            const isNew = order.status === 'RECEBIDO';

            return (
              <div
                key={order.id}
                className={`bg-[#141417] border rounded-3xl p-5 flex flex-col justify-between transition-all shadow-xl ${
                  isNew
                    ? 'border-orange-500 ring-2 ring-orange-500/30 shadow-orange-600/10'
                    : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div>
                  {/* Top Header: Order Number, Modality & Status */}
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
                    <div>
                      <span className="text-lg font-black text-white tracking-wide">
                        PEDIDO #{order.formattedNumber}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-400">
                        <Clock className="w-3.5 h-3.5 text-orange-500" />
                        <span>
                          {new Date(order.createdAt).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                    <div>{getStatusBadge(order.status)}</div>
                  </div>

                  {/* Client Info & Modality Badge */}
                  <div className="mt-3 bg-zinc-950/70 border border-zinc-800/80 rounded-2xl p-3.5 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm">
                        {order.clientName}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-lg text-[10px] ${
                          isEntrega
                            ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                            : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {isEntrega ? (
                          <>
                            <Truck className="w-3 h-3" /> ENTREGA
                          </>
                        ) : (
                          <>
                            <Store className="w-3 h-3" /> RETIRADA
                          </>
                        )}
                      </span>
                    </div>

                    <div className="text-zinc-400 flex items-center justify-between">
                      <span>WhatsApp: {order.clientPhone}</span>
                      <a
                        href={`https://wa.me/${order.clientPhone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-400 hover:text-emerald-300 font-bold inline-flex items-center gap-1"
                      >
                        <MessageCircle className="w-3.5 h-3.5" /> Abrir conversa
                      </a>
                    </div>

                    {isEntrega && order.address && (
                      <div className="pt-1 text-zinc-300 border-t border-zinc-800/80 text-[11px] flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-orange-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p>{order.address.formatted}</p>
                          {order.address.reference && (
                            <p className="text-zinc-400 text-[10px]">
                              Ref: {order.address.reference}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Items list */}
                  <div className="mt-3 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                      Itens do Pedido ({order.items.reduce((s, i) => s + i.quantity, 0)})
                    </span>
                    <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                      {order.items.map((it, idx) => (
                        <div
                          key={idx}
                          className="bg-zinc-950/40 p-2 rounded-xl text-xs flex flex-col justify-between"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-zinc-200">
                              <strong className="text-orange-400">{it.quantity}x</strong>{' '}
                              {it.name}
                            </span>
                            <span className="font-semibold text-zinc-300 text-[11px]">
                              {formatCurrencyBRL(it.price * it.quantity)}
                            </span>
                          </div>
                          {it.notes && (
                            <p className="text-[10px] text-orange-300 mt-0.5 bg-zinc-900 px-2 py-0.5 rounded">
                              Obs: {it.notes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    {order.generalNotes && (
                      <div className="bg-orange-950/30 border border-orange-500/20 p-2.5 rounded-xl text-[11px] text-orange-300 mt-2">
                        <strong>Obs. do Pedido:</strong> {order.generalNotes}
                      </div>
                    )}
                  </div>

                  {/* Financial Values & Delivery Fee Status */}
                  <div className="mt-4 pt-3 border-t border-zinc-800/80 text-xs space-y-1.5">
                    <div className="flex justify-between text-zinc-400">
                      <span>Subtotal dos produtos:</span>
                      <span className="font-bold text-white">
                        {formatCurrencyBRL(order.subtotal)}
                      </span>
                    </div>

                    {isEntrega ? (
                      <div className="flex items-center justify-between bg-zinc-950 p-2 rounded-xl border border-zinc-800">
                        <div>
                          <span className="text-[11px] text-zinc-400 block">
                            Taxa de Entrega:
                          </span>
                          {order.deliveryFeeStatus === 'CONFIRMADA' &&
                          order.deliveryFee !== null ? (
                            <span className="font-bold text-emerald-400">
                              {formatCurrencyBRL(order.deliveryFee)} (Confirmada)
                            </span>
                          ) : (
                            <span className="font-bold text-orange-400 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> A confirmar via WhatsApp
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleOpenFeeModal(order)}
                          className="bg-orange-600 hover:bg-orange-500 text-white font-bold text-[11px] px-3 py-1.5 rounded-lg transition cursor-pointer"
                        >
                          {order.deliveryFeeStatus === 'CONFIRMADA'
                            ? 'Alterar Taxa'
                            : 'Definir Taxa'}
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-between text-xs text-emerald-400 bg-emerald-950/20 p-2 rounded-xl border border-emerald-500/20">
                        <span>Taxa de Entrega:</span>
                        <span className="font-bold">R$ 0,00 (Retirada)</span>
                      </div>
                    )}

                    <div className="flex justify-between text-sm font-black pt-1 text-white">
                      <span>Total:</span>
                      <span className="text-orange-400">
                        {order.total !== null
                          ? formatCurrencyBRL(order.total)
                          : `${formatCurrencyBRL(order.subtotal)} + Taxa`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions: Status Flow & Reprint */}
                <div className="mt-5 pt-3 border-t border-zinc-800/80 space-y-2">
                  <div className="flex items-center gap-2">
                    {/* Status Advance Buttons */}
                    {order.status === 'RECEBIDO' && (
                      <button
                        type="button"
                        onClick={() => onUpdateStatus(order.id, 'EM_PREPARO')}
                        className="flex-1 py-2.5 rounded-xl bg-yellow-600 hover:bg-yellow-500 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Iniciar Preparo</span>
                      </button>
                    )}

                    {order.status === 'EM_PREPARO' && (
                      <button
                        type="button"
                        onClick={() => onUpdateStatus(order.id, 'PRONTO')}
                        className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Marcar como Pronto</span>
                      </button>
                    )}

                    {order.status === 'PRONTO' && isEntrega && (
                      <button
                        type="button"
                        onClick={() => onUpdateStatus(order.id, 'SAIU_PARA_ENTREGA')}
                        className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>Saiu para Entrega</span>
                      </button>
                    )}

                    {order.status === 'PRONTO' && !isEntrega && (
                      <button
                        type="button"
                        onClick={() => onUpdateStatus(order.id, 'RETIRADO')}
                        className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Store className="w-3.5 h-3.5" />
                        <span>Marcar como Retirado</span>
                      </button>
                    )}

                    {order.status === 'SAIU_PARA_ENTREGA' && (
                      <button
                        type="button"
                        onClick={() => onUpdateStatus(order.id, 'ENTREGUE')}
                        className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Finalizar (Entregue)</span>
                      </button>
                    )}

                    {/* Reprint Button strictly required */}
                    <button
                      type="button"
                      title="Reimprimir Comanda na impressora Epson USB"
                      disabled={isReprintingId === order.id}
                      onClick={() => handleReprint(order)}
                      className="px-3 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 hover:text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5 text-orange-400" />
                      <span className="hidden sm:inline">2ª Via</span>
                    </button>

                    {/* View details */}
                    <button
                      type="button"
                      title="Ver Comanda Completa"
                      onClick={() => setSelectedOrder(order)}
                      className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white transition cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Manual Delivery Fee Confirmation Modal (Requisito 3.4) */}
      {feeModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#161618] border border-zinc-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-orange-500" />
                <h3 className="font-black text-lg text-white">
                  Confirmar Taxa de Entrega
                </h3>
              </div>
              <button
                onClick={() => setFeeModalOrder(null)}
                className="text-zinc-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-zinc-950 p-4 rounded-2xl text-xs space-y-1.5 border border-zinc-800">
              <p className="text-zinc-400">
                Pedido: <strong className="text-white">#{feeModalOrder.formattedNumber}</strong>
              </p>
              <p className="text-zinc-400">
                Cliente: <strong className="text-white">{feeModalOrder.clientName}</strong>
              </p>
              <p className="text-zinc-300">
                Endereço: {feeModalOrder.address?.formatted}
              </p>
              {feeModalOrder.address?.reference && (
                <p className="text-orange-400">
                  Ref: {feeModalOrder.address.reference}
                </p>
              )}
            </div>

            {feeError && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>{feeError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                Valor da Taxa de Entrega (R$)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-sm">
                  R$
                </span>
                <input
                  type="number"
                  step="0.50"
                  min="0"
                  autoFocus
                  placeholder="0.00"
                  value={feeInput}
                  onChange={(e) => setFeeInput(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 focus:border-orange-500 rounded-2xl pl-12 pr-4 py-3 text-white text-base font-bold outline-none"
                />
              </div>
              <p className="text-[11px] text-zinc-500 mt-1.5">
                Verifique a localização enviada pelo cliente no WhatsApp para calcular a distância e digite o valor exato.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setFeeModalOrder(null)}
                className="px-4 py-2.5 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmFee}
                className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-lg shadow-orange-600/30 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Salvar e Confirmar Taxa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comanda Preview / Reprint Modal (Requisito 2.6 & 3.5) */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#161618] border border-zinc-800 rounded-3xl p-6 max-w-lg w-full max-h-[90vh] flex flex-col justify-between shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-orange-500" />
                <h3 className="font-black text-lg text-white">
                  Visualização da Comanda Térmica Epson
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-zinc-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Receipt Paper Simulation matching template */}
            <div className="my-4 overflow-y-auto bg-white text-black font-mono p-5 rounded-xl shadow-inner text-xs leading-relaxed border border-zinc-300">
              <div className="flex flex-col items-center justify-center pb-3 mb-2 border-b border-dashed border-zinc-400">
                <img
                  src={settings.printLogoUrl || '/assets/aistudio/IMG_0848-Photoroomm_42d628da.png'}
                  alt={settings.restaurantName}
                  className="max-h-20 max-w-[170px] object-contain filter contrast-125"
                />
              </div>
              <pre className="whitespace-pre-wrap font-inherit">
                {formatEpsonReceiptText(selectedOrder, {
                  width: settings.paperWidth,
                  restaurantName: settings.restaurantName,
                  isSecondCopy: selectedOrder.printCount > 0,
                  reprintDate: new Date().toLocaleString('pt-BR'),
                })}
              </pre>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
              <span className="text-xs text-zinc-400">
                Bobina: {settings.paperWidth}mm • Impressões: {selectedOrder.printCount || 1}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white text-xs font-bold"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleReprint(selectedOrder);
                    setSelectedOrder(null);
                  }}
                  className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-orange-600/30"
                >
                  <Printer className="w-4 h-4" />
                  <span>REIMPRIMIR COMANDA (2ª VIA)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
