/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type {
  Order,
  OrderItem,
  OrderStatus,
  OrderModality,
  DeliveryFeeStatus,
} from '../src/utils/orderRules.ts';
import {
  formatOrderNumber,
  calculateOrderSubtotal,
  formatEpsonReceiptText,
  isDeliveryScheduleOpen,
} from '../src/utils/orderRules.ts';

export interface Category {
  id: string;
  name: string;
  slug: string;
  order: number;
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  available: boolean;
}

export interface PrintJob {
  id: string;
  orderId: string;
  orderNumber: number;
  formattedNumber: string;
  receiptText: string;
  isSecondCopy: boolean;
  status: 'PENDING' | 'PRINTING' | 'COMPLETED' | 'FAILED';
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  printedAt?: string;
  error?: string;
}

export interface PrintHistoryEntry {
  id: string;
  orderId: string;
  orderNumber: number;
  formattedNumber: string;
  type: 'ORIGINAL' | 'SEGUNDA_VIA';
  timestamp: string;
  printerDevice: string;
  status: 'SUCCESS' | 'FAILED';
  error?: string;
}

export interface RestaurantSettings {
  restaurantName: string;
  neighborhood: string;
  cityState: string;
  fullAddress: string;
  whatsappNumber: string;
  logoUrl: string;
  printLogoUrl?: string;
  bannerUrl: string;
  openingHours: string;
  isOpen: boolean;
  autoScheduleEnabled: boolean;
  openTime: string;
  closeTime: string;
  paperWidth: 80 | 58;
  printerName: string;
  autoPrintOnNewOrder: boolean;
  soundAlertEnabled: boolean;
  adminPasswordHash: string; // default hashed or checked
  serviceToken: string;
}

export interface DatabaseSchema {
  settings: RestaurantSettings;
  categories: Category[];
  products: Product[];
  orders: Order[];
  printQueue: PrintJob[];
  printHistory: PrintHistoryEntry[];
  nextOrderSequence: number;
}

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'restaurant_db.json');

const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Porções', slug: 'porcoes', order: 1 },
  { id: 'cat-2', name: 'Petiscos', slug: 'petiscos', order: 2 },
  { id: 'cat-3', name: 'Hambúrgueres', slug: 'hamburgueres', order: 3 },
  { id: 'cat-4', name: 'Trio de hambúrgueres', slug: 'trio-de-hamburgueres', order: 4 },
  { id: 'cat-5', name: 'Caldos', slug: 'caldos', order: 5 },
  { id: 'cat-6', name: 'Molhos', slug: 'molhos', order: 6 },
  { id: 'cat-7', name: 'Bebidas não alcoólicas', slug: 'bebidas-nao-alcoolicas', order: 7 },
  { id: 'cat-8', name: 'Bebidas alcoólicas', slug: 'bebidas-alcoolicas', order: 8 },
];

const INITIAL_PRODUCTS: Product[] = [
  // 1. Porções
  {
    id: 'prod-1',
    categoryId: 'cat-1',
    name: 'Batata Rústica Especial com Bacon & Cheddar',
    description: 'Batatas crocantes cortadas artesanalmente, cobertas com blend de queijo cheddar cremoso e cubos crocantes de bacon.',
    price: 36.9,
    imageUrl: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&auto=format&fit=crop&q=80',
    available: true,
  },
  {
    id: 'prod-2',
    categoryId: 'cat-1',
    name: 'Isca de Frango Empanada Crocante (500g)',
    description: 'Tiras de peito de frango marinadas no tempero do chefe, empanadas na farinha panko. Acompanha molho da casa.',
    price: 42.0,
    imageUrl: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=600&auto=format&fit=crop&q=80',
    available: true,
  },
  {
    id: 'prod-3',
    categoryId: 'cat-1',
    name: 'Carne de Sol com Mandioca na Manteiga de Garrafa',
    description: 'Clássico goiano: carne de sol desfiada e salteada com cebola roxa e macaxeira cozida no ponto certo com manteiga de garrafa.',
    price: 54.9,
    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80',
    available: true,
  },
  // 2. Petiscos
  {
    id: 'prod-4',
    categoryId: 'cat-2',
    name: 'Bolinho de Costela Desfiada (6 unidades)',
    description: 'Costela bovina assada por 8 horas, desfiada com especiarias e empanada crocante. Recheio super suculento.',
    price: 32.0,
    imageUrl: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=600&auto=format&fit=crop&q=80',
    available: true,
  },
  {
    id: 'prod-5',
    categoryId: 'cat-2',
    name: 'Dadinhos de Tapioca com Queijo Coalho',
    description: 'Cubos dourados de tapioca granulada e queijo coalho tostado. Acompanha geleia artesanal de pimenta agridoce.',
    price: 28.5,
    imageUrl: 'https://images.unsplash.com/photo-1541529086526-db283c563270?w=600&auto=format&fit=crop&q=80',
    available: true,
  },
  // 3. Hambúrgueres
  {
    id: 'prod-6',
    categoryId: 'cat-3',
    name: 'Burger Ingá Monster Smash (160g)',
    description: 'Dois smash burgers de 80g cada, queijo cheddar derretido, bacon fatiado, cebola caramelizada e maionese defumada no pão brioche amanteigado.',
    price: 32.9,
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80',
    available: true,
  },
  {
    id: 'prod-7',
    categoryId: 'cat-3',
    name: 'Burger Caipira Gourmet (180g)',
    description: 'Blend bovino 180g grelhado na brasa, queijo minas padrão tostado, ovo caipira estalado, alface americana e molho especial de ervas.',
    price: 35.0,
    imageUrl: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=600&auto=format&fit=crop&q=80',
    available: true,
  },
  // 4. Trio de hambúrgueres
  {
    id: 'prod-8',
    categoryId: 'cat-4',
    name: 'Trio Degustação de Mini Burgers Artesanais',
    description: 'Combo com 3 mini hambúrgueres especiais: 1 Clássico Cheddar & Bacon, 1 Gorgonzola com Geleia, e 1 Costela Barbecue. Acompanha porção de fritas.',
    price: 49.9,
    imageUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&auto=format&fit=crop&q=80',
    available: true,
  },
  // 5. Caldos
  {
    id: 'prod-9',
    categoryId: 'cat-5',
    name: 'Caldo de Feijão Especial com Bacon e Couve (500ml)',
    description: 'Feijão preto bem temperado com alho, folhas de louro, cubinhos de bacon frito, linguiça calabresa e couve fininha.',
    price: 22.0,
    imageUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&auto=format&fit=crop&q=80',
    available: true,
  },
  {
    id: 'prod-10',
    categoryId: 'cat-5',
    name: 'Caldo de Panga com Mandioca e Carne Seca (500ml)',
    description: 'Receita tradicional: creme aveludado de mandioca fresca cozida com carne seca desfiada e cheiro-verde fresco.',
    price: 24.5,
    imageUrl: 'https://images.unsplash.com/photo-1603105037880-880cd4edfb0d?w=600&auto=format&fit=crop&q=80',
    available: true,
  },
  // 6. Molhos
  {
    id: 'prod-11',
    categoryId: 'cat-6',
    name: 'Maionese Especial Verde da Casa (100ml)',
    description: 'Nossa famosa maionese verde temperada com ervas finas, alho assado e azeite extravirgem.',
    price: 5.0,
    imageUrl: 'https://images.unsplash.com/photo-1528751014936-863e6e7a319c?w=600&auto=format&fit=crop&q=80',
    available: true,
  },
  {
    id: 'prod-12',
    categoryId: 'cat-6',
    name: 'Molho Barbecue Defumado com Rapadura (100ml)',
    description: 'Molho barbecue rústico com notas defumadas e toque suave de rapadura artesanal.',
    price: 6.0,
    imageUrl: 'https://images.unsplash.com/photo-1472476443507-c7a5948772fc?w=600&auto=format&fit=crop&q=80',
    available: true,
  },
  // 7. Bebidas não alcoólicas
  {
    id: 'prod-13',
    categoryId: 'cat-7',
    name: 'Coca-Cola Original 350ml Lata',
    description: 'Refrigerante Coca-Cola em lata gelada trincando.',
    price: 6.5,
    imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80',
    available: true,
  },
  {
    id: 'prod-14',
    categoryId: 'cat-7',
    name: 'Suco Natural de Laranja da Fruta (500ml)',
    description: 'Suco feito na hora com laranjas selecionadas, 100% puro e sem adição de água.',
    price: 11.0,
    imageUrl: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=600&auto=format&fit=crop&q=80',
    available: true,
  },
  // 8. Bebidas alcoólicas
  {
    id: 'prod-15',
    categoryId: 'cat-8',
    name: 'Cerveja Heineken Long Neck 330ml',
    description: 'Cerveja puro malte Premium geladíssima.',
    price: 11.9,
    imageUrl: 'https://images.unsplash.com/photo-1608270119330-8041a9952528?w=600&auto=format&fit=crop&q=80',
    available: true,
  },
  {
    id: 'prod-16',
    categoryId: 'cat-8',
    name: 'Chopp Pilsen Artesanal Gelado (500ml)',
    description: 'Chopp claro e refrescante, tirado no ponto perfeito com colarinho cremoso.',
    price: 14.0,
    imageUrl: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=600&auto=format&fit=crop&q=80',
    available: true,
  },
];

const INITIAL_SETTINGS: RestaurantSettings = {
  restaurantName: 'Vitim Cozinha e Bar',
  neighborhood: 'Jardim do Ingá',
  cityState: 'Luziânia - GO',
  fullAddress: 'Avenida Lucena Roriz, Qd. 65, Lt 23, Jardim do Ingá, Luziânia-GO',
  whatsappNumber: '5561999636183',
  logoUrl: '/assets/aistudio/IMG_0848-Photoroom_78eae265.png',
  printLogoUrl: '/assets/aistudio/IMG_0848-Photoroomm_42d628da.png',
  bannerUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80',
  openingHours: 'Diariamente das 11:45 às 23:30',
  isOpen: false,
  autoScheduleEnabled: true,
  openTime: '11:45',
  closeTime: '23:30',
  paperWidth: 80,
  printerName: 'EPSON TM-T20X',
  autoPrintOnNewOrder: true,
  soundAlertEnabled: true,
  adminPasswordHash: 'vitim2026', // Admin password
  serviceToken: 'sec-inga-print-token-2026',
};

class Database {
  private data: DatabaseSchema;
  private isSaving = false;

  constructor() {
    this.data = this.loadDatabase();
  }

  private loadDatabase(): DatabaseSchema {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          settings: { ...INITIAL_SETTINGS, ...(parsed.settings || {}) },
          categories: parsed.categories && parsed.categories.length ? parsed.categories : INITIAL_CATEGORIES,
          products: parsed.products && parsed.products.length ? parsed.products : INITIAL_PRODUCTS,
          orders: Array.isArray(parsed.orders) ? parsed.orders : [],
          printQueue: Array.isArray(parsed.printQueue) ? parsed.printQueue : [],
          printHistory: Array.isArray(parsed.printHistory) ? parsed.printHistory : [],
          nextOrderSequence: parsed.nextOrderSequence || (parsed.orders?.length ? parsed.orders.length + 1 : 1),
        };
      }
    } catch (err) {
      console.error('Error loading database file, falling back to default:', err);
    }

    const initialDb: DatabaseSchema = {
      settings: INITIAL_SETTINGS,
      categories: INITIAL_CATEGORIES,
      products: INITIAL_PRODUCTS,
      orders: [],
      printQueue: [],
      printHistory: [],
      nextOrderSequence: 1,
    };

    this.saveImmediate(initialDb);
    return initialDb;
  }

  private saveImmediate(db: DatabaseSchema) {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write database file:', err);
    }
  }

  private save() {
    if (this.isSaving) return;
    this.isSaving = true;
    setTimeout(() => {
      this.saveImmediate(this.data);
      this.isSaving = false;
    }, 50);
  }

  // --- Settings ---
  public getSettings(): RestaurantSettings {
    const settings = { ...this.data.settings };
    if (settings.autoScheduleEnabled !== false) {
      const schedule = isDeliveryScheduleOpen(
        new Date(),
        settings.openTime || '11:45',
        settings.closeTime || '23:30'
      );
      if (settings.isOpen !== schedule.isOpen) {
        settings.isOpen = schedule.isOpen;
        this.data.settings.isOpen = schedule.isOpen;
        this.save();
      }
    }
    return settings;
  }

  public updateSettings(updates: Partial<RestaurantSettings>): RestaurantSettings {
    this.data.settings = { ...this.data.settings, ...updates };
    this.save();
    return this.data.settings;
  }

  // --- Categories ---
  public getCategories(): Category[] {
    return [...this.data.categories].sort((a, b) => a.order - b.order);
  }

  public saveCategory(cat: Omit<Category, 'id'> & { id?: string }): Category {
    if (cat.id) {
      const idx = this.data.categories.findIndex((c) => c.id === cat.id);
      if (idx !== -1) {
        this.data.categories[idx] = { ...this.data.categories[idx], ...cat };
        this.save();
        return this.data.categories[idx];
      }
    }
    const newCat: Category = {
      id: `cat-${Date.now()}`,
      name: cat.name,
      slug: cat.name.toLowerCase().replace(/\s+/g, '-'),
      order: cat.order || this.data.categories.length + 1,
    };
    this.data.categories.push(newCat);
    this.save();
    return newCat;
  }

  public deleteCategory(id: string): boolean {
    const prevLen = this.data.categories.length;
    this.data.categories = this.data.categories.filter((c) => c.id !== id);
    if (this.data.categories.length !== prevLen) {
      this.save();
      return true;
    }
    return false;
  }

  // --- Products ---
  public getProducts(): Product[] {
    return [...this.data.products];
  }

  public getProductById(id: string): Product | undefined {
    return this.data.products.find((p) => p.id === id);
  }

  public saveProduct(prod: Omit<Product, 'id'> & { id?: string }): Product {
    if (prod.id) {
      const idx = this.data.products.findIndex((p) => p.id === prod.id);
      if (idx !== -1) {
        this.data.products[idx] = {
          ...this.data.products[idx],
          ...prod,
          price: Number(prod.price) || 0,
        };
        this.save();
        return this.data.products[idx];
      }
    }
    const newProd: Product = {
      id: `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      categoryId: prod.categoryId,
      name: prod.name,
      description: prod.description || '',
      price: Number(prod.price) || 0,
      imageUrl: prod.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
      available: prod.available !== false,
    };
    this.data.products.push(newProd);
    this.save();
    return newProd;
  }

  public deleteProduct(id: string): boolean {
    const prevLen = this.data.products.length;
    this.data.products = this.data.products.filter((p) => p.id !== id);
    if (this.data.products.length !== prevLen) {
      this.save();
      return true;
    }
    return false;
  }

  // --- Orders ---
  public getOrders(filter?: {
    status?: OrderStatus;
    modality?: OrderModality;
    search?: string;
  }): Order[] {
    let orders = [...this.data.orders];

    if (filter?.status) {
      orders = orders.filter((o) => o.status === filter.status);
    }
    if (filter?.modality) {
      orders = orders.filter((o) => o.modality === filter.modality);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      orders = orders.filter(
        (o) =>
          o.formattedNumber.includes(q) ||
          o.clientName.toLowerCase().includes(q) ||
          o.clientPhone.includes(q)
      );
    }

    return orders.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getOrderById(id: string): Order | undefined {
    return this.data.orders.find((o) => o.id === id);
  }

  public createOrder(data: {
    clientName: string;
    clientPhone: string;
    modality: OrderModality;
    address?: {
      street: string;
      number: string;
      neighborhood: string;
      complement?: string;
      reference?: string;
    };
    items: OrderItem[];
    generalNotes?: string;
  }): { order: Order; printJob: PrintJob } {
    const seq = this.data.nextOrderSequence++;
    const formattedNumber = formatOrderNumber(seq);
    const now = new Date().toISOString();

    const subtotal = calculateOrderSubtotal(data.items);
    const isRetirada = data.modality === 'RETIRADA';

    const deliveryFeeStatus: DeliveryFeeStatus = isRetirada ? 'ISENTA' : 'PENDENTE';
    const deliveryFee = isRetirada ? 0 : null;
    const total = isRetirada ? subtotal : null;

    let formattedAddress = undefined;
    if (data.address) {
      const parts = [
        `${data.address.street}, Nº ${data.address.number || 'S/N'}`,
        `Bairro ${data.address.neighborhood}`,
      ];
      if (data.address.complement) parts.push(`Compl: ${data.address.complement}`);
      if (data.address.reference) parts.push(`Ref: ${data.address.reference}`);
      formattedAddress = {
        ...data.address,
        formatted: parts.join(' - '),
      };
    }

    const newOrder: Order = {
      id: `ord-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      orderNumber: seq,
      formattedNumber,
      clientName: data.clientName.trim(),
      clientPhone: data.clientPhone.trim(),
      modality: data.modality,
      address: formattedAddress,
      items: data.items.map((i) => ({ ...i })),
      subtotal,
      deliveryFee,
      deliveryFeeStatus,
      total,
      status: 'RECEBIDO',
      generalNotes: data.generalNotes?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
      statusHistory: [
        {
          status: 'RECEBIDO',
          timestamp: now,
          note: 'Pedido criado pelo cliente via Cardápio Online',
        },
      ],
      printCount: 0,
    };

    this.data.orders.unshift(newOrder);

    // Queue for Epson USB thermal printer
    const receiptText = formatEpsonReceiptText(newOrder, {
      width: this.data.settings.paperWidth,
      restaurantName: this.data.settings.restaurantName,
      isSecondCopy: false,
    });

    const printJob: PrintJob = {
      id: `print-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      orderId: newOrder.id,
      orderNumber: newOrder.orderNumber,
      formattedNumber: newOrder.formattedNumber,
      receiptText,
      isSecondCopy: false,
      status: 'PENDING',
      attempts: 0,
      maxAttempts: 5,
      createdAt: now,
    };

    this.data.printQueue.push(printJob);

    this.save();
    return { order: newOrder, printJob };
  }

  public updateOrderStatus(
    orderId: string,
    nextStatus: OrderStatus,
    note?: string
  ): Order | null {
    const order = this.data.orders.find((o) => o.id === orderId);
    if (!order) return null;

    const now = new Date().toISOString();
    order.status = nextStatus;
    order.updatedAt = now;
    order.statusHistory.push({
      status: nextStatus,
      timestamp: now,
      note: note || `Status alterado para ${nextStatus}`,
    });

    this.save();
    return order;
  }

  public setDeliveryFee(
    orderId: string,
    feeValue: number,
    note?: string
  ): Order | null {
    const order = this.data.orders.find((o) => o.id === orderId);
    if (!order) return null;

    const safeFee = Math.max(0, Math.round(Number(feeValue) * 100) / 100);
    order.deliveryFee = safeFee;
    order.deliveryFeeStatus = 'CONFIRMADA';
    order.total = Math.round((order.subtotal + safeFee) * 100) / 100;
    order.updatedAt = new Date().toISOString();

    order.statusHistory.push({
      status: order.status,
      timestamp: order.updatedAt,
      note: note || `Taxa de entrega confirmada: R$ ${safeFee.toFixed(2)}`,
    });

    this.save();
    return order;
  }

  public queueReprint(orderId: string): { order: Order; printJob: PrintJob } | null {
    const order = this.data.orders.find((o) => o.id === orderId);
    if (!order) return null;

    const now = new Date().toISOString();
    const receiptText = formatEpsonReceiptText(order, {
      width: this.data.settings.paperWidth,
      restaurantName: this.data.settings.restaurantName,
      isSecondCopy: true,
      reprintDate: new Date().toLocaleString('pt-BR'),
    });

    const printJob: PrintJob = {
      id: `print-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      orderId: order.id,
      orderNumber: order.orderNumber,
      formattedNumber: order.formattedNumber,
      receiptText,
      isSecondCopy: true,
      status: 'PENDING',
      attempts: 0,
      maxAttempts: 5,
      createdAt: now,
    };

    this.data.printQueue.push(printJob);
    this.save();

    return { order, printJob };
  }

  // --- Print Queue & History ---
  public getPendingPrintJobs(): PrintJob[] {
    return this.data.printQueue.filter(
      (job) => job.status === 'PENDING' || job.status === 'FAILED'
    );
  }

  public acknowledgePrintJob(
    jobId: string,
    status: 'COMPLETED' | 'FAILED',
    errorMessage?: string,
    device = 'Epson TM-T20X USB'
  ): boolean {
    const jobIdx = this.data.printQueue.findIndex((j) => j.id === jobId);
    if (jobIdx === -1) return false;

    const job = this.data.printQueue[jobIdx];
    const now = new Date().toISOString();

    job.status = status;
    job.attempts++;

    if (status === 'COMPLETED') {
      job.printedAt = now;

      // Update order print statistics
      const order = this.data.orders.find((o) => o.id === job.orderId);
      if (order) {
        order.printCount = (order.printCount || 0) + 1;
        order.lastPrintedAt = now;
      }

      // Record in print history
      this.data.printHistory.unshift({
        id: `ph-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
        orderId: job.orderId,
        orderNumber: job.orderNumber,
        formattedNumber: job.formattedNumber,
        type: job.isSecondCopy ? 'SEGUNDA_VIA' : 'ORIGINAL',
        timestamp: now,
        printerDevice: device,
        status: 'SUCCESS',
      });

      // Remove from active queue on success
      this.data.printQueue.splice(jobIdx, 1);
    } else {
      job.error = errorMessage || 'Falha na comunicação com a impressora Epson USB';

      this.data.printHistory.unshift({
        id: `ph-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
        orderId: job.orderId,
        orderNumber: job.orderNumber,
        formattedNumber: job.formattedNumber,
        type: job.isSecondCopy ? 'SEGUNDA_VIA' : 'ORIGINAL',
        timestamp: now,
        printerDevice: device,
        status: 'FAILED',
        error: job.error,
      });

      // Keep in queue if attempts < maxAttempts so it can be retried automatically
      if (job.attempts >= job.maxAttempts) {
        job.status = 'FAILED';
      }
    }

    this.save();
    return true;
  }

  public getPrintHistory(limit = 100): PrintHistoryEntry[] {
    return this.data.printHistory.slice(0, limit);
  }
}

export const db = new Database();
