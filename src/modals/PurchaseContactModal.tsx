import { motion } from 'motion/react';
import { SystemSettings } from '../types';
import React from 'react';

interface PurchaseContactModalProps {
  lang: "ar" | "en";
  settings: SystemSettings;
  setShowPurchaseContactModal: React.Dispatch<React.SetStateAction<boolean>>;
  contactName: string;
  setContactName: React.Dispatch<React.SetStateAction<string>>;
  contactPhone: string;
  setContactPhone: React.Dispatch<React.SetStateAction<string>>;
  contactEmail: string;
  setContactEmail: React.Dispatch<React.SetStateAction<string>>;
  contactShop: string;
  setContactShop: React.Dispatch<React.SetStateAction<string>>;
  contactMessage: string;
  setContactMessage: React.Dispatch<React.SetStateAction<string>>;
}

export function PurchaseContactModal({
  lang,
  settings,
  setShowPurchaseContactModal,
  contactName,
  setContactName,
  contactPhone,
  setContactPhone,
  contactEmail,
  setContactEmail,
  contactShop,
  setContactShop,
  contactMessage,
  setContactMessage,
}: PurchaseContactModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="purchase-contact-modal">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl p-6 w-full max-w-lg text-right border border-emerald-150 shadow-2xl space-y-4 font-sans max-h-[90vh] overflow-y-auto scrollbar-thin"
      >
        <div className="text-center space-y-2 border-b border-slate-100 pb-3">
          <span className="text-4xl">📨</span>
          <h3 className="text-base font-black text-slate-800">
            {lang === 'ar' ? 'نموذج تواصل لشراء وتفعيل الاشتراك السنوي' : 'Annual License Purchase & Contact Form'}
          </h3>
          <p className="text-[11px] text-slate-400 font-medium max-w-md mx-auto">
            {lang === 'ar' 
              ? 'املأ بياناتك لإنشاء رسالة طلب التفعيل لتجهيز الاشتراك السنوي وحذف القيود. تواصل مع المطور أ. كامل بيضاء مباشرة.'
              : 'Submit contact details below to generate immediate purchase inquiry with full support for annual subscription.'}
          </p>
        </div>

        <div className="space-y-3.5 text-right">
          <div>
            <label className="block text-slate-500 mb-1 text-[11px] font-bold">👤 {lang === 'ar' ? 'اسمك الكريم / المالك:' : 'Your Name / Shop Owner:'}</label>
            <input 
              type="text"
              value={contactName}
              onChange={e => setContactName(e.target.value)}
              placeholder={lang === 'ar' ? 'مثال: كامل بيضاء...' : 'e.g. Kamel'}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-right font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-500 mb-1 text-[11px] font-bold">📧 {lang === 'ar' ? 'البريد الإلكتروني:' : 'Email Address:'}</label>
              <input 
                type="email"
                value={contactEmail}
                onChange={e => setContactEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-center font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-500 mb-1 text-[11px] font-bold">📞 {lang === 'ar' ? 'رقم الهاتف / WhatsApp:' : 'Phone Line / WhatsApp:'}</label>
              <input 
                type="text"
                value={contactPhone}
                onChange={e => setContactPhone(e.target.value)}
                placeholder="+96170082327"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-center font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-500 mb-1 text-[11px] font-bold">🏢 {lang === 'ar' ? 'اسم المتجر المراد تفعيله:' : 'Store Name to Activate:'}</label>
            <input 
              type="text"
              value={contactShop || settings.shopName || ''}
              onChange={e => setContactShop(e.target.value)}
              placeholder={settings.shopName || "Supermarket"}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-right font-black text-rose-700/90 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-500 mb-1 text-[11px] font-bold">📝 {lang === 'ar' ? 'رسالتك أو ملاحظاتك الإضافية للطلب:' : 'Additional message / custom terms:'}</label>
            <textarea 
              value={contactMessage}
              onChange={e => setContactMessage(e.target.value)}
              placeholder={lang === 'ar' ? 'تفاصيل عن متطلبات محلك، عدد الأجهزة...' : 'Inquire about hardware specs, pricing, multiple stations...'}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-right font-medium h-16 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="bg-emerald-50/50 border border-emerald-100 p-3 rounded-xl text-center space-y-2 mt-4">
          <span className="text-[11px] font-black text-emerald-800 block">
            {lang === 'ar' ? '💬 اختر وسيلة الإرسال المباشرة أدناه للتفعيل السنوي الفوري عبر المطور:' : '💬 Choose shipping channel for annual key activation:'}
          </span>

          <div className="grid grid-cols-2 gap-2 text-xs font-bold">
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
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer text-center"
                >
                  💬 {lang === 'ar' ? 'واتساب مباشر' : 'Send WhatsApp'}
                </a>
              );
            })()}

            {(() => {
              const mailSubject = `طلب تفعيل برنامج المبيعات - ${contactShop || settings.shopName || "السوبر ماركت"}`;
              const mailBody = `السلام عليكم أستاذ كامل بيضاء,\n\nأود شراء النسخة الكاملة لبرنامج المبيعات - الاشتراك السنوي.\n\nتفاصيل تفعيل الترخيص:\n` +
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
                  className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer text-center"
                >
                  📧 {lang === 'ar' ? 'بريد إلكتروني' : 'Send Email'}
                </a>
              );
            })()}
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 flex justify-end">
          <button 
            type="button"
            onClick={() => setShowPurchaseContactModal(false)}
            className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2.5 px-6 rounded-xl transition cursor-pointer text-xs"
          >
            {lang === 'ar' ? 'تراجع وإغلاق' : 'Close'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
