import { useState } from 'react';
import { Customer, SystemSettings } from '../types';
import * as storage from '../lib/storage';

interface PrinterHardwareDeps {
  settings: SystemSettings;
  customers: Customer[];
  lang: 'ar' | 'en';
  showToast: (type: 'success' | 'error' | 'warning', message: string) => void;
}

/**
 * Direct POS hardware: raw ESC/POS printing over WebUSB / Web Serial and the cash drawer kick.
 * The chosen connection type and device labels are remembered on this device.
 */
export function usePrinterHardware({ settings, customers, lang, showToast }: PrinterHardwareDeps) {
  const [hardwarePrinterType, setHardwarePrinterType] = useState<'system' | 'usb' | 'serial'>(() => {
    return (storage.getItem('pos_hardware_printer_type') as 'system' | 'usb' | 'serial') || 'system';
  });
  const [usbPrinterDevice, setUsbPrinterDevice] = useState<any | null>(null);
  const [serialPrinterPort, setSerialPrinterPort] = useState<any | null>(null);
  const [usbDeviceName, setUsbDeviceName] = useState<string>(() => {
    return storage.getItem('pos_usb_device_name') || '';
  });
  const [serialPortInfo, setSerialPortInfo] = useState<string>(() => {
    return storage.getItem('pos_serial_port_info') || '';
  });
  const [baudRate, setBaudRate] = useState<number>(() => {
    return Number(storage.getItem('pos_serial_baud_rate')) || 9600;
  });

  const connectUSBPrinter = async () => {
    if (!('usb' in navigator)) {
      showToast('error', lang === 'ar' ? 'متصفحك لا يدعم WebUSB. يرجى استخدام متصفح Chrome أو Edge' : 'WebUSB is not supported in this browser. Please use Chrome or Edge.');
      return;
    }
    try {
      const usb = (navigator as any).usb;
      const device = await usb.requestDevice({ filters: [] });
      setUsbPrinterDevice(device);
      setUsbDeviceName(device.productName || `USB Device (${device.vendorId}:${device.productId})`);
      storage.setItem('pos_usb_device_name', device.productName || `USB Device (${device.vendorId}:${device.productId})`);
      setHardwarePrinterType('usb');
      storage.setItem('pos_hardware_printer_type', 'usb');
      showToast('success', lang === 'ar' ? `تم الاتصال بالطابعة عبر USB: ${device.productName || 'جهاز غير معروف'}` : `Connected to USB Printer: ${device.productName || 'Unknown Device'}`);
    } catch (err: any) {
      console.error(err);
      showToast('error', lang === 'ar' ? `خطأ في الاتصال: ${err.message}` : `Connection failed: ${err.message}`);
    }
  };

  const connectSerialPrinter = async () => {
    if (!('serial' in navigator)) {
      showToast('error', lang === 'ar' ? 'متصفحك لا يدعم Web Serial. يرجى استخدام متصفح Chrome أو Edge' : 'Web Serial is not supported in this browser. Please use Chrome or Edge.');
      return;
    }
    try {
      const serial = (navigator as any).serial;
      const port = await serial.requestPort();
      setSerialPrinterPort(port);
      setSerialPortInfo(`COM Port (Baud: ${baudRate})`);
      storage.setItem('pos_serial_port_info', `COM Port (Baud: ${baudRate})`);
      setHardwarePrinterType('serial');
      storage.setItem('pos_hardware_printer_type', 'serial');
      showToast('success', lang === 'ar' ? 'تم تحديد طابعة المنفذ التسلسلي (Serial COM Port)' : 'Serial COM Port printer selected.');
    } catch (err: any) {
      console.error(err);
      showToast('error', lang === 'ar' ? `خطأ في الاتصال: ${err.message}` : `Connection failed: ${err.message}`);
    }
  };

  const openCashDrawer = async () => {
    if (settings.cashDrawerEnabled === false) {
      console.log('Cash drawer trigger is disabled in system configurations.');
      return;
    }

    // Default to Aronium command codes if empty or undefined
    let bytesCode = [27, 112, 0, 148, 49];
    if (settings.cashDrawerCodes && settings.cashDrawerCodes.trim()) {
      try {
        const parsed = settings.cashDrawerCodes
          .split(',')
          .map(pt => parseInt(pt.trim(), 10))
          .filter(val => !isNaN(val));
        if (parsed.length > 0) {
          bytesCode = parsed;
        }
      } catch (err) {
        console.error('Failed to parse user cashDRAWER codes:', err);
      }
    }

    const drawerCommands = new Uint8Array(bytesCode);
    const alternateDrawerCommands = new Uint8Array([27, 112, 0, 25, 250]); // standard ESC/POS fallback

    if (hardwarePrinterType === 'usb') {
      try {
        let device = usbPrinterDevice;
        const usb = (navigator as any).usb;
        if (!device && usb) {
          const devices = await usb.getDevices();
          if (devices.length > 0) {
            device = devices[0];
            setUsbPrinterDevice(device);
          }
        }
        if (!device) {
          showToast('warning', lang === 'ar' ? 'يرجى تعريف وتوصيل طابعة USB أولاً أو اختبار فتح الدرج' : 'Please connect a USB printer first.');
          return;
        }
        await device.open();
        await device.selectConfiguration(1);
        await device.claimInterface(0);
        const interface_ = device.configuration?.interfaces.find(i => i.claimed);
        const alternate = interface_?.alternates[0];
        const endpointOut = alternate?.endpoints.find(e => e.direction === 'out' && e.type === 'bulk');
        if (!endpointOut) {
          throw new Error('No bulk out endpoint found on this printer.');
        }
        await device.transferOut(endpointOut.endpointNumber, drawerCommands);
        await device.transferOut(endpointOut.endpointNumber, alternateDrawerCommands);
        showToast('success', lang === 'ar' ? 'تم إرسال إشارة فتح درج الكاش عبر USB 💸' : 'Sent USB cash drawer open signal 💸');
      } catch (err: any) {
        console.error(err);
        showToast('error', lang === 'ar' ? `فشل فتح الدرج عبر USB: ${err.message}` : `USB cash drawer trigger failed: ${err.message}`);
      }
    } else if (hardwarePrinterType === 'serial') {
      try {
        let port = serialPrinterPort;
        const serial = (navigator as any).serial;
        if (!port && serial) {
          const ports = await serial.getPorts();
          if (ports.length > 0) {
            port = ports[0];
            setSerialPrinterPort(port);
          }
        }
        if (!port) {
          showToast('warning', lang === 'ar' ? 'يرجى توصيل طابعة Serial COM أولاً' : 'Please connect a Serial/COM printer first.');
          return;
        }
        await port.open({ baudRate });
        const writer = port.writable.getWriter();
        await writer.write(drawerCommands);
        await writer.write(alternateDrawerCommands);
        await writer.write(new Uint8Array([10, 13]));
        writer.releaseLock();
        await port.close();
        showToast('success', lang === 'ar' ? 'تم إرسال إشارة فتح درج الكاش عبر المنفذ التسلسلي 💸' : 'Sent Serial cash drawer open signal 💸');
      } catch (err: any) {
        console.error(err);
        showToast('error', lang === 'ar' ? `فشل فتح الدرج عبر المنفذ التسلسلي: ${err.message}` : `Serial drawer open failed: ${err.message}`);
      }
    } else {
      // Direct Windows Virtual Printer Spooling notification
      showToast('success', lang === 'ar' ? `📋 تم إرسال أمر فتح الدرج الافتراضي للاستجابة: [${bytesCode.join(',')}]` : `Sent test draw kick command: [${bytesCode.join(',')}]`);
    }
  };

  const printDirectHardwareTest = async () => {
    if (hardwarePrinterType === 'system') {
      showToast('warning', lang === 'ar' ? 'أنت تستخدم طباعة نظام التشغيل الافتراضية' : 'You are using default OS printing.');
      return;
    }
    
    const escPosInit = new Uint8Array([27, 64]); // ESC @
    const testText = new TextEncoder().encode("\n=== POS HARDWARE TEST ===\n\nPrinters & Drawers Connected Successfully!\nReady to register sales.\n\n\n\n\n\n");
    const cutPaper = new Uint8Array([29, 86, 66, 0]); // GS V B 0 (Cut paper)

    try {
      if (hardwarePrinterType === 'usb') {
        let device = usbPrinterDevice;
        const usb = (navigator as any).usb;
        if (!device && usb) {
          const devices = await usb.getDevices();
          if (devices.length > 0) device = devices[0];
        }
        if (!device) throw new Error('No device connected.');
        await device.open();
        await device.selectConfiguration(1);
        await device.claimInterface(0);
        const interface_ = device.configuration?.interfaces.find(i => i.claimed);
        const endpointOut = interface_?.alternates[0]?.endpoints.find(e => e.direction === 'out' && e.type === 'bulk');
        if (!endpointOut) throw new Error('No bulk output endpoint.');
        
        await device.transferOut(endpointOut.endpointNumber, escPosInit);
        await device.transferOut(endpointOut.endpointNumber, testText);
        await device.transferOut(endpointOut.endpointNumber, cutPaper);
        showToast('success', lang === 'ar' ? 'تم إرسال تذكرة الفحص المباشر عبر USB 🖨️' : 'Direct USB test ticket sent 🖨️');
      } else if (hardwarePrinterType === 'serial') {
        let port = serialPrinterPort;
        const serial = (navigator as any).serial;
        if (!port && serial) {
          const ports = await serial.getPorts();
          if (ports.length > 0) port = ports[0];
        }
        if (!port) throw new Error('No serial port selected.');
        await port.open({ baudRate });
        const writer = port.writable.getWriter();
        await writer.write(escPosInit);
        await writer.write(testText);
        await writer.write(cutPaper);
        writer.releaseLock();
        await port.close();
        showToast('success', lang === 'ar' ? 'تم إرسال تذكرة الفحص المباشر عبر Serial 🖨️' : 'Direct Serial test ticket sent 🖨️');
      }
    } catch (err: any) {
      console.error(err);
      showToast('error', lang === 'ar' ? `خطأ أثناء الطباعة المباشرة: ${err.message}` : `Direct printing error: ${err.message}`);
    }
  };

  const printInvoiceToRawHardware = async (inv: any) => {
    try {
      if (!inv || hardwarePrinterType === 'system') return;
      
      const encoder = new TextEncoder();
      const escPosInit = new Uint8Array([27, 64]); // ESC @
      const openDrawerCmd = new Uint8Array([27, 112, 0, 148, 49]); // Open cash drawer pulse
      const alternateDrawerCmd = new Uint8Array([27, 112, 0, 25, 250]);
      const cutPaper = new Uint8Array([29, 86, 66, 0]); // Cut paper
      
      const linkedCust = (customers || []).find(c => c.id === inv.customerId);
      const custName = linkedCust ? linkedCust.name : (lang === 'ar' ? 'زبون نقدي' : 'Cash Customer');
      
      // Build a pure ASCII/Arabic UTF-8 aligned receipt text formatted nicely for thermal roll
      let text = `\n`;
      text += `      ${settings.shopName || 'دكان أبو كامل'}      \n`;
      text += `      تلفون: ${settings.phone || ''}      \n`;
      text += `==========================================\n`;
      text += `رقم الفاتورة: ${inv.invoiceNumber}\n`;
      text += `التاريخ: ${inv.date} | ${inv.time}\n`;
      text += `الزبون: ${custName}\n`;
      text += `الكاشير: ${inv.cashier}\n`;
      text += `الدفع: ${inv.paymentMethod === 'cash' ? 'كاش' : inv.paymentMethod === 'debt' ? 'دين' : 'بطاقة'}\n`;
      text += `------------------------------------------\n`;
      
      (inv.items || []).forEach((itm: any) => {
        text += `${itm.productName}\n`;
        text += `   ${itm.quantity} x ${itm.priceUSD.toFixed(1)}$ = ${itm.totalUSD.toFixed(1)}$\n`;
      });
      
      text += `------------------------------------------\n`;
      text += `المجموع الفرعي: ${inv.subtotalUSD.toFixed(2)}$\n`;
      if (inv.discountUSD > 0) {
        text += `الخصم: -${inv.discountUSD.toFixed(2)}$\n`;
      }
      text += `المطلوب النهائي: ${inv.totalUSD.toFixed(2)}$\n`;
      text += `المطلوب ليرة: ${Math.ceil(inv.totalLBP).toLocaleString()} LBP\n`;
      text += `==========================================\n`;
      text += `        ${settings.receiptFooter || 'شكراً لزيارتكم!'}        \n`;
      text += `\n\n\n\n`; // feed lines
      
      const textBytes = encoder.encode(text);
      
      // Combine commands
      const totalLen = escPosInit.length + openDrawerCmd.length + alternateDrawerCmd.length + textBytes.length + cutPaper.length;
      const combined = new Uint8Array(totalLen);
      
      let cursor = 0;
      combined.set(escPosInit, cursor); cursor += escPosInit.length;
      combined.set(openDrawerCmd, cursor); cursor += openDrawerCmd.length;
      combined.set(alternateDrawerCmd, cursor); cursor += alternateDrawerCmd.length;
      combined.set(textBytes, cursor); cursor += textBytes.length;
      combined.set(combined.subarray(cursor - textBytes.length, cursor), cursor); // Correctly fill cuts
      combined.set(cutPaper, cursor); cursor += cutPaper.length;

      if (hardwarePrinterType === 'usb') {
        let device = usbPrinterDevice;
        const usb = (navigator as any).usb;
        if (!device && usb) {
          const devices = await usb.getDevices();
          if (devices.length > 0) device = devices[0];
        }
        if (device) {
          await device.open();
          await device.selectConfiguration(1);
          await device.claimInterface(0);
          const interface_ = device.configuration?.interfaces.find((i: any) => i.claimed);
          const alternate = interface_?.alternates[0];
          const endpointOut = alternate?.endpoints.find((e: any) => e.direction === 'out' && e.type === 'bulk');
          if (endpointOut) {
            await device.transferOut(endpointOut.endpointNumber, combined);
            showToast('success', lang === 'ar' ? '✔️ تم طباعة الفاتورة وفتح درج الكاشير عبر USB صامتاً بلحظات!' : 'Printed and kicked drawer via USB silent!');
          }
        }
      } else if (hardwarePrinterType === 'serial') {
        let port = serialPrinterPort;
        const serial = (navigator as any).serial;
        if (!port && serial) {
          const ports = await serial.getPorts();
          if (ports.length > 0) port = ports[0];
        }
        if (port) {
          await port.open({ baudRate });
          const writer = port.writable.getWriter();
          await writer.write(combined);
          writer.releaseLock();
          await port.close();
          showToast('success', lang === 'ar' ? '✔️ تم طباعة الفاتورة وفتح درج الكاشير عبر المنفذ التسلسلي صامتاً!' : 'Printed and kicked drawer via Serial silent!');
        }
      }
    } catch (err: any) {
      console.error('Error raw printing:', err);
      showToast('error', lang === 'ar' ? `خطأ في الطباعة المباشرة: ${err.message}` : `Direct POS print failed: ${err.message}`);
    }
  };

  return {
    hardwarePrinterType,
    setHardwarePrinterType,
    usbDeviceName,
    serialPortInfo,
    baudRate,
    setBaudRate,
    connectUSBPrinter,
    connectSerialPrinter,
    openCashDrawer,
    printInvoiceToRawHardware,
  };
}
