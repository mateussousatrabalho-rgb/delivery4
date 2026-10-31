/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Printer,
  Usb,
  Download,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sliders,
  Store,
  Clock,
  Phone,
  HelpCircle,
  FileText,
  Play,
  RotateCcw,
  Info,
} from 'lucide-react';
import { RestaurantSettings, PrintJob, PrintHistoryEntry } from '../../../server/db';
import { epsonPrinter } from '../../services/epsonPrinter.ts';

interface Props {
  settings: RestaurantSettings;
  onUpdateSettings: (updates: Partial<RestaurantSettings>) => Promise<void>;
}

export const AdminPrinterSettings: React.FC<Props> = ({
  settings,
  onUpdateSettings,
}) => {
  const [formData, setFormData] = useState<RestaurantSettings>(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [printQueue, setPrintQueue] = useState<PrintJob[]>([]);
  const [printHistory, setPrintHistory] = useState<PrintHistoryEntry[]>([]);
  const [usbStatus, setUsbStatus] = useState<string>('Pronto para conexão');
  const [isUsbConnected, setIsUsbConnected] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    setFormData(settings);
    epsonPrinter.setPaperWidth(settings.paperWidth);
    loadQueueAndHistory();
    checkExistingUsb();
  }, [settings]);

  const checkExistingUsb = async () => {
    const res = await epsonPrinter.autoConnectExistingPort();
    if (res.connected) {
      setIsUsbConnected(true);
      setUsbStatus(`Conectado via USB: ${res.deviceName}`);
    } else if (epsonPrinter.isSerialConnected()) {
      setIsUsbConnected(true);
      setUsbStatus('Conectado via USB (Pronto)');
    }
  };

  const loadQueueAndHistory = async () => {
    try {
      const [queueRes, histRes] = await Promise.all([
        fetch('/api/print-queue'),
        fetch('/api/print-history'),
      ]);
      const queueData = await queueRes.json();
      const histData = await histRes.json();
      if (queueData.success) setPrintQueue(queueData.queue || []);
      if (histData.success) setPrintHistory(histData.history || []);
    } catch (e) {
      console.error('Error fetching print info:', e);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await onUpdateSettings(formData);
      epsonPrinter.setPaperWidth(formData.paperWidth);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConnectWebSerial = async () => {
    setUsbStatus('Solicitando permissão de porta USB no Chrome...');
    const res = await epsonPrinter.connectWebSerialUSB();
    if (res.success) {
      setIsUsbConnected(true);
      setUsbStatus(`Conectado via USB: ${res.deviceName}`);
    } else {
      setIsUsbConnected(false);
      setUsbStatus(`Aviso USB: ${res.error}`);
    }
  };

  const handleDisconnectWebSerial = async () => {
    const res = await epsonPrinter.disconnectWebSerialUSB();
    setIsUsbConnected(false);
    setUsbStatus(res.message);
  };

  const handleTestPrint = async () => {
    setIsTesting(true);
    setTestResult(null);

    const testTicket = `
================================
${formData.restaurantName.toUpperCase()}
TESTE DE IMPRESSÃO EPSON USB
================================
IMPRESSORA: ${formData.printerName}
BOBINA: ${formData.paperWidth}mm
HORÁRIO: ${new Date().toLocaleString('pt-BR')}
LOCALIZAÇÃO: ${formData.neighborhood}, ${formData.cityState}
STATUS DA CONEXÃO: OK
================================
TESTE CONCLUÍDO COM SUCESSO!
`.trim();

    try {
      const res = await epsonPrinter.printReceipt(testTicket, {
        printerName: formData.printerName,
        logoUrl: formData.printLogoUrl || '/assets/aistudio/IMG_0848-Photoroomm_42d628da.png',
      });
      if (res.success) {
        setTestResult(`Impressão de teste enviada com sucesso via ${res.method}!`);
        loadQueueAndHistory();
      } else {
        setTestResult(`Falha no teste: ${res.error}`);
      }
    } finally {
      setIsTesting(false);
    }
  };

  const handleRetryJob = async (jobId: string) => {
    try {
      const job = printQueue.find((j) => j.id === jobId);
      if (job) {
        await epsonPrinter.printReceipt(job.receiptText, {
          printerName: formData.printerName,
          jobId: job.id,
          logoUrl: formData.printLogoUrl || '/assets/aistudio/IMG_0848-Photoroomm_42d628da.png',
        });
        loadQueueAndHistory();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 text-white pb-12">
      {/* Header */}
      <div className="bg-[#141417] border border-zinc-800 p-6 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Printer className="w-5 h-5 text-orange-500" />
            Configuração da Impressora Epson USB & Restaurante
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Gestão da bobina térmica de 80mm/58mm, serviço de impressão local Windows e dados do estabelecimento
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadQueueAndHistory}
            className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition cursor-pointer"
            title="Atualizar fila de impressão"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="bg-emerald-950/80 border border-emerald-500/40 rounded-2xl p-4 text-xs text-emerald-200 flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Configurações salvas e aplicadas com sucesso!</span>
        </div>
      )}

      {testResult && (
        <div className="bg-orange-950/80 border border-orange-500/40 rounded-2xl p-4 text-xs text-orange-200 flex items-center justify-between animate-fadeIn">
          <span>{testResult}</span>
          <button onClick={() => setTestResult(null)} className="font-bold underline text-xs">
            Fechar
          </button>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Section 1: Epson USB Hardware Configuration */}
        <div className="bg-[#141417] border border-zinc-800 rounded-3xl p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2 text-white font-black text-base">
              <Usb className="w-5 h-5 text-orange-500" />
              <span>Conexão & Bobina Térmica Epson USB</span>
            </div>
            <span className="text-xs text-zinc-400 font-semibold">
              Windows USB Driver
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                Modelo da Impressora Epson
              </label>
              <input
                type="text"
                value={formData.printerName}
                onChange={(e) =>
                  setFormData({ ...formData, printerName: e.target.value })
                }
                placeholder="Ex: EPSON TM-T20X, TM-T88, TM-T20"
                className="w-full bg-zinc-950 border border-zinc-700 focus:border-orange-500 rounded-xl px-4 py-2.5 text-white text-xs outline-none"
              />
              <p className="text-[11px] text-zinc-500 mt-1">
                Nome exato da impressora instalado no Windows (Painel de Controle &gt; Dispositivos e Impressoras).
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                Tamanho da Bobina Térmica *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, paperWidth: 80 })}
                  className={`p-3 rounded-xl border text-center transition cursor-pointer ${
                    formData.paperWidth === 80
                      ? 'bg-orange-950/60 border-orange-500 text-orange-400 font-black ring-1 ring-orange-500/30'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <span className="block text-sm">80 mm (Padrão)</span>
                  <span className="text-[10px] text-zinc-500 font-normal">
                    48 colunas por linha
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, paperWidth: 58 })}
                  className={`p-3 rounded-xl border text-center transition cursor-pointer ${
                    formData.paperWidth === 58
                      ? 'bg-orange-950/60 border-orange-500 text-orange-400 font-black ring-1 ring-orange-500/30'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <span className="block text-sm">58 mm</span>
                  <span className="text-[10px] text-zinc-500 font-normal">
                    32 colunas por linha
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Thermal Darkness Indicator */}
          <div className="bg-orange-950/30 border border-orange-500/30 rounded-2xl p-4 flex items-start gap-3">
            <span className="w-8 h-8 rounded-xl bg-orange-600/30 text-orange-400 border border-orange-500/40 flex items-center justify-center font-bold text-sm flex-shrink-0">
              Aa
            </span>
            <div className="text-xs">
              <span className="font-extrabold text-white block">
                Modo Alta Densidade Térmica & Letra Escura Ativado (ESC/POS)
              </span>
              <p className="text-zinc-300 mt-0.5 leading-relaxed">
                A comanda está configurada com queima térmica máxima (+4 / 130% de energia nos pontos), fonte padrão Font A (12×24) e modos <strong>Emphasized</strong> e <strong>Double-Strike</strong> ativados. O texto sai preto sólido, grosso e nítido na bobina da Epson.
              </p>
            </div>
          </div>

          {/* Quick Actions for Hardware Connection */}
          <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white block">
                  Comunicação com a Impressora Epson USB
                </span>
                {isUsbConnected ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    USB Conectado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-800 text-zinc-400">
                    Não pareado
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400">
                Status: <strong className={isUsbConnected ? 'text-emerald-400' : 'text-orange-400'}>{usbStatus}</strong>
              </p>

              {usbStatus && (usbStatus.includes('iframe') || usbStatus.includes('bloqueado')) && (
                <div className="mt-2 p-2.5 rounded-xl bg-orange-950/40 border border-orange-500/30 text-orange-200 text-xs space-y-1">
                  <p className="font-bold flex items-center gap-1.5 text-white">
                    <Info className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                    Aviso sobre o pareamento USB no quadro (iframe):
                  </p>
                  <p className="text-[11px] text-zinc-300 leading-relaxed">
                    A impressão térmica da comanda <strong>NÃO depende do pareamento WebSerial</strong>. Ao clicar em <strong>"Testar Impressão"</strong> ou receber novos pedidos, a comanda é enviada via Driver Epson / Spooler do Windows automaticamente.
                  </p>
                  <p className="text-[11px] text-zinc-300 leading-relaxed">
                    Para habilitar o pareamento USB direto (WebSerial), abra o link do sistema diretamente em uma aba separada do navegador.
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleConnectWebSerial}
                className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-bold text-zinc-200 hover:text-white transition cursor-pointer flex items-center gap-1.5"
                title="Conectar ou parear impressora USB no Chrome"
              >
                <Usb className="w-3.5 h-3.5 text-orange-400" />
                <span>{isUsbConnected ? 'Trocar Porta USB' : 'Parear Porta USB (Chrome)'}</span>
              </button>

              {isUsbConnected && (
                <button
                  type="button"
                  onClick={handleDisconnectWebSerial}
                  className="px-3 py-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-400 hover:text-red-400 transition cursor-pointer"
                  title="Liberar e fechar porta serial USB no navegador"
                >
                  Liberar Porta
                </button>
              )}

              <button
                type="button"
                disabled={isTesting}
                onClick={handleTestPrint}
                className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-black shadow-md shadow-orange-600/20 transition cursor-pointer flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{isTesting ? 'Enviando...' : 'Testar Impressão'}</span>
              </button>
            </div>
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <label className="flex items-center gap-3 p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.autoPrintOnNewOrder}
                onChange={(e) =>
                  setFormData({ ...formData, autoPrintOnNewOrder: e.target.checked })
                }
                className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500"
              />
              <div>
                <span className="text-xs font-bold text-white block">
                  Imprimir Comanda Automaticamente ao Chegar Pedido
                </span>
                <span className="text-[10px] text-zinc-400">
                  Envia a comanda para a impressora assim que o cliente clica em finalizar
                </span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.soundAlertEnabled}
                onChange={(e) =>
                  setFormData({ ...formData, soundAlertEnabled: e.target.checked })
                }
                className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500"
              />
              <div>
                <span className="text-xs font-bold text-white block">
                  Alerta Sonoro no Painel (Sino de Cozinha)
                </span>
                <span className="text-[10px] text-zinc-400">
                  Toca som nítido na recepção sempre que um novo pedido for feito
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Section 2: Windows Local Print Agent (Requisito 2.6) */}
        <div className="bg-[#141417] border border-zinc-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2 text-white font-black text-base">
              <Download className="w-5 h-5 text-orange-500" />
              <span>Serviço de Impressão Local para Windows (QZ Tray / Agent)</span>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
              Totalmente Independente
            </span>
          </div>

          <p className="text-xs text-zinc-300 leading-relaxed">
            Conforme especificado, a impressão USB no restaurante não depende do navegador do cliente. O computador do restaurante conecta-se à impressora Epson e busca pedidos pendentes da fila para impressão imediata.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Option A: Local Script */}
            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-orange-600 text-white font-bold text-xs flex items-center justify-center">
                  1
                </span>
                <h4 className="font-bold text-xs text-white">
                  Script de Impressão Windows Local (Node.js)
                </h4>
              </div>
              <p className="text-[11px] text-zinc-400">
                Baixe o script oficial de monitoramento que roda no Windows, recebe os pedidos e manda para a Epson USB.
              </p>
              <a
                href="/api/download-agent"
                download="print-agent.js"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Baixar print-agent.js</span>
              </a>
            </div>

            {/* Option B: QZ Tray */}
            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                  2
                </span>
                <h4 className="font-bold text-xs text-white">
                  Integração Direta QZ Tray (Driver Epson)
                </h4>
              </div>
              <p className="text-[11px] text-zinc-400">
                O sistema conecta-se automaticamente ao software QZ Tray no computador do restaurante via WebSocket seguro.
              </p>
              <div className="text-[11px] text-zinc-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Driver Epson TM Spooler pronto</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Restaurant General Data */}
        <div className="bg-[#141417] border border-zinc-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-white font-black text-base border-b border-zinc-800 pb-3">
            <Store className="w-5 h-5 text-orange-500" />
            <span>Informações do Restaurante (Jardim do Ingá)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Nome do Estabelecimento *
              </label>
              <input
                type="text"
                required
                value={formData.restaurantName}
                onChange={(e) =>
                  setFormData({ ...formData, restaurantName: e.target.value })
                }
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-white text-xs outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                WhatsApp Oficial (com DDD) *
              </label>
              <input
                type="text"
                required
                value={formData.whatsappNumber}
                onChange={(e) =>
                  setFormData({ ...formData, whatsappNumber: e.target.value })
                }
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-white text-xs outline-none font-bold text-emerald-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Bairro e Cidade
              </label>
              <input
                type="text"
                value={`${formData.neighborhood}, ${formData.cityState}`}
                onChange={(e) => {
                  const parts = e.target.value.split(',');
                  setFormData({
                    ...formData,
                    neighborhood: parts[0]?.trim() || formData.neighborhood,
                    cityState: parts[1]?.trim() || formData.cityState,
                  });
                }}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-white text-xs outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Endereço Completo para Retirada
              </label>
              <input
                type="text"
                value={formData.fullAddress}
                onChange={(e) =>
                  setFormData({ ...formData, fullAddress: e.target.value })
                }
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-white text-xs outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Horário de Funcionamento
              </label>
              <input
                type="text"
                value={formData.openingHours}
                onChange={(e) =>
                  setFormData({ ...formData, openingHours: e.target.value })
                }
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-white text-xs outline-none"
              />
            </div>

            <div className="sm:col-span-2 space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Logomarca do Cardápio & Painel (Fundo Escuro)
                </label>
                <div className="flex items-center gap-4 bg-zinc-950 border border-zinc-800 rounded-2xl p-3">
                  <div className="w-16 h-16 rounded-xl bg-black p-1 flex items-center justify-center border border-zinc-700 flex-shrink-0 shadow-sm">
                    <img
                      src={formData.logoUrl || '/assets/aistudio/IMG_0848-Photoroom_78eae265.png'}
                      alt="Logo Site"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={formData.logoUrl}
                      onChange={(e) =>
                        setFormData({ ...formData, logoUrl: e.target.value })
                      }
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white text-xs outline-none"
                      placeholder="/assets/aistudio/IMG_0848-Photoroom_78eae265.png"
                    />
                    <p className="text-[10px] text-zinc-400 mt-1">
                      Exibida no cabeçalho do cardápio digital do cliente e no painel administrativo.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Logomarca de Impressão Térmica (Topo da Comanda / Bobina Epson)
                </label>
                <div className="flex items-center gap-4 bg-zinc-950 border border-zinc-800 rounded-2xl p-3">
                  <div className="w-16 h-16 rounded-xl bg-white p-1 flex items-center justify-center border border-zinc-300 flex-shrink-0 shadow-sm">
                    <img
                      src={formData.printLogoUrl || '/assets/aistudio/IMG_0848-Photoroomm_42d628da.png'}
                      alt="Logo Impressão"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={formData.printLogoUrl || '/assets/aistudio/IMG_0848-Photoroomm_42d628da.png'}
                      onChange={(e) =>
                        setFormData({ ...formData, printLogoUrl: e.target.value })
                      }
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white text-xs outline-none"
                      placeholder="/assets/aistudio/IMG_0848-Photoroomm_42d628da.png"
                    />
                    <p className="text-[10px] text-zinc-400 mt-1">
                      Exibida exclusivamente no topo de cada pedido impresso e na simulação da comanda térmica.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white font-black text-sm shadow-xl shadow-orange-600/30 transition cursor-pointer"
          >
            {isSaving ? 'Salvando Configurações...' : 'Salvar Todas as Configurações'}
          </button>
        </div>
      </form>

      {/* Section 4: Print Queue & History (Requisitos 2.6 & 4) */}
      <div className="bg-[#141417] border border-zinc-800 rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2 text-white font-black text-base">
            <Clock className="w-5 h-5 text-orange-500" />
            <span>Fila de Impressão & Histórico de Dispositivos</span>
          </div>
          <span className="text-xs text-zinc-400">
            Fila Ativa: <strong className="text-white">{printQueue.length}</strong> pendentes
          </span>
        </div>

        {printQueue.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-orange-400">
              Comandas na Fila para Impressão
            </h4>
            {printQueue.map((job) => (
              <div
                key={job.id}
                className="p-3.5 rounded-2xl bg-zinc-950 border border-orange-500/30 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-white block">
                    Pedido #{job.formattedNumber} ({job.isSecondCopy ? '2ª VIA' : 'ORIGINAL'})
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    Tentativas: {job.attempts}/{job.maxAttempts} • Status: {job.status}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRetryJob(job.id)}
                  className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Tentar Novamente
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Print History Log */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
            Últimas Impressões Realizadas
          </h4>
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {printHistory.length === 0 ? (
              <p className="text-xs text-zinc-500 py-3">Nenhuma impressão registrada no log.</p>
            ) : (
              printHistory.map((entry) => (
                <div
                  key={entry.id}
                  className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        entry.status === 'SUCCESS' ? 'bg-emerald-400' : 'bg-red-400'
                      }`}
                    />
                    <span className="font-bold text-white">
                      Pedido #{entry.formattedNumber}
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      [{entry.type}]
                    </span>
                  </div>

                  <div className="text-right text-[11px] text-zinc-400">
                    <span>{new Date(entry.timestamp).toLocaleString('pt-BR')}</span>
                    <span className="block text-[10px] text-zinc-500">
                      {entry.printerDevice}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
