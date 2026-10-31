/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  Package,
  Truck,
  Store,
  Calendar,
  Layers,
  Award,
  Filter,
} from 'lucide-react';
import {
  Order,
  formatCurrencyBRL,
  calculateFinancialMetrics,
} from '../../utils/orderRules.ts';
import { Category, Product } from '../../../server/db';

interface Props {
  orders: Order[];
  categories: Category[];
  products: Product[];
}

export const AdminFinancial: React.FC<Props> = ({
  orders,
  categories,
  products,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<
    'all' | 'today' | 'week' | 'month' | 'custom'
  >('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Filter orders by chosen period
  const filteredOrders = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    return orders.filter((o) => {
      const orderDate = o.createdAt.slice(0, 10);

      if (selectedPeriod === 'today') {
        return orderDate === todayStr;
      }
      if (selectedPeriod === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10);
        return orderDate >= weekAgo;
      }
      if (selectedPeriod === 'month') {
        const monthStr = now.toISOString().slice(0, 7);
        return o.createdAt.slice(0, 7) === monthStr;
      }
      if (selectedPeriod === 'custom') {
        if (startDate && orderDate < startDate) return false;
        if (endDate && orderDate > endDate) return false;
        return true;
      }
      return true;
    });
  }, [orders, selectedPeriod, startDate, endDate]);

  const metrics = useMemo(
    () => calculateFinancialMetrics(filteredOrders),
    [filteredOrders]
  );

  // Category breakdown calculation
  const categorySales = useMemo(() => {
    const catMap: Record<string, { name: string; quantity: number; revenue: number }> =
      {};
    for (const cat of categories) {
      catMap[cat.id] = { name: cat.name, quantity: 0, revenue: 0 };
    }

    const prodToCat: Record<string, string> = {};
    for (const p of products) {
      prodToCat[p.id] = p.categoryId;
    }

    for (const ord of filteredOrders) {
      if (ord.status === 'CANCELADO') continue;
      for (const it of ord.items) {
        const catId = prodToCat[it.productId] || 'cat-1';
        if (catMap[catId]) {
          catMap[catId].quantity += it.quantity;
          catMap[catId].revenue += it.quantity * it.price;
        }
      }
    }

    return Object.values(catMap).sort((a, b) => b.revenue - a.revenue);
  }, [categories, products, filteredOrders]);

  return (
    <div className="space-y-6 text-white pb-12">
      {/* Top Header & Period Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#141417] border border-zinc-800 p-6 rounded-3xl">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-orange-500" />
            Relatórios Financeiros & Faturamento
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Contabilidade transparente: valores de produtos separados estritamente das taxas de entrega
          </p>
        </div>

        {/* Period Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'today', label: 'Hoje' },
            { id: 'week', label: 'Últimos 7 dias' },
            { id: 'month', label: 'Este Mês' },
            { id: 'all', label: 'Todo o Período' },
            { id: 'custom', label: 'Personalizado' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedPeriod(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedPeriod === tab.id
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20'
                  : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Pickers */}
      {selectedPeriod === 'custom' && (
        <div className="bg-[#141417] border border-zinc-800 rounded-3xl p-4 flex flex-wrap items-center gap-4 text-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 font-bold">Data Inicial:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-white outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 font-bold">Data Final:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-white outline-none"
            />
          </div>
        </div>
      )}

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Faturamento em Produtos */}
        <div className="bg-[#141417] border border-zinc-800 rounded-3xl p-5">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Faturamento em Produtos
          </span>
          <p className="text-2xl sm:text-3xl font-black text-white mt-2">
            {formatCurrencyBRL(metrics.productSalesRevenue)}
          </p>
          <p className="text-[11px] text-zinc-400 mt-1">
            Venda bruta do cardápio (sem incluir entregas)
          </p>
        </div>

        {/* Total de Taxas de Entrega */}
        <div className="bg-[#141417] border border-zinc-800 rounded-3xl p-5">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
            Total de Taxas de Entrega
          </span>
          <p className="text-2xl sm:text-3xl font-black text-emerald-400 mt-2">
            {formatCurrencyBRL(metrics.deliveryFeesRevenue)}
          </p>
          <p className="text-[11px] text-zinc-400 mt-1">
            Repasse exclusivo de frete e motoboy
          </p>
        </div>

        {/* Total Consolidado */}
        <div className="bg-[#141417] border border-zinc-800 rounded-3xl p-5">
          <span className="text-xs font-bold uppercase tracking-wider text-orange-400">
            Entrada Total (Bruto)
          </span>
          <p className="text-2xl sm:text-3xl font-black text-orange-400 mt-2">
            {formatCurrencyBRL(metrics.totalRevenue)}
          </p>
          <p className="text-[11px] text-zinc-400 mt-1">
            Produtos ({formatCurrencyBRL(metrics.productSalesRevenue)}) + Taxas ({formatCurrencyBRL(metrics.deliveryFeesRevenue)})
          </p>
        </div>

        {/* Ticket Médio */}
        <div className="bg-[#141417] border border-zinc-800 rounded-3xl p-5">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Ticket Médio
          </span>
          <p className="text-2xl sm:text-3xl font-black text-white mt-2">
            {formatCurrencyBRL(metrics.averageTicket)}
          </p>
          <p className="text-[11px] text-zinc-400 mt-1">
            Baseado em {filteredOrders.filter((o) => o.status !== 'CANCELADO').length} pedidos válidos
          </p>
        </div>
      </div>

      {/* Entrega vs Retirada Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#141417] border border-zinc-800 rounded-3xl p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-600/20 text-orange-400 border border-orange-500/30 flex items-center justify-center">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
                Vendas de Entrega (Delivery)
              </h4>
              <p className="text-2xl font-black text-white mt-1">
                {metrics.countByModality.entrega} Pedidos
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-zinc-400 block">Taxas confirmadas:</span>
            <span className="text-base font-black text-emerald-400">
              {formatCurrencyBRL(metrics.deliveryFeesRevenue)}
            </span>
          </div>
        </div>

        <div className="bg-[#141417] border border-zinc-800 rounded-3xl p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
                Vendas de Retirada no Restaurante
              </h4>
              <p className="text-2xl font-black text-white mt-1">
                {metrics.countByModality.retirada} Pedidos
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-zinc-400 block">Taxa cobrada:</span>
            <span className="text-base font-black text-zinc-400">R$ 0,00</span>
          </div>
        </div>
      </div>

      {/* Breakdown by Category & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="bg-[#141417] border border-zinc-800 rounded-3xl p-6">
          <h3 className="text-base font-extrabold text-white flex items-center gap-2 mb-4">
            <Layers className="w-4 h-4 text-orange-500" />
            Vendas por Categoria
          </h3>

          <div className="space-y-3">
            {categorySales.map((cat, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800 text-xs"
              >
                <div>
                  <span className="font-bold text-white block">{cat.name}</span>
                  <span className="text-[11px] text-zinc-400">
                    {cat.quantity} unidades vendidas
                  </span>
                </div>
                <span className="font-extrabold text-orange-400 text-sm">
                  {formatCurrencyBRL(cat.revenue)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-[#141417] border border-zinc-800 rounded-3xl p-6">
          <h3 className="text-base font-extrabold text-white flex items-center gap-2 mb-4">
            <Award className="w-4 h-4 text-orange-500" />
            Produtos Mais Vendidos no Período
          </h3>

          <div className="space-y-3">
            {metrics.topSellingProducts.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-500">
                Nenhum produto registrado no período.
              </div>
            ) : (
              metrics.topSellingProducts.slice(0, 8).map((it, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-orange-600/20 text-orange-400 font-extrabold flex items-center justify-center text-xs">
                      #{idx + 1}
                    </span>
                    <span className="font-bold text-white">{it.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-white block">{it.quantity} un</span>
                    <span className="text-[11px] text-zinc-400">
                      {formatCurrencyBRL(it.revenue)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
