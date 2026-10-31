/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Lock } from 'lucide-react';
import { ClientHeader } from './components/client/ClientHeader.tsx';
import { ClientIdentification } from './components/client/ClientIdentification.tsx';
import { ClientMenu } from './components/client/ClientMenu.tsx';
import { ClientCart } from './components/client/ClientCart.tsx';
import { ClientSuccess } from './components/client/ClientSuccess.tsx';

import { AdminLogin } from './components/admin/AdminLogin.tsx';
import { AdminHeader, AdminTab } from './components/admin/AdminHeader.tsx';
import { AdminDashboard } from './components/admin/AdminDashboard.tsx';
import { AdminLiveOrders } from './components/admin/AdminLiveOrders.tsx';
import { AdminMenuManager } from './components/admin/AdminMenuManager.tsx';
import { AdminHistory } from './components/admin/AdminHistory.tsx';
import { AdminFinancial } from './components/admin/AdminFinancial.tsx';
import { AdminPrinterSettings } from './components/admin/AdminPrinterSettings.tsx';

import {
  OrderItem,
  ClientData,
  Order,
  OrderStatus,
  formatEpsonReceiptText,
  calculateOrderSubtotal,
  formatCurrencyBRL,
} from './utils/orderRules.ts';
import { Category, Product, RestaurantSettings } from '../server/db';
import { audioAlert } from './services/audioAlert.ts';
import { epsonPrinter } from './services/epsonPrinter.ts';

const DEFAULT_SETTINGS: RestaurantSettings = {
  restaurantName: 'Vitim Cozinha e Bar',
  neighborhood: 'Jardim do Ingá',
  cityState: 'Luziânia - GO',
  fullAddress: 'Avenida Lucena Roriz, Qd. 65, Lt 23, Jardim do Ingá, Luziânia-GO',
  whatsappNumber: '5561999636183',
  logoUrl: '/assets/aistudio/IMG_0848-Photoroom_78eae265.png',
  printLogoUrl: '/assets/aistudio/IMG_0848-Photoroomm_42d628da.png',
  bannerUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80',
  openingHours: 'Terça a Domingo das 11:00 às 23:30',
  isOpen: true,
  paperWidth: 80,
  printerName: 'EPSON TM-T20X',
  autoPrintOnNewOrder: true,
  soundAlertEnabled: true,
  adminPasswordHash: 'inga123',
  serviceToken: 'sec-inga-print-token-2026',
};

function checkIsAdminArea(): boolean {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.toLowerCase();
  const search = window.location.search.toLowerCase();
  const hash = window.location.hash.toLowerCase();

  return (
    path.startsWith('/admin') ||
    path.includes('/admin') ||
    search.includes('area=admin') ||
    search.includes('admin=1') ||
    search.includes('admin=true') ||
    hash.includes('admin')
  );
}

export default function App() {
  // Determine area based on URL path, query parameter or hash
  const [isAdminArea, setIsAdminArea] = useState<boolean>(checkIsAdminArea);

  // Admin session state
  const [adminToken, setAdminToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('inga_admin_token');
    }
    return null;
  });
  const [adminTab, setAdminTab] = useState<AdminTab>('live-orders');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Shared Data State
  const [settings, setSettings] = useState<RestaurantSettings>(DEFAULT_SETTINGS);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  // Client Area State
  const [clientData, setClientData] = useState<ClientData>({
    name: '',
    phone: '',
    modality: 'ENTREGA',
    street: '',
    number: '',
    neighborhood: 'Jardim do Ingá',
    complement: '',
    reference: '',
  });
  const [cartItems, setCartItems] = useState<OrderItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [addedToast, setAddedToast] = useState<{ name: string } | null>(null);

  // References for live printer & audio in callbacks
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const isAdminRef = useRef(isAdminArea);
  isAdminRef.current = isAdminArea;

  // Listen to popstate or url changes
  useEffect(() => {
    const handleUrlChange = () => {
      setIsAdminArea(checkIsAdminArea());
    };
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  // Fetch initial data
  useEffect(() => {
    loadInitialData();
    setupSseConnection();
  }, []);

  const loadInitialData = async () => {
    try {
      const [settingsRes, catRes, prodRes, ordersRes] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/categories'),
        fetch('/api/products'),
        fetch('/api/orders'),
      ]);

      const [settingsData, catData, prodData, ordersData] = await Promise.all([
        settingsRes.json(),
        catRes.json(),
        prodRes.json(),
        ordersRes.json(),
      ]);

      if (settingsData.success) {
        setSettings(settingsData.settings);
        epsonPrinter.setPaperWidth(settingsData.settings.paperWidth);
        audioAlert.setEnabled(settingsData.settings.soundAlertEnabled);
        setSoundEnabled(settingsData.settings.soundAlertEnabled);
      }
      if (catData.success) setCategories(catData.categories);
      if (prodData.success) setProducts(prodData.products);
      if (ordersData.success) setOrders(ordersData.orders);
    } catch (err) {
      console.error('Error loading initial restaurant data:', err);
    }
  };

  // Real-time Server-Sent Events setup
  const setupSseConnection = () => {
    try {
      const eventSource = new EventSource('/api/events');

      eventSource.addEventListener('order:new', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          const newOrder: Order = payload.order;

          setOrders((prev) => [newOrder, ...prev.filter((o) => o.id !== newOrder.id)]);

          // If in Admin panel, trigger chime and automatic thermal print!
          if (isAdminRef.current) {
            audioAlert.playNewOrderChime();

            if (settingsRef.current.autoPrintOnNewOrder && payload.printJob) {
              const receipt = formatEpsonReceiptText(newOrder, {
                width: settingsRef.current.paperWidth,
                restaurantName: settingsRef.current.restaurantName,
              });
              epsonPrinter.printReceipt(receipt, {
                printerName: settingsRef.current.printerName,
                jobId: payload.printJob.id,
                logoUrl: settingsRef.current.printLogoUrl || '/assets/aistudio/IMG_0848-Photoroomm_42d628da.png',
              });
            }
          }
        } catch (err) {
          console.error('SSE order:new parse error:', err);
        }
      });

      eventSource.addEventListener('order:updated', (e: MessageEvent) => {
        try {
          const updated: Order = JSON.parse(e.data);
          setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
          if (completedOrder && completedOrder.id === updated.id) {
            setCompletedOrder(updated);
          }
        } catch (err) {
          console.error(err);
        }
      });

      eventSource.addEventListener('order:fee_confirmed', (e: MessageEvent) => {
        try {
          const updated: Order = JSON.parse(e.data);
          setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
          if (completedOrder && completedOrder.id === updated.id) {
            setCompletedOrder(updated);
          }
        } catch (err) {
          console.error(err);
        }
      });

      eventSource.addEventListener('products:updated', (e: MessageEvent) => {
        try {
          const updated = JSON.parse(e.data);
          setProducts(updated);
        } catch (err) {
          console.error(err);
        }
      });

      eventSource.addEventListener('categories:updated', (e: MessageEvent) => {
        try {
          const updated = JSON.parse(e.data);
          setCategories(updated);
        } catch (err) {
          console.error(err);
        }
      });

      eventSource.addEventListener('settings:updated', (e: MessageEvent) => {
        try {
          const updated = JSON.parse(e.data);
          setSettings(updated);
        } catch (err) {
          console.error(err);
        }
      });

      return () => {
        eventSource.close();
      };
    } catch (e) {
      console.error('SSE connection failed:', e);
    }
  };

  // --- CLIENT CART HANDLERS ---
  const handleAddToCart = (product: Product, quantity = 1, notes?: string) => {
    setCartItems((prev) => {
      const idx = prev.findIndex((i) => i.productId === product.id);
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = {
          ...copy[idx],
          quantity: copy[idx].quantity + quantity,
          notes: notes !== undefined ? notes : copy[idx].notes,
        };
        return copy;
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity,
          notes,
        },
      ];
    });

    // Provide visual feedback without forcing cart open
    setAddedToast({ name: product.name });
    setTimeout(() => {
      setAddedToast(null);
    }, 2800);
  };

  const handleUpdateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveCartItem(productId);
      return;
    }
    setCartItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, quantity } : i))
    );
  };

  const handleRemoveCartItem = (productId: string) => {
    setCartItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  const handleFinalizeOrder = async (generalNotes?: string) => {
    setIsSubmittingOrder(true);
    try {
      const payload = {
        clientName: clientData.name,
        clientPhone: clientData.phone,
        modality: clientData.modality,
        address:
          clientData.modality === 'ENTREGA'
            ? {
                street: clientData.street || '',
                number: clientData.number || '',
                neighborhood: clientData.neighborhood || '',
                complement: clientData.complement || '',
                reference: clientData.reference || '',
              }
            : undefined,
        items: cartItems,
        generalNotes,
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success && data.order) {
        setCompletedOrder(data.order);
        setCartItems([]);
        setIsCartOpen(false);

        // Optimistically add to local state
        setOrders((prev) => [data.order, ...prev.filter((o) => o.id !== data.order.id)]);
        return { success: true };
      } else {
        return {
          success: false,
          errors: data.errors || ['Não foi possível finalizar o pedido. Verifique os dados.'],
        };
      }
    } catch {
      return {
        success: false,
        errors: ['Erro ao enviar pedido para o restaurante. Verifique sua conexão.'],
      };
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // --- ADMIN HANDLERS ---
  const handleAdminLoginSuccess = (token: string) => {
    setAdminToken(token);
    sessionStorage.setItem('inga_admin_token', token);
  };

  const handleAdminLogout = () => {
    setAdminToken(null);
    sessionStorage.removeItem('inga_admin_token');
  };

  const handleToggleSound = () => {
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    audioAlert.setEnabled(nextVal);
  };

  const handleUpdateOrderStatus = async (
    orderId: string,
    status: OrderStatus,
    note?: string
  ) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, note }),
      });
      const data = await res.json();
      if (data.success && data.order) {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? data.order : o)));
      }
    } catch (e) {
      console.error('Failed to update status:', e);
    }
  };

  const handleSetDeliveryFee = async (orderId: string, fee: number) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/delivery-fee`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fee }),
      });
      const data = await res.json();
      if (data.success && data.order) {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? data.order : o)));
      }
    } catch (e) {
      console.error('Failed to set delivery fee:', e);
    }
  };

  const handleReprintOrder = async (orderId: string) => {
    try {
      await fetch(`/api/orders/${orderId}/reprint`, { method: 'POST' });
    } catch (e) {
      console.error('Failed to queue reprint:', e);
    }
  };

  const handleSaveProduct = async (prod: Partial<Product>) => {
    try {
      const method = prod.id ? 'PUT' : 'POST';
      const url = prod.id ? `/api/products/${prod.id}` : '/api/products';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prod),
      });
      const data = await res.json();
      if (data.success && data.product) {
        setProducts((prev) => {
          const idx = prev.findIndex((p) => p.id === data.product.id);
          if (idx !== -1) {
            const copy = [...prev];
            copy[idx] = data.product;
            return copy;
          }
          return [...prev, data.product];
        });
      }
    } catch (e) {
      console.error('Failed to save product:', e);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await fetch(`/api/products/${id}`, { method: 'DELETE' });
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      console.error('Failed to delete product:', e);
    }
  };

  const handleSaveCategory = async (cat: Partial<Category>) => {
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cat),
      });
      const data = await res.json();
      if (data.success && data.category) {
        setCategories((prev) => [...prev, data.category]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateSettings = async (updates: Partial<RestaurantSettings>) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings(data.settings);
        audioAlert.setEnabled(data.settings.soundAlertEnabled);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Switcher navigation for preview / testing
  const navigateTo = (area: 'cliente' | 'admin') => {
    if (area === 'admin') {
      try {
        window.history.pushState({}, '', '/?area=admin');
      } catch {}
      setIsAdminArea(true);
    } else {
      try {
        window.history.pushState({}, '', '/');
      } catch {}
      setIsAdminArea(false);
    }
  };

  // --- RENDER AREA 2: ADMIN AREA ---
  if (isAdminArea) {
    if (!adminToken) {
      return (
        <div>
          <AdminLogin
            settings={settings}
            onLoginSuccess={handleAdminLoginSuccess}
            onBackToMenu={() => navigateTo('cliente')}
          />
        </div>
      );
    }

    const activeOrdersCount = orders.filter(
      (o) => !['ENTREGUE', 'RETIRADO', 'CANCELADO'].includes(o.status)
    ).length;

    return (
      <div className="min-h-screen bg-[#0d0d0f] text-zinc-100 flex flex-col font-sans selection:bg-orange-600 selection:text-white">
        <AdminHeader
          settings={settings}
          activeTab={adminTab}
          onSelectTab={setAdminTab}
          activeOrdersCount={activeOrdersCount}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
          onLogout={handleAdminLogout}
          onViewClientMenu={() => navigateTo('cliente')}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
          {adminTab === 'live-orders' && (
            <AdminLiveOrders
              orders={orders}
              settings={settings}
              onUpdateStatus={handleUpdateOrderStatus}
              onSetDeliveryFee={handleSetDeliveryFee}
              onReprintOrder={handleReprintOrder}
            />
          )}

          {adminTab === 'dashboard' && (
            <AdminDashboard
              orders={orders}
              onNavigateToLive={() => setAdminTab('live-orders')}
            />
          )}

          {adminTab === 'menu' && (
            <AdminMenuManager
              categories={categories}
              products={products}
              onSaveProduct={handleSaveProduct}
              onDeleteProduct={handleDeleteProduct}
              onSaveCategory={handleSaveCategory}
              onDeleteCategory={handleDeleteCategory}
            />
          )}

          {adminTab === 'history' && (
            <AdminHistory
              orders={orders}
              settings={settings}
              onReprintOrder={handleReprintOrder}
            />
          )}

          {adminTab === 'financial' && (
            <AdminFinancial
              orders={orders}
              categories={categories}
              products={products}
            />
          )}

          {adminTab === 'printer' && (
            <AdminPrinterSettings
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
            />
          )}
        </main>
      </div>
    );
  }

  // --- RENDER AREA 1: CLIENT AREA (LINK 1) ---
  // Notice: Absolutely NO administrative access, buttons or menus are displayed here (Requisito 2).
  const totalCartCount = cartItems.reduce((acc, i) => acc + i.quantity, 0);

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-zinc-100 flex flex-col font-sans selection:bg-orange-600 selection:text-white">
      <ClientHeader
        settings={settings}
        cartCount={totalCartCount}
        onOpenCart={() => setIsCartOpen(true)}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 sm:py-8">
        {completedOrder ? (
          <ClientSuccess
            order={completedOrder}
            settings={settings}
            onNewOrder={() => setCompletedOrder(null)}
          />
        ) : (
          <div className="space-y-8">
            {/* Step 1: Identification & Modality */}
            <ClientIdentification
              clientData={clientData}
              onChange={(updated) =>
                setClientData((prev) => ({ ...prev, ...updated }))
              }
              onProceed={() => {
                const el = document.getElementById('cardapio-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
            />

            {/* Step 2: Digital Menu */}
            <div id="cardapio-section">
              <ClientMenu
                categories={categories}
                products={products}
                cartItems={cartItems}
                onAddToCart={handleAddToCart}
                onUpdateCartQuantity={handleUpdateCartQuantity}
              />
            </div>
          </div>
        )}
      </main>

      {/* Subtle Toast when adding item without interrupting user */}
      {addedToast && (
        <div className="fixed top-20 right-4 sm:right-8 z-50 animate-slideDown">
          <div className="bg-zinc-900 border border-orange-500/60 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-bold">
              {addedToast.name} adicionado ao carrinho!
            </span>
            <button
              onClick={() => setIsCartOpen(true)}
              className="ml-2 text-xs font-black text-orange-400 hover:text-orange-300 underline cursor-pointer"
            >
              Ver Carrinho
            </button>
          </div>
        </div>
      )}

      {/* Floating Cart Bar (Mobile & Desktop) */}
      {!completedOrder && totalCartCount > 0 && !isCartOpen && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-8 sm:w-96 z-40 animate-slideUp">
          <div className="bg-[#141417]/95 border-2 border-orange-500/60 backdrop-blur-md p-3.5 rounded-3xl shadow-2xl shadow-black/80 flex items-center justify-between gap-3 text-white">
            <div className="flex items-center gap-3 pl-1">
              <div className="w-10 h-10 rounded-2xl bg-orange-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-orange-600/30">
                {totalCartCount}
              </div>
              <div>
                <p className="text-xs font-black text-white leading-tight">
                  {totalCartCount} {totalCartCount === 1 ? 'item no carrinho' : 'itens no carrinho'}
                </p>
                <p className="text-xs font-extrabold text-orange-400">
                  {formatCurrencyBRL(calculateOrderSubtotal(cartItems))}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsCartOpen(true)}
              aria-label="Ver Carrinho"
              className="py-2.5 px-5 rounded-2xl bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white font-black text-xs sm:text-sm shadow-lg shadow-orange-600/30 transition cursor-pointer flex items-center gap-2 active:scale-95"
            >
              <span>Ver Carrinho</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Cart Drawer */}
      <ClientCart
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        clientData={clientData}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={handleClearCart}
        onFinalizeOrder={handleFinalizeOrder}
        isSubmitting={isSubmittingOrder}
      />

      {/* Client Footer */}
      <footer className="bg-[#0f0f12] border-t border-zinc-900 text-zinc-500 text-xs py-8 px-4 text-center">
        <p className="font-semibold text-zinc-400">
          {settings.restaurantName} • {settings.neighborhood}, {settings.cityState}
        </p>
        <p className="mt-1">
          {settings.openingHours} • Pedidos online e entrega rápida
        </p>
        <p className="mt-2 text-[10px] text-zinc-600">
          Vitim Cozinha e Bar LTDA
        </p>

        {/* Discreet Staff / Admin Access for phone & tablet */}
        <div className="mt-5 pt-3 border-t border-zinc-900/60 flex items-center justify-center">
          <button
            type="button"
            onClick={() => navigateTo('admin')}
            className="text-[11px] text-zinc-500 hover:text-orange-400 py-1.5 px-3 rounded-lg hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition cursor-pointer flex items-center gap-1.5"
            title="Acesso exclusivo para funcionários do restaurante"
          >
            <Lock className="w-3.5 h-3.5 text-zinc-500" />
            <span>Acesso da Equipe (Painel Administrativo)</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
