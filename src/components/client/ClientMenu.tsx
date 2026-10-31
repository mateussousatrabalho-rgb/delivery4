/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Search, Plus, Minus, Check, MessageSquare } from 'lucide-react';
import { Category, Product } from '../../../server/db';
import { OrderItem, formatCurrencyBRL } from '../../utils/orderRules.ts';

interface Props {
  categories: Category[];
  products: Product[];
  cartItems: OrderItem[];
  onAddToCart: (product: Product, quantity: number, notes?: string) => void;
  onUpdateCartQuantity: (productId: string, quantity: number) => void;
}

export const ClientMenu: React.FC<Props> = ({
  categories,
  products,
  cartItems,
  onAddToCart,
  onUpdateCartQuantity,
}) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [activeNoteInputId, setActiveNoteInputId] = useState<string | null>(null);

  // Filter products by category, search, and availability
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      if (!prod.available) return false;
      const matchCat =
        selectedCategoryId === 'all' || prod.categoryId === selectedCategoryId;
      const matchSearch =
        !searchQuery.trim() ||
        prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prod.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, selectedCategoryId, searchQuery]);

  // Map cart items for quick lookup
  const cartItemMap = useMemo(() => {
    const map = new Map<string, OrderItem>();
    for (const item of cartItems) {
      map.set(item.productId, item);
    }
    return map;
  }, [cartItems]);

  return (
    <section className="mt-8 space-y-6">
      {/* Category Pills & Search */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-4 sm:p-6 shadow-xl backdrop-blur-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-orange-600 text-white flex items-center justify-center text-sm font-bold shadow-md shadow-orange-600/30">
                2
              </span>
              Cardápio Digital
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Selecione seus itens favoritos e personalize com suas observações.
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar porções, burgers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-orange-500 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 outline-none transition"
            />
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-700">
          <button
            onClick={() => setSelectedCategoryId('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
              selectedCategoryId === 'all'
                ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20'
                : 'bg-zinc-950 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800'
            }`}
          >
            Todos os Produtos ({products.filter((p) => p.available).length})
          </button>
          {categories.map((cat) => {
            const count = products.filter(
              (p) => p.categoryId === cat.id && p.available
            ).length;
            const isSelected = selectedCategoryId === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20'
                    : 'bg-zinc-950 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800'
                }`}
              >
                <span>{cat.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-orange-800/80 text-orange-100' : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Product Grid */}
      {filteredProducts.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-12 text-center text-zinc-400">
          <p className="text-base font-semibold">Nenhum produto encontrado nesta categoria.</p>
          <p className="text-xs text-zinc-500 mt-1">Tente buscar por outro termo ou selecione outra categoria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {filteredProducts.map((product) => {
            const inCart = cartItemMap.get(product.id);
            const qtyInCart = inCart?.quantity || 0;
            const isNoteOpen = activeNoteInputId === product.id;

            return (
              <div
                key={product.id}
                className="bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700/80 rounded-3xl p-4 sm:p-5 flex flex-col justify-between transition-all shadow-xl group hover:shadow-orange-500/5"
              >
                <div>
                  <div className="flex gap-4">
                    {/* Product Photo */}
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-zinc-950 overflow-hidden flex-shrink-0 relative border border-zinc-800">
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-extrabold text-base sm:text-lg text-white leading-snug">
                        {product.name}
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                        {product.description}
                      </p>
                      <div className="mt-2.5 flex items-center justify-between">
                        <span className="text-base sm:text-lg font-black text-orange-400">
                          {formatCurrencyBRL(product.price)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Observações Input Toggle */}
                  <div className="mt-3">
                    {isNoteOpen ? (
                      <div className="space-y-1.5 animate-fadeIn">
                        <label className="text-[11px] font-bold text-zinc-400 flex items-center gap-1">
                          <MessageSquare className="w-3 h-3 text-orange-500" />
                          Observações para este item:
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: sem cebola, ponto da carne, molho à parte..."
                          value={itemNotes[product.id] || inCart?.notes || ''}
                          onChange={(e) =>
                            setItemNotes((prev) => ({
                              ...prev,
                              [product.id]: e.target.value,
                            }))
                          }
                          className="w-full bg-zinc-950 border border-zinc-800 focus:border-orange-500 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                        />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setActiveNoteInputId(product.id)}
                        className="text-[11px] text-zinc-400 hover:text-orange-400 font-semibold flex items-center gap-1 transition cursor-pointer"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>
                          {inCart?.notes
                            ? `Obs: "${inCart.notes}" (editar)`
                            : '+ Adicionar observação'}
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Add / Stepper controls */}
                <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                  <span className="text-xs text-zinc-500">
                    {qtyInCart > 0 ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> {qtyInCart} no carrinho
                      </span>
                    ) : (
                      'Disponível'
                    )}
                  </span>

                  {qtyInCart === 0 ? (
                    <button
                      type="button"
                      onClick={() =>
                        onAddToCart(product, 1, itemNotes[product.id] || undefined)
                      }
                      className="bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-orange-600/20 active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl p-1">
                      <button
                        type="button"
                        aria-label={`Diminuir quantidade de ${product.name}`}
                        onClick={() =>
                          onUpdateCartQuantity(product.id, qtyInCart - 1)
                        }
                        className="w-7 h-7 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 flex items-center justify-center transition cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-black text-white px-2">
                        {qtyInCart}
                      </span>
                      <button
                        type="button"
                        aria-label={`Aumentar quantidade de ${product.name}`}
                        onClick={() =>
                          onUpdateCartQuantity(product.id, qtyInCart + 1)
                        }
                        className="w-7 h-7 rounded-lg bg-orange-600 hover:bg-orange-500 text-white flex items-center justify-center transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
