import React, { useState } from 'react';
import { AlertTriangle, Award, Calendar, Check, DollarSign, FileText, Plus, Trash, Users, X } from 'lucide-react';
import { Customer, ReturnRecord, WasteRecord, Product, Invoice, Supplier, SystemSettings } from '../../types';
import * as storage from '../../lib/storage';

interface CustomersTabProps {
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  lang: 'ar' | 'en';
  showToast: (type: 'success' | 'error' | 'warning', msg: string) => void;
  invoices?: Invoice[];
}

export function CustomersTab({ customers, setCustomers, lang, showToast, invoices = [] }: CustomersTabProps) {
  // Selected customer file for full profiling & alert panels
  const [selectedCustomerFile, setSelectedCustomerFile] = useState<Customer | null>(null);

  // New customer form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [type, setType] = useState<'retail' | 'wholesale'>('retail');
  const [debtLimit, setDebtLimit] = useState('1000');

  // Customer Debt payment state
  const [payingCustId, setPayingCustId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState('');

  // Search query states
  const [custSearch, setCustSearch] = useState('');

  // Customer registering
  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('error', lang === 'ar' ? 'الرجاء إدخال اسم العميل بشكل صحيح!' : 'Please enter customer name');
      return;
    }

    const newCustomer: Customer = {
      id: `cust-${Date.now()}`,
      name: name.trim(),
      phone: phone.trim() || 'N/A',
      type,
      loyaltyPoints: 0,
      creditBalance: 0,
      debtLimit: parseFloat(debtLimit) || 1000
    };

    const updated = [...customers, newCustomer];
    setCustomers(updated);
    storage.setJSON('pos_customers', updated);

    // Clear form
    setName('');
    setPhone('');
    setType('retail');
    setDebtLimit('1000');

    showToast('success', lang === 'ar' ? `تم تسجيل العميل الجديد [${newCustomer.name}] بنجاح! 🎉` : `Customer [${newCustomer.name}] registered successfully!`);
  };

  // Payoff part of debt
  const handlePayDebtSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingCustId) return;

    const payVal = parseFloat(payAmount) || 0;
    if (payVal <= 0) {
      showToast('error', lang === 'ar' ? 'الرجاء إدخال مبلغ دفع صالح!' : 'Please enter a valid amount');
      return;
    }

    const targetCustomer = customers.find(c => c.id === payingCustId);
    if (!targetCustomer) return;

    if (payVal > targetCustomer.creditBalance) {
      showToast('warning', lang === 'ar' ? 'المبلغ المدفوع يتجاوز قيمة الدين العام المسجل للعميل!' : 'Pay amount exceeds outstanding debt');
    }

    const updated = customers.map(c => {
      if (c.id === payingCustId) {
        return {
          ...c,
          creditBalance: Math.max(0, c.creditBalance - payVal)
        };
      }
      return c;
    });

    setCustomers(updated);
    storage.setJSON('pos_customers', updated);

    showToast('success', lang === 'ar' 
      ? `تم الدفع بنجاح! تم خصم ${payVal.toFixed(2)}$ من حساب العميل [${targetCustomer.name}].`
      : `Payment successful! Subtracted $${payVal.toFixed(2)} from ${targetCustomer.name}.`
    );

    setPayingCustId(null);
    setPayAmount('');
  };

  // Point conversion (100 points = $1 store credit / balance payment)
  const handleRedeemPoints = (custId: string) => {
    const target = customers.find(c => c.id === custId);
    if (!target) return;

    if (target.loyaltyPoints < 100) {
      showToast('warning', lang === 'ar' ? 'عفواً! العميل لا يمتلك الحد الأدنى لاستبدال النقاط (100 نقطة على الأقل).' : 'Insufficient points. Minimum 100 points needed to redeem.');
      return;
    }

    const valueToRedeemInDollars = Math.floor(target.loyaltyPoints / 100);
    const convertedPoints = valueToRedeemInDollars * 100;

    const updated = customers.map(c => {
      if (c.id === custId) {
        return {
          ...c,
          loyaltyPoints: c.loyaltyPoints - convertedPoints,
          creditBalance: Math.max(0, c.creditBalance - valueToRedeemInDollars)
        };
      }
      return c;
    });

    setCustomers(updated);
    storage.setJSON('pos_customers', updated);

    showToast('success', lang === 'ar' 
      ? `تم استبدال ${convertedPoints} نقطة بخصم آجل بقيمة ${valueToRedeemInDollars.toFixed(2)}$ لحساب العميل! ⭐`
      : `Redeemed ${convertedPoints} pts for a $${valueToRedeemInDollars.toFixed(2)} credit!`
    );
  };

  // Remove customer
  const handleDeleteCustomer = (id: string, cName: string) => {
    if (confirm(lang === 'ar' ? `هل أنت متأكد من حذف حساب الزبون [${cName}]؟` : `Are you sure you want to delete [${cName}]?`)) {
      const updated = customers.filter(c => c.id !== id);
      setCustomers(updated);
      storage.setJSON('pos_customers', updated);
      showToast('success', lang === 'ar' ? 'تم حذف حساب الزبون بنجاح.' : 'Customer account removed.');
    }
  };

  // Filtering lists by search query
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(custSearch.toLowerCase()) ||
    (c.phone && c.phone.includes(custSearch))
  );

  const totalOutstandingDebts = customers.reduce((sum, c) => sum + c.creditBalance, 0);
  const totalPoints = customers.reduce((sum, c) => sum + c.loyaltyPoints, 0);

  return (
    <div className="space-y-6" id="extensions-customers">
      
      <>
          {/* Customers stats row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div className="text-right">
                <span className="text-xs font-bold text-slate-400 block uppercase">
                  {lang === 'ar' ? 'إجمالي عدد الزبائن الموثقين' : 'Registered Customer Directory'}
                </span>
                <span className="text-2xl font-black font-mono text-slate-800 block mt-1">
                  {customers.length} {lang === 'ar' ? 'حساب' : 'accounts'}
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div className="text-right">
                <span className="text-xs font-bold text-slate-400 block uppercase">
                  {lang === 'ar' ? 'الديون العامة المعلقة للزبائن' : 'Total Outstanding Receivables (Debt)'}
                </span>
                <span className="text-2xl font-black font-mono text-rose-600 block mt-1">
                  {totalOutstandingDebts.toFixed(2)} $
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div className="text-right">
                <span className="text-xs font-bold text-slate-400 block uppercase">
                  {lang === 'ar' ? 'إجمالي نقاط ولاء الزبائن المعطاة' : 'Total Client Loyalty Points'}
                </span>
                <span className="text-2xl font-black font-mono text-amber-500 block mt-1">
                  {totalPoints.toLocaleString()} 🌟
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center">
                <Award className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Register profile */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs h-fit">
              <h3 className="font-extrabold text-slate-800 text-base mb-4 pb-2 border-b border-slate-100 text-right flex items-center gap-2 flex-row-reverse">
                <Plus className="w-5 h-5 text-[#1D9E75]" />
                <span>{lang === 'ar' ? 'تسجيل عميل جديد بالشرائح' : 'Register New Account'}</span>
              </h3>

              <form onSubmit={handleAddCustomer} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 text-right mb-1">
                    {lang === 'ar' ? 'اسم العميل الكامل (الرباعي أو المحل): *' : 'Customer Full Name: *'}
                  </label>
                  <input 
                    type="text" 
                    value={name} 
                    onChange={e => setName(e.target.value)}
                    placeholder="مثال: سوبرماركت الوفاء / الحاج أبو حسن"
                    className="w-full text-right bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-hidden font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 text-right mb-1">
                    {lang === 'ar' ? 'رقم الهاتف للتواصل والوتساب:' : 'Contact Phone No:'}
                  </label>
                  <input 
                    type="text" 
                    value={phone} 
                    onChange={e => setPhone(e.target.value)}
                    placeholder="03 / 123456"
                    className="w-full text-right bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-hidden font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 text-right mb-1">
                      {lang === 'ar' ? 'سقف ديون الآجل ($):' : 'Debt Limit ($):'}
                    </label>
                    <input 
                      type="number" 
                      value={debtLimit} 
                      onChange={e => setDebtLimit(e.target.value)}
                      className="w-full text-center bg-slate-50 border border-slate-200 p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-hidden font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 text-right mb-1">
                      {lang === 'ar' ? 'شريحة المعاملة العامة:' : 'Account Sub-Type:'}
                    </label>
                    <select
                      value={type}
                      onChange={e => setType(e.target.value as 'retail' | 'wholesale')}
                      className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs font-bold text-right"
                    >
                      <option value="retail">{lang === 'ar' ? 'شريحة مفرّق' : 'Retail'}</option>
                      <option value="wholesale">{lang === 'ar' ? 'شريحة جملة / محلات' : 'Wholesale'}</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#1D9E75] hover:bg-emerald-600 text-white font-bold py-2.5 rounded-xl transition text-sm flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{lang === 'ar' ? 'حفظ الحساب في قاعدة البيانات' : 'Commit New Account'}</span>
                </button>
              </form>
            </div>

            {/* Right Column: Customer items directory */}
            <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs h-[520px] flex flex-col">
              <div className="mb-4 pb-2 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                <h3 className="font-extrabold text-slate-800 text-base text-right flex items-center justify-start gap-2 flex-row-reverse shrink-0">
                  <Users className="w-5 h-5 text-emerald-600" />
                  <span>{lang === 'ar' ? 'قائمة حسابات الزبائن والشرائح المفعلة' : 'Client Accounts List'}</span>
                </h3>
                
                {/* Search input to search customers */}
                <div className="relative w-full sm:max-w-xs">
                  <input
                    type="text"
                    placeholder={lang === 'ar' ? 'البحث عن الزبون بالاسم أو رقم الهاتف...' : 'Search by name or phone...'}
                    value={custSearch}
                    onChange={e => setCustSearch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs text-right focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-medium"
                  />
                </div>
              </div>

              {/* Table container */}
              <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 scrollbar-thin">
                {filteredCustomers.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    {lang === 'ar' ? 'لا يوجد نتائج للبحث الحالي.' : 'No customer accounts matches your search.'}
                  </div>
                ) : (
                  filteredCustomers.map(cust => (
                    <div 
                      key={cust.id}
                      className="p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100/60 transition space-y-3"
                    >
                      <div className="flex items-start justify-between flex-row-reverse">
                        <div className="text-right">
                          <div className="flex items-center gap-2 flex-row-reverse">
                            <h4 className="font-extrabold text-slate-900 text-sm">{cust.name}</h4>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${cust.type === 'wholesale' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'}`}>
                              {cust.type === 'wholesale' ? (lang === 'ar' ? 'جملة' : 'Whls') : (lang === 'ar' ? 'مفرّق' : 'Rtl')}
                            </span>
                          </div>
                          <p className="text-xs font-mono text-slate-400 mt-1">📞 {cust.phone}</p>
                        </div>

                        {/* Right Delete trigger */}
                        <button 
                          onClick={() => handleDeleteCustomer(cust.id, cust.name)}
                          className="text-slate-300 hover:text-rose-600 p-1.5 rounded transition cursor-pointer"
                          title={lang === 'ar' ? 'حذف الزبون من الآرشيف' : 'Remove customer'}
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Financial indicators and points */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs bg-white border border-slate-200/50 p-2.5 rounded-lg text-slate-500">
                        <div className="text-right">
                          <span className="text-[10px] block text-slate-400">{lang === 'ar' ? 'رصيد الدين:' : 'Due balance:'}</span>
                          <strong className={`font-mono text-sm block mt-0.5 ${cust.creditBalance > 0 ? 'text-rose-600 font-extrabold' : 'text-slate-500'}`}>
                            {(cust.creditBalance || 0).toFixed(2)} $
                          </strong>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] block text-slate-400">{lang === 'ar' ? 'سقف الدين:' : 'Allowed Limit:'}</span>
                          <strong className="font-mono text-slate-700 text-sm block mt-0.5">{(cust.debtLimit !== undefined && cust.debtLimit !== null ? cust.debtLimit : 1000).toFixed(2)} $</strong>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] block text-slate-400">{lang === 'ar' ? 'نقاط الولاء المعلقة:' : 'Loyalty Points:'}</span>
                          <strong className="text-amber-500 font-extrabold block text-sm mt-0.5">⭐ {cust.loyaltyPoints}</strong>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] block text-slate-400">{lang === 'ar' ? 'سند استبدال نقاط:' : 'Redeem Value:'}</span>
                          <strong className="text-[#1D9E75] block font-bold mt-0.5">
                            {Math.floor(cust.loyaltyPoints / 100)} $
                          </strong>
                        </div>
                      </div>

                      {/* Operational parameters for paying debt or converting points */}
                      <div className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-2 border-t border-slate-200/40 w-full">
                        <div className="flex flex-wrap gap-2 justify-start w-full sm:w-auto">
                          <button
                            onClick={() => handleRedeemPoints(cust.id)}
                            disabled={cust.loyaltyPoints < 100}
                            className="px-3 py-1.5 bg-amber-50 border border-amber-200 text-[#D4AF37] hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed text-[11px] font-extrabold rounded-lg transition"
                          >
                            🎁 {lang === 'ar' ? 'استبدال كل 100 نقطة بـ خصم 1$' : 'Redeem 100 pts for $1 Credit'}
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedCustomerFile(cust)}
                            className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-[11px] font-extrabold rounded-lg transition cursor-pointer flex items-center gap-1 shrink-0"
                          >
                            <span>📁 {lang === 'ar' ? 'فتح ملف الزبون' : 'Open Customer File'}</span>
                          </button>
                        </div>

                        <div className="w-full sm:w-auto flex justify-end">
                          {payingCustId === cust.id ? (
                            <form onSubmit={handlePayDebtSubmit} className="flex items-center gap-1.5 w-full sm:w-auto">
                              <input
                                type="number"
                                step="any"
                                placeholder="$ مقدار السداد"
                                value={payAmount}
                                onChange={e => setPayAmount(e.target.value)}
                                className="w-24 bg-white border border-rose-300 rounded font-mono text-center text-xs py-1"
                                required
                              />
                              <button
                                type="submit"
                                className="bg-rose-600 text-white px-2.5 py-1 text-[11px] rounded font-bold"
                              >
                                {lang === 'ar' ? 'تأكيد السداد' : 'Confirm'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setPayingCustId(null)}
                                className="text-slate-400 hover:text-slate-600 text-xs px-1"
                              >
                                X
                              </button>
                            </form>
                          ) : (
                            <button
                              onClick={() => {
                                setPayingCustId(cust.id);
                                setPayAmount('');
                              }}
                              className="px-3.5 py-1.5 bg-[#EAF6ED] border border-emerald-200 text-[#1D9E75] hover:bg-emerald-50 text-[11px] font-extrabold rounded-lg transition cursor-pointer"
                            >
                              💵 {lang === 'ar' ? 'سداد جزء من حساب المديونية والذمم والآجل' : 'Pay Down Account Debt'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
      </>

      {/* Customer file overlay modal */}
      {selectedCustomerFile && (() => {
        const cust = customers.find(c => c.id === selectedCustomerFile.id) || selectedCustomerFile;
        const custInvoices = invoices.filter(inv => inv.customerId === cust.id);
        const limit = cust.debtLimit !== undefined && cust.debtLimit !== null ? cust.debtLimit : 1000;
        const isDebtExceeded = cust.creditBalance > limit;

        return (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in no-print font-sans">
            <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl text-right">
              
              {/* Header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 flex-row-reverse text-right">
                <button 
                  onClick={() => setSelectedCustomerFile(null)}
                  className="p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="font-extrabold text-slate-950 text-base flex items-center gap-2 flex-row-reverse">
                  <Users className="w-5 h-5 text-[#1D9E75]" />
                  <span>📁 {lang === 'ar' ? `الملف المحاسبي للزبون: [ ${cust.name} ]` : `Ledger & Account File: ${cust.name}`}</span>
                </h3>
              </div>

              {/* Scrollable content */}
              <div className="p-5 overflow-y-auto space-y-4 flex-1 scrollbar-thin">
                
                {/* AUTOMATIC ALERT PANEL ON DEBT LIMIT EXCEEDED */}
                {isDebtExceeded && (
                  <div className="bg-rose-50 border-r-4 border-rose-600 p-4 rounded-xl text-right animate-pulse space-y-2.5">
                    <div className="flex items-center justify-between flex-row-reverse">
                      <div className="flex items-center gap-2 flex-row-reverse text-rose-800 font-extrabold text-xs sm:text-sm">
                        <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                        <span>⚠️ تنبيه محاسبي: مديونية هذا الزبون تجاوزت السقف المسموح به!</span>
                      </div>
                      <span className="bg-rose-100 text-rose-800 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                        {lang === 'ar' ? 'تجاوز السقف' : 'LIMIT EXCEEDED'}
                      </span>
                    </div>
                    <div className="text-rose-700 text-xs font-bold leading-relaxed space-y-1">
                      <p>
                        {lang === 'ar' ? 'يرجى العلم بأن إجمالي المديونية المسجلة حالياً بذمة هذا الزبون بلغت:' : 'Please note that the current recorded outstanding balance of this client is:'}{' '}
                        <strong className="underline text-rose-900 font-mono text-base font-black">{(cust.creditBalance || 0).toFixed(2)}$</strong>
                      </p>
                      <p>
                        {lang === 'ar' ? 'بينما المديونية القصوى أو سقف الدين الائتماني المعتمد له هو فقط:' : 'While their maximum allowed limit or safe credit threshold is only:'}{' '}
                        <strong className="underline text-slate-800 font-mono text-sm font-black">{limit.toFixed(2)}$</strong>
                      </p>
                      <p className="bg-rose-100/50 p-2 rounded-lg text-rose-950 text-xs font-black mt-2 inline-block">
                        {lang === 'ar' ? `📢 قيمة فائض التجاوز المحررة بالدين: ${((cust.creditBalance || 0) - limit).toFixed(2)}$` : `Excess Violation Balance: $${((cust.creditBalance || 0) - limit).toFixed(2)}`}
                      </p>
                    </div>
                    <p className="text-slate-600 text-[10.5px] font-medium leading-normal pt-1 border-t border-rose-200/40">
                      {lang === 'ar' 
                        ? '💡 توصية الصندوق: يرجى الامتناع التام عن تسجيل أي مبيعات إضافية بالآجل أو تمرير معاملات ذمم لهذا الحساب لحين استرداد جزء من المبالغ العالقة وتخفيض الدين إلى ما دون السقف المعتمد.' 
                        : 'System recommendation: Please fully block any additional post-dated check or deferred sales for this customer until outstanding amounts are settled below the allowed threshold.'}
                    </p>
                  </div>
                )}

                {/* Profile Quick Stats Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-50 border p-3 rounded-xl text-center">
                    <span className="text-[10px] text-slate-400 block font-bold">{lang === 'ar' ? 'فئة الحساب المعينة' : 'Account Tier'}</span>
                    <strong className="text-slate-800 font-extrabold text-sm block mt-1">
                      {cust.type === 'wholesale' ? (lang === 'ar' ? 'شريحة جملة 🏢' : 'Wholesale') : (lang === 'ar' ? 'مفرّق عادي 🛒' : 'Retail')}
                    </strong>
                  </div>
                  <div className="bg-slate-50 border p-3 rounded-xl text-center">
                    <span className="text-[10px] text-slate-400 block font-bold">{lang === 'ar' ? 'نقاط الولاء النشطة' : 'Loyalty Points'}</span>
                    <strong className="text-amber-500 font-mono font-black text-sm block mt-1">
                      ⭐ {cust.loyaltyPoints} {lang === 'ar' ? 'نقطة' : 'pts'}
                    </strong>
                  </div>
                  <div className="bg-slate-50 border p-3 rounded-xl text-center">
                    <span className="text-[10px] text-slate-400 block font-bold">{lang === 'ar' ? 'قيمة مديونية الذمم' : 'Due Balance'}</span>
                    <strong className={`font-mono font-black text-sm block mt-1 ${cust.creditBalance > 0 ? 'text-red-600' : 'text-slate-600'}`}>
                      {cust.creditBalance.toFixed(2)} $
                    </strong>
                  </div>
                  <div className="bg-slate-50 border p-3 rounded-xl text-center">
                    <span className="text-[10px] text-slate-400 block font-bold">{lang === 'ar' ? 'الحد الائتماني (السقف)' : 'Credit Limit'}</span>
                    <strong className="text-slate-800 font-mono font-black text-sm block mt-1">
                      {limit.toFixed(2)} $
                    </strong>
                  </div>
                </div>

                {/* Quick actions panel inside file details counter */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <h4 className="text-xs font-black text-slate-800 mb-2">{lang === 'ar' ? '🔌 إجراءات سريعة لملف الحساب:' : 'Account Quick Settings:'}</h4>
                  <div className="flex flex-col sm:flex-row gap-2 justify-end">
                    
                    {/* Convert points inside file */}
                    <button
                      type="button"
                      onClick={() => handleRedeemPoints(cust.id)}
                      disabled={cust.loyaltyPoints < 100}
                      className="px-3 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-[#D4AF37] disabled:opacity-40 disabled:cursor-not-allowed text-[11px] font-extrabold rounded-xl transition cursor-pointer"
                    >
                      🌟 {lang === 'ar' ? `استرداد نقاط الولاء (${Math.floor(cust.loyaltyPoints / 100) * 100} نقطة بـ خصم $${Math.floor(cust.loyaltyPoints / 100)})` : 'Redeem Points'}
                    </button>

                    {/* Pay Balance inside file */}
                    {payingCustId === cust.id ? (
                      <form onSubmit={handlePayDebtSubmit} className="flex items-center gap-1.5 w-full sm:w-auto">
                        <input
                          type="number"
                          step="any"
                          placeholder="$ ادخل مبلغ السداد"
                          value={payAmount}
                          onChange={e => setPayAmount(e.target.value)}
                          className="w-28 bg-white border border-rose-300 rounded-lg font-mono text-center text-xs py-1.5"
                          required
                        />
                        <button
                          type="submit"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-[11px] rounded-lg font-bold cursor-pointer"
                        >
                          {lang === 'ar' ? 'تأكيد القبض والخصم' : 'Submit'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPayingCustId(null)}
                          className="text-slate-400 hover:text-slate-600 text-xs px-1 cursor-pointer"
                        >
                          X
                        </button>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setPayingCustId(cust.id);
                          setPayAmount('');
                        }}
                        className="px-3.5 py-2 bg-[#EAF6ED] border border-emerald-200 text-[#1D9E75] hover:bg-emerald-50 text-[11px] font-extrabold rounded-xl transition cursor-pointer"
                      >
                        💵 {lang === 'ar' ? 'تسجيل إيصال سداد نقدي (سند قبض ذمم)' : 'Issue Settle Payment Reciept'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Sub-section: Purchase Receipt File History */}
                <div className="space-y-2 text-right">
                  <h4 className="text-xs font-black text-slate-800 text-right flex items-center gap-1 flex-row-reverse border-b pb-1.5">
                    <FileText className="w-4 h-4 text-[#1D9E75]" />
                    <span>{lang === 'ar' ? '📜 تاريخ وصور الفواتير والمستندات المسجلة للزبون' : 'Invoices & Sales Transactions Log'}</span>
                  </h4>

                  {custInvoices.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs font-bold bg-slate-50 border border-slate-100 rounded-xl">
                      {lang === 'ar' ? 'لا توجد فواتير ومبيعات آجل مسجلة باسم هذا الزبون حتى الآن.' : 'No invoices or transaction history for this client on record.'}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-right border-collapse">
                        <thead>
                          <tr className="bg-slate-100 border-b text-slate-600 font-bold">
                            <th className="p-2 text-right">{lang === 'ar' ? 'رقم الفاتورة' : 'Inv No'}</th>
                            <th className="p-2 text-center">{lang === 'ar' ? 'التاريخ والوقت' : 'Date / Time'}</th>
                            <th className="p-2 text-center">{lang === 'ar' ? 'وسيلة الدفع' : 'Payment'}</th>
                            <th className="p-2 text-left">{lang === 'ar' ? 'إجمالي مع الصرف' : 'Total Value'}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {custInvoices.map((inv, idx) => (
                            <tr key={inv.id || idx} className="border-b hover:bg-slate-50 font-medium">
                              <td className="p-2 text-right font-mono font-bold text-[#1D9E75]">
                                {inv.invoiceNumber}
                              </td>
                              <td className="p-2 text-center text-slate-500 text-[10.5px]">
                                {inv.date} | {inv.time}
                              </td>
                              <td className="p-2 text-center">
                                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${inv.paymentMethod === 'debt' ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-slate-150 text-slate-700'}`}>
                                  {inv.paymentMethod === 'debt' ? (lang === 'ar' ? 'آجل ذمم' : 'Debt') : (lang === 'ar' ? 'نقدي كاش' : 'Cash')}
                                </span>
                              </td>
                              <td className="p-2 text-left font-mono font-bold text-slate-800">
                                {inv.totalUSD.toFixed(2)}$ <span className="text-slate-400 font-normal text-[10px]">({Math.ceil(inv.totalLBP).toLocaleString()} ل.ل)</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-start">
                <button
                  onClick={() => setSelectedCustomerFile(null)}
                  className="px-5 py-2 bg-slate-300 hover:bg-slate-400 text-slate-800 font-bold rounded-xl transition text-xs cursor-pointer"
                >
                  {lang === 'ar' ? 'إغلاق نافذة الملف ❌' : 'Close File'}
                </button>
              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
}

// -----------------------------------------------------
// 2) RETURNS AND WASTE TAB VIEW (FOR EXPIRY/DAMAGED/REFUNDS)
// -----------------------------------------------------
