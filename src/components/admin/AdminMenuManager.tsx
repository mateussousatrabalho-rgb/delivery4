/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Power,
  PowerOff,
  Image as ImageIcon,
  FolderPlus,
  DollarSign,
  Utensils,
} from 'lucide-react';
import { Category, Product } from '../../../server/db';
import { formatCurrencyBRL } from '../../utils/orderRules.ts';

interface Props {
  categories: Category[];
  products: Product[];
  onSaveProduct: (prod: Partial<Product>) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  onSaveCategory: (cat: Partial<Category>) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
}

export const AdminMenuManager: React.FC<Props> = ({
  categories,
  products,
  onSaveProduct,
  onDeleteProduct,
  onSaveCategory,
  onDeleteCategory,
}) => {
  const [selectedCatId, setSelectedCatId] = useState<string>('all');
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [showCatModal, setShowCatModal] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);

  const filteredProducts = products.filter((p) =>
    selectedCatId === 'all' ? true : p.categoryId === selectedCatId
  );

  const handleOpenNewProduct = () => {
    setIsNewProduct(true);
    setEditingProduct({
      categoryId: categories[0]?.id || 'cat-1',
      name: '',
      description: '',
      price: 25.0,
      imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80',
      available: true,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.name) return;
    await onSaveProduct(editingProduct);
    setEditingProduct(null);
    setIsNewProduct(false);
  };

  const handleToggleAvailable = async (prod: Product) => {
    await onSaveProduct({
      id: prod.id,
      available: !prod.available,
    });
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    await onSaveCategory({ name: newCatName.trim() });
    setNewCatName('');
    setShowCatModal(false);
  };

  return (
    <div className="space-y-6 text-white pb-12">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#141417] border border-zinc-800 p-6 rounded-3xl">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Utensils className="w-5 h-5 text-orange-500" />
            Gerenciamento do Cardápio
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Cadastre, edite preços, descrições e controle a disponibilidade dos produtos em tempo real
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowCatModal(true)}
            className="px-4 py-2.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-bold text-xs flex items-center gap-2 transition cursor-pointer"
          >
            <FolderPlus className="w-4 h-4 text-orange-400" />
            <span>Categorias ({categories.length})</span>
          </button>

          <button
            type="button"
            onClick={handleOpenNewProduct}
            className="px-5 py-2.5 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-orange-600/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Produto</span>
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedCatId('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
            selectedCatId === 'all'
              ? 'bg-orange-600 text-white'
              : 'bg-[#141417] text-zinc-400 border border-zinc-800 hover:text-white'
          }`}
        >
          Todos ({products.length})
        </button>
        {categories.map((c) => {
          const count = products.filter((p) => p.categoryId === c.id).length;
          return (
            <button
              key={c.id}
              onClick={() => setSelectedCatId(c.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                selectedCatId === c.id
                  ? 'bg-orange-600 text-white'
                  : 'bg-[#141417] text-zinc-400 border border-zinc-800 hover:text-white'
              }`}
            >
              <span>{c.name}</span>
              <span className="text-[10px] bg-zinc-800 px-1.5 py-0.2 rounded-full">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Product Table / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map((prod) => (
          <div
            key={prod.id}
            className={`bg-[#141417] border rounded-3xl p-5 flex flex-col justify-between transition-all ${
              prod.available
                ? 'border-zinc-800 hover:border-zinc-700'
                : 'border-zinc-800/60 opacity-60'
            }`}
          >
            <div>
              <div className="flex gap-4">
                <div className="w-20 h-20 rounded-2xl bg-zinc-950 overflow-hidden flex-shrink-0 border border-zinc-800">
                  <img
                    src={prod.imageUrl}
                    alt={prod.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-bold uppercase text-orange-400">
                      {categories.find((c) => c.id === prod.categoryId)?.name || 'Geral'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleAvailable(prod)}
                      title={prod.available ? 'Clique para pausar' : 'Clique para ativar'}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer ${
                        prod.available
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                      }`}
                    >
                      {prod.available ? (
                        <>
                          <Power className="w-3 h-3" /> Ativo
                        </>
                      ) : (
                        <>
                          <PowerOff className="w-3 h-3" /> Pausado
                        </>
                      )}
                    </button>
                  </div>

                  <h3 className="font-extrabold text-sm text-white mt-1 leading-snug truncate">
                    {prod.name}
                  </h3>
                  <p className="text-xs font-black text-orange-400 mt-1">
                    {formatCurrencyBRL(prod.price)}
                  </p>
                </div>
              </div>

              <p className="text-xs text-zinc-400 mt-3 line-clamp-2 leading-relaxed">
                {prod.description}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
              <span className="text-[11px] text-zinc-500">ID: {prod.id}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsNewProduct(false);
                    setEditingProduct(prod);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Pencil className="w-3 h-3 text-orange-400" />
                  <span>Editar</span>
                </button>
                {deletingProductId === prod.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteProduct(prod.id);
                        setDeletingProductId(null);
                      }}
                      className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[10px] font-bold"
                    >
                      Excluir
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingProductId(null)}
                      className="px-2 py-1 bg-zinc-800 text-zinc-400 hover:text-white rounded-lg text-[10px]"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    title="Excluir produto"
                    onClick={() => setDeletingProductId(prod.id)}
                    className="p-1.5 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-950/40 transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit / Create Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#161618] border border-zinc-800 rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="font-black text-lg text-white">
                {isNewProduct ? 'Cadastrar Novo Produto' : 'Editar Produto'}
              </h3>
              <button
                onClick={() => setEditingProduct(null)}
                className="text-zinc-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Categoria *
                </label>
                <select
                  value={editingProduct.categoryId}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, categoryId: e.target.value })
                  }
                  className="w-full bg-zinc-950 border border-zinc-700 focus:border-orange-500 rounded-xl px-3 py-2.5 text-white text-xs outline-none"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Nome do Produto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Hambúrguer Artesanal Supremo"
                  value={editingProduct.name || ''}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, name: e.target.value })
                  }
                  className="w-full bg-zinc-950 border border-zinc-700 focus:border-orange-500 rounded-xl px-3 py-2.5 text-white text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Preço em Reais (R$) *
                </label>
                <input
                  type="number"
                  step="0.10"
                  required
                  value={editingProduct.price || ''}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      price: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-zinc-950 border border-zinc-700 focus:border-orange-500 rounded-xl px-3 py-2.5 text-white text-xs outline-none font-bold text-orange-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Descrição Completa
                </label>
                <textarea
                  rows={3}
                  placeholder="Ingredientes, peso, ponto e acompanhamentos..."
                  value={editingProduct.description || ''}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      description: e.target.value,
                    })
                  }
                  className="w-full bg-zinc-950 border border-zinc-700 focus:border-orange-500 rounded-xl px-3 py-2 text-white text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  URL da Fotografia
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={editingProduct.imageUrl || ''}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      imageUrl: e.target.value,
                    })
                  }
                  className="w-full bg-zinc-950 border border-zinc-700 focus:border-orange-500 rounded-xl px-3 py-2 text-white text-xs outline-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="availCheck"
                  checked={editingProduct.available !== false}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      available: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500"
                />
                <label htmlFor="availCheck" className="text-xs text-zinc-300 font-bold">
                  Produto Disponível para Venda
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-lg shadow-orange-600/20"
                >
                  Salvar Produto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Manager Modal */}
      {showCatModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#161618] border border-zinc-800 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="font-black text-lg text-white">Gerenciar Categorias</h3>
              <button
                onClick={() => setShowCatModal(false)}
                className="text-zinc-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="mt-4 flex gap-2">
              <input
                type="text"
                required
                placeholder="Nova categoria..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-orange-500"
              />
              <button
                type="submit"
                className="bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition"
              >
                Adicionar
              </button>
            </form>

            <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
              {categories.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs"
                >
                  <span className="font-bold text-white">{c.name}</span>
                  {deletingCategoryId === c.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteCategory(c.id);
                          setDeletingCategoryId(null);
                        }}
                        className="px-2 py-0.5 bg-red-600 hover:bg-red-500 text-white rounded text-[10px] font-bold"
                      >
                        Excluir
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingCategoryId(null)}
                        className="px-2 py-0.5 bg-zinc-800 text-zinc-400 hover:text-white rounded text-[10px]"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      title="Excluir categoria"
                      onClick={() => setDeletingCategoryId(c.id)}
                      className="text-zinc-500 hover:text-red-400 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
