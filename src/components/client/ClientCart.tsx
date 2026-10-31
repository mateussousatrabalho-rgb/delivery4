/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Trash2,
  Plus,
  Minus,
  Truck,
  Store,
  AlertTriangle,
  Send,
  MessageCircle,
  FileText,
} from 'lucide-react';
import {
  OrderItem,
  ClientData,
  calculateOrderSubtotal,
  formatCurrencyBRL,
  validateOrder,
} from '../../utils/orderRules.ts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  cartItems: OrderItem[];
  clientData: ClientData;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onFinalizeOrder: (generalNotes?: string) => Promise<{ success: boolean; errors?: string[] } | void>;
  isSubmitting: boolean;
}

export const ClientCart: React.FC<Props> = ({
  isOpen,
  onClose,
  cartItems,
  clientData,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onFinalizeOrder,
  isSubmitting,
}) => {
  const [generalNotes, setGeneralNotes] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  if (!isOpen) return null;

  const subtotal = calculateOrderSubtotal(cartItems);
  const isEntrega = clientData.modality === 'ENTREGA';

  const handleFinalize = async () => {
    setValidationErrors([]);
    const validation = validateOrder(
      {
        name: clientData.name,
        phone: clientData.phone,
        modality: clientData.modality,
        street: clientData.street,
        neighborhood: clientData.neighborhood,
      },
      cartItems
    );

    if (!validation.valid) {
      setValidationErrors(validation.errors);
      return;
    }

    const res = await onFinalizeOrder(generalNotes);
    if (res && !res.success && res.errors) {
      setValidationErrors(res.errors);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/80 backdrop-blur-sm flex justify-end animate-fadeIn">
      <div className="w-full max-w-md bg-[#121214] border-l border-zinc-800 h-full flex flex-col justify-between shadow-2xl text-white">
        {/* Cart Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600/20 text-orange-500 border border-orange-500/30 flex items-center justify-center font-bold">
              {cartItems.reduce((acc, i) => acc + i.quantity, 0)}
            </div>
            <div>
              <h2 className="font-black text-lg text-white">Seu Carrinho</h2>
              <p className="text-xs text-zinc-400">Revise os itens e modalidade</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar carrinho"
            className="w-9 h-9 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cart Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Client & Delivery Info Snapshot */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-xs space-y-2">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="font-bold text-zinc-300">Cliente:</span>
              <span className="text-white font-semibold">
                {clientData.name || '(Nome não informado)'}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="font-bold text-zinc-300">Modalidade:</span>
              <span className="inline-flex items-center gap-1 font-bold text-orange-400">
                {isEntrega ? (
                  <>
                    <Truck className="w-3.5 h-3.5" /> Entrega
                  </>
                ) : (
                  <>
                    <Store className="w-3.5 h-3.5" /> Retirada no Restaurante
                  </>
                )}
              </span>
            </div>

            {isEntrega ? (
              <div className="pt-1 text-zinc-400">
                <span className="font-bold text-zinc-300 block mb-0.5">Endereço:</span>
                <p className="text-zinc-300">
                  {clientData.street
                    ? `${clientData.street}, Nº ${clientData.number || 'S/N'} - ${clientData.neighborhood}`
                    : 'Endereço pendente'}
                </p>
                {clientData.complement && (
                  <p className="text-[11px] text-zinc-400">Compl: {clientData.complement}</p>
                )}
                {clientData.reference && (
                  <p className="text-[11px] text-zinc-400">Ref: {clientData.reference}</p>
                )}
              </div>
            ) : (
              <div className="pt-1 text-emerald-400 flex items-center gap-1.5 font-medium">
                <Store className="w-4 h-4" />
                <span>Retirada no balcão (Jardim do Ingá, Luziânia-GO)</span>
              </div>
            )}
          </div>

          {/* Cart Items List */}
          {cartItems.length === 0 ? (
            <div className="py-12 text-center text-zinc-400">
              <p className="font-semibold text-sm">Seu carrinho está vazio.</p>
              <p className="text-xs text-zinc-500 mt-1">
                Adicione porções, burgers ou bebidas do cardápio!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
                <span className="font-bold uppercase tracking-wider">Produtos Escolhidos</span>
                <button
                  type="button"
                  onClick={onClearCart}
                  className="text-red-400 hover:text-red-300 flex items-center gap-1 transition cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" /> Limpar tudo
                </button>
              </div>

              {cartItems.map((item) => (
                <div
                  key={item.productId}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5 space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h4 className="font-bold text-sm text-white leading-tight">
                        {item.name}
                      </h4>
                      <span className="text-xs text-orange-400 font-extrabold block mt-0.5">
                        {formatCurrencyBRL(item.price * item.quantity)}
                      </span>
                    </div>

                    <button
                      type="button"
                      aria-label={`Remover ${item.name}`}
                      onClick={() => onRemoveItem(item.productId)}
                      className="text-zinc-500 hover:text-red-400 transition cursor-pointer p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {item.notes && (
                    <div className="bg-zinc-950 px-2.5 py-1.5 rounded-lg text-[11px] text-zinc-400 border border-zinc-800/80">
                      <span className="font-semibold text-orange-400">Obs:</span> {item.notes}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-zinc-500">
                      {item.quantity} x {formatCurrencyBRL(item.price)}
                    </span>

                    <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl p-0.5">
                      <button
                        type="button"
                        aria-label={`Diminuir ${item.name}`}
                        onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}
                        className="w-6 h-6 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 flex items-center justify-center transition cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold text-white px-1.5">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label={`Aumentar ${item.name}`}
                        onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
                        className="w-6 h-6 rounded-lg bg-orange-600 hover:bg-orange-500 text-white flex items-center justify-center transition cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* General Order Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-orange-500" />
              Observações gerais do pedido:
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Não tocar campainha, trocar ponto do burger, enviar sachês extras..."
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-orange-500 rounded-xl p-3 text-xs text-white placeholder-zinc-500 outline-none"
            />
          </div>

          {/* Important Payment Notice (Requisito 2.4) */}
          <div className="bg-orange-950/40 border border-orange-500/30 rounded-2xl p-3.5 text-xs text-orange-200 flex items-start gap-2.5">
            <MessageCircle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-white">Forma de Pagamento e Entrega</p>
              <p className="text-zinc-300 mt-0.5 leading-relaxed">
                Forma de pagamento e valor da entrega serão combinados diretamente pelo WhatsApp.
              </p>
            </div>
          </div>

          {/* Validation Errors Box */}
          {validationErrors.length > 0 && (
            <div className="bg-red-950/50 border border-red-500/40 rounded-2xl p-3.5 text-xs text-red-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-red-400">
                <AlertTriangle className="w-4 h-4" />
                <span>Por favor, corrija os seguintes itens:</span>
              </div>
              <ul className="list-disc pl-5 space-y-0.5 text-zinc-300">
                {validationErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Cart Footer: Subtotal, Delivery Fee, Total, Finalize Button */}
        <div className="p-5 border-t border-zinc-800 bg-zinc-950 space-y-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-zinc-400">
              <span>Subtotal dos produtos:</span>
              <span className="font-semibold text-white">{formatCurrencyBRL(subtotal)}</span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-400">Taxa de entrega:</span>
              {isEntrega ? (
                <span className="font-bold text-orange-400 bg-orange-950/60 border border-orange-500/20 px-2 py-0.5 rounded-md">
                  Taxa de entrega a confirmar pelo WhatsApp
                </span>
              ) : (
                <span className="font-bold text-emerald-400">
                  Retirada no restaurante — sem taxa de entrega (R$ 0,00)
                </span>
              )}
            </div>

            <div className="border-t border-zinc-800 pt-2 flex justify-between items-baseline">
              <span className="text-base font-bold text-white">Total Final:</span>
              <div className="text-right">
                {isEntrega ? (
                  <div>
                    <span className="text-base font-black text-orange-400">
                      {formatCurrencyBRL(subtotal)} + Taxa
                    </span>
                    <span className="block text-[10px] text-zinc-400">
                      (Taxa confirmada no WhatsApp)
                    </span>
                  </div>
                ) : (
                  <span className="text-lg font-black text-emerald-400">
                    {formatCurrencyBRL(subtotal)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleFinalize}
            disabled={isSubmitting || cartItems.length === 0}
            className={`w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xl ${
              isSubmitting || cartItems.length === 0
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white shadow-orange-600/30 active:scale-98'
            }`}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Enviando pedido e acionando comanda...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Send className="w-5 h-5" />
                FINALIZAR PEDIDO
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
