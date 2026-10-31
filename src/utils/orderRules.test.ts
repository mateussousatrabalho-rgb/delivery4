/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateOrderSubtotal,
  formatOrderNumber,
  validateOrder,
  formatEpsonReceiptText,
  calculateFinancialMetrics,
  isValidStatusTransition,
  generateEscPosBytes,
  formatOrderWhatsAppMessage,
  isDeliveryScheduleOpen,
  Order,
  OrderItem,
} from './orderRules';

test('calculateOrderSubtotal sums items accurately with decimal rounding', () => {
  const items: OrderItem[] = [
    { productId: '1', name: 'Hambúrguer Artesanal', price: 28.5, quantity: 2 },
    { productId: '2', name: 'Batata Rústica', price: 18.0, quantity: 1 },
    { productId: '3', name: 'Coca-Cola Lata', price: 6.0, quantity: 3 },
  ];
  // 2 * 28.50 = 57.00
  // 1 * 18.00 = 18.00
  // 3 * 6.00 = 18.00
  // total = 93.00
  assert.equal(calculateOrderSubtotal(items), 93.0);
  assert.equal(calculateOrderSubtotal([]), 0);
});

test('formatOrderNumber formats sequential number with 4 digits', () => {
  assert.equal(formatOrderNumber(1), '0001');
  assert.equal(formatOrderNumber(42), '0042');
  assert.equal(formatOrderNumber(1250), '1250');
});

test('validateOrder correctly verifies delivery and pickup requirements', () => {
  const sampleItems: OrderItem[] = [{ productId: '1', name: 'Porção de Batata', price: 20, quantity: 1 }];

  // Invalid: missing client name
  const invalidName = validateOrder({ name: '', phone: '61999998888', modality: 'RETIRADA' }, sampleItems);
  assert.equal(invalidName.valid, false);
  assert.match(invalidName.errors[0], /nome/i);

  // Valid pickup without address
  const validPickup = validateOrder({ name: 'João Santos', phone: '61999998888', modality: 'RETIRADA' }, sampleItems);
  assert.equal(validPickup.valid, true);

  // Invalid delivery: missing street and neighborhood
  const invalidDelivery = validateOrder({ name: 'Maria Silva', phone: '61999998888', modality: 'ENTREGA' }, sampleItems);
  assert.equal(invalidDelivery.valid, false);
  assert.ok(invalidDelivery.errors.some((err) => /rua/i.test(err)));

  // Valid delivery with address
  const validDelivery = validateOrder(
    {
      name: 'Maria Silva',
      phone: '61999998888',
      modality: 'ENTREGA',
      street: 'Rua das Flores',
      neighborhood: 'Jardim do Ingá',
    },
    sampleItems
  );
  assert.equal(validDelivery.valid, true);

  // Invalid: empty cart
  const emptyCart = validateOrder(
    { name: 'João Santos', phone: '61999998888', modality: 'RETIRADA' },
    []
  );
  assert.equal(emptyCart.valid, false);
});

test('formatEpsonReceiptText formats thermal receipt matching template', () => {
  const deliveryOrder: Order = {
    id: 'ord-1',
    orderNumber: 1,
    formattedNumber: '0001',
    clientName: 'Carlos Silva',
    clientPhone: '61988887777',
    modality: 'ENTREGA',
    address: {
      street: 'Rua 15',
      number: '45',
      neighborhood: 'Jardim do Ingá',
      complement: 'Casa 02',
      reference: 'Perto do mercado',
      formatted: 'Rua 15, Nº 45 - Jardim do Ingá',
    },
    items: [
      { productId: '1', name: 'Batata Frita', price: 22.0, quantity: 2 },
      { productId: '2', name: 'Hambúrguer Especial', price: 34.0, quantity: 1 },
    ],
    subtotal: 78.0,
    deliveryFee: null,
    deliveryFeeStatus: 'PENDENTE',
    total: null,
    status: 'RECEBIDO',
    generalNotes: 'Caprichar no molho',
    createdAt: '2026-10-30T15:30:00.000Z',
    updatedAt: '2026-10-30T15:30:00.000Z',
    statusHistory: [],
    printCount: 1,
  };

  const receipt = formatEpsonReceiptText(deliveryOrder, {
    width: 80,
    restaurantName: 'VITIM COZINHA E BAR',
  });

  assert.match(receipt, /VITIM COZINHA E BAR/);
  assert.match(receipt, /PEDIDO Nº 0001/);
  assert.match(receipt, /CLIENTE: CARLOS SILVA/);
  assert.match(receipt, /TIPO: ENTREGA/);
  assert.match(receipt, /Rua 15, Nº 45/);
  assert.match(receipt, /2x BATATA FRITA/);
  assert.match(receipt, /OBSERVAÇÕES:\nCaprichar no molho/);
  assert.match(receipt, /SUBTOTAL:/);
  assert.match(receipt, /TAXA DE ENTREGA: A CONFIRMAR/);
  assert.match(receipt, /TOTAL FINAL: A CONFIRMAR/);
  assert.match(receipt, /PEDIDO RECEBIDO/);

  // Test reprint copy header
  const reprintCopy = formatEpsonReceiptText(deliveryOrder, {
    isSecondCopy: true,
    reprintDate: '30/10/2026 15:35',
  });
  assert.match(reprintCopy, /SEGUNDA VIA - REIMPRESSÃO/);

  // Test pickup receipt
  const pickupOrder: Order = {
    ...deliveryOrder,
    modality: 'RETIRADA',
    address: undefined,
  };
  const pickupReceipt = formatEpsonReceiptText(pickupOrder);
  assert.match(pickupReceipt, /TIPO: RETIRADA NO RESTAURANTE/);
  assert.match(pickupReceipt, /TAXA: R\$ 0,00/);
});

test('calculateFinancialMetrics separates products from delivery fees', () => {
  const orders: Order[] = [
    {
      id: '1',
      orderNumber: 1,
      formattedNumber: '0001',
      clientName: 'A',
      clientPhone: '1',
      modality: 'ENTREGA',
      items: [{ productId: 'p1', name: 'Burger', price: 30, quantity: 2 }],
      subtotal: 60,
      deliveryFee: 10,
      deliveryFeeStatus: 'CONFIRMADA',
      total: 70,
      status: 'ENTREGUE',
      createdAt: '2026-10-30T10:00:00Z',
      updatedAt: '2026-10-30T10:00:00Z',
      statusHistory: [],
      printCount: 1,
    },
    {
      id: '2',
      orderNumber: 2,
      formattedNumber: '0002',
      clientName: 'B',
      clientPhone: '2',
      modality: 'RETIRADA',
      items: [{ productId: 'p2', name: 'Caldo Verde', price: 25, quantity: 1 }],
      subtotal: 25,
      deliveryFee: 0,
      deliveryFeeStatus: 'ISENTA',
      total: 25,
      status: 'RETIRADO',
      createdAt: '2026-10-30T11:00:00Z',
      updatedAt: '2026-10-30T11:00:00Z',
      statusHistory: [],
      printCount: 1,
    },
    {
      id: '3',
      orderNumber: 3,
      formattedNumber: '0003',
      clientName: 'C',
      clientPhone: '3',
      modality: 'ENTREGA',
      items: [{ productId: 'p1', name: 'Burger', price: 30, quantity: 1 }],
      subtotal: 30,
      deliveryFee: 10,
      deliveryFeeStatus: 'CONFIRMADA',
      total: 40,
      status: 'CANCELADO',
      createdAt: '2026-10-30T12:00:00Z',
      updatedAt: '2026-10-30T12:00:00Z',
      statusHistory: [],
      printCount: 1,
    },
  ];

  const metrics = calculateFinancialMetrics(orders);
  // Non-cancelled orders: 1 and 2
  // Product revenue: 60 + 25 = 85
  // Delivery fee revenue: 10
  // Total revenue: 95
  assert.equal(metrics.productSalesRevenue, 85);
  assert.equal(metrics.deliveryFeesRevenue, 10);
  assert.equal(metrics.totalRevenue, 95);
  assert.equal(metrics.averageTicket, 42.5); // 85 / 2
  assert.equal(metrics.countByStatus.ENTREGUE, 1);
  assert.equal(metrics.countByStatus.RETIRADO, 1);
  assert.equal(metrics.countByStatus.CANCELADO, 1);
});

test('isValidStatusTransition validates correct transitions', () => {
  // Retirada cannot transition to SAIU_PARA_ENTREGA or ENTREGUE
  assert.equal(isValidStatusTransition('PRONTO', 'SAIU_PARA_ENTREGA', 'RETIRADA'), false);
  assert.equal(isValidStatusTransition('PRONTO', 'RETIRADO', 'RETIRADA'), true);

  // Entrega cannot transition to RETIRADO
  assert.equal(isValidStatusTransition('PRONTO', 'RETIRADO', 'ENTREGA'), false);
  assert.equal(isValidStatusTransition('PRONTO', 'SAIU_PARA_ENTREGA', 'ENTREGA'), true);
  assert.equal(isValidStatusTransition('SAIU_PARA_ENTREGA', 'ENTREGUE', 'ENTREGA'), true);
});

test('formatOrderWhatsAppMessage generates full details for location and tracking', () => {
  const sampleOrder: Order = {
    id: 'ord-99',
    orderNumber: 42,
    formattedNumber: '0042',
    clientName: 'Mariana Costa',
    clientPhone: '61988887777',
    modality: 'ENTREGA',
    address: {
      street: 'Rua das Oliveiras',
      number: '120',
      neighborhood: 'Jardim do Ingá',
      complement: 'Apt 101',
      reference: 'Próximo ao Mercado Central',
      formatted: 'Rua das Oliveiras, Nº 120 - Jardim do Ingá',
    },
    items: [
      { productId: 'p1', name: 'Combo Artesanal Burger', price: 35.0, quantity: 2, notes: 'Sem cebola' },
      { productId: 'p2', name: 'Coca-Cola Zero', price: 7.0, quantity: 2 },
    ],
    subtotal: 84.0,
    deliveryFee: null,
    deliveryFeeStatus: 'PENDENTE',
    total: null,
    status: 'RECEBIDO',
    generalNotes: 'Caprichar na maionese da casa',
    createdAt: '2026-10-30T19:00:00.000Z',
    updatedAt: '2026-10-30T19:00:00.000Z',
    statusHistory: [],
    printCount: 1,
  };

  const locMsg = formatOrderWhatsAppMessage(sampleOrder, { intent: 'LOCALIZACAO', restaurantName: 'Vitim Cozinha e Bar' });
  assert.match(locMsg, /PEDIDO #0042/);
  assert.match(locMsg, /Mariana Costa/);
  assert.match(locMsg, /61988887777/);
  assert.match(locMsg, /Rua das Oliveiras/);
  assert.match(locMsg, /Jardim do Ingá/);
  assert.match(locMsg, /2x.*Combo Artesanal Burger/);
  assert.match(locMsg, /Sem cebola/);
  assert.match(locMsg, /Caprichar na maionese da casa/);
  assert.match(locMsg, /Subtotal.*R\$\s*84,00/);
  assert.match(locMsg, /ENVIO DE LOCALIZAÇÃO DO PEDIDO/);

  const trackMsg = formatOrderWhatsAppMessage(sampleOrder, { intent: 'ACOMPANHAR' });
  assert.match(trackMsg, /PEDIDO #0042/);
  assert.match(trackMsg, /ACOMPANHAMENTO DO PEDIDO/);
});

test('generateEscPosBytes includes maximum thermal darkness initialization commands', () => {
  const bytes = generateEscPosBytes('TESTE');
  assert.ok(bytes.length > 10);
  // ESC @ = 0x1B, 0x40
  assert.equal(bytes[0], 0x1b);
  assert.equal(bytes[1], 0x40);
  // ESC 7 heating parameter = 0x1B, 0x37
  assert.equal(bytes[2], 0x1b);
  assert.equal(bytes[3], 0x37);
  // GS ( K thermal density command
  assert.equal(bytes[7], 0x1d);
  assert.equal(bytes[8], 0x28);
  assert.equal(bytes[9], 0x4b);
});

test('generateEscPosBytes prepends raster logo bytes before text', () => {
  const mockRasterLogo = new Uint8Array([0x1d, 0x76, 0x30, 0x00, 0x02, 0x00, 0x02, 0x00, 0xff, 0xff]);
  const bytes = generateEscPosBytes('TESTE COM LOGO', mockRasterLogo);
  // init commands length is 23 (2+5+7+3+3+3)
  assert.equal(bytes[23], 0x1d);
  assert.equal(bytes[24], 0x76);
  assert.equal(bytes[25], 0x30);
  assert.ok(bytes.length > mockRasterLogo.length + 23);
});

test('isDeliveryScheduleOpen automatically opens at 11:45 and closes at 23:30', () => {
  // In Brasilia (UTC-3):
  // 11:44:50 Brasilia = 14:44:50 UTC -> CLOSED
  const at1144 = new Date('2026-10-31T14:44:50Z');
  assert.equal(isDeliveryScheduleOpen(at1144, '11:45', '23:30').isOpen, false);
  assert.equal(isDeliveryScheduleOpen(at1144, '11:45', '23:30').currentBrasiliaTime, '11:44');

  // 11:45:00 Brasilia = 14:45:00 UTC -> OPEN
  const at1145 = new Date('2026-10-31T14:45:00Z');
  assert.equal(isDeliveryScheduleOpen(at1145, '11:45', '23:30').isOpen, true);
  assert.equal(isDeliveryScheduleOpen(at1145, '11:45', '23:30').currentBrasiliaTime, '11:45');

  // 18:30:00 Brasilia = 21:30:00 UTC -> OPEN
  const at1830 = new Date('2026-10-31T21:30:00Z');
  assert.equal(isDeliveryScheduleOpen(at1830, '11:45', '23:30').isOpen, true);

  // 23:29:50 Brasilia = 02:29:50 UTC (next day) -> OPEN
  const at2329 = new Date('2026-11-01T02:29:50Z');
  assert.equal(isDeliveryScheduleOpen(at2329, '11:45', '23:30').isOpen, true);
  assert.equal(isDeliveryScheduleOpen(at2329, '11:45', '23:30').currentBrasiliaTime, '23:29');

  // 23:30:00 Brasilia = 02:30:00 UTC (next day) -> CLOSED
  const at2330 = new Date('2026-11-01T02:30:00Z');
  assert.equal(isDeliveryScheduleOpen(at2330, '11:45', '23:30').isOpen, false);
  assert.equal(isDeliveryScheduleOpen(at2330, '11:45', '23:30').currentBrasiliaTime, '23:30');

  // 01:00:00 Brasilia = 04:00:00 UTC -> CLOSED
  const at0100 = new Date('2026-10-31T04:00:00Z');
  assert.equal(isDeliveryScheduleOpen(at0100, '11:45', '23:30').isOpen, false);
});



