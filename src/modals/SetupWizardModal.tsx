import { motion } from 'motion/react';
import { ShieldAlert } from 'lucide-react';

interface SetupWizardModalProps {
  lang: "ar" | "en";
  adminRealName: string;
  cashierRealName: string;
  saveWizardData: (adminName: string, adminPass: string, cashierName: string, cashierPass: string) => void;
  showToast: (type: "success" | "error" | "warning", message: string) => void;
}

export function SetupWizardModal({
  lang,
  adminRealName,
  cashierRealName,
  saveWizardData,
  showToast,
}: SetupWizardModalProps) {
  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-xl z-[99999] flex items-center justify-center p-4 overflow-y-auto no-print font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[32px] border border-slate-100 max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative text-right"
      >
        <div className="flex items-center gap-3.5 justify-end border-b border-slate-100 pb-4 flex-row-reverse">
          <div className="w-12 h-12 bg-amber-500/15 border border-amber-500/25 rounded-2xl flex items-center justify-center text-amber-500">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-0.5">
            <span className="block text-[10px] text-[#1D9E75] font-black uppercase tracking-wider">
              {lang === 'ar' ? 'تخصيص أمان المالك الجديد' : 'New Owner Security Customization'}
            </span>
            <h2 className="text-xl font-bold text-slate-800 leading-tight">
              {lang === 'ar' ? '🛡️ إعداد حسابات المدير والكاشير للترخيص الجديد' : '🛡️ Setup Authorized Admin & Cashier Accounts'}
            </h2>
          </div>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed font-semibold">
          {lang === 'ar' 
            ? '🎉 أهلاً بك! لقد تم تنشيط الاشتراك السنوي بنجاح لمتجرك الموقر. كخطوة أمنية إلزامية لحماية الصندوق، يرجى استبدال كود المبيعات وكلمات المرور الافتراضية الآن بتعيين اسم وباسكود خاص بالمدير وتعيين اسم وباسكود الكاشير المسؤول:'
            : '🎉 Congratulations! Your annual subscription is successfully activated. As a mandatory safety step to prevent unauthorized cash manipulation, please customize administrator and cashier real names and passcodes below:'}
        </p>

        <form 
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const aName = (form.elements.namedItem('wAdminName') as HTMLInputElement).value;
            const aPass = (form.elements.namedItem('wAdminPass') as HTMLInputElement).value;
            const cName = (form.elements.namedItem('wCashierName') as HTMLInputElement).value;
            const cPass = (form.elements.namedItem('wCashierPass') as HTMLInputElement).value;

            if (!aName.trim() || !aPass.trim() || !cName.trim() || !cPass.trim()) {
              showToast('error', lang === 'ar' ? 'يرجى مراجعة كافة حقول إعداد الحسابات!' : 'Please fill all account setup fields!');
              return;
            }
            saveWizardData(aName, aPass, cName, cPass);
          }}
          className="space-y-5"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 flex-row-reverse">
            {/* Admin Block */}
            <div className="bg-amber-500/5 border border-amber-200/40 p-5 rounded-2xl space-y-3.5 text-right">
              <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider block border-b border-amber-200/50 pb-1.5">
                {lang === 'ar' ? '١. حساب المدير العام وصاحب العمل:' : '1. General Administrator & Store Owner:'}
              </span>

              <div className="space-y-1">
                <label className="block text-slate-650 font-bold text-[11px]">{lang === 'ar' ? 'الاسم الكامل للمدير:' : 'Full Admin Name:'}</label>
                <input 
                  name="wAdminName"
                  type="text"
                  defaultValue={adminRealName}
                  required
                  className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-right focus:outline-none focus:ring-1 focus:ring-amber-500 font-bold"
                  placeholder="كامل بيضاء"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-650 font-bold text-[11px]">{lang === 'ar' ? 'باسكود/كلمة دخل الدخول الجديد:' : 'New Admin Passcode/Password:'}</label>
                <input 
                  name="wAdminPass"
                  type="text"
                  defaultValue=""
                  required
                  className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-center ltr:font-mono font-bold focus:outline-none focus:ring-1 focus:ring-amber-500"
                  placeholder={lang === 'ar' ? 'أدخل باسكود جديد مميز' : 'e.g. 556677'}
                />
                <span className="text-[9.5px] text-slate-400 block mt-0.5 leading-tight">{lang === 'ar' ? 'لتغيير الأسعار والمبيعات وإغلاق الورديات والتقارير' : 'Used for settings, rate controls and stock counts'}</span>
              </div>
            </div>

            {/* Cashier Block */}
            <div className="bg-[#1D9E75]/5 border border-emerald-200/40 p-5 rounded-2xl space-y-3.5 text-right">
              <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider block border-b border-emerald-200/50 pb-1.5">
                🛒 {lang === 'ar' ? '٢. حساب الكاشير وبائع المبيعات:' : '2. Point of Sales Cashier Staff:'}
              </span>

              <div className="space-y-1">
                <label className="block text-slate-650 font-bold text-[11px]">{lang === 'ar' ? 'الاسم الكامل للكاشير:' : 'Full Cashier Name:'}</label>
                <input 
                  name="wCashierName"
                  type="text"
                  defaultValue={cashierRealName}
                  required
                  className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-right focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
                  placeholder="أحمد كاشير"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-650 font-bold text-[11px]">{lang === 'ar' ? 'باسكود/رمز دخول الكاشير الجديد:' : 'New Cashier Passcode:'}</label>
                <input 
                  name="wCashierPass"
                  type="text"
                  defaultValue=""
                  required
                  className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-center ltr:font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder={lang === 'ar' ? 'أدخل باسكود المبيعات' : 'e.g. 1212'}
                />
                <span className="text-[9.5px] text-slate-400 block mt-0.5 leading-tight">{lang === 'ar' ? 'لتسجيل الدخول وتمرير المبيعات اليومية فقط' : 'Used specifically for barcode scans & checkouts'}</span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full bg-[#1D9E75] hover:bg-emerald-600 text-white font-black py-4 px-4 rounded-xl text-xs sm:text-sm transition duration-150 shadow-lg shadow-emerald-950/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{lang === 'ar' ? 'حفظ وإعداد الهوية وأمان النظام الآن' : 'Save Accounts & Complete Terminal Initializations'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
