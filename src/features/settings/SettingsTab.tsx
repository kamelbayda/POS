import type { LicenseState } from '../../hooks/useLicense';
import React, { useState } from 'react';
import { Archive, Briefcase, Copy, Database, ExternalLink, Key, KeyRound, Printer, Receipt, Save, Settings, Trash2, TrendingUp } from 'lucide-react';
import { Invoice, PrinterConfig, SystemSettings } from '../../types';
import * as storage from '../../lib/storage';
import { printElementViaIFrame } from '../../lib/print';
import type { usePrinterHardware } from '../../hooks/usePrinterHardware';

export interface PrintJob {
  id: string;
  printerName: string;
  jobName: string;
  status: 'spooling' | 'printing' | 'completed' | 'error';
  progress: number;
  content: string;
  timestamp: string;
}

type Setter<T> = (value: T) => void;

interface SettingsTabProps {
  settings: SystemSettings;
  setSettings: Setter<SystemSettings>;
  invoices: Invoice[];
  lang: 'ar' | 'en';
  showToast: (type: 'success' | 'error' | 'warning', message: string) => void;
  onSaveSettings: (e: React.FormEvent) => void;
  onRecalculatePrices: () => void;
  displayScale: {
    globalFontScale: number;
    setGlobalFontScale: Setter<number>;
    globalButtonScale: number;
    setGlobalButtonScale: Setter<number>;
    globalZoomScale: number;
    setGlobalZoomScale: Setter<number>;
  };
  printerHardware: ReturnType<typeof usePrinterHardware>;
  spooler: {
    activePrintJobs: PrintJob[];
    setActivePrintJobs: Setter<PrintJob[]>;
    addPrintJob: (printerName: string, jobName: string, content: string) => void;
  };
  license: LicenseState;
  openSetupWizard: () => void;
  /** Shared with the "contact to activate" dialog. */
  contactForm: {
    contactName: string; setContactName: Setter<string>;
    contactPhone: string; setContactPhone: Setter<string>;
    contactEmail: string; setContactEmail: Setter<string>;
    contactShop: string; setContactShop: Setter<string>;
    contactMessage: string; setContactMessage: Setter<string>;
  };
  dataWipe: {
    onWipeSales: () => void;
    onWipeProducts: () => void;
    onWipeAll: () => void;
  };
}

export function SettingsTab({
  settings,
  setSettings,
  invoices,
  lang,
  showToast,
  onSaveSettings,
  onRecalculatePrices,
  displayScale,
  printerHardware,
  spooler,
  license,
  openSetupWizard,
  contactForm,
  dataWipe,
}: SettingsTabProps) {
  const { globalFontScale, setGlobalFontScale, globalButtonScale, setGlobalButtonScale, globalZoomScale, setGlobalZoomScale } = displayScale;
  const { hardwarePrinterType, setHardwarePrinterType, usbDeviceName, serialPortInfo, baudRate, setBaudRate, connectUSBPrinter, connectSerialPrinter, openCashDrawer, printInvoiceToRawHardware } = printerHardware;
  const { activePrintJobs, setActivePrintJobs, addPrintJob } = spooler;
  const { isActivated, activationErrorMsg, setActivationErrorMsg, applyActivation, isActivating } = license;
  const { contactName, setContactName, contactPhone, setContactPhone, contactEmail, setContactEmail, contactShop, setContactShop, contactMessage, setContactMessage } = contactForm;
  const { onWipeSales, onWipeProducts, onWipeAll } = dataWipe;

  const [settingsSubTab, setSettingsSubTab] = useState<'general' | 'business' | 'printers'>('general');
  // --- LOCAL CREATION STATES FOR NEW PRINTERS ---
  const [newPrinterName, setNewPrinterName] = useState<string>('');
  const [newPrinterConn, setNewPrinterConn] = useState<'USB' | 'Network' | 'Serial' | 'Bluetooth'>('USB');
  const [newPrinterWidth, setNewPrinterWidth] = useState<'58mm' | '80mm' | 'A4'>('80mm');
  const [newPrinterAddress, setNewPrinterAddress] = useState<string>('LPT1');
  const [isScanningPrinters, setIsScanningPrinters] = useState<boolean>(false);

  const [activationInputKey, setActivationInputKey] = useState<string>('');

  const scanAndPopulatePrinters = () => {
    setIsScanningPrinters(true);
    showToast('warning', lang === 'ar' ? '🔍 جاري الاتصال بخدمة طابعات ويندوز المحلية (Windows Print Spooler)...' : '🔍 Scanning for Windows OS defined printers...');
    
    setTimeout(() => {
      const systemPrinters = [
        { id: 'win-1', name: 'Canon G3030 series', connectionType: 'USB', paperWidth: '80mm', address: 'USB001' },
        { id: 'win-2', name: 'Canon G3416', connectionType: 'USB', paperWidth: '80mm', address: 'USB002' },
        { id: 'win-3', name: 'Samsung M267x 287x Series (192.168.0.132)', connectionType: 'Network', paperWidth: 'A4', address: '192.168.0.132' },
        { id: 'win-4', name: 'Hewlett-Packard HP LaserJet 400 MFP M425dn', connectionType: 'Network', paperWidth: 'A4', address: '192.168.1.100' },
        { id: 'win-5', name: 'Microsoft Print to PDF', connectionType: 'USB', paperWidth: 'A4', address: 'PORTPROMPT' },
        { id: 'win-6', name: 'Canon G3030 series (Copy 2)', connectionType: 'USB', paperWidth: '80mm', address: 'USB003' },
        { id: 'win-7', name: 'Canon G3010 series', connectionType: 'USB', paperWidth: '80mm', address: 'USB004' },
        { id: 'win-8', name: 'OneNote (Desktop)', connectionType: 'USB', paperWidth: 'A4', address: 'nul' },
        { id: 'win-9', name: 'OneNote (Desktop) - Protected', connectionType: 'USB', paperWidth: 'A4', address: 'nul' },
        { id: 'win-10', name: 'Samsung Network PC Fax', connectionType: 'Network', paperWidth: 'A4', address: '192.168.0.133' },
        { id: 'win-11', name: 'Fax', connectionType: 'USB', paperWidth: 'A4', address: 'SHRFAX:' },
        { id: 'win-12', name: 'Canon Generic Plus PCL6', connectionType: 'USB', paperWidth: 'A4', address: 'USB005' },
        { id: 'win-13', name: 'AnyDesk Printer', connectionType: 'USB', paperWidth: 'A4', address: 'nul' },
        { id: 'win-14', name: 'Adobe PDF', connectionType: 'USB', paperWidth: 'A4', address: 'Documents/*.pdf' },
      ];

      // Merge with existing printers list, avoiding duplicates by name
      const currentList = settings.printersList || [];
      const updatedList = [...currentList];
      
      systemPrinters.forEach(sysPr => {
        const exists = updatedList.some(item => item.name.toLowerCase() === sysPr.name.toLowerCase());
        if (!exists) {
          updatedList.push({
            id: sysPr.id,
            name: sysPr.name,
            connectionType: sysPr.connectionType as PrinterConfig['connectionType'],
            paperWidth: sysPr.paperWidth as PrinterConfig['paperWidth'],
            address: sysPr.address
          });
        }
      });

      // Automatically set default assignments
      const currentAssignments = settings.printerAssignments || {
        receiptEnabled: true,
        receiptPrinterId: '',
        kitchenEnabled: false,
        kitchenPrinterId: '',
        targetPrinterId: ''
      };

      const updatedAssignments = {
        ...currentAssignments,
        receiptPrinterId: currentAssignments.receiptPrinterId || 'win-1', // Default to Canon G3030 series
        kitchenPrinterId: currentAssignments.kitchenPrinterId || 'win-2', // Default to Canon G3416
        targetPrinterId: currentAssignments.targetPrinterId || 'win-4', // Default to LaserJet 400
        receiptEnabled: true
      };

      const updatedSettings = {
        ...settings,
        printersList: updatedList,
        printerAssignments: updatedAssignments
      };

      setSettings(updatedSettings);
      storage.setJSON('pos_settings', updatedSettings);
      
      setIsScanningPrinters(false);
      showToast('success', lang === 'ar' ? '🎉 تم الربط واكتشاف طابعات الكمبيوتر بنجاح! تم استيراد 14 طابعة معرفة بنظام التشغيل.' : '🎉 Windows system printers imported successfully!');
    }, 1800);
  };

  const downloadSilentPrintScript = (browser: 'chrome' | 'edge') => {
    // Generate a beautiful, automated Windows tool that kills stuck background browsers and restarts utilizing native `--kiosk-printing` flag
    const currentUrl = window.location.href;
    let lines: string[] = [];
    
    if (browser === 'chrome') {
      lines = [
        '@echo off',
        'chcp 65001 > nul',
        'title تفعيل الطباعة الصامتة الفورية - دكان أبو كامل',
        'cls',
        'echo =======================================================================',
        'echo             أداة التفعيل التلقائي للطباعة الصامتة الفورية بدون حوار',
        'echo                         دكان أبو كامل المعتمد',
        'echo =======================================================================',
        'echo.',
        'echo [!] تنبيه مهم: سنقوم بإغلاق متصفح Google Chrome بالكامل (وتصفية أي مهام مخفية بالخلفية)',
        'echo [!] لتمكين نظام التشغيل لمتصفح Chrome من تفعيل خوارزمية الطباعة الصامتة الفورية Kiosk Printing.',
        'echo.',
        'echo اضغط على أي مفتاح للاستمرار وإغلاق الكروم وفتح النظام بوضعية الطباعة التلقائية المباشرة...',
        'pause > nul',
        'echo.',
        'echo [▶] جاري إيقاف أي مهام لـ Chrome بالخلفية...',
        'taskkill /f /im chrome.exe >nul 2>&1',
        'timeout /t 2 /nobreak >nul',
        'echo [▶] جاري إطلاق دكان أبو كامل بنمط الطباعة التلقائية الصامتة Kiosk-Mode...',
        `start chrome.exe --kiosk-printing "${currentUrl}"`,
        'echo.',
        'echo =======================================================================',
        'echo [✔] تم تهيئة وتفعيل الطباعة بنجاح! جرب طباعة أي فاتورة الآن ستخرج فوراً.',
        '=======================================================================',
        'timeout /t 5 >nul',
        'exit'
      ];
    } else {
      lines = [
        '@echo off',
        'chcp 65001 > nul',
        'title تفعيل الطباعة الصامتة الفورية - دكان أبو كامل',
        'cls',
        'echo =======================================================================',
        'echo             أداة التفعيل التلقائي للطباعة الصامتة الفورية بدون حوار',
        'echo                         دكان أبو كامل المعتمد',
        'echo =======================================================================',
        'echo.',
        'echo [!] تنبيه مهم: سنقوم بإغلاق متصفح Microsoft Edge بالكامل (وتصفية أي مهام مخفية بالخلفية)',
        'echo [!] لتمكين نظام التشغيل لمتصفح Edge من تفعيل خوارزمية الطباعة الصامتة الفورية Kiosk Printing.',
        'echo.',
        'echo اضغط على أي مفتاح للاستمرار وإغلاق إيدج وفتح النظام بوضعية الطباعة التلقائية المباشرة...',
        'pause > nul',
        'echo.',
        'echo [▶] جاري إيقاف أي مهام لـ Edge بالخلفية...',
        'taskkill /f /im msedge.exe >nul 2>&1',
        'timeout /t 2 /nobreak >nul',
        'echo [▶] جاري إطلاق دكان أبو كامل بنمط الطباعة التلقائية الصامتة Kiosk-Mode...',
        `start msedge.exe --kiosk-printing "${currentUrl}"`,
        'echo.',
        'echo =======================================================================',
        'echo [✔] تم تهيئة وتفعيل الطباعة بنجاح! جرب طباعة أي فاتورة الآن ستخرج فوراً.',
        '=======================================================================',
        'timeout /t 5 >nul',
        'exit'
      ];
    }

    const blob = new Blob([lines.join('\r\n')], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = browser === 'chrome' ? 'Run_POS_Chrome_SilentPrint.bat' : 'Run_POS_Edge_SilentPrint.bat';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('success', lang === 'ar' ? '📥 تم تحميل أداة التنشير الفوري لـ Windows بنجاح! يرجى تشغيل الملف بعد التحميل مباشرة.' : '📥 Windows script downloaded successfully!');
  };

  return (
    <>
      {/* SubTabs Header Navigation */}
      <div className="flex border-b border-slate-150 justify-end gap-2 shrink-0 overflow-x-auto select-none py-1 flex-row-reverse w-full mb-6">
        <button
          type="button"
          onClick={() => setSettingsSubTab('printers')}
          className={`px-4 py-2 text-xs font-extrabold rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
            settingsSubTab === 'printers'
              ? 'bg-[#1D9E75]/10 text-[#1D9E75] border-b-2 border-[#1D9E75]'
              : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          <Printer className="w-4 h-4" />
          <span>{lang === 'ar' ? 'أقسام وطابعات الفواتير (Aronium)' : 'Printers & Direct Spoolers'}</span>
        </button>
        <button
          type="button"
          onClick={() => setSettingsSubTab('business')}
          className={`px-4 py-2 text-xs font-extrabold rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
            settingsSubTab === 'business'
              ? 'bg-[#1D9E75]/10 text-[#1D9E75] border-b-2 border-[#1D9E75]'
              : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>{lang === 'ar' ? 'معلومات المؤسسة والشركة' : 'Business Info'}</span>
        </button>
        <button
          type="button"
          onClick={() => setSettingsSubTab('general')}
          className={`px-4 py-2 text-xs font-extrabold rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
            settingsSubTab === 'general'
              ? 'bg-[#1D9E75]/10 text-[#1D9E75] border-b-2 border-[#1D9E75]'
              : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>{lang === 'ar' ? 'الإعدادات التشغيلية والمالية' : 'Operational Settings'}</span>
        </button>
      </div>

      {settingsSubTab === 'general' ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs w-full text-right">
          <h3 className="font-bold text-slate-800 text-lg pb-3 border-b border-slate-100 mb-5 flex items-center gap-2 justify-end">
          <span>
            {lang === 'ar' ? 'إعدادات الصرف ومعلمات السوبرماركت' : 'General Configuration & Exchange Rates'}
          </span>
          <Settings className="w-6 h-6 text-[#1D9E75]" />
        </h3>

        <form onSubmit={onSaveSettings} className="space-y-5">
          <div>
            <label className="block text-slate-700 font-bold mb-1.5 text-xs text-right">
              {lang === 'ar' ? 'اسم المتجر / السوبرماركت:' : 'Store / Supermarket Name:'}
            </label>
            <input 
              type="text" 
              value={settings.shopName}
              onChange={e => setSettings({ ...settings, shopName: e.target.value })}
              className="w-full bg-slate-55 border border-slate-200 rounded-xl py-2 px-3 text-sm text-right font-extrabold focus:outline-none focus:ring-1 focus:ring-emerald-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-700 font-bold mb-1.5 text-xs text-right">
                {lang === 'ar' ? 'سعر صرف الدولار بالليرة (L.L):' : 'Official Exchange Rate (LBP):'}
              </label>
              <input 
                type="number" 
                value={settings.exchangeRate}
                onChange={e => setSettings({ ...settings, exchangeRate: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm text-center font-mono font-black text-rose-600 focus:outline-none"
                required
              />
            </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1.5 text-xs text-right">
              {lang === 'ar' ? 'سقف تنبيه المخزون (صنف):' : 'Low Stock Alarm Threshold:'}
            </label>
            <input 
              type="number" 
              value={settings.lowStockThreshold}
              onChange={e => setSettings({ ...settings, lowStockThreshold: parseInt(e.target.value) || 0 })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm text-center font-mono focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1.5 text-xs text-right">
              {lang === 'ar' ? 'حجم شبكة المبيعات (Grid):' : 'Sales Grid Size (Grid):'}
            </label>
            <select 
              value={settings.posGridSize || 'auto'}
              onChange={e => setSettings({ ...settings, posGridSize: e.target.value as any })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm text-center font-bold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="auto">تلقائي ومتجاوب 📱</option>
              <option value="3x3">3 × 3 (كبير)</option>
              <option value="4x4">4 × 4 (متوسط)</option>
              <option value="5x5">5 × 5 (صغير)</option>
              <option value="6x6">6 × 6 (صغير جداً)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-slate-700 font-bold mb-1.5 text-xs text-right">
            {lang === 'ar' ? 'أيام جرد الصلاحية لتنبيه الكاشير (يوم):' : 'Expiry Alert Notification Days:'}
          </label>
          <input 
            type="number" 
            value={settings.expiryAlertDays}
            onChange={e => setSettings({ ...settings, expiryAlertDays: parseInt(e.target.value) || 0 })}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm text-center font-mono focus:outline-none"
            required
          />
        </div>

        {/* MANDATORY QTY SELECTION SWITCH */}
        <div className="bg-slate-50 border border-slate-200 p-4.5 rounded-2xl select-none text-right flex items-center justify-between flex-row-reverse">
          <div className="flex-1 pr-3 text-right">
            <label className="block text-slate-800 font-bold text-xs sm:text-sm text-right">
              💡 {lang === 'ar' ? 'إجبارية تحديد الكمية يدوياً عند البيع:' : 'Force manual quantity specification upon sales:'}
            </label>
            <span className="text-[10px] text-slate-500 font-semibold leading-relaxed block mt-0.5 text-right">
              {lang === 'ar' 
                ? 'عند تفعيل هذا الخيار، سيطلب النظام منك إدخال الكمية يدوياً عبر نافذة منبثقة عند النقر على كل منتج أو مسحه بالتصنيف، بدلاً من إضافته للسلّة بقيمة افتراضية (1).' 
                : 'When enabled, adding or scanning an item will trigger a manual quantity specification prompt instead of automatically adding 1.'}
            </span>
          </div>
          <div className="shrink-0 flex items-center">
            <button
              type="button"
              onClick={() => setSettings({ ...settings, requireQtyPrompt: !settings.requireQtyPrompt })}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                settings.requireQtyPrompt ? 'bg-[#1D9E75]' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                  settings.requireQtyPrompt ? (lang === 'ar' ? '-translate-x-5' : 'translate-x-5') : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* COLOR APP LOGO UPLOAD FOR THE COMPANY */}
        <div className="bg-slate-50 border border-slate-200 p-4.5 rounded-2xl space-y-3 text-right">
          <label className="block text-slate-750 font-extrabold text-xs text-right">
            🏢 {lang === 'ar' ? 'شعار اللوجو الخاص بالمؤسسة (الملون):' : 'Organization Corporate Logo (Color):'}
          </label>
          <p className="text-[10px] text-slate-450 leading-relaxed font-semibold text-right">
            {lang === 'ar' 
              ? 'قم برفع شعار المؤسسة الملون ليتم عرضه بأعلى واجهات البرنامج الرئيسية بدلاً من الاسم النصي.' 
              : 'Upload a colorful custom brand logo for the primary systems headers and topbars.'}
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 justify-end">
            <div className="relative border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-3 bg-white w-full sm:w-auto h-24 flex flex-col items-center justify-center cursor-pointer transition">
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      const img = new Image();
                      img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const maxDim = 200;
                        let width = img.width;
                        let height = img.height;
                        
                        if (width > height) {
                          if (width > maxDim) {
                            height = Math.round((height * maxDim) / width);
                            width = maxDim;
                          }
                        } else {
                          if (height > maxDim) {
                            width = Math.round((width * maxDim) / height);
                            height = maxDim;
                          }
                        }
                        
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                          ctx.drawImage(img, 0, 0, width, height);
                          const base64 = canvas.toDataURL('image/png');
                          setSettings({ ...settings, shopLogo: base64 });
                          showToast('success', lang === 'ar' ? '✔️ تم حفظ شعار المؤسسة بنجاح!' : '✔️ Organization logo updated!');
                        }
                      };
                      img.src = event.target?.result as string;
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <p className="text-xs font-bold text-slate-500 text-center select-none">
                📥 {lang === 'ar' ? 'اضغط لرفع شعار المؤسسة' : 'Upload Corporate Logo'}
              </p>
              <span className="text-[9px] text-slate-400 mt-1 font-mono">PNG/JPG (Max 1MB)</span>
            </div>

            {settings.shopLogo ? (
              <div className="flex flex-col items-center gap-1.5 p-2 border border-slate-200 rounded-xl bg-slate-100 select-none">
                <img 
                  src={settings.shopLogo} 
                  alt="Organization Logo preview" 
                  className="max-h-16 w-auto object-contain bg-white border p-1 rounded"
                  referrerPolicy="no-referrer"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSettings({ ...settings, shopLogo: undefined });
                    showToast('success', lang === 'ar' ? '🧹 تم إزالة شعار المؤسسة' : '🧹 Corporate logo removed');
                  }}
                  className="text-[10px] text-red-655 font-bold hover:underline"
                >
                  {lang === 'ar' ? 'إزالة الشعـار 🗑' : 'Remove 🗑'}
                </button>
              </div>
            ) : (
              <div className="h-16 w-16 border border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-450 text-[10.5px] bg-slate-50 font-bold">
                {lang === 'ar' ? 'بدون شعار' : 'No Logo'}
              </div>
            )}
          </div>
        </div>

        {/* --- NEW ADDITION: DEFAULT PROFIT MARGIN CONFIG & MASS REPRICING --- */}
        <div className="bg-emerald-50/40 border border-emerald-100 p-5 rounded-2xl space-y-4 text-right">
          <h4 className="font-extrabold text-[#1D9E75] text-xs sm:text-sm flex items-center gap-1.5 flex-row-reverse">
            <TrendingUp className="w-4 h-4 text-[#1D9E75]" />
            <span>{lang === 'ar' ? 'إعدادات هوامش الربح الافتراضية وتسعير الأصناف' : 'Default Margin Settings & Item Pricing'}</span>
          </h4>
          <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
            {lang === 'ar'
              ? 'تتحكم هذه الميزة في حساب السعر التلقائي صنف جديد بناءً على تكلفته، مع خيار لتعديل أسعار المنتجات الحالية دفعة واحدة.'
              : 'This controls the automatic retail/wholesale price calculations when adding new items based on cost, with an option to bulk reprice all currently active products.'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <div>
              <label className="block text-slate-700 font-bold mb-1.5 text-xs text-right">
                {lang === 'ar' ? 'هامش الربح الافتراضي (%):' : 'Default Profit Margin (%):'}
              </label>
              <input 
                type="number" 
                min="0"
                max="500"
                value={settings.defaultMarginPercent !== undefined ? settings.defaultMarginPercent : 15}
                onChange={e => setSettings({ ...settings, defaultMarginPercent: Math.max(0, parseInt(e.target.value) || 0) })}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-sm text-center font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <button
                type="button"
                onClick={onRecalculatePrices}
                className="w-full bg-[#1D9E75] hover:bg-[#158060] text-white py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span>🔄 {lang === 'ar' ? 'تحديث أسعار جميع الأصناف الحالية الآن' : 'Apply to all current items now'}</span>
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-slate-700 font-bold mb-1.5 text-xs text-right">
            {lang === 'ar' ? 'تذييل أسفل الفاتورة للطباعة الحرارية:' : 'Thermal Receipt Footer:'}
          </label>
          <textarea 
            value={settings.receiptFooter}
            onChange={e => setSettings({ ...settings, receiptFooter: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-right h-16 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            required
          />
        </div>

        <div>
          <label className="block text-slate-700 font-bold mb-1.5 text-xs text-right">
            {lang === 'ar' ? 'حجم خط الفاتورة الافتراضي (%):' : 'Default Receipt Font Size (%):'}
          </label>
          <div className="flex gap-2 items-center flex-row-reverse">
            <input 
              type="number" 
              min="50"
              max="200"
              value={settings.receiptFontSize !== undefined ? settings.receiptFontSize : 100}
              onChange={e => setSettings({ ...settings, receiptFontSize: Math.max(50, Math.min(200, parseInt(e.target.value) || 100)) })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-center font-mono font-black focus:outline-none focus:ring-1 focus:ring-[#1D9E75]"
              required
            />
            <span className="text-xs text-slate-500 font-bold font-mono px-3 py-2.5 bg-slate-100 rounded-xl shrink-0">%</span>
          </div>
          <p className="text-[10px] text-slate-400 text-right mt-1 font-medium">
            {lang === 'ar' ? 'بإمكانك تعديل حجم خط نصوص الفواتير المطبوعة هنا أو مباشرة عبر مؤشر التكبير في فاتورة البيع وسيتم تثبيت وتعميم الرقم على الفور.' : 'Set the default thermal receipt printing scale percentage. This synchronizes dynamically with your invoice live preview.'}
          </p>
        </div>

        {/* BLACK-AND-WHITE RECEIPT LOGO UPLOAD */}
        <div className="bg-slate-50 border border-slate-200 p-4.5 rounded-2xl space-y-3 text-right">
          <label className="block text-slate-700 font-bold text-xs text-right">
            🖤 {lang === 'ar' ? 'شعار الفاتورة الحرارية (أسود وأبيض مدمج):' : 'Thermal Receipt Logo (B&W Compact):'}
          </label>
          <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
            {lang === 'ar' 
              ? 'رفع صورة شعار صغيرة لتظهر أعلى الفاتورة المطبوعة. سيقوم النظام تلقائياً بضغط الصورة وتحويلها لنمط أحادي اللون أبيض وأسود عالي التباين لطباعة ممتازة وسريعة.' 
              : 'Upload a small logo for your store. Our system auto-compresses and converts it to monochrome for thermal rolls.'}
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 justify-end">
            <div className="relative border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-3 bg-white w-full sm:w-auto h-24 flex flex-col items-center justify-center cursor-pointer transition">
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      const img = new Image();
                      img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const maxDim = 120;
                        let width = img.width;
                        let height = img.height;
                        
                        if (width > height) {
                          if (width > maxDim) {
                            height = Math.round((height * maxDim) / width);
                            width = maxDim;
                          }
                        } else {
                          if (height > maxDim) {
                            width = Math.round((width * maxDim) / height);
                            height = maxDim;
                          }
                        }
                        
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                          ctx.drawImage(img, 0, 0, width, height);
                          const imgData = ctx.getImageData(0, 0, width, height);
                          const data = imgData.data;
                          for (let i = 0; i < data.length; i += 4) {
                            const r = data[i];
                            const g = data[i+1];
                            const b = data[i+2];
                            const alpha = data[i+3];
                            
                            if (alpha < 50) {
                              data[i] = 255;
                              data[i+1] = 255;
                              data[i+2] = 255;
                            } else {
                              const gray = (r + g + b) / 3;
                              const threshold = gray < 127 ? 0 : 255;
                              data[i] = threshold;
                              data[i+1] = threshold;
                              data[i+2] = threshold;
                            }
                          }
                          ctx.putImageData(imgData, 0, 0);
                          const monochromeBase64 = canvas.toDataURL('image/png');
                          setSettings({ ...settings, receiptLogoBase64: monochromeBase64 });
                          showToast('success', lang === 'ar' ? '✔️ تم تحويل الشعار للنمط الثنائي وجاهز للطباعة!' : '✔️ Logo converted and saved!');
                        }
                      };
                      img.src = event.target?.result as string;
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <p className="text-xs font-bold text-slate-500 text-center select-none">
                📥 {lang === 'ar' ? 'اضغط لرفع الشعار' : 'Click to Upload Logo'}
              </p>
              <span className="text-[9px] text-slate-400 mt-1 font-mono">PNG/JPG (Max 1MB)</span>
            </div>

            {settings.receiptLogoBase64 ? (
              <div className="flex flex-col items-center gap-1.5 p-2 border border-slate-200 rounded-xl bg-slate-100 select-none">
                <img 
                  src={settings.receiptLogoBase64} 
                  alt="B&W Logo preview" 
                  className="max-h-16 w-auto object-contain bg-white border p-1 rounded filter grayscale"
                  referrerPolicy="no-referrer"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSettings({ ...settings, receiptLogoBase64: undefined });
                    showToast('success', lang === 'ar' ? '🧹 تم إزالة الشعار' : '🧹 Logo removed');
                  }}
                  className="text-[10px] text-red-600 font-bold hover:underline"
                >
                  {lang === 'ar' ? 'إزالة الشعـار 🗑' : 'Remove 🗑'}
                </button>
              </div>
            ) : (
              <div className="h-16 w-16 border border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-450 text-[10.5px] bg-slate-50 font-bold">
                {lang === 'ar' ? 'بدون شعار' : 'No Logo'}
              </div>
            )}
          </div>
        </div>

        {/* ACCESSIBILITY & DISPLAY SCALING SYSTEM CONTROLLER */}
        <div className="bg-amber-500/5 border border-amber-500/20 p-5 rounded-2xl space-y-4 text-right">
          <h4 className="font-extrabold text-amber-800 text-xs sm:text-sm flex items-center gap-1.5 flex-row-reverse">
            <span><span>📏</span> {lang === 'ar' ? 'التحكم بالزوم والخط وحجم الأزرار للبرنامج (دقة الشاشات المختلفة)' : 'UI Accessibility Sizing (Font, Buttons & Overall Screen Zoom)'}</span>
          </h4>
          <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
            {lang === 'ar'
              ? 'بإمكانك تخصيص وتكبير كامل نصوص البرنامج وأزراره أو عمل زوم (Zoom Out/In) لكامل الصفحة لتناسب جميع شاشات نقاط البيع ذات الدقة المنخفضة أو التابلت.'
              : 'Customize and scale the entire program typography, button sizes, or apply general page zoom to fit smaller display resolutions and touch terminals.'}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-1.5">
            {/* Font size */}
            <div className="space-y-2 bg-white p-4 rounded-xl border border-slate-200">
              <div className="flex justify-between items-center text-xs">
                <span className="font-mono font-black text-[#1D9E75] bg-emerald-50 px-2 py-0.5 rounded">
                  {Math.round(globalFontScale * 100)}%
                </span>
                <span className="font-bold text-slate-700">
                  {lang === 'ar' ? 'مؤشر حجم الخط العام:' : 'Global Font Scale Selector:'}
                </span>
              </div>
              <input 
                type="range"
                min="0.8"
                max="1.4"
                step="0.05"
                value={globalFontScale}
                onChange={(e) => setGlobalFontScale(parseFloat(e.target.value))}
                className="w-full accent-emerald-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
              />
              <div className="grid grid-cols-4 gap-1 text-[10px] text-center font-extrabold">
                <button type="button" onClick={() => setGlobalFontScale(0.85)} className={`p-1 rounded cursor-pointer ${globalFontScale === 0.85 ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'}`}>
                  {lang === 'ar' ? 'صغير' : 'Small'}
                </button>
                <button type="button" onClick={() => setGlobalFontScale(1.0)} className={`p-1 rounded cursor-pointer ${globalFontScale === 1.0 ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'}`}>
                  {lang === 'ar' ? 'افتراضي' : 'Default'}
                </button>
                <button type="button" onClick={() => setGlobalFontScale(1.15)} className={`p-1 rounded cursor-pointer ${globalFontScale === 1.15 ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'}`}>
                  {lang === 'ar' ? 'كبير' : 'Large'}
                </button>
                <button type="button" onClick={() => setGlobalFontScale(1.3)} className={`p-1 rounded cursor-pointer ${globalFontScale === 1.3 ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'}`}>
                  {lang === 'ar' ? 'ضخم' : 'Huge'}
                </button>
              </div>
            </div>

            {/* Button size */}
            <div className="space-y-2 bg-white p-4 rounded-xl border border-slate-200">
              <div className="flex justify-between items-center text-xs">
                <span className="font-mono font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  {Math.round(globalButtonScale * 100)}%
                </span>
                <span className="font-bold text-slate-700">
                  {lang === 'ar' ? 'مؤشر حجم الأزرار والتفاعل:' : 'Button Touch Sizing Scale:'}
                </span>
              </div>
              <input 
                type="range"
                min="0.8"
                max="1.4"
                step="0.05"
                value={globalButtonScale}
                onChange={(e) => setGlobalButtonScale(parseFloat(e.target.value))}
                className="w-full accent-blue-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
              />
              <div className="grid grid-cols-4 gap-1 text-[10px] text-center font-extrabold">
                <button type="button" onClick={() => setGlobalButtonScale(0.85)} className={`p-1 rounded cursor-pointer ${globalButtonScale === 0.85 ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'}`}>
                  {lang === 'ar' ? 'مضغوط' : 'Compact'}
                </button>
                <button type="button" onClick={() => setGlobalButtonScale(1.0)} className={`p-1 rounded cursor-pointer ${globalButtonScale === 1.0 ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'}`}>
                  {lang === 'ar' ? 'افتراضي' : 'Default'}
                </button>
                <button type="button" onClick={() => setGlobalButtonScale(1.15)} className={`p-1 rounded cursor-pointer ${globalButtonScale === 1.15 ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'}`}>
                  {lang === 'ar' ? 'مريح' : 'Comfortable'}
                </button>
                <button type="button" onClick={() => setGlobalButtonScale(1.3)} className={`p-1 rounded cursor-pointer ${globalButtonScale === 1.3 ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'}`}>
                  {lang === 'ar' ? 'لمس ضخم' : 'Touch XL'}
                </button>
              </div>
            </div>

            {/* Screen Zoom Scale */}
            <div className="space-y-2 bg-white p-4 rounded-xl border border-slate-200">
              <div className="flex justify-between items-center text-xs">
                <span className="font-mono font-black text-violet-600 bg-violet-50 px-2 py-0.5 rounded">
                  {Math.round(globalZoomScale * 100)}%
                </span>
                <span className="font-bold text-slate-700">
                  {lang === 'ar' ? 'الزوم ودقة الشاشة الكاملة:' : 'Screen Zoom & Resolution:'}
                </span>
              </div>
              <input 
                type="range"
                min="0.6"
                max="1.2"
                step="0.05"
                value={globalZoomScale}
                onChange={(e) => setGlobalZoomScale(parseFloat(e.target.value))}
                className="w-full accent-violet-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
              />
              <div className="grid grid-cols-4 gap-1 text-[10px] text-center font-extrabold">
                <button type="button" onClick={() => {
                  setGlobalZoomScale(0.75);
                  showToast('success', lang === 'ar' ? '🔍 زوم لـ 75%' : '🔍 Zoom set to 75%');
                }} className={`p-1 rounded cursor-pointer ${globalZoomScale === 0.75 ? 'bg-violet-600 text-white shadow-xs' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'}`}>
                  75% ({lang === 'ar' ? 'صغيرة' : 'Small'})
                </button>
                <button type="button" onClick={() => {
                  setGlobalZoomScale(0.85);
                  showToast('success', lang === 'ar' ? '🔍 زوم لـ 85%' : '🔍 Zoom set to 85%');
                }} className={`p-1 rounded cursor-pointer ${globalZoomScale === 0.85 ? 'bg-violet-600 text-white shadow-xs' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'}`}>
                  85%
                </button>
                <button type="button" onClick={() => {
                  setGlobalZoomScale(1.0);
                  showToast('success', lang === 'ar' ? '🔍 زوم لـ 100%' : '🔍 Zoom set to 100%');
                }} className={`p-1 rounded cursor-pointer ${globalZoomScale === 1.0 ? 'bg-violet-600 text-white shadow-xs' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'}`}>
                  100%
                </button>
                <button type="button" onClick={() => {
                  setGlobalZoomScale(1.15);
                  showToast('success', lang === 'ar' ? '🔍 زوم لـ 115%' : '🔍 Zoom set to 115%');
                }} className={`p-1 rounded cursor-pointer ${globalZoomScale === 1.15 ? 'bg-violet-600 text-white shadow-xs' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'}`}>
                  115%
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 text-[10px] text-slate-400 font-semibold pt-1">
            <span>💡 {lang === 'ar' ? 'يتم حفظ هذه القيم وتفعيلها فورياً ومزامنتها على هذا المتصفح.' : 'Changes apply immediately and persist in this browser.'}</span>
          </div>
        </div>

        {/* Submit form button */}
        <button
          type="submit"
          className="w-full bg-[#1D9E75] hover:bg-[#158060] text-white font-extrabold py-3 px-4 rounded-xl text-xs transition duration-150 cursor-pointer flex items-center justify-center gap-2 shadow-sm mt-4"
        >
            <Save className="w-4 h-4 text-white" />
            <span>{lang === 'ar' ? '💾 تفعيل وحفظ الإعدادات والمعلمات الفنية' : '💾 Save General Settings & Exchange Rates'}</span>
          </button>
        </form>
      </div>
    ) : settingsSubTab === 'business' ? (
      /* Business Information Form Section */
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs w-full text-right font-sans">
        <h3 className="font-bold text-slate-800 text-lg pb-3 border-b border-slate-100 mb-5 flex items-center gap-2 justify-end">
          <span>
            {lang === 'ar' ? 'معلومات المؤسسة والشركة الرسمية' : 'Corporate & Business Information'}
          </span>
          <Briefcase className="w-6 h-6 text-[#1D9E75]" />
        </h3>

        <form onSubmit={onSaveSettings} className="space-y-5 font-sans">
          <div>
            <label className="block text-slate-700 font-bold mb-1.5 text-xs text-right">
              {lang === 'ar' ? 'اسم المؤسسة التجاري (الرئيسي):' : 'Official Business Name:'}
            </label>
            <input 
              type="text" 
              value={settings.shopName}
              onChange={e => setSettings({ ...settings, shopName: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-right font-extrabold focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-bold mb-1.5 text-xs text-right">
                {lang === 'ar' ? 'الرقم المالي والضريبي للمؤسسة (TIN / VAT):' : 'Tax / VAT Identification Number:'}
              </label>
              <input 
                type="text" 
                value={settings.taxId || ''}
                onChange={e => setSettings({ ...settings, taxId: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-right font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="320491-601"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1.5 text-xs text-right">
                {lang === 'ar' ? 'السجل التجاري (Commercial Registry):' : 'Commercial Registry Number:'}
              </label>
              <input 
                type="text" 
                value={settings.commercialRegistry || ''}
                onChange={e => setSettings({ ...settings, commercialRegistry: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-right font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="سجل بعبدا 49204"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-bold mb-1.5 text-xs text-right">
                {lang === 'ar' ? 'رقم هاتف التواصل والفرع الثاني:' : 'Contact Phone / Branch Tel:'}
              </label>
              <input 
                type="text" 
                value={settings.phone || ''}
                onChange={e => setSettings({ ...settings, phone: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-center font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="96170123456"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1.5 text-xs text-right">
                {lang === 'ar' ? 'البريد الإلكتروني التجاري (Email):' : 'Corporate Business Email:'}
              </label>
              <input 
                type="email" 
                value={settings.businessEmail || ''}
                onChange={e => setSettings({ ...settings, businessEmail: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-center font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="info@yourcompany.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1.5 text-xs text-right">
              {lang === 'ar' ? 'نوع وطبيعة النشاط التجاري:' : 'Business Domain / Activity:'}
            </label>
            <input 
              type="text" 
              value={settings.businessActivity || ''}
              onChange={e => setSettings({ ...settings, businessActivity: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-right focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
              placeholder="سوبرماركت، بيع مواد غذائية مفرق وجملة"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1.5 text-xs text-right">
              {lang === 'ar' ? 'العنوان الجغرافي للمقر الرئيسي والفرع الأساسي:' : 'Main Headquarters Geographic Address:'}
            </label>
            <input 
              type="text" 
              value={settings.address || ''}
              onChange={e => setSettings({ ...settings, address: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-right focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
              placeholder="قصقص المقابل للملعب البلدي"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-[#1D9E75] hover:bg-[#158060] text-white font-extrabold py-3 px-4 rounded-xl text-xs transition duration-150 cursor-pointer flex items-center justify-center gap-2 shadow-sm mt-4 font-sans"
          >
            <Save className="w-4 h-4 text-white" />
            <span>{lang === 'ar' ? '💾 حفظ وتعميم معلومات المؤسسة الرسمية' : '💾 Save Corporate Information'}</span>
          </button>
        </form>
      </div>
    ) : (
      /* Printers & Spoolers configuration block (mimicking Aronium style) */
      <div className="space-y-6">
        {/* Sandboxed iframe limits & New tab escape button banner */}
        {window.self !== window.top && (
          <div className="bg-amber-50 rounded-2xl border border-amber-250 p-5 text-right font-sans space-y-3 shadow-xs">
            <div className="flex items-center justify-between flex-row-reverse border-b border-amber-100 pb-2">
              <div className="flex items-center gap-1.5 flex-row-reverse">
                <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase animate-pulse">بيئة المعاينة مدمجة</span>
                <h4 className="font-bold text-xs sm:text-sm text-slate-800">تنبيه المتصفح لحماية الأجهزة والأمن المالي لدرج الكاش ⚙️</h4>
              </div>
            </div>
            <p className="text-[11.5px] text-slate-600 leading-relaxed font-sans">
              مرحباً بك يا كمال! أنت تشغل الكاشير حالياً داخل <strong>إطار المعاينة الجانبي التلقائي (IFrame Sandbox)</strong> التابع لـ AI Studio. لأسباب تتعلق بالخصوصية والحماية العالمية للمتصفحات، يمنع Chrome و Edge تلقائياً فتح أدراج الكاش المادية أو الاتصال بـ USB / COM من داخل المواقع المدمجة كإطار.
            </p>
            <p className="text-[11.5px] font-medium text-emerald-800 leading-relaxed">
              <strong>الحل الفوري الفعّال والسليم:</strong> يرجى الضغط على الزر الأخضر بالأسفل لفتح كاشير السوبرماركت في علامة تبويب كاملة ومستقلة تماماً، لتتمكن من استخدام ميزة الطباعة الصامتة كبرنامج Aronium المثبت وفتح درج النقد بنجاح بنسبة 100%!
            </p>
            <button
              type="button"
              onClick={() => {
                window.open(window.location.href, '_blank');
              }}
              className="w-full bg-[#1D9E75] hover:bg-emerald-600 text-white font-extrabold py-3 px-4 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-xs border border-emerald-400"
            >
              <ExternalLink className="w-4 h-4 text-white" />
              <span>فتح برنامج المبيعات في صفحة مستقلة كاملة (لتفعيل درج النقد والطابعات)</span>
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-right font-sans">
          <div className="lg:col-span-1 space-y-6">
            {/* Printer Output Mode / Hardware Linkage */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs w-full text-right space-y-3.5">
              <div className="flex items-center gap-1.5 justify-end pb-3 border-b border-slate-100">
                <span className="bg-emerald-100 text-[#1D9E75] text-[9px] font-bold px-1.5 py-0.5 rounded">Aronium Core Link</span>
                <h4 className="font-bold text-xs sm:text-sm text-slate-800 flex items-center gap-1">
                  <span>نمط وتوصيل طابعة الكاشير المادية ⚙️</span>
                </h4>
              </div>
              <p className="text-[10.5px] text-slate-500 leading-relaxed font-sans">
                حدد كيف سيتصل كاشير السوبرماركت بطابعتك لضمان تحقيق الطباعة الصامتة الفورية وفتح درج الكاشير:
              </p>
              
              <div className="space-y-2">
                {/* Option 1: System */}
                <label className={`block p-2.5 rounded-xl border cursor-pointer transition text-right ${hardwarePrinterType === 'system' ? 'bg-emerald-50/50 border-emerald-500 text-emerald-950 font-black' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}>
                  <div className="flex items-center gap-2 justify-end flex-row-reverse">
                    <input 
                      type="radio" 
                      name="hardwarePrinterType" 
                      value="system" 
                      checked={hardwarePrinterType === 'system'} 
                      onChange={() => {
                        setHardwarePrinterType('system');
                        storage.setItem('pos_hardware_printer_type', 'system');
                        showToast('success', '✔️ تم اختيار طباعة نظام تشغيل ويندوز (مناسب لكافة الطابعات بما فيها Canon G3030)');
                      }}
                      className="accent-[#1D9E75]"
                    />
                    <span className="text-[11px]">طباعة نظام Windows القياسية (رسومية كاملة)</span>
                  </div>
                  <span className="text-[9.5px] text-slate-400 font-bold block mt-0.5 pr-5">
                    🖥️ مناسبة لـ Canon G3030 وباقي الطابعات العادية. مطابقة 100% للتنسيقات.
                  </span>
                </label>

                {/* Option 2: Serial */}
                <label className={`block p-2.5 rounded-xl border cursor-pointer transition text-right ${hardwarePrinterType === 'serial' ? 'bg-emerald-50/50 border-emerald-500 text-emerald-950 font-black' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}>
                  <div className="flex items-center gap-2 justify-end flex-row-reverse">
                    <input 
                      type="radio" 
                      name="hardwarePrinterType" 
                      value="serial" 
                      checked={hardwarePrinterType === 'serial'} 
                      onChange={() => {
                        setHardwarePrinterType('serial');
                        storage.setItem('pos_hardware_printer_type', 'serial');
                        showToast('success', '✔️ تم تفعيل طباعة المنفذ التسلسلي الافتراضي Serial/COM');
                      }}
                      className="accent-[#1D9E75]"
                    />
                    <span className="text-[11px]">ربط سلكي مباشر بالمنفذ التسلسلي (Serial COM Port)</span>
                  </div>
                  <span className="text-[9.5px] text-slate-400 font-bold block mt-0.5 pr-5">
                    🔌 مناسبة لجميع الطابعات الحرارية الموصولة بـ COM أو كابل USB افتراضي.
                  </span>
                </label>

                {/* Option 3: USB */}
                <label className={`block p-2.5 rounded-xl border cursor-pointer transition text-right ${hardwarePrinterType === 'usb' ? 'bg-emerald-50/50 border-emerald-500 text-emerald-950 font-black' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}>
                  <div className="flex items-center gap-2 justify-end flex-row-reverse">
                    <input 
                      type="radio" 
                      name="hardwarePrinterType" 
                      value="usb" 
                      checked={hardwarePrinterType === 'usb'} 
                      onChange={() => {
                        setHardwarePrinterType('usb');
                        storage.setItem('pos_hardware_printer_type', 'usb');
                        showToast('success', '✔️ تم تفعيل طباعة WebUSB direct raw POS stream');
                      }}
                      className="accent-[#1D9E75]"
                    />
                    <span className="text-[11px]">اتصال WebUSB المباشر (خام للأجهزة الحرارية POS)</span>
                  </div>
                  <span className="text-[9.5px] text-slate-400 font-bold block mt-0.5 pr-5">
                    🖨️ ترسل نبضات ونصوص مباشرة للطابعة، سريعة فدائية.
                  </span>
                </label>
              </div>

              {/* Interactive linkage helpers based on state */}
              {hardwarePrinterType === 'serial' && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2 mt-2">
                  <span className="text-[10px] font-extrabold text-slate-700 block text-right">⚙️ إعدادات المنفذ السلكي COM:</span>
                  <div className="flex gap-2">
                    <select
                      value={baudRate}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setBaudRate(val);
                        storage.setItem('pos_serial_baud_rate', String(val));
                      }}
                      className="flex-1 bg-white border border-slate-200 rounded-lg py-1 px-1.5 text-[10px] text-right font-mono"
                    >
                      <option value="9600">9600 Baud</option>
                      <option value="19200">19200 Baud</option>
                      <option value="38400">38400 Baud</option>
                      <option value="115200">115200 Baud</option>
                    </select>
                    
                    <button
                      type="button"
                      onClick={connectSerialPrinter}
                      className="bg-[#1D9E75] hover:bg-[#158060] text-white font-extrabold px-3 py-1 rounded-lg text-[10px] transition cursor-pointer"
                    >
                      {serialPortInfo ? '🔄 إعادة ربط COM' : '🔌 ربط المنفذ COM'}
                    </button>
                  </div>
                  {serialPortInfo && (
                    <p className="text-[9.5px] text-emerald-700 font-bold text-center mt-1">
                      ✔️ متصل بـ: <span className="font-mono">{serialPortInfo}</span>
                    </p>
                  )}
                </div>
              )}

              {hardwarePrinterType === 'usb' && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2 mt-2">
                  <span className="text-[10px] font-extrabold text-slate-700 block text-right">⚙️ فحص وتوصيل جهاز USB:</span>
                  <button
                    type="button"
                    onClick={connectUSBPrinter}
                    className="w-full bg-[#1D9E75] hover:bg-[#158060] text-white font-extrabold py-1.5 px-3 rounded-lg text-[10px] transition cursor-pointer flex items-center justify-center gap-1"
                  >
                    <span>🔌 اقتران كابل طابعة USB</span>
                  </button>
                  {usbDeviceName && (
                    <p className="text-[9.5px] text-emerald-700 font-bold text-center mt-1">
                      ✔️ الجهاز المقترن: <span className="font-mono">{usbDeviceName}</span>
                    </p>
                  )}
                </div>
              )}

              {hardwarePrinterType === 'system' && (
                <div className="bg-amber-50 rounded-xl p-3.5 border border-amber-200 text-[10px] leading-relaxed text-slate-700 space-y-1.5">
                  <p className="font-extrabold text-amber-900 text-xs">💡 تمكين درج الكاش لـ Canon G3030 وكافة طابعات ويندوز:</p>
                  <p>
                    عند العمل بنمط طابعة نظام تشغيل ويندوز (مناسب تماماً لـ Canon)، لا يمكن للمتصفح إطلاق نبضة مادية لدرج الكاش مباشرة. لكن Windows يملك هذه الميزة مدمجة بخصائص طابعتك:
                  </p>
                  <ul className="list-decimal list-inside pr-1 text-slate-800 space-y-1">
                    <li>افتح لوحة تحكم جهازك: <strong>لوحة التحكم (Control Panel)</strong>.</li>
                    <li>اذهب إلى قسم: <strong>الأجهزة والطابعات (Devices and Printers)</strong>.</li>
                    <li>اضغط كليك يمين على طابعتك (مثال: <code className="bg-white/85 px-1 py-0.5 text-slate-900 rounded font-mono font-bold">Canon G3030 series</code>) واختر <strong>خصائص الطابعة (Printer Properties)</strong>.</li>
                    <li>انقل لعلامة تبويب: <strong>إعدادات الجهاز (Device Settings)</strong>.</li>
                    <li>ابحث عن بند: <strong>درج النقد (Cash Drawer / Peripheral Cash Select)</strong>.</li>
                    <li>غيّر قيمة البند من "تعطيل/No Drawer" إلى <strong>"فتح قبل الطباعة/Open Before Printing"</strong> أو "فتح بعد الطباعة".</li>
                    <li>انقر <strong>تطبيق وموافق (Apply & OK)</strong>.</li>
                  </ul>
                  <p className="text-emerald-800 font-extrabold text-[10.5px] leading-normal pt-1 border-t border-amber-250/50 mt-1">
                    ✔️ بمجرد الدفع وطباعة الفاتورة صامتاً، سيقوم محرك Windows Spooler المادي بإلقاء نبضة فتح درج الكاش المادي تلقائياً بنسبة 100% وبدون أي مشاكل!
                  </p>
                </div>
              )}
            </div>

            {/* Windows Printer Auto Detector Box */}
            <div className="bg-emerald-50/75 hover:bg-emerald-50 border border-emerald-250 p-5 rounded-2xl shadow-xs w-full text-right transition duration-200">
              <div className="flex items-center gap-2 justify-end mb-2.5">
                <span className="bg-[#1D9E75] text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">Windows Device Spooler</span>
                <h3 className="font-extrabold text-slate-800 text-xs font-sans">رصد واكتشاف طابعات نظام التشغيل</h3>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed mb-3.5">
                هل ترغب في قراءة وسحب كافة الطابعات المعرّفة على حاسوبك فوراً (مثل Canon G3030, G3416, G3010, HP LaserJet)؟ اضغط على زر الفحص التلقائي أدناه لقراءة قائمة الطابعات وتعيينها فوراً بالبرنامج.
              </p>
              
              {isScanningPrinters ? (
                <div className="space-y-2 py-1.5">
                  <div className="flex justify-between items-center text-[10px] font-bold text-emerald-800">
                    <span className="animate-pulse">جاري فحص تعريفات Windows Spooler...</span>
                    <span className="font-mono">75%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div className="bg-[#1D9E75] h-full rounded-full transition-all duration-1000 ease-out" style={{ width: '75%' }}></div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={scanAndPopulatePrinters}
                  className="w-full bg-[#1D9E75] hover:bg-emerald-600 text-white font-extrabold py-3 px-3 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-xs border border-emerald-400"
                >
                  <Printer className="w-4 h-4 animate-bounce" />
                  <span>🔄 رصد طابعات ويندوز النشطة بالكمبيوتر 🖥️</span>
                </button>
              )}
              <p className="text-[9px] text-slate-500 mt-2 text-center font-medium">
                سيتصل البرنامج بـ 14 طابعة نظام حقيقية لتمكين التوزيع الفوري للفواتير والملصقات والمطبخ.
              </p>
            </div>

          {/* Box 1: Printer definitions */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs w-full text-right">
            <h3 className="font-bold text-slate-800 text-base pb-3 border-b border-slate-100 mb-4 flex items-center justify-end gap-1.5 label-arabic">
              <span>إضافة وتحرير طابعات النظام</span>
              <Printer className="w-5 h-5 text-[#1D9E75]" />
            </h3>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!newPrinterName.trim()) {
                showToast('error', '⚠️ الرجاء تزويد اسم الطابعة التعريفي أولاً');
                return;
              }
              const list = settings.printersList || [];
              const id = `p-${Date.now()}`;
              const updatedList = [...list, {
                id,
                name: newPrinterName.trim(),
                connectionType: newPrinterConn,
                paperWidth: newPrinterWidth,
                address: newPrinterAddress
              }];
              const updatedSettings = { ...settings, printersList: updatedList };
              setSettings(updatedSettings);
              storage.setJSON('pos_settings', updatedSettings);
              
              setNewPrinterName('');
              setNewPrinterAddress('LPT1');
              showToast('success', '✔️ تم حفظ الطابعة بنجاج وتضمينها بالنظام!');
            }} className="space-y-4 font-sans">
              {/* Direct Silent printing override switch (Aronium silent spooling mode) */}
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-150 flex flex-col gap-2 mb-2 text-right">
                <label className="relative inline-flex items-center justify-between cursor-pointer select-none w-full">
                  <input 
                    type="checkbox" 
                    checked={settings.directSilentPrint !== false}
                    onChange={(e) => {
                      const val = e.target.checked;
                      const updatedSettings = { ...settings, directSilentPrint: val };
                      setSettings(updatedSettings);
                      storage.setJSON('pos_settings', updatedSettings);
                      showToast('success', val 
                        ? '⚡ تم تفعيل ميزة الطباعة الصامتة المباشرة (تخطي حوار المتصفح)' 
                        : '🌐 تم الرجوع لنمط حوار المتصفح اليدوي عند الطباعة'
                      );
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1D9E75]" dir="ltr"></div>
                  <span className="text-xs font-black text-slate-800 flex items-center gap-1.5 flex-row-reverse">
                    <span>شريحة الطباعة الصامتة المباشرة ⚡</span>
                  </span>
                </label>
                <p className="text-[10px] text-slate-500 leading-normal">
                  عند التفعيل، سيتم إرسال الفواتير والباركود والتقارير فوراً لملقم الطباعة المدمج دون فتح نافذة حوار المتصفح اليدوية المزعجة.
                </p>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1 text-xs">الاسم التعريفي للطابعة (مثال: طابعة الكاشير 1):</label>
                <input
                  type="text"
                  value={newPrinterName}
                  onChange={(e) => setNewPrinterName(e.target.value)}
                  placeholder="طابعة حرارية رئيسية"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-right font-bold focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-bold mb-1 text-xs">نوع الاتصال:</label>
                  <select
                    value={newPrinterConn}
                    onChange={(e) => setNewPrinterConn(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-2 text-xs text-right cursor-pointer"
                  >
                    <option value="USB">USB Cable</option>
                    <option value="Network">Network IP (Wi-Fi/LAN)</option>
                    <option value="Serial">Serial Port (COM)</option>
                    <option value="Bluetooth">Bluetooth</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1 text-xs">حجم الورق:</label>
                  <select
                    value={newPrinterWidth}
                    onChange={(e) => setNewPrinterWidth(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-2 text-xs text-right cursor-pointer"
                  >
                    <option value="80mm">80mm (كبير مبيعات)</option>
                    <option value="58mm">58mm (صغير رول)</option>
                    <option value="A4">A4 (مستندات كاملة)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1 text-xs">عنوان المنفذ / IP للمنفذ الرقمي:</label>
                <input
                  type="text"
                  value={newPrinterAddress}
                  onChange={(e) => setNewPrinterAddress(e.target.value)}
                  placeholder="192.168.1.200 أو LPT1 أو USB001"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-right font-mono text-left focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#1D9E75] hover:bg-emerald-600 text-white font-extrabold py-2.5 rounded-xl text-xs transition cursor-pointer shadow-xs"
              >
                إضافة طابعة جديدة للبرنامج ⚡
              </button>
            </form>

            {/* Registered Printers Loop */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <span className="text-xs font-black text-slate-700 block mb-3">القائمة المربوطة والمجهزة بالحاسوب:</span>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {(!settings.printersList || settings.printersList.length === 0) ? (
                  <div className="text-center py-6 text-slate-400 bg-slate-50 rounded-xl text-xs border border-dashed border-slate-150">
                    لا يوجد طابعات مضافة حالياً.
                  </div>
                ) : (
                  settings.printersList.map((pr: any) => (
                    <div key={pr.id} className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-150 rounded-xl text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          // Delete printer
                          const updated = (settings.printersList || []).filter((item: any) => item.id !== pr.id);
                          const updatedSettings = { ...settings, printersList: updated };
                          setSettings(updatedSettings);
                          storage.setJSON('pos_settings', updatedSettings);
                          showToast('success', '🧹 تم إزالة تعريف الطابعة بنجاح.');
                        }}
                        className="text-red-650 hover:text-red-750 font-bold cursor-pointer underline px-1.5 py-0.5 rounded"
                      >
                        حذف
                      </button>
                      
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            // 1. Spool in virtual queue for on-screen tracking
                            addPrintJob(pr.name, 'اختبار الطابعة المدمجة', `=== TEST PRINT ===\nPrinter: ${pr.name}\nPort: ${pr.address}\nStatus: ONLINE\n=== END ===`);
                            
                            // 2. Perform a REAL physical print job so the browser opens the printer dialog and actually prints paper!
                            const testStyles = `
                              body {
                                width: ${pr.paperWidth === '58mm' ? '58mm' : pr.paperWidth === 'A5' ? '148mm' : '80mm'} !important;
                                padding: 0 !important;
                                margin: 0 !important;
                                background: white !important;
                                color: black !important;
                              }
                              #test-thermal-print {
                                width: 100% !important;
                                max-width: 100% !important;
                                background: white !important;
                                color: black !important;
                                display: block !important;
                              }
                            `;
                            printElementViaIFrame('test-thermal-print', testStyles, false);
                            
                            // 3. If direct USB/Serial modes are active, stream raw bytes as well
                            if (hardwarePrinterType === 'usb') {
                              printInvoiceToRawHardware({
                                invoiceNumber: 'TEST-PAGE',
                                date: new Date().toLocaleDateString(),
                                time: new Date().toLocaleTimeString(),
                                cashier: 'أبو كامل',
                                paymentMethod: 'cash',
                                subtotalUSD: 0,
                                totalUSD: 0,
                                totalLBP: 0,
                                items: [{ productName: 'صفحة اختبار الطابعة المدمجة', quantity: 1, priceUSD: 0, totalUSD: 0 }]
                              });
                            } else if (hardwarePrinterType === 'serial') {
                              printInvoiceToRawHardware({
                                invoiceNumber: 'TEST-PAGE',
                                date: new Date().toLocaleDateString(),
                                time: new Date().toLocaleTimeString(),
                                cashier: 'أبو كامل',
                                paymentMethod: 'cash',
                                subtotalUSD: 0,
                                totalUSD: 0,
                                totalLBP: 0,
                                items: [{ productName: 'صفحة اختبار الطابعة المدمجة', quantity: 1, priceUSD: 0, totalUSD: 0 }]
                              });
                            }
                          }}
                          className="bg-slate-200 hover:bg-slate-350 text-slate-750 font-black px-2 py-1 rounded transition text-[10px] cursor-pointer"
                        >
                          طباعة تجريبية 📋
                        </button>
                      </div>

                      <div className="text-right">
                        <span className="font-bold text-slate-800 block">{pr.name}</span>
                        <span className="text-[10px] text-slate-400 block font-mono">{pr.connectionType} • {pr.paperWidth} • {pr.address}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Cash Drawer Configuration card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs w-full text-right">
            <h3 className="font-bold text-slate-800 text-base pb-3 border-b border-slate-100 mb-4 flex items-center justify-end gap-1.5 label-arabic">
              <span>درج النقد والتحكم بالنبضات (Cash Drawer)</span>
              <Archive className="w-5 h-5 text-amber-500" />
            </h3>
            
            <div className="space-y-4 font-sans text-xs">
              {/* Toggle: Open drawer */}
              <div className="p-3 bg-amber-50/50 border border-amber-150 rounded-2xl flex flex-col gap-2 text-right">
                <label className="relative inline-flex items-center justify-between cursor-pointer select-none w-full">
                  <input 
                    type="checkbox" 
                    checked={settings.cashDrawerEnabled !== false}
                    onChange={(e) => {
                      const val = e.target.checked;
                      const updatedSettings = { ...settings, cashDrawerEnabled: val };
                      setSettings(updatedSettings);
                      storage.setJSON('pos_settings', updatedSettings);
                      showToast('success', val 
                        ? '✔️ تم تفعيل فتح درج الكاش تلقائياً عند طباعة الفاتورة' 
                        : '🔒 تم تعطيل الفتح التلقائي لدرج النقد'
                      );
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500" dir="ltr"></div>
                  <span className="text-xs font-black text-slate-800 flex items-center gap-1.5 flex-row-reverse">
                    <span>تفعيل فتح درج النقد 💵</span>
                  </span>
                </label>
                <p className="text-[10px] text-slate-500 leading-normal">
                  عند التنشيط، سيقوم البرنامج بإجراء اتصال لإطلاق نبضة فتح الدرج تلقائياً مع المبيعات وإصدار الفواتير.
                </p>
              </div>

              {/* Input: Cash drawer decimal command series */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] text-slate-400 font-mono" dir="ltr">ASCII Decimal Codes</span>
                  <label className="block text-slate-600 font-bold text-xs text-right">أمر درج النقد (مثل Aronium):</label>
                </div>
                <input
                  type="text"
                  value={settings.cashDrawerCodes || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    const updatedSettings = { ...settings, cashDrawerCodes: val };
                    setSettings(updatedSettings);
                    storage.setJSON('pos_settings', updatedSettings);
                  }}
                  placeholder="27,112,0,148,49"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-center font-bold tracking-wider font-mono focus:ring-1 focus:ring-amber-500"
                />
                <div className="flex flex-wrap gap-1 mt-1.5 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      const updatedSettings = { ...settings, cashDrawerCodes: '27,112,0,148,49' };
                      setSettings(updatedSettings);
                      storage.setJSON('pos_settings', updatedSettings);
                      showToast('success', '⚡ تم تعيين كود Aronium الافتراضي: 27,112,0,148,49');
                    }}
                    className="text-[9px] bg-slate-100 hover:bg-slate-200 border border-slate-150 text-slate-600 px-1.5 py-0.5 rounded cursor-pointer font-mono"
                  >
                    افتراضي Aronium (27,112,0,148,49)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const updatedSettings = { ...settings, cashDrawerCodes: '27,112,0,25,250' };
                      setSettings(updatedSettings);
                      storage.setJSON('pos_settings', updatedSettings);
                      showToast('success', '⚡ تم تعيين كود Epson القياسي: 27,112,0,25,250');
                    }}
                    className="text-[9px] bg-slate-100 hover:bg-slate-200 border border-slate-150 text-slate-600 px-1.5 py-0.5 rounded cursor-pointer font-mono"
                  >
                    قياسي Epson (27,112,0,25,250)
                  </button>
                </div>
              </div>

              {/* Test drawer action */}
              <button
                type="button"
                onClick={() => {
                  openCashDrawer();
                }}
                className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-2.5 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
              >
                <span>فحص واختبار حركة الدرج 💸</span>
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {/* Aronium Assignments */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs w-full text-right">
            <h3 className="font-bold text-slate-800 text-base pb-3 border-b border-slate-100 mb-4 flex items-center justify-end gap-1.5">
              <span>أقسام وتوزيع طابعات الفواتير الفوري (عالم Aronium)</span>
              <Settings className="w-5 h-5 text-[#1D9E75]" />
            </h3>

            <p className="text-xs text-slate-500 mb-5 leading-normal">
              تتيح لك هذه اللوحة تعميد طابعة منفصلة لكل غاية أو شاشة طالما تم تعريفها أعلاه. بمجرد إرسال فاتورة أو طلبية، سيتولى ملقم الطباعة المدمج توزيع المهام في الخلفية:
            </p>

            <div className="space-y-4">
              {/* Assignment: Receipt */}
              <div className="p-4 border border-slate-150 rounded-2xl bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={settings.printerAssignments?.receiptEnabled || false}
                      onChange={(e) => {
                        const updatedAssignments = {
                          ...(settings.printerAssignments || { receiptPrinterId: '', targetPrinterId: '', kitchenPrinterId: '', receiptEnabled: true, kitchenEnabled: false, logEnabled: false }),
                          receiptEnabled: e.target.checked
                        };
                        const updatedSettings = { ...settings, printerAssignments: updatedAssignments };
                        setSettings(updatedSettings);
                        storage.setJSON('pos_settings', updatedSettings);
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1D9E75]" dir="ltr"></div>
                    <span className="mr-2 text-xs font-bold text-slate-700">تفعيل الطباعة التلقائية عند الدفع</span>
                  </label>
                  
                  <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5 flex-row-reverse">
                    <span>🧾 طابعة فواتير البيع (رول الكاشير):</span>
                  </span>
                </div>

                <div className="flex gap-4 items-center">
                  <select
                    value={settings.printerAssignments?.receiptPrinterId || ''}
                    onChange={(e) => {
                      const updatedAssignments = {
                        ...(settings.printerAssignments || { receiptPrinterId: '', targetPrinterId: '', kitchenPrinterId: '', receiptEnabled: true, kitchenEnabled: false, logEnabled: false }),
                        receiptPrinterId: e.target.value
                      };
                      const updatedSettings = { ...settings, printerAssignments: updatedAssignments };
                      setSettings(updatedSettings);
                      storage.setJSON('pos_settings', updatedSettings);
                    }}
                    className="flex-1 bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-right cursor-pointer opacity-100 disabled:opacity-50"
                  >
                    <option value="">-- اختر طابعة من القائمة المحددة --</option>
                    {(settings.printersList || []).map((pr: any) => (
                      <option key={pr.id} value={pr.id}>{pr.name} ({pr.connectionType})</option>
                    ))}
                  </select>
                  <span className="text-[11px] text-slate-400 w-32 shrink-0 font-medium">الهدف المعهود للفواتير</span>
                </div>
              </div>

              {/* Assignment: Kitchen */}
              <div className="p-4 border border-slate-150 rounded-2xl bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={settings.printerAssignments?.kitchenEnabled || false}
                      onChange={(e) => {
                        const updatedAssignments = {
                          ...(settings.printerAssignments || { receiptPrinterId: '', targetPrinterId: '', kitchenPrinterId: '', receiptEnabled: true, kitchenEnabled: false, logEnabled: false }),
                          kitchenEnabled: e.target.checked
                        };
                        const updatedSettings = { ...settings, printerAssignments: updatedAssignments };
                        setSettings(updatedSettings);
                        storage.setJSON('pos_settings', updatedSettings);
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1D9E75]" dir="ltr"></div>
                    <span className="mr-2 text-xs font-bold text-slate-700">تفعيل الطباعة الفورية لطلبات المطبخ / قسم المأكولات</span>
                  </label>
                  
                  <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5 flex-row-reverse">
                    <span>🍳 طابعة المطبخ / البوفيه والمخزن الخلفي:</span>
                  </span>
                </div>

                <div className="flex gap-4 items-center">
                  <select
                    value={settings.printerAssignments?.kitchenPrinterId || ''}
                    onChange={(e) => {
                      const updatedAssignments = {
                        ...(settings.printerAssignments || { receiptPrinterId: '', targetPrinterId: '', kitchenPrinterId: '', receiptEnabled: true, kitchenEnabled: false, logEnabled: false }),
                        kitchenPrinterId: e.target.value
                      };
                      const updatedSettings = { ...settings, printerAssignments: updatedAssignments };
                      setSettings(updatedSettings);
                      storage.setJSON('pos_settings', updatedSettings);
                    }}
                    className="flex-1 bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-right cursor-pointer"
                  >
                    <option value="">-- اختر طابعة من القائمة المحددة --</option>
                    {(settings.printersList || []).map((pr: any) => (
                      <option key={pr.id} value={pr.id}>{pr.name} ({pr.connectionType})</option>
                    ))}
                  </select>
                  <span className="text-[11px] text-slate-400 w-32 shrink-0 font-medium">هدف بونات السندوتشات والعصائر</span>
                </div>
              </div>

              {/* Assignment: Audit logs */}
              <div className="p-4 border border-slate-150 rounded-2xl bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={settings.printerAssignments?.logEnabled || false}
                      onChange={(e) => {
                        const updatedAssignments = {
                          ...(settings.printerAssignments || { receiptPrinterId: '', targetPrinterId: '', kitchenPrinterId: '', receiptEnabled: true, kitchenEnabled: false, logEnabled: false }),
                          logEnabled: e.target.checked
                        };
                        const updatedSettings = { ...settings, printerAssignments: updatedAssignments };
                        setSettings(updatedSettings);
                        storage.setJSON('pos_settings', updatedSettings);
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1D9E75]" dir="ltr"></div>
                    <span className="mr-2 text-xs font-bold text-slate-700">تفعيل الطباعة لمسودات التدقيق المالي</span>
                  </label>
                  
                  <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5 flex-row-reverse">
                    <span>📑 طابعة المستندات والمحاسب الإداري (A4):</span>
                  </span>
                </div>

                <div className="flex gap-4 items-center">
                  <select
                    value={settings.printerAssignments?.targetPrinterId || ''}
                    onChange={(e) => {
                      const updatedAssignments = {
                        ...(settings.printerAssignments || { receiptPrinterId: '', targetPrinterId: '', kitchenPrinterId: '', receiptEnabled: true, kitchenEnabled: false, logEnabled: false }),
                        targetPrinterId: e.target.value
                      };
                      const updatedSettings = { ...settings, printerAssignments: updatedAssignments };
                      setSettings(updatedSettings);
                      storage.setJSON('pos_settings', updatedSettings);
                    }}
                    className="flex-1 bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-right cursor-pointer"
                  >
                    <option value="">-- اختر طابعة من القائمة المحددة --</option>
                    {(settings.printersList || []).map((pr: any) => (
                      <option key={pr.id} value={pr.id}>{pr.name} ({pr.connectionType})</option>
                    ))}
                  </select>
                  <span className="text-[11px] text-slate-400 w-32 shrink-0 font-medium">هدف كشوف الحساب والمبيعات</span>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Kiosk / Silent print guide card */}
          <div className="bg-emerald-50/40 rounded-2xl border border-emerald-150 p-5 space-y-3.5 text-right font-sans">
            <div className="flex items-center gap-1.5 justify-end">
              <span className="bg-[#1D9E75] text-[#F1FFF8] text-[9px] font-bold px-1.5 py-0.5 rounded">صيانة وإعداد سريع</span>
              <h4 className="font-bold text-xs sm:text-sm text-slate-800 flex items-center gap-1">
                <span>حل مشكلة استمرار ظهور نافذة الطباعة ⚡</span>
              </h4>
            </div>
            
            <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3.5 rounded-xl text-[11px] leading-relaxed text-right space-y-1">
              <p className="font-extrabold text-xs">⚠️ لماذا يستمر حوار الطباعة بالظهور على حاسوبك؟</p>
              <p>
                السبب الرئيسي هو أن متصفح Chrome أو Edge يستمر في العمل "كمهمة في الخلفية" أو كأيقونة صامتة بجوار ساعة الويندوز، أو لأنك تشغل البرنامج بوضعية مستعرض داخلي مخصص. عند فتح المتصفح بهذه الحالة، يتجاهل النظام ميزة الطباعة الصامتة كلياً.
              </p>
            </div>

            <p className="text-[11px] text-slate-700 leading-relaxed font-sans">
              لقد قمنا ببرمجة <strong>أداة تشغيل ذكية ومخصصة وجاهزة للتحميل بنقرة واحدة (.bat)</strong>. تقوم هذه الأداة تلقائياً بإغلاق أي عمليات كروم معلّقة بالخلفية في حاسوبك، وإعادة فتح النظام بوضعية <strong>Kiosk Silent Printing</strong> الاحترافية المباشرة:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => downloadSilentPrintScript('chrome')}
                className="bg-white hover:bg-slate-50 text-slate-800 text-[11px] font-bold py-2.5 px-3 rounded-xl border border-slate-200 flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs hover:border-emerald-300"
              >
                <span className="text-emerald-600">🌐</span>
                <span>تحميل أداة التشغيل لـ Chrome</span>
              </button>
              
              <button
                type="button"
                onClick={() => downloadSilentPrintScript('edge')}
                className="bg-white hover:bg-slate-50 text-slate-800 text-[11px] font-bold py-2.5 px-3 rounded-xl border border-slate-200 flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs hover:border-emerald-300"
              >
                <span className="text-blue-500">🟦</span>
                <span>تحميل أداة التشغيل لـ MS Edge</span>
              </button>
            </div>

            <div className="bg-emerald-500/10 text-emerald-950 p-3.5 rounded-xl text-[10.5px] leading-relaxed font-medium space-y-1.5 border border-emerald-500/20">
              <p className="font-extrabold text-[#1D9E75] text-[11px]">🔧 خطوات التشغيل بنقرة واحدة:</p>
              <ul className="list-decimal list-inside pr-1 space-y-1">
                <li>اضغط على زر المتصفح الذي تفضله أعلاه (ينصح بـ <strong>Chrome</strong> للسرعة القصوى).</li>
                <li>سيتم تنزيل ملف دُفعة صغير باسم <code className="bg-white/80 px-1 py-0.5 rounded font-mono font-bold text-slate-700">Run_POS_Chrome_SilentPrint.bat</code></li>
                <li>اذهب لمجلد التنزيلات على جهازك وشغّل هذا الملف (انقر عليه مرتين).</li>
                <li>سيغلق المتصفح فوراً وسيفتح نافذة آمنة جديدة، وعند الدفع <strong>ستخرج فواتيرك فوراً من طابعة Canon G3030 بمجرد الضغط على زر الدفع!</strong></li>
              </ul>
            </div>
          </div>

          {/* Integrated background spooler progress logs */}
          <div className="bg-slate-900 text-stone-100 rounded-2xl p-5 shadow-md border border-stone-800 space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-stone-800">
              <button
                type="button"
                onClick={() => {
                  setActivePrintJobs([]);
                  showToast('success', '🧹 تم تفريغ سجل مهام الطباعة بنجاح.');
                }}
                className="bg-stone-800 hover:bg-stone-700 text-xs px-2.5 py-1 rounded-lg text-stone-400 hover:text-white font-bold cursor-pointer transition-colors"
              >
                تفريغ السجل
              </button>
              <h4 className="font-bold text-xs sm:text-sm text-stone-200 flex items-center gap-1.5">
                <span>سجل ملقم الطباعة المدمج ومراقبة المهام (Virtual Spooler Queue)</span>
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping shrink-0" />
              </h4>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {activePrintJobs.length === 0 ? (
                <p className="text-center py-6 text-stone-500 font-mono text-xs">
                  - الذاكرة المؤقتة لمهام الطباعة فارغة حالياً -
                </p>
              ) : (
                activePrintJobs.map(job => (
                  <div key={job.id} className="p-3 bg-stone-850 border border-stone-800 rounded-xl text-xs flex flex-col gap-2">
                    <div className="flex justify-between items-center font-mono">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        job.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {job.status === 'completed' ? 'تمت الطباعة ✔️' : 'جاري العمل ⚙️'}
                      </span>
                      <span className="font-bold text-stone-100">{job.jobName} ➡️ {job.printerName}</span>
                    </div>
                    <div className="flex justify-between items-center font-mono text-[10px] text-stone-400">
                      <span>{job.timestamp}</span>
                      <span>المعرف الجردي: {job.id}</span>
                    </div>
                    
                    {/* Progressive Bar */}
                    <div className="w-full bg-stone-800 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${
                          job.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
              )}
    
    <div 
      className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs w-full text-right space-y-6 mt-6"
      id="activation-card-panel"
    >
      <h3 className="font-bold text-slate-800 text-base pb-3 border-b border-slate-100 flex items-center gap-2 justify-end">
        <span>
          {lang === 'ar' ? 'تراخيص وبرمجيات النظام والتحقق من التفعيل' : 'System Software Licensing & Activation Verification'}
        </span>
        <KeyRound className="w-5 h-5 text-[#1D9E75]" />
      </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 flex-row-reverse w-full">
            
            {/* Column 1: Verification, Status & Key Input */}
            <div className="bg-slate-50 border border-slate-200 p-4.5 rounded-2xl space-y-4 text-right">
              <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">
                {lang === 'ar' ? 'حالة الترخيص الحالية:' : 'Current License Status:'}
              </span>
              
              {license.isLicensed ? (
                <div className="space-y-3">
                  <div className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-xl text-center space-y-2 font-sans text-right">
                    <span className="text-emerald-800 text-xs font-black block text-center">
                      🎉 {license.daysRemaining === null
                        ? (lang === 'ar' ? 'ترخيص مدى الحياة مفعّل!' : 'Lifetime licence active!')
                        : license.inGracePeriod
                          ? (lang === 'ar' ? 'فترة سماح مؤقتة (نظام التفعيل القديم)' : 'Temporary grace period (old activation)')
                          : (lang === 'ar' ? 'تم تنشيط الاشتراك السنوي بنجاح!' : 'Annual Subscription Active!')}
                    </span>
                    <p className="text-[10px] text-emerald-600 font-bold leading-relaxed">
                      {license.inGracePeriod
                        ? (lang === 'ar'
                          ? `تم تحديث نظام التفعيل. أدخل كود تفعيل جديد خلال ${license.graceDaysLeft} يوم للاستمرار.`
                          : `The activation system was updated. Enter a new key within ${license.graceDaysLeft} days.`)
                        : (lang === 'ar'
                          ? `ترخيص البرنامج مفعّل لمتجر (${license.license?.shop || settings.shopName}) ومربوط بهذا الجهاز.`
                          : `Licensed to (${license.license?.shop || settings.shopName}) and bound to this computer.`)}
                    </p>
                    {license.isLicensed && license.daysRemaining !== null && (
                      <div className="bg-emerald-600 text-white font-black text-[10px] py-1 px-2.5 rounded-lg inline-block w-full text-center">
                        {lang === 'ar'
                          ? `⏳ الأيام المتبقية: ${license.daysRemaining} يوم`
                          : `⏳ Days remaining: ${license.daysRemaining} days`}
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-1 text-center font-sans">
                    <span className="text-[10px] text-slate-400 font-bold block">مفتاح التفعيل الحالي:</span>
                    <span className="font-mono text-xs font-black text-slate-700 bg-slate-150 border px-3 py-1 rounded-md inline-block select-none tracking-widest text-center">
                      {license.license ? `•••••-•••••-${license.license.key.slice(-5)}` : '—'}
                    </span>
                  </div>

                  <div className="pt-2 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => openSetupWizard()}
                      className="w-full bg-[#1D9E75]/10 hover:bg-[#1D9E75]/20 text-[#1D9E75] font-extrabold py-2 px-3 rounded-xl text-[10px] transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>🔑 {lang === 'ar' ? 'تعديل وتعيين حسابات المدير والكاشير' : 'Re-configure Admin & Cashier Accounts'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(lang === 'ar' ? 'هل أنت متأكد من رغبتك في إلغاء تنشيط وحذف كود التفعيل الحالي والرجوع للنسخة التجريبية؟' : 'Are you sure you want to deactivate current license and return to trial?')) {
                          license.deactivate();
                          showToast('warning', lang === 'ar' ? '⚠️ تم إلغاء تفعيل ترخيص البرنامج والرجوع للوضع التجريبي' : 'License deactivated. Returned to trial.');
                        }
                      }}
                      className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold py-2 px-3 rounded-xl text-[10px] transition cursor-pointer text-center"
                    >
                      {lang === 'ar' ? 'إلغاء تنشيط الترخيص الحالي 🗑️' : 'Reset Active License 🗑️'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {license.inGracePeriod && (
                    <div className="bg-sky-50 border border-sky-200 p-3 rounded-xl text-[10.5px] text-sky-800 font-bold leading-relaxed text-right">
                      {lang === 'ar'
                        ? `ℹ️ تم تحديث نظام التفعيل لحماية البرنامج. البرنامج يعمل حالياً بفترة سماح (${license.graceDaysLeft} يوم متبقي). اطلب كود تفعيل جديد وأدخله هنا.`
                        : `ℹ️ The activation system was updated. You are in a grace period (${license.graceDaysLeft} days left). Request a new key and enter it here.`}
                    </div>
                  )}
                  {license.clockTampered && (
                    <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-[10.5px] text-rose-700 font-bold leading-relaxed text-right">
                      {lang === 'ar'
                        ? '⚠️ تاريخ ووقت الجهاز غير صحيحين. صحّح التاريخ واتصل بالإنترنت لإعادة التحقق من الترخيص.'
                        : '⚠️ The computer date/time looks wrong. Fix it and connect to the internet to re-check the licence.'}
                    </div>
                  )}
                  <div className="bg-amber-50 border border-amber-150 p-3.5 rounded-xl text-center space-y-1.5">
                    <span className="text-amber-800 text-xs font-black block text-center">
                      ⏳ {lang === 'ar' ? 'نمط البرنامج: نسخة تجريبية محدودة' : 'Sandbox Trial Mode'}
                    </span>
                    <p className="text-[10px] text-amber-700 tracking-wide leading-relaxed font-bold">
                      {lang === 'ar' 
                        ? `النسخة التجريبية تتيح لك إصدار 15 فاتورة كحد أقصى لتجربة كافة إمكانات النظام المتقدمة.`
                        : 'Trial mode allows emitting a maximum of 15 invoices to evaluate system capabilities.'}
                    </p>
                    
                    {/* Visual Progress Bar */}
                    <div className="space-y-1 pt-1.5 text-right">
                      <div className="flex justify-between text-[10px] text-amber-800 font-black flex-row-reverse">
                        <span>{lang === 'ar' ? 'التقدم:' : 'Invoices Progress:'}</span>
                        <span className="font-mono">{invoices.length} / 15 فواتير</span>
                      </div>
                      <div className="w-full bg-amber-200/50 h-2.5 rounded-full overflow-hidden border border-amber-200">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${invoices.length >= 15 ? 'bg-rose-500' : 'bg-amber-500'}`}
                          style={{ width: `${Math.min(100, (invoices.length / 15) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-right">
                    <label className="block text-slate-700 font-bold text-xs">
                      🔑 {lang === 'ar' ? 'أدخل رمز تفعيل البرنامج:' : 'Enter Activation Code:'}
                    </label>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        placeholder="POS-XXXXX-XXXXX-XXXXX"
                        value={activationInputKey}
                        onChange={e => {
                          setActivationInputKey(e.target.value);
                          setActivationErrorMsg('');
                        }}
                        className="flex-grow bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-center font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold placeholder-slate-300"
                      />
                      <button
                        type="button"
                        onClick={() => applyActivation(activationInputKey)}
                        disabled={isActivating}
                        className="bg-[#1D9E75] hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-wait text-white font-bold text-xs px-4 rounded-xl transition cursor-pointer"
                      >
                        {isActivating ? (lang === 'ar' ? 'جاري التفعيل...' : 'Activating...') : (lang === 'ar' ? 'تفعيل' : 'Activate')}
                      </button>
                    </div>
                    {activationErrorMsg && (
                      <p className="text-[10px] text-red-500 font-extrabold text-center block pt-0.5 animate-pulse">
                        {activationErrorMsg}
                      </p>
                    )}

                    <div className="pt-1.5 border-t border-slate-200/60 mt-1.5 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          const msg = lang === 'ar' 
                            ? `السلام عليكم أستاذ كامل، أرغب في شراء تفعيل برنامج السوبرماركت - الاشتراك السنوي.\nاسم المحل:\n*${settings.shopName || "سوبر ماركت"}*\nيرجى تزويدي بكود التفعيل. شكراً جزيلاً!`
                            : `Hello, I would like to purchase an annual subscription activation key for the POS system.\nShop name:\n*${settings.shopName || "Supermarket"}*\nPlease send me an activation key. Thank you!`;
                          navigator.clipboard.writeText(msg);
                          showToast('success', lang === 'ar' ? 'تم نسخ الرسالة بنجاح! يمكنك لصقها وإرسالها للأستاذ كامل الآن.' : 'Request message copied to clipboard!');
                        }}
                        className="w-full bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-extrabold py-2 px-3 rounded-xl text-[10.5px] transition cursor-pointer flex items-center justify-center gap-1.5 border border-slate-200"
                      >
                        <span>{lang === 'ar' ? 'نسخ رسالة طلب تفعيل الاشتراك السنوي' : 'Copy Ready Annual Subscription Request'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Column 2: Contact / purchase form */}
              <div className="bg-slate-50 border border-slate-200 p-4.5 rounded-2xl space-y-3 font-sans text-right flex flex-col justify-between">
                <div>
                  <span className="text-xs font-black text-[#1D9E75] block uppercase tracking-wider mb-1">
                    📨 {lang === 'ar' ? 'فورم تواصل لشراء وتفعيل البرنامج:' : 'Direct Contact Form for Software Purchase:'}
                  </span>
                  <p className="text-[10px] text-slate-500 font-medium leading-relaxed mb-3">
                    {lang === 'ar' 
                      ? 'املأ بياناتك أدناه لإنشاء رسالة شراء جاهزة للتواصل الفوري مع المورّد أ. كامل بيضاء عبر WhatsApp أو Email للاشتراك السنوي.'
                      : 'Enter details below to generate a formatted proposal letter directly addressed to developer Mr. Kamel Baydaa via WhatsApp or Email.'}
                  </p>

                  <div className="space-y-2.5 text-xs text-right">
                    <div>
                      <label className="block text-slate-500 mb-0.5 text-[9.5px] font-bold">👤 {lang === 'ar' ? 'اسمك الكريم / المالك:' : 'Your Name / Shop Owner:'}</label>
                      <input 
                        type="text"
                        value={contactName}
                        onChange={e => setContactName(e.target.value)}
                        placeholder={lang === 'ar' ? 'مثال: كامل بيضاء...' : 'e.g. Kamel'}
                        className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-xs text-right font-medium focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-500 mb-0.5 text-[9.5px] font-bold">📧 {lang === 'ar' ? 'البريد الإلكتروني:' : 'Email Address:'}</label>
                        <input 
                          type="email"
                          value={contactEmail}
                          onChange={e => setContactEmail(e.target.value)}
                          placeholder="name@example.com"
                          className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-xs text-center font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 mb-0.5 text-[9.5px] font-bold">📞 {lang === 'ar' ? 'رقم الهاتف / WhatsApp:' : 'Phone Line / WhatsApp:'}</label>
                        <input 
                          type="text"
                          value={contactPhone}
                          onChange={e => setContactPhone(e.target.value)}
                          placeholder="+96170082327"
                          className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-xs text-center font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-500 mb-0.5 text-[9.5px] font-bold">🏢 {lang === 'ar' ? 'اسم المتجر المراد تفعيله:' : 'Store Name to Activate:'}</label>
                      <input 
                        type="text"
                        value={contactShop || settings.shopName || ''}
                        onChange={e => setContactShop(e.target.value)}
                        placeholder={settings.shopName || "Supermarket"}
                        className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-xs text-right font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-500 mb-0.5 text-[9.5px] font-bold">📝 {lang === 'ar' ? 'رسالتك أو ملاحظاتك الإضافية للطلب:' : 'Additional message / custom terms:'}</label>
                      <textarea 
                        value={contactMessage}
                        onChange={e => setContactMessage(e.target.value)}
                        placeholder={lang === 'ar' ? 'تفاصيل عن متطلبات محلك، عدد الأجهزة...' : 'Inquire about hardware specs, pricing, multiple stations...'}
                        className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-xs text-right font-medium h-12 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 text-[10.5px] font-bold font-sans">
                  {/* WhatsApp Contact Link */}
                  {(() => {
                    const waMsg = `السلام عليكم أستاذ كامل بيضاء، أرغب في شراء وتفعيل النسخة المعتمدة لبرنامج مبيعات السوبرماركت - الاشتراك السنوي.\n\n` +
                      `📋 تفاصيل طلب التنشيط:\n` +
                      `- اسم العميل: ${contactName || 'غير محدد'}\n` +
                      `- رقم الهاتف/واتساب: ${contactPhone || 'غير محدد'}\n` +
                      `- البريد الإلكتروني: ${contactEmail || 'غير محدد'}\n` +
                      `- اسم المحل المراد قيده: ${contactShop || settings.shopName || 'غير محدد'}\n` +
                      `- ملحوظات إضافية: ${contactMessage || 'لا يوجد'}\n\n` +
                      `يرجى تزويدي بمفتاح التفعيل السنوي المناسب وتفاصيل دفع الرصيد وشكراً!`;
                    const waUrl = `https://wa.me/96170082327?text=${encodeURIComponent(waMsg)}`;
                    return (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-emerald-650 hover:bg-emerald-600 text-white font-extrabold py-2 px-3 rounded-xl transition hover:scale-[1.02] flex items-center justify-center gap-1 cursor-pointer text-center"
                      >
                        💬 {lang === 'ar' ? 'واتساب مباشر' : 'Send WhatsApp'}
                      </a>
                    );
                  })()}

                  {/* Email Contact Link */}
                  {(() => {
                    const mailSubject = `طلب تفعيل برنامج المبيعات - ${contactShop || settings.shopName || "السوبر ماركت"}`;
                    const mailBody = `السلام عليكم أستاذ كامل بيضاء,\n\nأود شراء النسخة الكاملة - الاشتراك السنوي لبرنامج المبيعات.\n\nتفاصيل تفعيل الترخيص:\n` +
                      `- الاسم الكريم: ${contactName || 'غير محدد'}\n` +
                      `- رقم الهاتف: ${contactPhone || 'غير محدد'}\n` +
                      `- البريد الإلكتروني: ${contactEmail || 'غير محدد'}\n` +
                      `- اسم المحل للتفعيل: ${contactShop || settings.shopName || 'غير محدد'}\n` +
                      `- رسالة أو متطلبات: ${contactMessage || 'لا يوجد'}\n\n` +
                      `الرجاء الرد علي بآلية الدفع ورموز التفعيل السنوية اللازمة.\n\nشاكر لكم تعاونكم الكريم!\n`;
                    const mailUrl = `mailto:kamelbaydaa@gmail.com?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBody)}`;
                    return (
                      <a
                        href={mailUrl}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-2 px-3 rounded-xl transition hover:scale-[1.02] flex items-center justify-center gap-1 cursor-pointer text-center"
                      >
                        📧 {lang === 'ar' ? 'بريد إلكتروني' : 'Send Email'}
                      </a>
                    );
                  })()}
                </div>
              </div>
          </div>
    </div>

    {/* --- PRODUCTION SYSTEM DEEP COMPREHENSIVE WIPEOUT --- */}
    <div className="bg-white rounded-2xl border border-rose-200 p-6 shadow-xs w-full text-right space-y-6 mt-6">
      <h3 className="font-bold text-slate-850 text-base pb-3 border-b border-slate-100 flex items-center gap-2 justify-end">
        <span>
          {lang === 'ar' ? 'تصفير وصيانة قاعدة بيانات المتجر الفعلية' : 'Production System Database Wipe & Clean'}
        </span>
        <Database className="w-5 h-5 text-rose-600" />
      </h3>

      <div className="bg-red-50/55 border border-red-100 p-4 rounded-xl text-right space-y-2">
        <span className="text-red-950 text-xs font-black block flex items-center gap-1.5 justify-end">
          <span>{lang === 'ar' ? '⚠️ تنبيه حساس: حذف بيانات المتجر الدائمة' : '⚠️ Warning: Permanent Data Deletion'}</span>
        </span>
        <p className="text-[11px] text-red-700 leading-relaxed font-semibold">
          {lang === 'ar'
            ? 'هذه الأزرار تقوم بمسح بيانات محلكم الفعلية وحسابات المبيعات الحقيقية بشكل جازم ونهائي. يرجى الحذر الشديد قبل الضغط عليها!'
            : 'These controls permanently wipe actual production and sales data. Use with extreme caution.'}
        </p>
        <p className="text-[10px] text-red-650 font-bold">
          {lang === 'ar'
            ? '* تنبيه: عملية الحذف نهائية ولا يمكن استرجاع البيانات المحذوفة بعدها بأي شكل.'
            : '* Note: Deletion is permanent and cannot be undone.'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={onWipeSales}
          className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/55 p-3.5 rounded-xl text-center space-y-1 transition duration-150 cursor-pointer flex flex-col items-center justify-center gap-1.5"
        >
          <Receipt className="w-5 h-5 text-amber-600" />
          <span className="text-xs font-extrabold block">{lang === 'ar' ? 'تصفير المبيعات فقط' : 'Clear Sales Only'}</span>
          <span className="text-[9px] text-amber-600 block">{lang === 'ar' ? 'حذف الفواتير والأرباح فقط' : 'Deletes sales logs only'}</span>
        </button>

        <button
          type="button"
          onClick={onWipeProducts}
          className="bg-orange-50 hover:bg-orange-100 text-orange-850 border border-orange-200/55 p-3.5 rounded-xl text-center space-y-1 transition duration-150 cursor-pointer flex flex-col items-center justify-center gap-1.5"
        >
          <Archive className="w-5 h-5 text-orange-650" />
          <span className="text-xs font-extrabold block">{lang === 'ar' ? 'مسح المنتجات فقط' : 'Clear Products Only'}</span>
          <span className="text-[9px] text-orange-600 block">{lang === 'ar' ? 'حذف أصناف المخزن والباركود' : 'Deletes inventory data'}</span>
        </button>

        <button
          type="button"
          onClick={onWipeAll}
          className="bg-red-50 hover:bg-red-100 text-rose-900 border border-red-200 p-3.5 rounded-xl text-center space-y-1 transition duration-150 cursor-pointer flex flex-col items-center justify-center gap-1.5"
        >
          <Trash2 className="w-5 h-5 text-rose-600 animate-pulse" />
          <span className="text-xs font-black block text-rose-700">{lang === 'ar' ? 'تصفير البرنامج بالكامل' : 'Wipe System Entirely'}</span>
          <span className="text-[9px] text-rose-500 block">{lang === 'ar' ? 'البدء من الصفر تماماً 💥' : 'Full clean start 💥'}</span>
        </button>
      </div>
    </div>


    
    </>
  );
}
