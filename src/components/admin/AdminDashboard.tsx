/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Clock,
  CheckCircle2,
  Package,
  Truck,
  Store,
  Layers,
  Award,
} from 'lucide-react';
import { Order, formatCurrencyBRL, calculateFinancialMetrics } from '../../utils/orderRules.ts';

interface Props {
  orders: Order[];
  onNavigateToLive: () => void;
}

export const AdminDashboard: React.FC<Props> = ({ orders, onNavigateToLive }) => {
  const [chartPeriod, setChartPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const metrics = calculateFinancialMetrics(orders);

  // Filter orders by today & this month
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const monthStr = now.toISOString().slice(0, 7);

  const todayOrders = orders.filter(
    (o) => o.createdAt.slice(0, 10) === todayStr && o.status !== 'CANCELADO'
  );
  const todaySales = todayOrders.reduce((sum, o) => sum + (o.subtotal || 0), 0);
  const todayFees = todayOrders.reduce(
    (sum, o) => (o.deliveryFeeStatus === 'CONFIRMADA' ? sum + (o.deliveryFee || 0) : sum),
    0
  );

  const monthOrders = orders.filter(
    (o) => o.createdAt.slice(0, 7) === monthStr && o.status !== 'CANCELADO'
  );
  const monthSales = monthOrders.reduce((sum, o) => sum + (o.subtotal || 0), 0);
  const monthFees = monthOrders.reduce(
    (sum, o) => (o.deliveryFeeStatus === 'CONFIRMADA' ? sum + (o.deliveryFee || 0) : sum),
    0
  );

  // Simulated chart data points based on orders
  const dailyPoints = [
    { label: '18h', produtos: todaySales * 0.15, taxa: todayFees * 0.15 },
    { label: '19h', produtos: todaySales * 0.25, taxa: todayFees * 0.25 },
    { label: '20h', produtos: todaySales * 0.35, taxa: todayFees * 0.35 },
    { label: '21h', produtos: todaySales * 0.18, taxa: todayFees * 0.18 },
    { label: '22h', produtos: todaySales * 0.07, taxa: todayFees * 0.07 },
  ];

  const weeklyPoints = [
    { label: 'Seg', produtos: monthSales * 0.08, taxa: monthFees * 0.08 },
    { label: 'Ter', produtos: monthSales * 0.12, taxa: monthFees * 0.12 },
    { label: 'Qua', produtos: monthSales * 0.14, taxa: monthFees * 0.14 },
    { label: 'Qui', produtos: monthSales * 0.16, taxa: monthFees * 0.16 },
    { label: 'Sex', produtos: monthSales * 0.24, taxa: monthFees * 0.24 },
    { label: 'Sáb', produtos: monthSales * 0.26, taxa: monthFees * 0.26 },
    { label: 'Dom', produtos: monthSales * 0.22, taxa: monthFees * 0.22 },
  ];

  const monthlyPoints = [
    { label: 'Semana 1', produtos: monthSales * 0.22, taxa: monthFees * 0.22 },
    { label: 'Semana 2', produtos: monthSales * 0.26, taxa: monthFees * 0.26 },
    { label: 'Semana 3', produtos: monthSales * 0.28, taxa: monthFees * 0.28 },
    { label: 'Semana 4', produtos: monthSales * 0.24, taxa: monthFees * 0.24 },
  ];

  const activePoints =
    chartPeriod === 'daily'
      ? dailyPoints
      : chartPeriod === 'weekly'
      ? weeklyPoints
      : monthlyPoints;

  const maxVal = Math.max(...activePoints.map((p) => p.produtos + p.taxa), 100);

  return (
    <div className="space-y-6 text-white pb-12">
      {/* Top Welcome & Quick Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#141417] border border-zinc-800 p-6 rounded-3xl">
        <div>
          <h2 className="text-2xl font-black text-white">Dashboard do Restaurante</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Visão geral em tempo real de vendas, fluxo de comandas e métricas no Jardim do Ingá
          </p>
        </div>

        <button
          onClick={onNavigateToLive}
          className="bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs px-5 py-3 rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-orange-600/20"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Ver Pedidos em Tempo Real ({metrics.countByStatus.RECEBIDO + metrics.countByStatus.EM_PREPARO})</span>
        </button>
      </div>

      {/* KPI Cards Row 1: Sales & Revenue */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Vendas de Hoje */}
        <div className="bg-[#141417] border border-zinc-800 rounded-3xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Vendas de Hoje
            </span>
            <div className="w-9 h-9 rounded-xl bg-orange-600/20 text-orange-500 border border-orange-500/30 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-white">
              {formatCurrencyBRL(todaySales)}
            </p>
            <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-400">
              <span>{todayOrders.length} pedidos hoje</span>
              <span className="text-orange-400 font-semibold">
                + {formatCurrencyBRL(todayFees)} taxas
              </span>
            </div>
          </div>
        </div>

        {/* Vendas do Mês */}
        <div className="bg-[#141417] border border-zinc-800 rounded-3xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Vendas do Mês
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-white">
              {formatCurrencyBRL(monthSales)}
            </p>
            <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-400">
              <span>{monthOrders.length} pedidos este mês</span>
              <span className="text-emerald-400 font-semibold">
                + {formatCurrencyBRL(monthFees)} taxas
              </span>
            </div>
          </div>
        </div>

        {/* Ticket Médio */}
        <div className="bg-[#141417] border border-zinc-800 rounded-3xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Ticket Médio
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-white">
              {formatCurrencyBRL(metrics.averageTicket)}
            </p>
            <p className="mt-1 text-[11px] text-zinc-400">
              Média por pedido (excluindo taxas)
            </p>
          </div>
        </div>

        {/* Total de Pedidos */}
        <div className="bg-[#141417] border border-zinc-800 rounded-3xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Total de Pedidos
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-white">{metrics.totalOrdersCount}</p>
            <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-400">
              <span>{metrics.countByModality.entrega} Entregas</span>
              <span>{metrics.countByModality.retirada} Retiradas</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Row 2: Status Breakdown strictly requested */}
      <div className="bg-[#141417] border border-zinc-800 rounded-3xl p-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2">
          <Layers className="w-4 h-4 text-orange-500" />
          Status Operacional dos Pedidos
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Novos */}
          <div className="bg-zinc-950/80 border border-orange-500/30 rounded-2xl p-4 text-center">
            <span className="text-xs font-bold text-orange-400">Pedidos Novos</span>
            <p className="text-2xl font-black text-orange-400 mt-1">
              {metrics.countByStatus.RECEBIDO}
            </p>
          </div>

          {/* Em Preparo */}
          <div className="bg-zinc-950/80 border border-yellow-500/30 rounded-2xl p-4 text-center">
            <span className="text-xs font-bold text-yellow-400">Em Preparo</span>
            <p className="text-2xl font-black text-yellow-400 mt-1">
              {metrics.countByStatus.EM_PREPARO}
            </p>
          </div>

          {/* Prontos */}
          <div className="bg-zinc-950/80 border border-blue-500/30 rounded-2xl p-4 text-center">
            <span className="text-xs font-bold text-blue-400">Prontos</span>
            <p className="text-2xl font-black text-blue-400 mt-1">
              {metrics.countByStatus.PRONTO}
            </p>
          </div>

          {/* Entregues */}
          <div className="bg-zinc-950/80 border border-emerald-500/30 rounded-2xl p-4 text-center">
            <span className="text-xs font-bold text-emerald-400">Entregues</span>
            <p className="text-2xl font-black text-emerald-400 mt-1">
              {metrics.countByStatus.ENTREGUE}
            </p>
          </div>

          {/* Retirados */}
          <div className="bg-zinc-950/80 border border-teal-500/30 rounded-2xl p-4 text-center">
            <span className="text-xs font-bold text-teal-400">Retirados</span>
            <p className="text-2xl font-black text-teal-400 mt-1">
              {metrics.countByStatus.RETIRADO}
            </p>
          </div>

          {/* Cancelados */}
          <div className="bg-zinc-950/80 border border-red-500/30 rounded-2xl p-4 text-center">
            <span className="text-xs font-bold text-red-400">Cancelados</span>
            <p className="text-2xl font-black text-red-400 mt-1">
              {metrics.countByStatus.CANCELADO}
            </p>
          </div>
        </div>
      </div>

      {/* Charts & Top Products Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart (Diário, Semanal, Mensal) */}
        <div className="lg:col-span-2 bg-[#141417] border border-zinc-800 rounded-3xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="text-base font-extrabold text-white">
                  Gráfico de Faturamento
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Separando faturamento de produtos e taxas de entrega
                </p>
              </div>

              {/* Period Tabs */}
              <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 self-start">
                <button
                  onClick={() => setChartPeriod('daily')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    chartPeriod === 'daily'
                      ? 'bg-orange-600 text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Hoje
                </button>
                <button
                  onClick={() => setChartPeriod('weekly')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    chartPeriod === 'weekly'
                      ? 'bg-orange-600 text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Semanal
                </button>
                <button
                  onClick={() => setChartPeriod('monthly')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    chartPeriod === 'monthly'
                      ? 'bg-orange-600 text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Mensal
                </button>
              </div>
            </div>

            {/* Visual Bar Chart */}
            <div className="h-60 flex items-end gap-3 sm:gap-6 pt-6 pb-2 border-b border-zinc-800">
              {activePoints.map((p, idx) => {
                const total = p.produtos + p.taxa;
                const heightPercent = maxVal > 0 ? Math.min(100, (total / maxVal) * 100) : 5;
                const prodPercent = total > 0 ? (p.produtos / total) * 100 : 80;

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    <div className="text-[10px] text-zinc-400 opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                      {formatCurrencyBRL(total)}
                    </div>
                    <div
                      className="w-full max-w-[48px] rounded-t-xl overflow-hidden flex flex-col justify-end bg-zinc-900 border border-zinc-800 group-hover:border-orange-500/50 transition-all"
                      style={{ height: `${Math.max(12, heightPercent)}%` }}
                    >
                      {/* Products bar */}
                      <div
                        className="w-full bg-orange-600 group-hover:bg-orange-500 transition-colors"
                        style={{ height: `${prodPercent}%` }}
                        title={`Produtos: ${formatCurrencyBRL(p.produtos)}`}
                      />
                      {/* Delivery fee bar */}
                      <div
                        className="w-full bg-emerald-600 group-hover:bg-emerald-500 transition-colors"
                        style={{ height: `${100 - prodPercent}%` }}
                        title={`Taxas de Entrega: ${formatCurrencyBRL(p.taxa)}`}
                      />
                    </div>
                    <span className="text-[11px] font-semibold text-zinc-400">{p.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chart Legend */}
          <div className="flex items-center justify-center gap-6 pt-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-600" />
              <span className="text-zinc-300">Venda de Produtos</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-600" />
              <span className="text-zinc-300">Taxas de Entrega</span>
            </div>
          </div>
        </div>

        {/* Top Selling Products */}
        <div className="bg-[#141417] border border-zinc-800 rounded-3xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-orange-500" />
              Produtos Mais Vendidos
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">Ranking por quantidade de unidades</p>

            <div className="mt-4 space-y-3">
              {metrics.topSellingProducts.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-500">
                  Aguardando os primeiros pedidos para calcular o ranking.
                </div>
              ) : (
                metrics.topSellingProducts.slice(0, 6).map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-orange-600/20 text-orange-400 font-extrabold flex items-center justify-center text-xs flex-shrink-0">
                        #{idx + 1}
                      </span>
                      <span className="font-bold text-zinc-200 truncate">{item.name}</span>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <span className="font-extrabold text-white block">
                        {item.quantity} un
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        {formatCurrencyBRL(item.revenue)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-800/80 text-center">
            <span className="text-[11px] text-zinc-400">
              Total consolidado em produtos: <strong className="text-white">{formatCurrencyBRL(metrics.productSalesRevenue)}</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
