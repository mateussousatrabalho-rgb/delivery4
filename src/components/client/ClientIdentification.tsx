/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Truck, Store, MapPin, User, Phone, CheckCircle2, AlertCircle } from 'lucide-react';
import { OrderModality, ClientData } from '../../utils/orderRules.ts';

interface Props {
  clientData: ClientData;
  onChange: (updated: Partial<ClientData>) => void;
  onProceed: () => void;
}

export const ClientIdentification: React.FC<Props> = ({
  clientData,
  onChange,
  onProceed,
}) => {
  const isEntrega = clientData.modality === 'ENTREGA';
  const isRetirada = clientData.modality === 'RETIRADA';

  const isFormValid =
    clientData.name.trim().length >= 2 &&
    clientData.phone.replace(/\D/g, '').length >= 8 &&
    (!isEntrega ||
      (Boolean(clientData.street?.trim()) && Boolean(clientData.neighborhood?.trim())));

  return (
    <section className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm">
      <div className="border-b border-zinc-800 pb-5 mb-6">
        <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl bg-orange-600 text-white flex items-center justify-center text-sm font-bold shadow-md shadow-orange-600/30">
            1
          </span>
          Como você deseja receber seu pedido?
        </h2>
        <p className="text-sm text-zinc-400 mt-1">
          Informe seus dados para identificarmos o pedido com rapidez. Não precisa criar conta ou baixar aplicativo.
        </p>
      </div>

      {/* Select Modality Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <button
          type="button"
          onClick={() => onChange({ modality: 'ENTREGA' })}
          className={`flex items-start gap-4 p-5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
            isEntrega
              ? 'bg-orange-950/40 border-orange-500 ring-2 ring-orange-500/30 shadow-lg shadow-orange-500/10'
              : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-300'
          }`}
        >
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isEntrega ? 'bg-orange-600 text-white shadow-md' : 'bg-zinc-800 text-zinc-400'
            }`}
          >
            <Truck className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-base sm:text-lg text-white">
                1. Entrega em Domicílio
              </span>
              {isEntrega && <CheckCircle2 className="w-5 h-5 text-orange-500" />}
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Entregamos na sua casa no Jardim do Ingá e proximidades. Taxa combinada pelo WhatsApp após envio da sua localização.
            </p>
            <span className="inline-block mt-2 text-xs font-semibold px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
              Taxa a confirmar pelo WhatsApp
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onChange({ modality: 'RETIRADA' })}
          className={`flex items-start gap-4 p-5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
            isRetirada
              ? 'bg-orange-950/40 border-orange-500 ring-2 ring-orange-500/30 shadow-lg shadow-orange-500/10'
              : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-300'
          }`}
        >
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isRetirada ? 'bg-orange-600 text-white shadow-md' : 'bg-zinc-800 text-zinc-400'
            }`}
          >
            <Store className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-base sm:text-lg text-white">
                2. Retirada no Restaurante
              </span>
              {isRetirada && <CheckCircle2 className="w-5 h-5 text-orange-500" />}
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Retire diretamente no balcão do restaurante no Jardim do Ingá assim que estiver pronto.
            </p>
            <span className="inline-block mt-2 text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Sem taxa de entrega (R$ 0,00)
            </span>
          </div>
        </button>
      </div>

      {/* Customer Identification Fields */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-orange-500" />
              Seu Nome Completo *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Carlos Silva"
              value={clientData.name}
              onChange={(e) => onChange({ name: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-orange-500" />
              WhatsApp / Telefone com DDD *
            </label>
            <input
              type="tel"
              required
              placeholder="Ex: (61) 98765-4321"
              value={clientData.phone}
              onChange={(e) => onChange({ phone: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition"
            />
          </div>
        </div>

        {/* Address Fields - ONLY IF ENTREGA */}
        {isEntrega ? (
          <div className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-5 space-y-4 mt-4">
            <div className="flex items-center gap-2 text-orange-400 text-sm font-bold">
              <MapPin className="w-4 h-4" />
              <span>Endereço de Entrega (Jardim do Ingá e Região)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Rua / Avenida / Quadra *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Rua 14 ou Quadra 22 Lote 15"
                  value={clientData.street || ''}
                  onChange={(e) => onChange({ street: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-700 focus:border-orange-500 rounded-xl px-3.5 py-2.5 text-white text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Número
                </label>
                <input
                  type="text"
                  placeholder="Ex: 45 ou S/N"
                  value={clientData.number || ''}
                  onChange={(e) => onChange({ number: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-700 focus:border-orange-500 rounded-xl px-3.5 py-2.5 text-white text-sm outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Bairro *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Jardim do Ingá"
                  value={clientData.neighborhood || ''}
                  onChange={(e) => onChange({ neighborhood: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-700 focus:border-orange-500 rounded-xl px-3.5 py-2.5 text-white text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Complemento
                </label>
                <input
                  type="text"
                  placeholder="Ex: Casa 02, Bloco B, Fundos"
                  value={clientData.complement || ''}
                  onChange={(e) => onChange({ complement: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-700 focus:border-orange-500 rounded-xl px-3.5 py-2.5 text-white text-sm outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Ponto de Referência
              </label>
              <input
                type="text"
                placeholder="Ex: Próximo à padaria central ou em frente à praça"
                value={clientData.reference || ''}
                onChange={(e) => onChange({ reference: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-700 focus:border-orange-500 rounded-xl px-3.5 py-2.5 text-white text-sm outline-none"
              />
            </div>

            <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 text-xs text-orange-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-orange-400 mt-0.5" />
              <span>
                <strong>Atenção:</strong> Para entrega, a taxa não é calculada automaticamente. Ao finalizar, você enviará sua localização pelo WhatsApp para o restaurante confirmar o valor exato da entrega.
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-4 text-xs text-zinc-400 flex items-center gap-3">
            <Store className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <span>
              <strong>Retirada no Balcão:</strong> Nenhum endereço é necessário. Taxa de entrega é automaticamente R$ 0,00. Avisaremos pelo WhatsApp assim que o pedido estiver pronto para retirada.
            </span>
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={onProceed}
          disabled={!isFormValid}
          className={`font-bold px-6 py-3.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-lg ${
            isFormValid
              ? 'bg-orange-600 hover:bg-orange-500 text-white shadow-orange-600/30'
              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
          }`}
        >
          <span>Continuar para o Cardápio</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </section>
  );
};
