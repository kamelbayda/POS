import React, { useState } from 'react';
import { AlertTriangle, Award, Calendar, Check, DollarSign, FileText, Plus, Trash, Users, X } from 'lucide-react';
import { Supplier } from '../../types';
import * as storage from '../../lib/storage';

interface SuppliersTabProps {
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  lang: 'ar' | 'en';
  showToast: (type: 'success' | 'error' | 'warning', msg: string) => void;
}

/** Suppliers and the money owed to them (accounts payable). */
export function SuppliersTab({ suppliers, setSuppliers, lang, showToast }: SuppliersTabProps) {
  // Supplier form state
  const [suppName, setSuppName] = useState('');
  const [suppPhone, setSuppPhone] = useState('');
  const [suppCompany, setSuppCompany] = useState('');
  const [suppDebt, setSuppDebt] = useState('0');

  // Supplier payment state
  const [payingSuppId, setPayingSuppId] = useState<string | null>(null);
  const [paySuppAmount, setPaySuppAmount] = useState('');

  const [suppSearch, setSuppSearch] = useState('');

  // --- SUPPLIER ACTIONS ---
  const handleAddSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!suppName.trim()) {
      showToast('error', lang === 'ar' ? 'الرجاء إدخال اسم المورد بشكل صحيح!' : 'Please enter supplier name');
      return;
    }

    const newSupplier: Supplier = {
      id: `supp-${Date.now()}`,
      name: suppName.trim(),
      phone: suppPhone.trim() || 'N/A',
      companyName: suppCompany.trim() || 'N/A',
      debtBalance: parseFloat(suppDebt) || 0
    };

    const updated = [...suppliers, newSupplier];
    setSuppliers(updated);
    storage.setJSON('pos_suppliers', updated);

    // Clear form
    setSuppName('');
    setSuppPhone('');
    setSuppCompany('');
    setSuppDebt('0');

    showToast('success', lang === 'ar' ? `تم تسجيل المورد الجديد [${newSupplier.name}] بنجاح! 🏢` : `Supplier [${newSupplier.name}] registered successfully!`);
  };

  const handlePaySupplierDebtSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingSuppId) return;

    const payVal = parseFloat(paySuppAmount) || 0;
    if (payVal <= 0) {
      showToast('error', lang === 'ar' ? 'الرجاء إدخال مبلغ دفع صالح!' : 'Please enter a valid amount');
      return;
    }

    const targetSupplier = suppliers.find(s => s.id === payingSuppId);
    if (!targetSupplier) return;

    const updated = suppliers.map(s => {
      if (s.id === payingSuppId) {
        return {
          ...s,
          debtBalance: Math.max(0, s.debtBalance - payVal)
        };
      }
      return s;
    });

    setSuppliers(updated);
    storage.setJSON('pos_suppliers', updated);

    showToast('success', lang === 'ar'
      ? `تم الدفع بنجاح! تم سداد مبلغ ${payVal.toFixed(2)}$ لحساب المورد [${targetSupplier.name}].`
      : `Payment registered! Paid $${payVal.toFixed(2)} to ${targetSupplier.name}.`
    );

    setPayingSuppId(null);
    setPaySuppAmount('');
  };

  const handleDeleteSupplier = (id: string, sName: string) => {
    if (confirm(lang === 'ar' ? `هل أنت متأكد من حذف حساب المورد [${sName}]؟` : `Are you sure you want to delete [${sName}]?`)) {
      const updated = suppliers.filter(s => s.id !== id);
      setSuppliers(updated);
      storage.setJSON('pos_suppliers', updated);
      showToast('success', lang === 'ar' ? 'تم حذف حساب المورد بنجاح.' : 'Supplier account removed.');
    }
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(suppSearch.toLowerCase()) ||
    (s.phone && s.phone.includes(suppSearch)) ||
    (s.companyName && s.companyName.toLowerCase().includes(suppSearch.toLowerCase()))
  );

  const totalSupplierDebts = suppliers.reduce((sum, s) => sum + s.debtBalance, 0);

  return (
    <div className="space-y-6" id="tab-suppliers">
          {/* Suppliers tab content */}
          {/* Suppliers stats row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div className="text-right">
                <span className="text-xs font-bold text-slate-400 block uppercase">
                  {lang === 'ar' ? 'إجمالي عدد الموردين المسجلين' : 'Registered Supplier Directory'}
                </span>
                <span className="text-2xl font-black font-mono text-slate-800 block mt-1">
                  {suppliers.length} {lang === 'ar' ? 'شركة / معمل' : 'suppliers'}
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-amber-500" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div className="text-right">
                <span className="text-xs font-bold text-slate-400 block uppercase">
                  {lang === 'ar' ? 'مستحقات دفع معلقة للموردين ($)' : 'Total Procurement Accounts Payable (Our Debt)'}
                </span>
                <span className="text-2xl font-black font-mono text-rose-600 block mt-1">
                  {totalSupplierDebts.toFixed(2)} $
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Register Supplier */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs h-fit">
              <h3 className="font-extrabold text-slate-800 text-base mb-4 pb-2 border-b border-slate-100 text-right flex items-center gap-2 flex-row-reverse">
                <Plus className="w-5 h-5 text-amber-500" />
                <span>{lang === 'ar' ? 'تعريف وتسجيل مورد جديد' : 'Register New Supplier'}</span>
              </h3>

              <form onSubmit={handleAddSupplier} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 text-right mb-1">
                    {lang === 'ar' ? 'اسم المورد / المسؤول (الكامل): *' : 'Supplier Representative Name: *'}
                  </label>
                  <input 
                    type="text" 
                    value={suppName} 
                    onChange={e => setSuppName(e.target.value)}
                    placeholder="مثال: السيد جهاد فواز / مندوب بيبسي"
                    className="w-full text-right bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-hidden font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 text-right mb-1">
                    {lang === 'ar' ? 'الشركة المصنعة / الموزع الإسمي:' : 'Manufacturer / Company Name:'}
                  </label>
                  <input 
                    type="text" 
                    value={suppCompany} 
                    onChange={e => setSuppCompany(e.target.value)}
                    placeholder="مثال: شركة بون جوس / الشركة العصرية للمعلبات"
                    className="w-full text-right bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-hidden font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 text-right mb-1">
                    {lang === 'ar' ? 'رقم هاتف المورّد للتنسيق والطلبات:' : 'Supplier Contact Phone No:'}
                  </label>
                  <input 
                    type="text" 
                    value={suppPhone} 
                    onChange={e => setSuppPhone(e.target.value)}
                    placeholder="03 / 987654"
                    className="w-full text-right bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 text-right mb-1">
                    {lang === 'ar' ? 'رصيد دين ابتدائي للمورد (إذا وجد) ($):' : 'Initial Outstanding Balance Owed ($):'}
                  </label>
                  <input 
                    type="number" 
                    step="any"
                    value={suppDebt} 
                    onChange={e => setSuppDebt(e.target.value)}
                    className="w-full text-center bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-hidden font-mono font-bold"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black py-2.5 rounded-xl transition text-sm flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{lang === 'ar' ? 'حفظ المورد في السجلات المعرّفة' : 'Commit Supplier Account'}</span>
                </button>
              </form>
            </div>

            {/* Right Column: Suppliers directory */}
            <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs h-[520px] flex flex-col">
              <div className="mb-4 pb-2 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                <h3 className="font-extrabold text-slate-800 text-base text-right flex items-center justify-start gap-2 flex-row-reverse shrink-0">
                  <Calendar className="w-5 h-5 text-amber-500" />
                  <span>{lang === 'ar' ? 'سجل الموردين والشركات المعتمدة الحالي' : 'Supplier Directory'}</span>
                </h3>
                
                {/* Search input to search suppliers */}
                <div className="relative w-full sm:max-w-xs">
                  <input
                    type="text"
                    placeholder={lang === 'ar' ? 'البحث عن مورّد بالاسم أو الهاتف أو الشركة...' : 'Search supplier name, company...'}
                    value={suppSearch}
                    onChange={e => setSuppSearch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs text-right focus:outline-hidden focus:ring-1 focus:ring-amber-500 font-medium"
                  />
                </div>
              </div>

              {/* Table container */}
              <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 scrollbar-thin">
                {filteredSuppliers.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    {lang === 'ar' ? 'لا يوجد نتائج للبحث الحالي في الموردين.' : 'No supplier accounts matches your search.'}
                  </div>
                ) : (
                  filteredSuppliers.map(supp => (
                    <div 
                      key={supp.id}
                      className="p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100/60 transition space-y-3"
                    >
                      <div className="flex items-start justify-between flex-row-reverse">
                        <div className="text-right">
                          <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2 flex-row-reverse">
                            <span>{supp.name}</span>
                            {supp.companyName && supp.companyName !== 'N/A' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-800 font-bold border border-slate-300">
                                {supp.companyName}
                              </span>
                            )}
                          </h4>
                          <p className="text-xs font-mono text-slate-400 mt-1">📞 {supp.phone}</p>
                        </div>

                        {/* Right Delete trigger */}
                        <button 
                          onClick={() => handleDeleteSupplier(supp.id, supp.name)}
                          className="text-slate-300 hover:text-rose-600 p-1.5 rounded transition cursor-pointer"
                          title={lang === 'ar' ? 'حذف المورد' : 'Remove supplier'}
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Financial indicators for money owed to supplier */}
                      <div className="grid grid-cols-2 gap-2 text-xs bg-white border border-slate-200/50 p-2.5 rounded-lg text-slate-500 justify-between items-center flex-row-reverse text-right">
                        <div className="text-right">
                          <span className="text-[10px] block text-slate-400">{lang === 'ar' ? 'مستحقات دفع معلقة بذمتنا لهم:' : 'Our Balance Due Out:'}</span>
                          <strong className={`font-mono text-base block mt-0.5 ${supp.debtBalance > 0 ? 'text-amber-600 font-extrabold animate-pulse' : 'text-slate-500'}`}>
                            {(supp.debtBalance || 0).toFixed(2)} $
                          </strong>
                        </div>
                        <div className="text-left">
                          <span className="text-[10px] block text-slate-400 text-left">{lang === 'ar' ? 'حالة الحساب الجاري:' : 'Account Status:'}</span>
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold mt-1 ${supp.debtBalance > 0 ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'}`}>
                            {supp.debtBalance > 0 ? (lang === 'ar' ? 'غير مسدد كامل' : 'Pending payment') : (lang === 'ar' ? 'الحساب مصفر وطيب' : 'Fully Settled')}
                          </span>
                        </div>
                      </div>

                      {/* Operational parameters for paying supplier debts */}
                      <div className="flex flex-col sm:flex-row justify-end items-center gap-2 pt-2 border-t border-slate-200/40">
                        {payingSuppId === supp.id ? (
                          <form onSubmit={handlePaySupplierDebtSubmit} className="flex items-center gap-1.5 w-full sm:w-auto">
                            <input
                              type="number"
                              step="any"
                              placeholder="$ قيمة السند"
                              value={paySuppAmount}
                              onChange={e => setPaySuppAmount(e.target.value)}
                              className="w-24 bg-white border border-rose-300 rounded font-mono text-center text-xs py-1"
                              required
                            />
                            <button
                              type="submit"
                              className="bg-amber-500 text-white px-3 py-1 text-[11px] rounded font-bold hover:bg-amber-600 transition"
                            >
                              {lang === 'ar' ? 'تأكيد السداد للمورد' : 'Confirm'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setPayingSuppId(null)}
                              className="text-slate-400 hover:text-slate-600 text-xs px-1"
                            >
                              X
                            </button>
                          </form>
                        ) : (
                          <button
                            onClick={() => {
                              setPayingSuppId(supp.id);
                              setPaySuppAmount('');
                            }}
                            className="px-3.5 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 text-[11px] font-extrabold rounded-lg transition cursor-pointer"
                          >
                            💵 {lang === 'ar' ? 'تسجيل دفعة سداد لحساب المورّد' : 'Register Payment Output'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
    </div>
  );
}
