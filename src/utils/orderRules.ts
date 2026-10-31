/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type OrderModality = 'ENTREGA' | 'RETIRADA';

export type OrderStatus =
  | 'RECEBIDO'
  | 'EM_PREPARO'
  | 'PRONTO'
  | 'SAIU_PARA_ENTREGA'
  | 'ENTREGUE'
  | 'RETIRADO'
  | 'CANCELADO';

export type DeliveryFeeStatus = 'PENDENTE' | 'CONFIRMADA' | 'ISENTA';

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

export interface ClientData {
  name: string;
  phone: string;
  modality: OrderModality;
  street?: string;
  number?: string;
  neighborhood?: string;
  complement?: string;
  reference?: string;
  generalNotes?: string;
}

export interface Order {
  id: string;
  orderNumber: number;
  formattedNumber: string;
  clientName: string;
  clientPhone: string;
  modality: OrderModality;
  address?: {
    street: string;
    number: string;
    neighborhood: string;
    complement?: string;
    reference?: string;
    formatted: string;
  };
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number | null;
  deliveryFeeStatus: DeliveryFeeStatus;
  total: number | null;
  status: OrderStatus;
  generalNotes?: string;
  createdAt: string;
  updatedAt: string;
  statusHistory: Array<{
    status: OrderStatus;
    timestamp: string;
    note?: string;
  }>;
  printCount: number;
  lastPrintedAt?: string;
}

/**
 * Calculates subtotal for a list of order items
 */
export function calculateOrderSubtotal(items: OrderItem[]): number {
  if (!Array.isArray(items) || items.length === 0) return 0;
  const total = items.reduce((sum, item) => {
    const qty = Math.max(0, item.quantity || 0);
    const price = Math.max(0, item.price || 0);
    return sum + qty * price;
  }, 0);
  return Math.round(total * 100) / 100;
}

/**
 * Formats a sequential order number (e.g. 1 -> "0001")
 */
export function formatOrderNumber(seq: number): string {
  const safeSeq = Math.max(1, Math.floor(seq || 1));
  return String(safeSeq).padStart(4, '0');
}

/**
 * Format currency in Brazilian Real
 */
export function formatCurrencyBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Validates client identification and items
 */
export function validateOrder(
  clientData: Partial<ClientData>,
  items: OrderItem[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!clientData.name || clientData.name.trim().length < 2) {
    errors.push('Por favor, informe seu nome completo.');
  }

  if (!clientData.phone || clientData.phone.replace(/\D/g, '').length < 8) {
    errors.push('Por favor, informe um telefone/WhatsApp válido com DDD.');
  }

  if (!clientData.modality || !['ENTREGA', 'RETIRADA'].includes(clientData.modality)) {
    errors.push('Selecione Entrega ou Retirada no Restaurante.');
  }

  if (clientData.modality === 'ENTREGA') {
    if (!clientData.street || clientData.street.trim().length < 2) {
      errors.push('Por favor, informe a rua/endereço para entrega.');
    }
    if (!clientData.neighborhood || clientData.neighborhood.trim().length < 2) {
      errors.push('Por favor, informe o bairro para entrega.');
    }
  }

  if (!items || items.length === 0) {
    errors.push('Seu carrinho está vazio. Adicione pelo menos um produto.');
  } else {
    for (const item of items) {
      if (!item.quantity || item.quantity <= 0) {
        errors.push(`Quantidade inválida para o item: ${item.name}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generates formatted text for Epson Thermal Printer matching user's exact specification
 */
export function formatEpsonReceiptText(
  order: Order,
  options: {
    width?: 80 | 58;
    isSecondCopy?: boolean;
    reprintDate?: string;
    restaurantName?: string;
  } = {}
): string {
  const width = options.width || 80;
  const charsPerLine = width === 80 ? 48 : 32;
  const separator = '-'.repeat(charsPerLine);
  const restaurant = (options.restaurantName || 'VITIMM COZINHA E BAR').toUpperCase();

  const lines: string[] = [];

  lines.push(restaurant);
  lines.push(`PEDIDO Nº ${order.formattedNumber || formatOrderNumber(order.orderNumber)}`);

  if (options.isSecondCopy) {
    const reprintStr = options.reprintDate || new Date().toLocaleString('pt-BR');
    lines.push(`** SEGUNDA VIA - REIMPRESSÃO **`);
    lines.push(`EMITIDA EM: ${reprintStr}`);
  }

  lines.push(separator);

  lines.push(`CLIENTE: ${order.clientName.toUpperCase()}`);
  if (order.clientPhone) {
    lines.push(`WHATSAPP: ${order.clientPhone}`);
  }

  if (order.modality === 'ENTREGA') {
    lines.push(`TIPO: ENTREGA`);
    lines.push(`ENDEREÇO:`);
    if (order.address) {
      lines.push(`${order.address.street}, Nº ${order.address.number || 'S/N'}`);
      lines.push(`BAIRRO: ${order.address.neighborhood}`);
      if (order.address.complement) lines.push(`COMPL: ${order.address.complement}`);
      if (order.address.reference) lines.push(`REF: ${order.address.reference}`);
    } else {
      lines.push('ENDEREÇO NÃO REGISTRADO');
    }
  } else {
    lines.push(`TIPO: RETIRADA NO RESTAURANTE`);
  }

  const orderDate = new Date(order.createdAt);
  const dateStr = orderDate.toLocaleDateString('pt-BR');
  const timeStr = orderDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  lines.push(`DATA: ${dateStr}`);
  lines.push(`HORÁRIO: ${timeStr}`);

  lines.push(separator);
  lines.push(`PRODUTOS:`);
  lines.push('');

  order.items.forEach((item) => {
    const itemTotal = formatCurrencyBRL(item.price * item.quantity);
    lines.push(`${item.quantity}x ${item.name.toUpperCase()} — ${itemTotal}`);
    if (item.notes && item.notes.trim()) {
      lines.push(`   Obs: ${item.notes.trim()}`);
    }
  });

  if (order.generalNotes && order.generalNotes.trim()) {
    lines.push(separator);
    lines.push(`OBSERVAÇÕES:`);
    lines.push(order.generalNotes.trim());
  }

  lines.push(separator);
  lines.push(`SUBTOTAL: ${formatCurrencyBRL(order.subtotal)}`);

  if (order.modality === 'ENTREGA') {
    if (order.deliveryFeeStatus === 'CONFIRMADA' && order.deliveryFee !== null) {
      lines.push(`TAXA DE ENTREGA: ${formatCurrencyBRL(order.deliveryFee)}`);
      const finalTotal = order.subtotal + order.deliveryFee;
      lines.push(`TOTAL FINAL: ${formatCurrencyBRL(finalTotal)}`);
    } else {
      lines.push(`TAXA DE ENTREGA: A CONFIRMAR`);
      lines.push(`TOTAL FINAL: A CONFIRMAR`);
    }
  } else {
    lines.push(`TAXA: R$ 0,00`);
    lines.push(`TOTAL FINAL: ${formatCurrencyBRL(order.subtotal)}`);
  }

  lines.push(separator);
  lines.push(`PEDIDO RECEBIDO`);

  return lines.join('\n');
}

/**
 * Converts an image from URL into ESC/POS monochrome raster bitmap bytes (GS v 0)
 */
export async function generateEscPosRasterLogo(
  imageUrl: string,
  maxWidthDots = 384
): Promise<Uint8Array | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null;
  }

  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const aspect = img.height / img.width;
          let width = Math.min(maxWidthDots, img.width || maxWidthDots);
          // ESC/POS raster width must be multiple of 8
          width = Math.floor(width / 8) * 8;
          if (width < 8) width = 8;
          const height = Math.round(width * aspect);

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(null);

          // White background
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          const imgData = ctx.getImageData(0, 0, width, height);
          const data = imgData.data;

          const bytesPerLine = width / 8;
          const rasterData = new Uint8Array(bytesPerLine * height);

          for (let y = 0; y < height; y++) {
            for (let b = 0; b < bytesPerLine; b++) {
              let byteVal = 0;
              for (let bit = 0; bit < 8; bit++) {
                const x = b * 8 + bit;
                const offset = (y * width + x) * 4;
                const r = data[offset];
                const g = data[offset + 1];
                const bVal = data[offset + 2];
                const a = data[offset + 3];

                // Darkness test: darker than threshold = black dot (1)
                const isBlack = a > 120 && (0.299 * r + 0.587 * g + 0.114 * bVal) < 170;
                if (isBlack) {
                  byteVal |= 1 << (7 - bit);
                }
              }
              rasterData[y * bytesPerLine + b] = byteVal;
            }
          }

          const xL = bytesPerLine & 0xff;
          const xH = (bytesPerLine >> 8) & 0xff;
          const yL = height & 0xff;
          const yH = (height >> 8) & 0xff;

          // Align center (ESC a 1), Print raster (GS v 0 0 xL xH yL yH), LF, Align left (ESC a 0)
          const header = new Uint8Array([
            0x1b, 0x61, 0x01,                   // ESC a 1 (center)
            0x1d, 0x76, 0x30, 0x00,             // GS v 0 0
            xL, xH, yL, yH,
          ]);
          const footer = new Uint8Array([
            0x0a,                               // LF
            0x1b, 0x61, 0x00,                   // ESC a 0 (left)
          ]);

          const total = header.length + rasterData.length + footer.length;
          const out = new Uint8Array(total);
          out.set(header, 0);
          out.set(rasterData, header.length);
          out.set(footer, header.length + rasterData.length);

          resolve(out);
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = imageUrl;
    } catch {
      resolve(null);
    }
  });
}

/**
 * Generates binary ESC/POS byte sequence for Epson USB thermal printer
 * Configures maximum thermal darkness: high heating energy, emphasized mode, and double-strike.
 * Optionally prepends raster logo image.
 */
export function generateEscPosBytes(
  receiptText: string,
  rasterLogoBytes?: Uint8Array | null
): Uint8Array {
  const encoder = new TextEncoder();
  const textBytes = encoder.encode(receiptText + '\n\n\n\n');

  // ESC @ = Initialize printer (0x1B, 0x40)
  // ESC 7 = Set heating parameters: max heating dots (7), max heating time (0xF0 = 2400us), heating interval (0x02)
  // GS ( K = Set thermal print density to maximum (+4, level 8 = 130% energy)
  // ESC M 0 = Select Font A (12x24, thicker dot matrix)
  // ESC E 1 = Turn ON Emphasized (bold) mode for intense thermal dot burn
  // ESC G 1 = Turn ON Double-strike mode for rich, deep black printout
  const initAndDarkness = new Uint8Array([
    0x1b, 0x40,                         // ESC @ Initialize
    0x1b, 0x37, 0x07, 0xf0, 0x02,       // ESC 7 Set max thermal burn time
    0x1d, 0x28, 0x4b, 0x02, 0x00, 0x31, 0x08, // GS ( K fn 49: density level 8 (130% max dark)
    0x1b, 0x4d, 0x00,                   // ESC M 0 Standard Font A (thicker dots)
    0x1b, 0x45, 0x01,                   // ESC E 1 Emphasized / Bold ON
    0x1b, 0x47, 0x01,                   // ESC G 1 Double-strike ON (deep black)
  ]);

  // GS V 66 0 = Partial cut with feed (0x1D, 0x56, 0x42, 0x00)
  const cut = new Uint8Array([
    0x1b, 0x45, 0x00,                   // ESC E 0 Emphasized OFF before cut
    0x1b, 0x47, 0x00,                   // ESC G 0 Double-strike OFF before cut
    0x1d, 0x56, 0x42, 0x00              // GS V 66 0 Partial cut
  ]);

  const logoLen = rasterLogoBytes ? rasterLogoBytes.length : 0;
  const totalLength = initAndDarkness.length + logoLen + textBytes.length + cut.length;
  const result = new Uint8Array(totalLength);

  let offset = 0;
  result.set(initAndDarkness, offset);
  offset += initAndDarkness.length;

  if (rasterLogoBytes && rasterLogoBytes.length > 0) {
    result.set(rasterLogoBytes, offset);
    offset += rasterLogoBytes.length;
  }

  result.set(textBytes, offset);
  offset += textBytes.length;

  result.set(cut, offset);

  return result;
}

/**
 * Generates complete WhatsApp message containing order number and all details
 */
export function formatOrderWhatsAppMessage(
  order: Order,
  options: {
    intent: 'LOCALIZACAO' | 'ACOMPANHAR';
    restaurantName?: string;
  }
): string {
  const isEntrega = order.modality === 'ENTREGA';
  const restaurant = (options.restaurantName || 'VITIM COZINHA E BAR').toUpperCase();
  const orderNum = order.formattedNumber || formatOrderNumber(order.orderNumber);

  const lines: string[] = [];
  lines.push(`🍔 *${restaurant}*`);
  lines.push(`📋 *PEDIDO #${orderNum}*`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);

  if (options.intent === 'LOCALIZACAO') {
    lines.push(`📍 *ENVIO DE LOCALIZAÇÃO DO PEDIDO*`);
    lines.push(
      `Olá! Seguem os dados completos do meu pedido. Estou enviando minha localização fixada/atual logo abaixo para combinarmos a taxa de entrega e pagamento! 👇`
    );
  } else {
    lines.push(`🔎 *ACOMPANHAMENTO DO PEDIDO*`);
    lines.push(
      `Olá! Gostaria de acompanhar o andamento do meu pedido #${orderNum}. Seguem todas as informações:`
    );
  }

  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`👤 *Cliente:* ${order.clientName}`);
  if (order.clientPhone) {
    lines.push(`📱 *Telefone/WhatsApp:* ${order.clientPhone}`);
  }
  lines.push(`🛵 *Tipo:* ${isEntrega ? 'Entrega em Domicílio' : 'Retirada no Restaurante'}`);

  if (isEntrega) {
    if (order.address) {
      lines.push(`📍 *Endereço para Entrega:*`);
      lines.push(`• Rua: ${order.address.street}, Nº ${order.address.number || 'S/N'}`);
      lines.push(`• Bairro: ${order.address.neighborhood}`);
      if (order.address.complement) lines.push(`• Compl: ${order.address.complement}`);
      if (order.address.reference) lines.push(`• Ref: ${order.address.reference}`);
    } else {
      lines.push(`📍 *Endereço:* A confirmar`);
    }
  } else {
    lines.push(`📍 *Local de Retirada:* Balcão do Restaurante (Jardim do Ingá, Luziânia-GO)`);
  }

  const orderDate = new Date(order.createdAt);
  const dateStr = !isNaN(orderDate.getTime()) ? orderDate.toLocaleDateString('pt-BR') : '';
  const timeStr = !isNaN(orderDate.getTime())
    ? orderDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : '';
  if (dateStr && timeStr) {
    lines.push(`🕒 *Horário do Pedido:* ${dateStr} às ${timeStr}`);
  }

  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`🛒 *PRODUTOS ESCOLHIDOS:*`);
  order.items.forEach((item) => {
    const itemTotal = formatCurrencyBRL(item.price * item.quantity);
    lines.push(`• *${item.quantity}x* ${item.name} — ${itemTotal}`);
    if (item.notes && item.notes.trim()) {
      lines.push(`   ↳ _Obs: ${item.notes.trim()}_`);
    }
  });

  if (order.generalNotes && order.generalNotes.trim()) {
    lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`📝 *Observações Gerais:*`);
    lines.push(`_${order.generalNotes.trim()}_`);
  }

  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`💵 *Subtotal:* ${formatCurrencyBRL(order.subtotal)}`);

  if (isEntrega) {
    if (order.deliveryFeeStatus === 'CONFIRMADA' && typeof order.deliveryFee === 'number') {
      lines.push(`🛵 *Taxa de Entrega:* ${formatCurrencyBRL(order.deliveryFee)}`);
      lines.push(`💰 *TOTAL FINAL:* ${formatCurrencyBRL(order.subtotal + order.deliveryFee)}`);
    } else {
      lines.push(`🛵 *Taxa de Entrega:* A CONFIRMAR`);
      lines.push(`💰 *TOTAL:* ${formatCurrencyBRL(order.subtotal)} + Taxa de Entrega`);
    }
  } else {
    lines.push(`🛵 *Taxa de Entrega:* R$ 0,00 (Sem taxa)`);
    lines.push(`💰 *TOTAL FINAL:* ${formatCurrencyBRL(order.subtotal)}`);
  }

  lines.push(`💳 *Forma de Pagamento:* A combinar no WhatsApp (Pix / Cartão / Dinheiro)`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);

  if (options.intent === 'LOCALIZACAO') {
    lines.push(
      `*Por favor, anexe agora a sua localização no WhatsApp clicando no clipe de anexo (📎) > Localização.*`
    );
  }

  return lines.join('\n');
}

/**
 * Calculates financial metrics separating product sales from delivery fees
 */
export function calculateFinancialMetrics(orders: Order[]): {
  totalRevenue: number;
  productSalesRevenue: number;
  deliveryFeesRevenue: number;
  totalOrdersCount: number;
  deliveredOrCompletedCount: number;
  averageTicket: number;
  countByModality: { entrega: number; retirada: number };
  countByStatus: Record<OrderStatus, number>;
  topSellingProducts: Array<{ name: string; quantity: number; revenue: number }>;
} {
  const countByStatus: Record<OrderStatus, number> = {
    RECEBIDO: 0,
    EM_PREPARO: 0,
    PRONTO: 0,
    SAIU_PARA_ENTREGA: 0,
    ENTREGUE: 0,
    RETIRADO: 0,
    CANCELADO: 0,
  };

  let productSalesRevenue = 0;
  let deliveryFeesRevenue = 0;
  let nonCancelledCount = 0;
  let entregaCount = 0;
  let retiradaCount = 0;

  const productAgg: Record<string, { quantity: number; revenue: number }> = {};

  for (const order of orders) {
    if (countByStatus[order.status] !== undefined) {
      countByStatus[order.status]++;
    }

    if (order.status === 'CANCELADO') {
      continue;
    }

    nonCancelledCount++;
    productSalesRevenue += order.subtotal || 0;

    if (order.modality === 'ENTREGA') {
      entregaCount++;
      if (order.deliveryFeeStatus === 'CONFIRMADA' && typeof order.deliveryFee === 'number') {
        deliveryFeesRevenue += order.deliveryFee;
      }
    } else {
      retiradaCount++;
    }

    // aggregate items
    for (const item of order.items || []) {
      if (!productAgg[item.name]) {
        productAgg[item.name] = { quantity: 0, revenue: 0 };
      }
      productAgg[item.name].quantity += item.quantity || 0;
      productAgg[item.name].revenue += (item.quantity || 0) * (item.price || 0);
    }
  }

  const topSellingProducts = Object.entries(productAgg)
    .map(([name, data]) => ({
      name,
      quantity: data.quantity,
      revenue: Math.round(data.revenue * 100) / 100,
    }))
    .sort((a, b) => b.quantity - a.quantity);

  const totalRevenue = Math.round((productSalesRevenue + deliveryFeesRevenue) * 100) / 100;
  const averageTicket =
    nonCancelledCount > 0 ? Math.round((productSalesRevenue / nonCancelledCount) * 100) / 100 : 0;

  return {
    totalRevenue,
    productSalesRevenue: Math.round(productSalesRevenue * 100) / 100,
    deliveryFeesRevenue: Math.round(deliveryFeesRevenue * 100) / 100,
    totalOrdersCount: orders.length,
    deliveredOrCompletedCount: countByStatus.ENTREGUE + countByStatus.RETIRADO,
    averageTicket,
    countByModality: {
      entrega: entregaCount,
      retirada: retiradaCount,
    },
    countByStatus,
    topSellingProducts,
  };
}

/**
 * Validates allowed status transitions according to restaurant rules
 */
export function isValidStatusTransition(
  current: OrderStatus,
  next: OrderStatus,
  modality: OrderModality
): boolean {
  if (current === next) return true;
  if (current === 'CANCELADO' || current === 'ENTREGUE' || current === 'RETIRADO') {
    return false; // Terminal states
  }
  if (next === 'CANCELADO') return true; // Can cancel anytime before completion

  // Specific rules for Retirada vs Entrega
  if (modality === 'RETIRADA') {
    if (next === 'SAIU_PARA_ENTREGA') return false; // Pickup never goes out for delivery
    if (next === 'ENTREGUE') return false; // Pickup uses RETIRADO
    return true;
  }

  if (modality === 'ENTREGA') {
    if (next === 'RETIRADO') return false; // Delivery uses ENTREGUE
    return true;
  }

  return true;
}

export interface DeliveryScheduleCheck {
  isOpen: boolean;
  currentBrasiliaTime: string;
  openTime: string;
  closeTime: string;
  statusText: string;
}

/**
 * Checks if the delivery is open based on schedule (openTime: '11:45', closeTime: '23:30')
 * and Brasilia / Luziânia-GO timezone (America/Sao_Paulo).
 */
export function isDeliveryScheduleOpen(
  now: Date = new Date(),
  openTime = '11:45',
  closeTime = '23:30'
): DeliveryScheduleCheck {
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const hourPart = parts.find((p) => p.type === 'hour')?.value || '00';
  const minPart = parts.find((p) => p.type === 'minute')?.value || '00';

  const currentMinutes = parseInt(hourPart, 10) * 60 + parseInt(minPart, 10);

  const [openH, openM] = openTime.split(':').map((s) => parseInt(s, 10) || 0);
  const [closeH, closeM] = closeTime.split(':').map((s) => parseInt(s, 10) || 0);

  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  let isOpen = false;
  if (openMinutes <= closeMinutes) {
    // Normal schedule: e.g. 11:45 to 23:30
    isOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes;
  } else {
    // Crosses midnight if ever configured
    isOpen = currentMinutes >= openMinutes || currentMinutes < closeMinutes;
  }

  const currentBrasiliaTime = `${hourPart}:${minPart}`;
  const statusText = isOpen
    ? `Aberto • Fecha às ${closeTime}`
    : `Fechado • Abre às ${openTime}`;

  return {
    isOpen,
    currentBrasiliaTime,
    openTime,
    closeTime,
    statusText,
  };
}
