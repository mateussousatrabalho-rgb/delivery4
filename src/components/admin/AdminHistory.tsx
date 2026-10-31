/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Calendar,
  Printer,
  Eye,
  Truck,
  Store,
  Clock,
  X,
  FileSpreadsheet,
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
  onReprintOrder: (orderId: string) => Promise<void>;
}

export const AdminHistory: React.FC<Props> = ({
  orders,
  settings,
  onReprintOrder,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modalityFilter, setModalityFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [reprintSuccess, setReprintSuccess] = useState<string | null>(null);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Search by Number, Client Name or Phone
      if (search.trim()) {
        const q = search.toLowerCase();
        const matches =
          o.formattedNumber.includes(q) ||
          o.clientName.toLowerCase().includes(q) ||
          o.clientPhone.includes(q);
        if (!matches) return false;
      }

      // Status
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;

      // Modality
      if (modalityFilter !== 'all' && o.modality !== modalityFilter) return false;

      // Date
      if (dateFilter && !o.createdAt.startsWith(dateFilter)) return false;

      return true;
    });
  }, [orders, search, statusFilter, modalityFilter, dateFilter]);

  const handleReprint = async (order: Order) => {
    await onReprintOrder(order.id);
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
    setReprintSuccess(`Comanda do pedido #${order.formattedNumber} enviada para reimpressão (2ª VIA)!`);
    setTimeout(() => setReprintSuccess(null), 4000);
  };

  return (
    <div className="space-y-6 text-white pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#141417] border border-zinc-800 p-6 rounded-3xl">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            Histórico Completo de Pedidos
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Consulte pedidos anteriores por data, número, cliente, status e reimprima comandas
          </p>
        </div>

        <div className="text-xs text-zinc-400 bg-zinc-950 px-4 py-2 rounded-2xl border border-zinc-800 self-start">
          Exibindo <strong className="text-white">{filteredOrders.length}</strong> de{' '}
          <strong className="text-white">{orders.length}</strong> pedidos
        </div>
      </div>

      {reprintSuccess && (
        <div className="bg-emerald-950/80 border border-emerald-500/40 rounded-2xl p-4 text-xs text-emerald-200 flex items-center justify-between">
          <span>{reprintSuccess}</span>
          <button onClick={() => setReprintSuccess(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-[#141417] border border-zinc-800 rounded-3xl p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search Input */}
        <div>
          <label className="block text-[11px] font-bold text-zinc-400 mb-1">
            Buscar por número ou cliente:
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Ex: 0001 ou Carlos"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-orange-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none"
            />
          </div>
        </div>

        {/* Date Filter */}
        <div>
          <label className="block text-[11px] font-bold text-zinc-400 mb-1">
            Filtrar por data:
          </label>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 focus:border-orange-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
          />
        </div>

        {/* Modality Filter */}
        <div>
          <label className="block text-[11px] font-bold text-zinc-400 mb-1">
            Modalidade:
          </label>
          <select
            value={modalityFilter}
            onChange={(e) => setModalityFilter(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 focus:border-orange-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
          >
            <option value="all">Todas as modalidades</option>
            <option value="ENTREGA">Entrega em Domicílio</option>
            <option value="RETIRADA">Retirada no Restaurante</option>
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-[11px] font-bold text-zinc-400 mb-1">
            Status do Pedido:
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 focus:border-orange-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
          >
            <option value="all">Todos os status</option>
            <option value="RECEBIDO">Recebido</option>
            <option value="EM_PREPARO">Em Preparo</option>
            <option value="PRONTO">Pronto</option>
            <option value="SAIU_PARA_ENTREGA">Saiu para Entrega</option>
            <option value="ENTREGUE">Entregue</option>
            <option value="RETIRADO">Retirado</option>
            <option value="CANCELADO">Cancelado</option>
          </select>
        </div>
      </div>

      {/* Orders List / Table */}
      <div className="bg-[#141417] border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-zinc-950 text-zinc-400 uppercase font-bold text-[10px] tracking-wider border-b border-zinc-800">
              <tr>
                <th className="py-3.5 px-4">Pedido</th>
                <th className="py-3.5 px-4">Data/Hora</th>
                <th className="py-3.5 px-4">Cliente</th>
                <th className="py-3.5 px-4">Modalidade</th>
                <th className="py-3.5 px-4">Produtos</th>
                <th className="py-3.5 px-4">Taxa Entrega</th>
                <th className="py-3.5 px-4">Total</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-zinc-500 font-semibold">
                    Nenhum pedido encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const isEntrega = order.modality === 'ENTREGA';
                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-zinc-900/50 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-black text-white whitespace-nowrap">
                        #{order.formattedNumber}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-zinc-400">
                        {new Date(order.createdAt).toLocaleDateString('pt-BR')}{' '}
                        {new Date(order.createdAt).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white whitespace-nowrap">
                        {order.clientName}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded ${
                            isEntrega
                              ? 'bg-orange-500/10 text-orange-400'
                              : 'bg-emerald-500/10 text-emerald-400'
                          }`}
                        >
                          {isEntrega ? <Truck className="w-3 h-3" /> : <Store className="w-3 h-3" />}
                          {order.modality}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 max-w-[200px] truncate text-zinc-300">
                        {order.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isEntrega ? (
                          order.deliveryFeeStatus === 'CONFIRMADA' &&
                          order.deliveryFee !== null ? (
                            <span className="font-bold text-emerald-400">
                              {formatCurrencyBRL(order.deliveryFee)}
                            </span>
                          ) : (
                            <span className="text-orange-400 font-semibold text-[11px]">
                              Pendente
                            </span>
                          )
                        ) : (
                          <span className="text-zinc-500">R$ 0,00</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-black text-white whitespace-nowrap">
                        {order.total !== null
                          ? formatCurrencyBRL(order.total)
                          : `${formatCurrencyBRL(order.subtotal)} + Taxa`}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            title="Ver Comanda"
                            onClick={() => setSelectedOrder(order)}
                            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Reimprimir 2ª Via"
                            onClick={() => handleReprint(order)}
                            className="p-1.5 rounded-lg bg-orange-600/20 hover:bg-orange-600 text-orange-400 hover:text-white transition"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Comanda View Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#161618] border border-zinc-800 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="font-black text-lg text-white">
                Comanda do Pedido #{selectedOrder.formattedNumber}
              </h3>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-zinc-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-4 bg-white text-black font-mono p-4 rounded-xl text-xs max-h-96 overflow-y-auto border border-zinc-300">
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
                  isSecondCopy: true,
                })}
              </pre>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 rounded-xl bg-zinc-900 text-zinc-400 text-xs font-bold"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => {
                  handleReprint(selectedOrder);
                  setSelectedOrder(null);
                }}
                className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Reimprimir Comanda</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
