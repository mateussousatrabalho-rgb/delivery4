/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { MapPin, Clock, Phone, Flame } from 'lucide-react';
import { RestaurantSettings } from '../../../server/db';

interface Props {
  settings: RestaurantSettings;
  cartCount: number;
  onOpenCart: () => void;
}

export const ClientHeader: React.FC<Props> = ({ settings, cartCount, onOpenCart }) => {
  return (
    <header className="relative bg-[#111113] border-b border-zinc-800 text-white shadow-xl">
      {/* Top announcement bar */}
      <div
        className={`px-4 py-1.5 text-center text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 ${
          settings.isOpen
            ? 'bg-orange-600 text-white'
            : 'bg-zinc-900 border-b border-zinc-800 text-zinc-300'
        }`}
      >
        <Flame
          className={`w-4 h-4 ${settings.isOpen ? 'animate-pulse text-white' : 'text-orange-500'}`}
        />
        <span>
          {settings.isOpen
            ? 'Cardápio Online • Delivery Aberto • Pedidos até 23:30'
            : 'Delivery Fechado no Momento • Horário de Funcionamento: 11:45 às 23:30'}
        </span>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Logo & Brand Info */}
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-black border-2 border-orange-500 overflow-hidden flex-shrink-0 shadow-lg shadow-orange-500/10 flex items-center justify-center p-1">
              <img
                src={settings.logoUrl || '/assets/aistudio/IMG_0848-Photoroom_78eae265.png'}
                alt={settings.restaurantName}
                className="w-full h-full object-contain"
              />
            </div>

            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  {settings.restaurantName}
                </h1>
                {settings.isOpen ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    Delivery Aberto • Fecha às {settings.closeTime || '23:30'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30 shadow-sm">
                    <Clock className="w-3.5 h-3.5 text-red-400" />
                    Fechado no Momento • Abre às {settings.openTime || '11:45'}
                  </span>
                )}
              </div>

              <div className="mt-1 flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-xs text-zinc-400">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-orange-500" />
                  {settings.neighborhood}, {settings.cityState}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-orange-500" />
                  {settings.openingHours}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-orange-500" />
                  WhatsApp Oficial
                </span>
              </div>
            </div>
          </div>

          {/* Cart Quick Button (Desktop / Tablet) */}
          <button
            onClick={onOpenCart}
            aria-label="Abrir carrinho de compras"
            className="hidden sm:inline-flex items-center gap-3 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white font-bold px-5 py-3 rounded-xl shadow-lg shadow-orange-600/30 hover:shadow-orange-600/40 transition-all cursor-pointer active:scale-95"
          >
            <div className="relative">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-white text-orange-600 font-extrabold text-xs w-5 h-5 rounded-full flex items-center justify-center shadow">
                  {cartCount}
                </span>
              )}
            </div>
            <span>Ver Carrinho {cartCount > 0 && `(${cartCount})`}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
