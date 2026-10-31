/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  CheckCircle,
  Clock,
  MapPin,
  MessageCircle,
  Truck,
  Store,
  Printer,
  ChevronRight,
  RotateCcw,
  Copy,
  Check,
} from 'lucide-react';
import {
  Order,
  formatCurrencyBRL,
  formatOrderWhatsAppMessage,
} from '../../utils/orderRules.ts';
import { RestaurantSettings } from '../../../server/db';

interface Props {
  order: Order;
  settings: RestaurantSettings;
  onNewOrder: () => void;
}

export const ClientSuccess: React.FC<Props> = ({ order, settings, onNewOrder }) => {
  const [copied, setCopied] = useState(false);
  const isEntrega = order.modality === 'ENTREGA';
  const cleanPhone = settings.whatsappNumber.replace(/\D/g, '');

  // Complete WhatsApp message with order number and all details
  const locationMessage = formatOrderWhatsAppMessage(order, {
    intent: 'LOCALIZACAO',
    restaurantName: settings.restaurantName,
  });
  const trackingMessage = formatOrderWhatsAppMessage(order, {
    intent: 'ACOMPANHAR',
    restaurantName: settings.restaurantName,
  });

  const whatsappLocationUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(locationMessage)}`;
  const whatsappTrackingUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(trackingMessage)}`;

  const handleCopyOrderInfo = async () => {
    try {
      await navigator.clipboard.writeText(locationMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  };

  return (
    <section className="max-w-2xl mx-auto py-8 px-4 animate-fadeIn">
      <div className="bg-[#121214] border border-zinc-800 rounded-3xl p-6 sm:p-10 shadow-2xl text-center text-white relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-orange-600/10 blur-3xl pointer-events-none" />

        {/* Success Icon */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-emerald-500/10 border-2 border-emerald-500/30 rounded-3xl mx-auto flex items-center justify-center text-emerald-400 mb-6 shadow-xl shadow-emerald-500/10">
          <CheckCircle className="w-12 h-12 sm:w-14 sm:h-14 stroke-[2.2]" />
        </div>

        {/* Titles strictly required */}
        <span className="inline-block px-3.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 mb-3 uppercase tracking-wider">
          Pedido Registrado
        </span>
        <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
          PEDIDO RECEBIDO COM SUCESSO!
        </h2>
        <p className="text-base sm:text-lg font-bold text-orange-400 mt-2">
          SEU PEDIDO ESTÁ EM PREPARO.
        </p>

        {/* Order Number Highlight */}
        <div className="my-8 bg-zinc-950 border-2 border-orange-500/30 rounded-2xl p-6 shadow-inner relative">
          <p className="text-xs uppercase font-extrabold tracking-widest text-zinc-400">
            NÚMERO DO PEDIDO
          </p>
          <p className="text-4xl sm:text-5xl font-black text-white mt-1 tracking-wider text-orange-500">
            #{order.formattedNumber}
          </p>
          <div className="flex items-center justify-center gap-2 mt-3 text-xs text-zinc-400">
            <Clock className="w-4 h-4 text-orange-500" />
            <span>
              {new Date(order.createdAt).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
              {' • '}
              {order.clientName}
            </span>
          </div>

          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-zinc-900 border border-zinc-800 text-zinc-300">
            <Printer className="w-3.5 h-3.5 text-orange-400" />
            <span>Comanda enviada automaticamente à impressora Epson</span>
          </div>
        </div>

        {/* Dynamic Condition: Entrega vs Retirada */}
        {isEntrega ? (
          <div className="space-y-6 text-left">
            <div className="bg-orange-950/40 border border-orange-500/30 rounded-2xl p-5 text-sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center flex-shrink-0 shadow-md">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">
                    Envio da Localização para Taxa de Entrega
                  </h3>
                  <p className="text-zinc-300 mt-1.5 leading-relaxed text-xs sm:text-sm">
                    Por favor, informe sua localização pelo WhatsApp para que possamos verificar sua localização e informar o valor da taxa de entrega.
                  </p>
                </div>
              </div>
            </div>

            {/* Buttons for Entrega */}
            <div className="space-y-3">
              <a
                href={whatsappLocationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm sm:text-base flex items-center justify-center gap-3 transition-all shadow-xl shadow-emerald-600/30 cursor-pointer active:scale-98 text-center"
              >
                <MessageCircle className="w-6 h-6 fill-white flex-shrink-0" />
                <span>ENVIAR LOCALIZAÇÃO E DADOS DO PEDIDO (# {order.formattedNumber})</span>
              </a>

              <a
                href={whatsappTrackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 px-6 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer text-center"
              >
                <MessageCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>ACOMPANHAR PEDIDO #{order.formattedNumber} NO WHATSAPP</span>
              </a>

              <button
                type="button"
                onClick={handleCopyOrderInfo}
                className="w-full py-2.5 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white font-medium text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-bold">Informações completas do pedido copiadas!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar texto com todas as informações do pedido</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 text-left">
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 text-sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-md">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">
                    Retirada no Restaurante
                  </h3>
                  <p className="text-zinc-300 mt-1.5 leading-relaxed text-xs sm:text-sm">
                    Seu pedido está sendo preparado. Aguarde a confirmação de que está pronto para retirada.
                  </p>
                  <p className="text-xs text-emerald-400 font-semibold mt-2">
                    Endereço para retirada: {settings.fullAddress}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              <a
                href={whatsappTrackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm sm:text-base flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-600/20 text-center"
              >
                <MessageCircle className="w-5 h-5 fill-white flex-shrink-0" />
                <span>ACOMPANHAR PEDIDO #{order.formattedNumber} NO WHATSAPP</span>
              </a>

              <button
                type="button"
                onClick={handleCopyOrderInfo}
                className="w-full py-2.5 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white font-medium text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-bold">Informações completas do pedido copiadas!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar texto com todas as informações do pedido</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Order Items Summary */}
        <div className="mt-8 pt-6 border-t border-zinc-800 text-left">
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
            Resumo dos Itens
          </h4>
          <div className="space-y-2">
            {order.items.map((it, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs py-1.5 border-b border-zinc-900"
              >
                <span className="text-zinc-200">
                  <strong className="text-orange-400">{it.quantity}x</strong> {it.name}
                </span>
                <span className="font-semibold text-zinc-300">
                  {formatCurrencyBRL(it.price * it.quantity)}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-between text-sm font-bold pt-2 border-t border-zinc-800 text-white">
            <span>Subtotal:</span>
            <span>{formatCurrencyBRL(order.subtotal)}</span>
          </div>
        </div>

        {/* Make another order button */}
        <div className="mt-8 pt-6 border-t border-zinc-800">
          <button
            onClick={onNewOrder}
            className="text-xs text-zinc-400 hover:text-white inline-flex items-center gap-1.5 transition cursor-pointer py-2 px-4 rounded-xl hover:bg-zinc-900"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Fazer outro pedido no cardápio</span>
          </button>
        </div>
      </div>
    </section>
  );
};
