/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Bell,
  BellOff,
  Printer,
  ShoppingBag,
  BarChart3,
  UtensilsCrossed,
  History,
  DollarSign,
  Settings,
  LogOut,
  Radio,
  Eye,
} from 'lucide-react';
import { RestaurantSettings } from '../../../server/db';

export type AdminTab =
  | 'live-orders'
  | 'dashboard'
  | 'menu'
  | 'history'
  | 'financial'
  | 'printer';

interface Props {
  settings: RestaurantSettings;
  activeTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  activeOrdersCount: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onLogout: () => void;
  onViewClientMenu?: () => void;
}

export const AdminHeader: React.FC<Props> = ({
  settings,
  activeTab,
  onSelectTab,
  activeOrdersCount,
  soundEnabled,
  onToggleSound,
  onLogout,
  onViewClientMenu,
}) => {
  const tabs: Array<{ id: AdminTab; label: string; icon: React.ReactNode; badge?: number }> = [
    {
      id: 'live-orders',
      label: 'Pedidos em Tempo Real',
      icon: <ShoppingBag className="w-4 h-4" />,
      badge: activeOrdersCount,
    },
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      id: 'menu',
      label: 'Cardápio',
      icon: <UtensilsCrossed className="w-4 h-4" />,
    },
    {
      id: 'history',
      label: 'Histórico',
      icon: <History className="w-4 h-4" />,
    },
    {
      id: 'financial',
      label: 'Financeiro',
      icon: <DollarSign className="w-4 h-4" />,
    },
    {
      id: 'printer',
      label: 'Impressora Epson',
      icon: <Printer className="w-4 h-4" />,
    },
  ];

  return (
    <header className="bg-[#121214] border-b border-zinc-800 text-white sticky top-0 z-40 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
          {/* Logo & Restaurant Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-black border border-orange-500 text-white flex items-center justify-center font-black text-xl shadow-md shadow-orange-600/20 flex-shrink-0 overflow-hidden p-0.5">
              <img
                src={settings.logoUrl || '/assets/aistudio/IMG_0848-Photoroom_78eae265.png'}
                alt={settings.restaurantName}
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-base sm:text-lg tracking-tight">
                  {settings.restaurantName}
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                  Painel Administrativo
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                {settings.neighborhood}, {settings.cityState}
              </p>
            </div>
          </div>

          {/* Quick Actions (Sound & Logout) */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Sound alert toggle */}
            <button
              onClick={onToggleSound}
              title={soundEnabled ? 'Alerta sonoro ativado' : 'Alerta sonoro desativado'}
              aria-label={soundEnabled ? 'Desativar som de novos pedidos' : 'Ativar som de novos pedidos'}
              className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
                soundEnabled
                  ? 'bg-zinc-900 border-zinc-700 text-orange-400 hover:bg-zinc-800'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {soundEnabled ? (
                <>
                  <Bell className="w-4 h-4 fill-orange-500/20" />
                  <span className="hidden md:inline">Som Ativo</span>
                </>
              ) : (
                <>
                  <BellOff className="w-4 h-4" />
                  <span className="hidden md:inline">Sem Som</span>
                </>
              )}
            </button>

            {/* View Client Menu Button */}
            {onViewClientMenu && (
              <button
                onClick={onViewClientMenu}
                title="Visualizar Cardápio dos Clientes"
                className="p-2.5 rounded-xl bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/30 text-orange-400 hover:text-white transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
              >
                <Eye className="w-4 h-4" />
                <span className="hidden sm:inline">Ver Cardápio</span>
              </button>
            )}

            {/* Logout */}
            <button
              onClick={onLogout}
              title="Sair do painel administrativo"
              aria-label="Sair do painel administrativo"
              className="p-2.5 rounded-xl bg-zinc-900 hover:bg-red-950/60 border border-zinc-800 hover:border-red-500/40 text-zinc-400 hover:text-red-400 transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 overflow-x-auto pb-2 sm:pb-3 scrollbar-none border-t border-zinc-800/60 pt-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition cursor-pointer relative ${
                  isActive
                    ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {typeof tab.badge === 'number' && tab.badge > 0 && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      isActive ? 'bg-white text-orange-600' : 'bg-orange-600 text-white animate-pulse'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
