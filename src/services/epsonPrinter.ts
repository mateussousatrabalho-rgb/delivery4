/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { generateEscPosBytes, generateEscPosRasterLogo } from '../utils/orderRules.ts';

export type PrinterConnectionType = 'webserial' | 'qztray' | 'browser' | 'agent';

export interface PrinterStatus {
  connected: boolean;
  type: PrinterConnectionType;
  deviceName?: string;
  paperWidth: 80 | 58;
  error?: string;
}

class EpsonPrinterService {
  private serialPort: any = null;
  private qzSocket: WebSocket | null = null;
  private qzConnected = false;
  private defaultWidth: 80 | 58 = 80;

  constructor() {
    // QZ Tray initialized on demand
  }

  public setPaperWidth(width: 80 | 58) {
    this.defaultWidth = width;
  }

  public getPaperWidth(): 80 | 58 {
    return this.defaultWidth;
  }

  // --- QZ TRAY INTEGRATION ---
  public tryConnectQzTray(): Promise<boolean> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') return resolve(false);
      try {
        const ws = new WebSocket('ws://localhost:8182');
        ws.onopen = () => {
          this.qzConnected = true;
          this.qzSocket = ws;
          resolve(true);
        };
        ws.onclose = () => {
          this.qzConnected = false;
          this.qzSocket = null;
          resolve(false);
        };
        ws.onerror = () => {
          this.qzConnected = false;
          resolve(false);
        };
      } catch {
        resolve(false);
      }
    });
  }

  public isQzTrayConnected(): boolean {
    return this.qzConnected && this.qzSocket?.readyState === WebSocket.OPEN;
  }

  // --- WEBSERIAL DIRECT USB (CHROME WINDOWS) ---
  private isPortOpen(port: any): boolean {
    return Boolean(port && (port.readable !== null || port.writable !== null));
  }

  private getDeviceLabel(port: any): string {
    try {
      const info = port?.getInfo?.() || {};
      if (info.usbVendorId) {
        const vidHex = info.usbVendorId.toString(16).padStart(4, '0').toUpperCase();
        const pidHex = info.usbProductId ? info.usbProductId.toString(16).padStart(4, '0').toUpperCase() : '----';
        if (vidHex === '04B8') {
          return `Epson USB Térmica TM (VID: 0x${vidHex}, PID: 0x${pidHex})`;
        }
        return `Impressora USB Serial (VID: 0x${vidHex}, PID: 0x${pidHex})`;
      }
    } catch {}
    return 'Epson USB Serial Port';
  }

  /**
   * Automatically attempts to detect and connect to previously authorized WebSerial ports
   */
  public async autoConnectExistingPort(): Promise<{ connected: boolean; deviceName?: string }> {
    if (typeof navigator === 'undefined' || !('serial' in navigator)) {
      return { connected: false };
    }

    try {
      const ports = await (navigator as any).serial.getPorts();
      if (ports && ports.length > 0) {
        const port = ports[0];
        // If port is already open, reuse it immediately
        if (this.isPortOpen(port)) {
          this.serialPort = port;
          return { connected: true, deviceName: this.getDeviceLabel(port) };
        }

        // Try opening it
        try {
          await port.open({ baudRate: 9600 });
          this.serialPort = port;
          return { connected: true, deviceName: this.getDeviceLabel(port) };
        } catch (openErr: any) {
          const msg = String(openErr?.message || '').toLowerCase();
          if (openErr?.name === 'InvalidStateError' || msg.includes('already open') || msg.includes('já está aberta')) {
            this.serialPort = port;
            return { connected: true, deviceName: this.getDeviceLabel(port) };
          }
        }
      }
    } catch (e) {
      console.debug('Autoconexão WebSerial:', e);
    }

    return { connected: false };
  }

  public async connectWebSerialUSB(): Promise<{ success: boolean; deviceName?: string; error?: string }> {
    if (typeof navigator === 'undefined' || !('serial' in navigator)) {
      return {
        success: false,
        error: 'Navegador não suporta WebSerial. Utilize o Google Chrome ou Microsoft Edge.',
      };
    }

    try {
      // Prompt user to select port
      const port = await (navigator as any).serial.requestPort({});

      // If user selected the same port or a port that is ALREADY open, reuse it cleanly
      if (this.isPortOpen(port)) {
        this.serialPort = port;
        const name = this.getDeviceLabel(port);
        return {
          success: true,
          deviceName: name,
        };
      }

      // If a different port was previously opened, attempt to close it first
      if (this.serialPort && this.serialPort !== port && this.isPortOpen(this.serialPort)) {
        try {
          await this.serialPort.close();
        } catch {}
      }

      // Open port with standard Epson baud rate
      try {
        await port.open({ baudRate: 9600 });
      } catch (openErr: any) {
        const msg = String(openErr?.message || '').toLowerCase();
        // If the error indicates port is already open, it is ready for use!
        if (openErr?.name === 'InvalidStateError' || msg.includes('already open') || msg.includes('já está aberta')) {
          console.info('Porta serial já estava aberta pelo Chrome, reutilizando:', openErr);
        } else {
          throw openErr;
        }
      }

      this.serialPort = port;
      return { success: true, deviceName: this.getDeviceLabel(port) };
    } catch (err: any) {
      const msg = String(err?.message || '');
      // Even in outer catch, verify if "already open" message is present
      if (msg.toLowerCase().includes('already open') || err?.name === 'InvalidStateError') {
        return {
          success: true,
          deviceName: 'Epson USB Serial Port (Já Ativa)',
        };
      }
      if (msg.toLowerCase().includes('permissions policy') || msg.toLowerCase().includes('disallowed')) {
        return {
          success: false,
          error:
            'Acesso USB direto bloqueado pela política de segurança do quadro (iframe). A impressão da comanda continua funcionando normalmente via Driver Epson/Spooler ou abrindo o link do app em uma nova aba.',
        };
      }
      return {
        success: false,
        error: msg || 'Conexão USB cancelada ou dispositivo ocupado por outro programa.',
      };
    }
  }

  /**
   * Releases and disconnects the WebSerial port cleanly
   */
  public async disconnectWebSerialUSB(): Promise<{ success: boolean; message: string }> {
    if (!this.serialPort) {
      return { success: true, message: 'Nenhuma porta USB conectada.' };
    }

    try {
      if (this.isPortOpen(this.serialPort)) {
        await this.serialPort.close();
      }
    } catch (err: any) {
      console.warn('Erro ao fechar porta USB:', err);
    } finally {
      this.serialPort = null;
    }

    return { success: true, message: 'Porta USB desconectada e liberada com sucesso.' };
  }

  public isSerialConnected(): boolean {
    return Boolean(this.serialPort && this.isPortOpen(this.serialPort));
  }

  /**
   * Dispatches receipt print using available method
   */
  public async printReceipt(
    receiptText: string,
    options: {
      printerName?: string;
      jobId?: string;
      logoUrl?: string;
    } = {}
  ): Promise<{ success: boolean; method: string; error?: string }> {
    const logoToUse = options.logoUrl || '/assets/aistudio/IMG_0848-Photoroomm_42d628da.png';

    // 1. Try Direct WebSerial if connected
    if (this.serialPort && this.serialPort.writable) {
      let writer: any = null;
      try {
        if (!this.serialPort.writable.locked) {
          writer = this.serialPort.writable.getWriter();

          let rasterLogoBytes: Uint8Array | null = null;
          if (logoToUse) {
            try {
              const maxDots = this.defaultWidth === 80 ? 384 : 288;
              rasterLogoBytes = await generateEscPosRasterLogo(logoToUse, maxDots);
            } catch (err) {
              console.warn('Erro ao gerar raster da logo para WebSerial:', err);
            }
          }

          const escPosBytes = generateEscPosBytes(receiptText, rasterLogoBytes);
          await writer.write(escPosBytes);

          if (options.jobId) {
            await this.acknowledgeJob(options.jobId, 'COMPLETED', 'Epson USB WebSerial');
          }

          return { success: true, method: 'Epson USB (WebSerial)' };
        } else {
          console.warn('Porta serial bloqueada no momento por outra escrita.');
        }
      } catch (err: any) {
        console.error('Falha na impressão WebSerial:', err);
      } finally {
        if (writer) {
          try {
            writer.releaseLock();
          } catch {}
        }
      }
    }

    // 2. Try QZ Tray if connected
    if (this.isQzTrayConnected()) {
      try {
        // High density heating, Font A, Emphasized (bold), and Double-strike commands
        const escPosPrefix = '\x1b@\x1b7\x07\xf0\x02\x1d(K\x02\x00\x31\x08\x1bM\x00\x1bE\x01\x1bG\x01';
        const escPosSuffix = '\n\n\n\x1bE\x00\x1bG\x00\x1dVB\x00';
        const qzPayload = {
          call: 'print',
          printer: options.printerName || 'EPSON TM-T20X',
          data: [{ type: 'raw', format: 'command', data: escPosPrefix + receiptText + escPosSuffix }],
        };
        this.qzSocket?.send(JSON.stringify(qzPayload));

        if (options.jobId) {
          await this.acknowledgeJob(options.jobId, 'COMPLETED', 'QZ Tray Epson Driver');
        }

        return { success: true, method: 'QZ Tray (Driver Epson Windows)' };
      } catch (err: any) {
        console.error('Falha no QZ Tray:', err);
      }
    }

    // 3. Fallback to Browser Thermal Print Frame
    const printed = this.printViaHiddenFrame(receiptText, logoToUse);
    if (printed) {
      if (options.jobId) {
        await this.acknowledgeJob(options.jobId, 'COMPLETED', 'Spooler Térmico');
      }
      return { success: true, method: 'Spooler Térmico (Impressão Windows)' };
    }

    return {
      success: false,
      method: 'none',
      error: 'Não foi possível enviar para a impressora. Verifique a conexão USB.',
    };
  }

  private printViaHiddenFrame(receiptText: string, logoUrl?: string): boolean {
    if (typeof window === 'undefined') return false;

    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc) return false;

      const widthMm = this.defaultWidth;
      const logoHtml = logoUrl
        ? `
          <div class="ticket-header-logo">
            <img src="${logoUrl}" alt="Logomarca Vitim" />
          </div>
        `
        : '';

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8" />
          <title>Comanda Epson</title>
          <style>
            @page {
              size: ${widthMm}mm auto;
              margin: 0;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
              box-sizing: border-box;
            }
            body {
              font-family: 'Courier New', Courier, monospace, monospace;
              width: ${widthMm}mm;
              margin: 0;
              padding: 3mm 1.5mm;
              color: #000000 !important;
              background: #ffffff !important;
              font-size: ${widthMm === 80 ? '30px' : '20px'} !important;
              font-weight: 900 !important;
              line-height: 1.25;
              -webkit-font-smoothing: none !important;
              text-rendering: geometricPrecision !important;
            }
            .ticket-header-logo {
              text-align: center;
              margin-bottom: 3mm;
              padding-bottom: 2mm;
              border-bottom: 1.5px dashed #000000;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
            }
            .ticket-header-logo img {
              max-width: ${widthMm === 80 ? '54mm' : '40mm'};
              max-height: 28mm;
              width: auto;
              height: auto;
              object-fit: contain;
              display: block;
              margin: 0 auto;
              filter: grayscale(100%) contrast(180%);
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            pre {
              margin: 0;
              white-space: pre-wrap;
              word-wrap: break-word;
              font-family: inherit;
              font-size: ${widthMm === 80 ? '30px' : '20px'} !important;
              font-weight: 900 !important;
              color: #000000 !important;
              text-shadow: 0.25px 0 0 #000, 0 0.25px 0 #000, -0.25px 0 0 #000;
              letter-spacing: 0.15px;
            }
          </style>
        </head>
        <body>
          ${logoHtml}
          <pre>${receiptText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
        </body>
        </html>
      `;

      doc.open();
      doc.write(html);
      doc.close();

      const triggerPrint = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.error('Print trigger error:', e);
        }
        setTimeout(() => {
          if (iframe.parentNode) {
            document.body.removeChild(iframe);
          }
        }, 3000);
      };

      const logoImg = doc.querySelector('.ticket-header-logo img') as HTMLImageElement | null;
      if (logoImg && !logoImg.complete) {
        let done = false;
        const finish = () => {
          if (!done) {
            done = true;
            setTimeout(triggerPrint, 150);
          }
        };
        logoImg.onload = finish;
        logoImg.onerror = finish;
        setTimeout(finish, 600);
      } else {
        setTimeout(triggerPrint, 250);
      }

      return true;
    } catch (err) {
      console.error('Error printing thermal iframe:', err);
      return false;
    }
  }

  private async acknowledgeJob(jobId: string, status: 'COMPLETED' | 'FAILED', device: string) {
    try {
      await fetch(`/api/print-queue/${jobId}/ack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, device }),
      });
    } catch (e) {
      console.error('Failed to ack print job:', e);
    }
  }
}

export const epsonPrinter = new EpsonPrinterService();
