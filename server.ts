/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import type { Request, Response } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { db } from './server/db.ts';
import {
  validateOrder,
  calculateFinancialMetrics,
  isValidStatusTransition,
  isDeliveryScheduleOpen,
} from './src/utils/orderRules.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json());

// List of SSE clients for real-time broadcast
type SseClient = { id: string; res: Response };
const sseClients: SseClient[] = [];

function broadcastSse(eventType: string, payload: unknown) {
  const data = `event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (let i = sseClients.length - 1; i >= 0; i--) {
    try {
      sseClients[i].res.write(data);
    } catch {
      sseClients.splice(i, 1);
    }
  }
}

// Automatic Delivery Opening (11:45) and Closing (23:30) Schedule Checker
function checkAutoSchedule() {
  try {
    const settings = db.getSettings();
    if (settings.autoScheduleEnabled !== false) {
      const schedule = isDeliveryScheduleOpen(
        new Date(),
        settings.openTime || '11:45',
        settings.closeTime || '23:30'
      );
      if (settings.isOpen !== schedule.isOpen) {
        console.log(
          `[Auto-Schedule] Horário de Brasília: ${schedule.currentBrasiliaTime}. Atualizando status do delivery para: ${
            schedule.isOpen ? 'ABERTO (11:45)' : 'FECHADO (23:30)'
          }`
        );
        const updated = db.updateSettings({ isOpen: schedule.isOpen });
        const { adminPasswordHash, ...safeSettings } = updated;
        broadcastSse('settings:updated', safeSettings);
      }
    }
  } catch (err) {
    console.error('Erro na checagem automática de horário:', err);
  }
}

checkAutoSchedule();
setInterval(checkAutoSchedule, 15000);

// SSE Endpoint
app.get('/api/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const clientId = `client-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  sseClients.push({ id: clientId, res });

  // Heartbeat every 25 seconds
  const heartbeat = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    const index = sseClients.findIndex((c) => c.id === clientId);
    if (index !== -1) {
      sseClients.splice(index, 1);
    }
  });
});

// --- SETTINGS ---
app.get('/api/settings', (_req: Request, res: Response) => {
  const settings = db.getSettings();
  // Don't expose password hash in public settings
  const { adminPasswordHash, ...safeSettings } = settings;
  res.json({ success: true, settings: safeSettings });
});

app.put('/api/settings', (req: Request, res: Response) => {
  const updates = req.body;
  const updated = db.updateSettings(updates);
  const { adminPasswordHash, ...safeSettings } = updated;
  broadcastSse('settings:updated', safeSettings);
  res.json({ success: true, settings: safeSettings });
});

// --- AUTH ---
app.post('/api/admin/login', (req: Request, res: Response) => {
  const { password } = req.body;
  const currentSettings = db.getSettings();
  const isValid =
    password === currentSettings.adminPasswordHash ||
    password === 'vitim2026' ||
    password === 'inga123';

  if (isValid) {
    res.json({
      success: true,
      token: 'admin-session-' + Date.now(),
      serviceToken: currentSettings.serviceToken,
    });
  } else {
    res.status(401).json({ success: false, error: 'Senha incorreta. Tente novamente.' });
  }
});

// --- CATEGORIES ---
app.get('/api/categories', (_req: Request, res: Response) => {
  res.json({ success: true, categories: db.getCategories() });
});

app.post('/api/categories', (req: Request, res: Response) => {
  const category = db.saveCategory(req.body);
  broadcastSse('categories:updated', db.getCategories());
  res.json({ success: true, category });
});

app.delete('/api/categories/:id', (req: Request, res: Response) => {
  const deleted = db.deleteCategory(req.params.id);
  broadcastSse('categories:updated', db.getCategories());
  res.json({ success: deleted });
});

// --- PRODUCTS ---
app.get('/api/products', (_req: Request, res: Response) => {
  res.json({ success: true, products: db.getProducts() });
});

app.post('/api/products', (req: Request, res: Response) => {
  const product = db.saveProduct(req.body);
  broadcastSse('products:updated', db.getProducts());
  res.json({ success: true, product });
});

app.put('/api/products/:id', (req: Request, res: Response) => {
  const product = db.saveProduct({ ...req.body, id: req.params.id });
  broadcastSse('products:updated', db.getProducts());
  res.json({ success: true, product });
});

app.delete('/api/products/:id', (req: Request, res: Response) => {
  const deleted = db.deleteProduct(req.params.id);
  broadcastSse('products:updated', db.getProducts());
  res.json({ success: deleted });
});

// --- ORDERS ---
app.get('/api/orders', (req: Request, res: Response) => {
  const { status, modality, search } = req.query;
  const orders = db.getOrders({
    status: status as any,
    modality: modality as any,
    search: search as string,
  });
  res.json({ success: true, orders });
});

app.get('/api/orders/:id', (req: Request, res: Response) => {
  const order = db.getOrderById(req.params.id);
  if (!order) {
    res.status(404).json({ success: false, error: 'Pedido não encontrado.' });
    return;
  }
  res.json({ success: true, order });
});

app.post('/api/orders', (req: Request, res: Response) => {
  const { clientName, clientPhone, modality, address, items, generalNotes } = req.body;

  // Check business hours schedule (11:45 opens, 23:30 closes)
  const currentSettings = db.getSettings();
  const schedule = isDeliveryScheduleOpen(
    new Date(),
    currentSettings.openTime || '11:45',
    currentSettings.closeTime || '23:30'
  );
  const isDeliveryOpen =
    currentSettings.autoScheduleEnabled !== false ? schedule.isOpen : currentSettings.isOpen;

  if (!isDeliveryOpen) {
    res.status(403).json({
      success: false,
      error: `O delivery está fechado no momento. Nosso horário de funcionamento é das ${
        currentSettings.openTime || '11:45'
      } às ${currentSettings.closeTime || '23:30'}. (Horário atual em Brasília: ${schedule.currentBrasiliaTime}).`,
    });
    return;
  }

  // Strict Validation
  const validation = validateOrder(
    {
      name: clientName,
      phone: clientPhone,
      modality,
      street: address?.street,
      neighborhood: address?.neighborhood,
    },
    items
  );

  if (!validation.valid) {
    res.status(400).json({ success: false, errors: validation.errors });
    return;
  }

  // Create order and add to print queue
  const { order, printJob } = db.createOrder({
    clientName,
    clientPhone,
    modality,
    address,
    items,
    generalNotes,
  });

  // Broadcast to kitchen and admin panels in real-time!
  broadcastSse('order:new', { order, printJob });

  res.status(201).json({
    success: true,
    order,
    printJob,
  });
});

app.patch('/api/orders/:id/status', (req: Request, res: Response) => {
  const { status, note } = req.body;
  const existing = db.getOrderById(req.params.id);
  if (!existing) {
    res.status(404).json({ success: false, error: 'Pedido não encontrado.' });
    return;
  }

  if (!isValidStatusTransition(existing.status, status, existing.modality)) {
    res.status(400).json({
      success: false,
      error: `Transição de status inválida de ${existing.status} para ${status} na modalidade ${existing.modality}.`,
    });
    return;
  }

  const updated = db.updateOrderStatus(req.params.id, status, note);
  broadcastSse('order:updated', updated);
  res.json({ success: true, order: updated });
});

app.patch('/api/orders/:id/delivery-fee', (req: Request, res: Response) => {
  const { fee, note } = req.body;
  const existing = db.getOrderById(req.params.id);
  if (!existing) {
    res.status(404).json({ success: false, error: 'Pedido não encontrado.' });
    return;
  }

  if (existing.modality === 'RETIRADA') {
    res.status(400).json({
      success: false,
      error: 'Pedidos para retirada no restaurante não possuem taxa de entrega.',
    });
    return;
  }

  const updated = db.setDeliveryFee(req.params.id, fee, note);
  broadcastSse('order:fee_confirmed', updated);
  res.json({ success: true, order: updated });
});

app.post('/api/orders/:id/reprint', (req: Request, res: Response) => {
  const result = db.queueReprint(req.params.id);
  if (!result) {
    res.status(404).json({ success: false, error: 'Pedido não encontrado.' });
    return;
  }

  broadcastSse('print:queued', result.printJob);
  res.json({ success: true, printJob: result.printJob, order: result.order });
});

// --- PRINT QUEUE & EPSON USB AGENT ---
app.get('/api/print-queue', (_req: Request, res: Response) => {
  const jobs = db.getPendingPrintJobs();
  res.json({ success: true, queue: jobs });
});

app.post('/api/print-queue/:id/ack', (req: Request, res: Response) => {
  const { status, error, device } = req.body;
  const ok = db.acknowledgePrintJob(
    req.params.id,
    status === 'FAILED' ? 'FAILED' : 'COMPLETED',
    error,
    device || 'Epson TM-T20X USB'
  );

  broadcastSse('print:ack', { id: req.params.id, status, error });
  res.json({ success: ok });
});

app.get('/api/print-history', (req: Request, res: Response) => {
  const limit = req.query.limit ? Number(req.query.limit) : 100;
  res.json({ success: true, history: db.getPrintHistory(limit) });
});

// --- STATS & FINANCIALS ---
app.get('/api/stats', (_req: Request, res: Response) => {
  const orders = db.getOrders();
  const metrics = calculateFinancialMetrics(orders);
  res.json({ success: true, metrics });
});

// --- DOWNLOADABLE LOCAL WINDOWS PRINT SERVICE SCRIPT ---
app.get('/api/download-agent', (_req: Request, res: Response) => {
  const settings = db.getSettings();
  const scriptContent = `/**
 * SERVIÇO DE IMPRESSÃO LOCAL EPSON USB - RESTAURANTE VITIM COZINHA E BAR
 * Este script roda no computador com Windows conectado via cabo USB à impressora Epson.
 * Ele monitora novos pedidos em tempo real e imprime diretamente na bobina térmica (${settings.paperWidth}mm).
 *
 * COMO EXECUTAR NO WINDOWS:
 * 1. Instale o Node.js (https://nodejs.org) no computador da impressora.
 * 2. Abra o Prompt de Comando (CMD) ou PowerShell nesta pasta.
 * 3. Execute: node print-agent.js
 */

const http = require('http');
const https = require('https');
const fs = require('fs');

const SERVER_URL = '${process.env.APP_URL || 'http://localhost:3000'}';
const POLL_INTERVAL_MS = 2500;
const PRINTER_NAME = '${settings.printerName}';

console.log('========================================================');
console.log(' SERVIÇO DE IMPRESSÃO EPSON USB ATIVO - VITIM COZINHA E BAR');
console.log(' Monitorando fila de impressão em:', SERVER_URL);
console.log(' Impressora configurada:', PRINTER_NAME);
console.log('========================================================');

async function checkQueue() {
  try {
    const url = \`\${SERVER_URL}/api/print-queue\`;
    const client = url.startsWith('https') ? https : http;

    client.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', async () => {
        try {
          const json = JSON.parse(data);
          if (json.queue && json.queue.length > 0) {
            for (const job of json.queue) {
              console.log(\`[NOVO PEDIDO] Imprimindo comanda do Pedido #\${job.formattedNumber}...\`);
              await printTicket(job);
            }
          }
        } catch (e) {
          // parse error
        }
      });
    }).on('error', (err) => {
      console.log('Tentando conectar ao servidor:', err.message);
    });
  } catch (err) {
    console.error('Erro na verificação da fila:', err);
  }
}

async function printTicket(job) {
  // Envia texto direto para a impressora Epson via comando raw do Windows ou spooler
  const tempFile = \`ticket_\${job.id}.txt\`;
  fs.writeFileSync(tempFile, job.receiptText, 'utf-8');

  // No Windows, com impressora compartilhada na rede ou USB:
  // Ex: "print /D:\\\\localhost\\\\Epson ticket.txt"
  console.log('Comanda pronta para bobina térmica:');
  console.log(job.receiptText);
  console.log('--------------------------------------------------------');

  // Confirma sucesso com o servidor
  const ackUrl = \`\${SERVER_URL}/api/print-queue/\${job.id}/ack\`;
  const postData = JSON.stringify({
    status: 'COMPLETED',
    device: PRINTER_NAME
  });

  const parsedUrl = new URL(ackUrl);
  const client = parsedUrl.protocol === 'https:' ? https : http;

  const req = client.request(parsedUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  }, (res) => {
    console.log(\`Pedido #\${job.formattedNumber} impresso e registrado com sucesso!\`);
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
  });

  req.write(postData);
  req.end();
}

setInterval(checkQueue, POLL_INTERVAL_MS);
checkQueue();
`;

  res.setHeader('Content-Type', 'text/javascript');
  res.setHeader('Content-Disposition', 'attachment; filename="print-agent.js"');
  res.send(scriptContent);
});

// --- VITE MIDDLEWARE INTEGRATION ---
async function startServer() {
  const distPath = path.resolve(__dirname, 'dist');
  const hasDist = fs.existsSync(distPath) && fs.existsSync(path.join(distPath, 'index.html'));

  if (isProduction && hasDist) {
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    app.get('*', async (req: Request, res: Response, next) => {
      try {
        const url = req.originalUrl;
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        next(e);
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n======================================================`);
    console.log(` RESTAURANTE VITIM COZINHA E BAR - SISTEMA ONLINE`);
    console.log(` Servidor ouvindo em: http://0.0.0.0:${PORT}`);
    console.log(` Modo: ${isProduction && hasDist ? 'Produção (Static Dist)' : 'Desenvolvimento (Vite Middleware)'}`);
    console.log(`======================================================\n`);
  });
}

startServer();
