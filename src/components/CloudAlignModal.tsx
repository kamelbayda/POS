import React from 'react';
import { CloudDownload, CloudUpload } from 'lucide-react';
import type { AlignChoice } from '../hooks/useCloudSync';

interface CloudAlignModalProps {
  lang: 'ar' | 'en';
  onChoose: (choice: AlignChoice) => void;
}

/** Asked once when a device signs in to a cloud shop that already has data. */
export function CloudAlignModal({ lang, onChoose }: CloudAlignModalProps) {
  const ar = lang === 'ar';
  const option = 'w-full text-start border-2 rounded-2xl p-4 flex gap-3 items-start cursor-pointer transition';
  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" id="cloud-align-modal" dir={ar ? 'rtl' : 'ltr'}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 space-y-4">
        <h2 className="font-black text-slate-800 text-lg">{ar ? '☁️ حساب السحاب عليه بيانات محل' : '☁️ This cloud account already has shop data'}</h2>
        <p className="text-sm text-slate-600">{ar ? 'اختار كيف هالجهاز بدو ينضم للمحل:' : 'Choose how this device joins the shop:'}</p>

        <button id="align-download" onClick={() => onChoose('download')} className={`${option} border-emerald-500 bg-emerald-50 hover:bg-emerald-100`}>
          <CloudDownload className="w-7 h-7 text-emerald-600 shrink-0" />
          <span>
            <span className="block font-black text-slate-800">{ar ? 'نزّل بيانات السحاب (جهاز جديد)' : 'Download the cloud data (new device)'}</span>
            <span className="block text-xs text-slate-600 mt-1">{ar
              ? 'الأصناف والأسعار والحسابات بتصير متل الأجهزة التانية. فواتير المبيع يلي على هالجهاز ما بتنمسح، بتنضاف للسحاب.'
              : 'Products, prices and accounts become the same as on the other devices. Sales on this device are kept and added to the cloud.'}</span>
          </span>
        </button>

        <button id="align-upload" onClick={() => onChoose('upload')} className={`${option} border-sky-300 hover:bg-sky-50`}>
          <CloudUpload className="w-7 h-7 text-sky-600 shrink-0" />
          <span>
            <span className="block font-black text-slate-800">{ar ? 'هالجهاز هو الأساسي: ارفع بياناته' : 'This is the main device: upload its data'}</span>
            <span className="block text-xs text-slate-600 mt-1">{ar
              ? 'بيانات هالجهاز بتنرفع وبتحل محل نفس الأصناف عالسحاب، ويلي عالسحاب بس بيضل وبينزل لهون.'
              : 'This device\'s data goes up and replaces the same records in the cloud; records only the cloud has stay and come down here.'}</span>
          </span>
        </button>

        <button id="align-cancel" onClick={() => onChoose('cancel')} className="w-full text-xs font-bold text-slate-500 hover:text-slate-800 py-2 cursor-pointer">
          {ar ? 'مش هلّق (هالجهاز ما بيتزامن)' : 'Not now (this device will not sync)'}
        </button>
      </div>
    </div>
  );
}
