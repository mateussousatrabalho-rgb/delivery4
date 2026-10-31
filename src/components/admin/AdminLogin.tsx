/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Lock, ShieldCheck, KeyRound, AlertCircle } from 'lucide-react';
import { RestaurantSettings } from '../../../server/db';

interface Props {
  settings: RestaurantSettings;
  onLoginSuccess: (token: string) => void;
  onBackToMenu?: () => void;
}

export const AdminLogin: React.FC<Props> = ({ settings, onLoginSuccess, onBackToMenu }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.success) {
        onLoginSuccess(data.token);
      } else {
        setError(data.error || 'Senha incorreta.');
      }
    } catch {
      setError('Erro ao autenticar. Verifique a conexão com o servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0d0e] flex items-center justify-center p-4 text-white">
      <div className="w-full max-w-md bg-[#161618] border border-zinc-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-orange-600/10 blur-3xl pointer-events-none" />

        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-orange-600/20 border border-orange-500/30 text-orange-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-600/10">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-white">Área Administrativa</h1>
          <p className="text-xs text-zinc-400 mt-1">
            {settings.restaurantName} • Painel de Gestão e Cozinha
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-950/60 border border-red-500/40 rounded-2xl p-4 text-xs text-red-200 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-orange-500" />
              Senha de Acesso do Restaurante
            </label>
            <input
              type="password"
              required
              autoFocus
              placeholder="Digite a senha de administrador"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-2xl px-4 py-3.5 text-white text-sm outline-none transition"
            />
            <p className="text-[11px] text-zinc-500 mt-2">
              Senha configurada: <span className="font-mono text-orange-400 font-bold">vitim2026</span>
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-600 font-black text-sm text-white shadow-xl shadow-orange-600/30 transition cursor-pointer flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span>Validando acesso...</span>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                <span>Entrar no Painel</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-zinc-800 text-center space-y-3">
          <p className="text-[11px] text-zinc-500">
            Acesso restrito para funcionários e operadores do caixa.
          </p>
          {onBackToMenu && (
            <button
              type="button"
              onClick={onBackToMenu}
              className="text-xs text-orange-400 hover:text-orange-300 font-semibold underline underline-offset-4 cursor-pointer"
            >
              ← Voltar ao Cardápio dos Clientes
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
