import { Lock } from 'lucide-react';

/** Shown in place of admin-only screens when a cashier opens them. */
export function AdminOnlyNotice({ userName }: { userName?: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center max-w-lg mx-auto my-12" id="admin-lock">
      <div className="bg-amber-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
        <Lock className="text-amber-600 w-10 h-10" />
      </div>
      <h3 className="text-xl font-bold text-slate-800 mb-3 font-sans">صفحة مغلقة ومخصصة للمدير</h3>
      <p className="text-slate-500 leading-relaxed mb-6">
        عفواً يا {userName}! صلاحية حسابك الحالي هي (كاشير). لا يمكنك تعديل جرد المستودع، الإعدادات، أو الإيرادات والتقارير المالية بالنظام.
      </p>
      <div className="text-xs text-slate-400 bg-slate-50 rounded-lg p-3 inline-block">
        يرجى تسجيل الخروج والولوج بحساب <span className="font-mono font-bold text-slate-600">admin</span> لرؤية هذه المعلومات.
      </div>
    </div>
  );
}
