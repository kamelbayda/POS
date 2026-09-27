import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Trash2, 
  Award, 
  ArrowLeftRight, 
  Check, 
  DollarSign, 
  Calendar, 
  RefreshCw, 
  AlertTriangle, 
  ChevronRight, 
  FileText, 
  Undo2,
  Trash,
  Printer,
  X
} from 'lucide-react';
import { Customer, ReturnRecord, WasteRecord, Product, Invoice, Supplier, SystemSettings } from '../types';

interface CustomersTabProps {
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  lang: 'ar' | 'en';
  showToast: (type: 'success' | 'error' | 'warning', msg: string) => void;
  invoices?: Invoice[];
}

export function CustomersTab({ customers, setCustomers, suppliers, setSuppliers, lang, showToast, invoices = [] }: CustomersTabProps) {
  const [subTab, setSubTab] = useState<'customers' | 'suppliers'>('customers');

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

  // Supplier form state
  const [suppName, setSuppName] = useState('');
  const [suppPhone, setSuppPhone] = useState('');
  const [suppCompany, setSuppCompany] = useState('');
  const [suppDebt, setSuppDebt] = useState('0');

  // Supplier payment state
  const [payingSuppId, setPayingSuppId] = useState<string | null>(null);
  const [paySuppAmount, setPaySuppAmount] = useState('');

  // Search query states
  const [custSearch, setCustSearch] = useState('');
  const [suppSearch, setSuppSearch] = useState('');

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
    localStorage.setItem('pos_customers', JSON.stringify(updated));

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
    localStorage.setItem('pos_customers', JSON.stringify(updated));

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
    localStorage.setItem('pos_customers', JSON.stringify(updated));

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
      localStorage.setItem('pos_customers', JSON.stringify(updated));
      showToast('success', lang === 'ar' ? 'تم حذف حساب الزبون بنجاح.' : 'Customer account removed.');
    }
  };

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
    localStorage.setItem('pos_suppliers', JSON.stringify(updated));

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
    localStorage.setItem('pos_suppliers', JSON.stringify(updated));

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
      localStorage.setItem('pos_suppliers', JSON.stringify(updated));
      showToast('success', lang === 'ar' ? 'تم حذف حساب المورد بنجاح.' : 'Supplier account removed.');
    }
  };

  // Filtering lists by search query
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(custSearch.toLowerCase()) ||
    (c.phone && c.phone.includes(custSearch))
  );

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(suppSearch.toLowerCase()) ||
    (s.phone && s.phone.includes(suppSearch)) ||
    (s.companyName && s.companyName.toLowerCase().includes(suppSearch.toLowerCase()))
  );

  const totalOutstandingDebts = customers.reduce((sum, c) => sum + c.creditBalance, 0);
  const totalPoints = customers.reduce((sum, c) => sum + c.loyaltyPoints, 0);
  const totalSupplierDebts = suppliers.reduce((sum, s) => sum + s.debtBalance, 0);

  return (
    <div className="space-y-6" id="extensions-customers">
      
      {/* Tab toggle at the top of the screen */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setSubTab('customers')}
          className={`flex-1 py-4 font-black text-sm flex items-center justify-center gap-2 border-b-2 transition ${subTab === 'customers' ? 'border-[#1D9E75] text-[#1D9E75]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <Users className="w-5 h-5 text-emerald-600" />
          <span>{lang === 'ar' ? 'تعريف وإدارة حسابات الزبائن (العملاء والذمم والولاء)' : 'Define Customers, Loyalty & Debts'}</span>
        </button>
        <button
          onClick={() => setSubTab('suppliers')}
          className={`flex-1 py-4 font-black text-sm flex items-center justify-center gap-2 border-b-2 transition ${subTab === 'suppliers' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <Calendar className="w-5 h-5 text-amber-500" />
          <span>{lang === 'ar' ? 'تعريف وإدارة حسابات المورّدين ومستحقات المشتريات والشركات' : 'Define Suppliers & Accounts Payable'}</span>
        </button>
      </div>

      {subTab === 'customers' ? (
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
      ) : (
        <>
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
        </>
      )}

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
interface ReturnsWasteTabProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  invoices: Invoice[];
  returns: ReturnRecord[];
  setReturns: React.Dispatch<React.SetStateAction<ReturnRecord[]>>;
  waste: WasteRecord[];
  setWaste: React.Dispatch<React.SetStateAction<WasteRecord[]>>;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  lang: 'ar' | 'en';
  showToast: (type: 'success' | 'error' | 'warning', msg: string) => void;
  sysDate: string;
  currentUserRole?: string;
}

export function ReturnsWasteTab({ 
  products, 
  setProducts, 
  invoices, 
  returns, 
  setReturns, 
  waste, 
  setWaste, 
  customers,
  setCustomers,
  lang, 
  showToast,
  sysDate,
  currentUserRole = 'admin'
}: ReturnsWasteTabProps) {
  const [subTab, setSubTab] = useState<'returns' | 'waste'>('returns');

  // --- PRINT MODAL STATES FOR RETURNS AND WASTE ---
  const [activePrintReturn, setActivePrintReturn] = useState<ReturnRecord | null>(null);
  const [activePrintWaste, setActivePrintWaste] = useState<WasteRecord | null>(null);

  const [settings] = useState<SystemSettings>(() => {
    try {
      const raw = localStorage.getItem('pos_settings');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return {
      shopName: 'Supermarket Al-Amine',
      exchangeRate: 89000,
      lowStockThreshold: 10,
      expiryAlertDays: 30,
      receiptFooter: 'شكراً لزيارتكم! مأجورين إن شاء الله للجرود والمنفعة'
    };
  });

  // --- RETURN INVOICE SPECIFIC STATE ---
  const [returnInvoiceNo, setReturnInvoiceNo] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [returnProductId, setReturnProductId] = useState('');
  const [returnQty, setReturnQty] = useState('1');
  const [returnReason, setReturnReason] = useState<'damaged' | 'customer_change' | 'expired'>('customer_change');
  const [refundType, setRefundType] = useState<'cash' | 'credit'>('cash');

  // --- WASTE SPECIFIC STATE ---
  const [wasteProductId, setWasteProductId] = useState('');
  const [wasteQty, setWasteQty] = useState('1');
  const [wasteReason, setWasteReason] = useState<'expired' | 'damaged_on_shelf' | 'theft_loss'>('expired');
  const [wasteCompensated, setWasteCompensated] = useState<'loss' | 'compensated'>('loss');

  // --- EXECUTE ACTIONS ---
  const handleFindInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const found = invoices.find(inv => inv.invoiceNumber.toUpperCase() === returnInvoiceNo.trim().toUpperCase());
    if (found) {
      setSelectedInvoice(found);
      setReturnProductId('');
      setReturnQty('1');
      showToast('success', lang === 'ar' ? `تم العثور على الفاتورة بنجاح! تحتوي على ${found.items.length} أصناف مبيعات` : `Invoice found!`);
    } else {
      setSelectedInvoice(null);
      showToast('error', lang === 'ar' ? 'رقم الفاتورة غير صحيح أو غير متوفر بالآرشيف!' : 'No matching invoice number on record');
    }
  };

  const handleProcessReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice || !returnProductId) return;

    const returnQuantity = parseFloat(returnQty) || 0;
    const soldItem = selectedInvoice.items.find(item => item.productId === returnProductId);
    if (!soldItem) return;

    if (returnQuantity <= 0 || returnQuantity > soldItem.quantity) {
      showToast('error', lang === 'ar' ? 'الكمية المراد إرجاعها غير صالحة أو تجاوزت قيمة الكمية المباعة!' : 'Invalid returned quantity');
      return;
    }

    const unitPrice = soldItem.priceUSD;
    const totalRefundValue = unitPrice * returnQuantity;

    // 1. Return item to inventory stock
    const updatedProducts = products.map(p => {
      if (p.id === returnProductId) {
        return {
          ...p,
          quantity: p.quantity + returnQuantity
        };
      }
      return p;
    });
    setProducts(updatedProducts);
    localStorage.setItem('pos_products', JSON.stringify(updatedProducts));

    // 2. Adjust Customer credit if refundType is 'credit' and customer is linked
    if (refundType === 'credit' && selectedInvoice.customerId) {
      const updatedCusts = customers.map(c => {
        if (c.id === selectedInvoice.customerId) {
          // Subtract from customer debt!
          return {
            ...c,
            creditBalance: Math.max(0, c.creditBalance - totalRefundValue)
          };
        }
        return c;
      });
      setCustomers(updatedCusts);
      localStorage.setItem('pos_customers', JSON.stringify(updatedCusts));
      showToast('success', lang === 'ar' ? `تم خصم قيمة المرتجع ${totalRefundValue.toFixed(2)}$ من مديونية حساب العميل.` : `Reduced client's debt!`);
    }

    // 3. Create Return Record
    const newReturn: ReturnRecord = {
      id: `ret-${Date.now()}`,
      invoiceId: selectedInvoice.id,
      invoiceNumber: selectedInvoice.invoiceNumber,
      date: sysDate,
      productId: returnProductId,
      productName: soldItem.productName,
      qty: returnQuantity,
      quantity: returnQuantity,
      action: refundType === 'cash' ? 'cash' : 'credit',
      refundAmountUSD: totalRefundValue,
      reason: returnReason,
      refundMethod: refundType,
      customerId: selectedInvoice.customerId
    };

    const updatedReturns = [newReturn, ...returns];
    setReturns(updatedReturns);
    localStorage.setItem('pos_returns', JSON.stringify(updatedReturns));
    setActivePrintReturn(newReturn); // Auto triggering printable return receipt!

    // Reset return item
    setReturnProductId('');
    setReturnQty('1');
    showToast('success', lang === 'ar' ? `تم بنجاح تسجيل إرجاع صنف والتعويض للزبون بقيمة ${totalRefundValue}$!` : `Return transaction completed successfully for $${totalRefundValue}!`);
  };

  const handleProcessWaste = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wasteProductId) return;

    const quantityToLoss = parseFloat(wasteQty) || 0;
    const targetProduct = products.find(p => p.id === wasteProductId);
    if (!targetProduct) return;

    if (quantityToLoss <= 0 || quantityToLoss > targetProduct.quantity) {
      showToast('error', lang === 'ar' ? `الكمية المدخلة خاطئة أو تجاوزت الرصيد الحالي المتوفر في الرف وهو ${targetProduct.quantity}!` : 'Invalid waste quantity input');
      return;
    }

    // 1. Subtract from stock inventory
    const updatedProducts = products.map(p => {
      if (p.id === wasteProductId) {
        return {
          ...p,
          quantity: Math.max(0, p.quantity - quantityToLoss)
        };
      }
      return p;
    });
    setProducts(updatedProducts);
    localStorage.setItem('pos_products', JSON.stringify(updatedProducts));

    // 2. Add Spoil Waste record
    const costValueUSD = targetProduct.priceUSD * quantityToLoss;
    const newWaste: WasteRecord = {
      id: `wst-${Date.now()}`,
      productId: wasteProductId,
      productName: targetProduct.name,
      qty: quantityToLoss,
      quantity: quantityToLoss,
      type: wasteReason === 'expired' ? 'expired' : 'damage',
      reason: wasteReason,
      cost: costValueUSD,
      date: sysDate,
      estimatedLossUSD: costValueUSD,
      compensationStatus: wasteCompensated
    };

    const updatedWasteList = [newWaste, ...waste];
    setWaste(updatedWasteList);
    localStorage.setItem('pos_waste', JSON.stringify(updatedWasteList));
    setActivePrintWaste(newWaste); // Auto triggering printable waste receipt voucher!

    // Reset waste states
    setWasteProductId('');
    setWasteQty('1');
    showToast('success', lang === 'ar' ? `تم تفريغ وإتلاف ${quantityToLoss} وحدات مفقودة وتسجيل المتبقي في تصفية الجرود بنجاح!` : `Waste/Loss logged! Stock removed.`);
  };

  const totalLossFromWaste = waste.reduce((sum, w) => w.compensationStatus === 'loss' ? sum + w.estimatedLossUSD : sum, 0);

  return (
    <div className="space-y-6" id="extensions-returns-waste">
      
      {/* Sub tabs navigation */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setSubTab('returns')}
          className={`px-6 py-3 font-extrabold text-sm flex items-center gap-2 border-b-2 transition ${subTab === 'returns' ? 'border-[#1D9E75] text-[#1D9E75]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <Undo2 className="w-4 h-4" />
          <span>{lang === 'ar' ? 'قسم مرتجعات المبيعات والزبائن' : 'Product Sales Returns'}</span>
        </button>
        <button
          onClick={() => setSubTab('waste')}
          className={`px-6 py-3 font-extrabold text-sm flex items-center gap-2 border-b-2 transition ${subTab === 'waste' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <Trash className="w-4 h-4 text-rose-500" />
          <span>{lang === 'ar' ? 'قسم شطب التوالف والتآكل المخرجات الفاسدة' : 'Spoilage & Damaged Stock Waste'}</span>
        </button>
      </div>

      {subTab === 'returns' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Register returns */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs h-fit space-y-5">
            <h3 className="font-extrabold text-slate-800 text-base mb-2 pb-2 border-b border-slate-100 text-right flex items-center gap-2 flex-row-reverse">
              <Undo2 className="w-5 h-5 text-emerald-600" />
              <span>{lang === 'ar' ? 'تسجيل إرجاع صنف مبيعات' : 'Process Return Credit'}</span>
            </h3>

            {/* Sub Form A: Find Invoice */}
            <form onSubmit={handleFindInvoice} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 text-right mb-1">
                  {lang === 'ar' ? 'خطوة أولى: ابحث برقم الفاتورة الفعلي:' : 'Step 1: Enter Invoice Number:'}
                </label>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="bg-slate-800 hover:bg-slate-900 text-white px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition"
                  >
                    {lang === 'ar' ? 'مزامنة' : 'Scan'}
                  </button>
                  <input
                    type="text"
                    placeholder="مثال: INV-123456-0001"
                    value={returnInvoiceNo}
                    onChange={e => setReturnInvoiceNo(e.target.value)}
                    className="w-full text-center bg-slate-50 border border-slate-200 py-1.5 px-2 rounded-lg text-xs font-mono font-bold"
                    required
                  />
                </div>
              </div>
            </form>

            {selectedInvoice && (
              <form onSubmit={handleProcessReturn} className="space-y-3.5 pt-3 border-t border-slate-100">
                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 text-xs text-right space-y-1">
                  <div className="font-bold text-slate-800">📋 {lang === 'ar' ? 'بيانات الفاتورة المحددة:' : 'Invoice Metadata:'}</div>
                  <div>ID: <strong className="font-mono">{selectedInvoice.invoiceNumber}</strong></div>
                  <div>{lang === 'ar' ? 'إجمالي الدفع:' : 'Paid amount:'} <strong className="text-emerald-700 font-mono">{selectedInvoice.totalUSD}$ / {(selectedInvoice.totalLBP).toLocaleString()} LBP</strong></div>
                  {selectedInvoice.customerId && (
                    <div className="text-amber-700 font-bold">👤 {lang === 'ar' ? 'زبون آجل / معرّف' : 'Linked Customer'}</div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 text-right mb-1">
                    {lang === 'ar' ? 'خطوة ثانية: حدد جرد الصنف المراد إرجاعه:' : 'Step 2: Selection Item to Return:'}
                  </label>
                  <select
                    value={returnProductId}
                    onChange={e => setReturnProductId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs font-semibold text-right"
                    required
                  >
                    <option value="">-- {lang === 'ar' ? 'اختر منتج من القائمة' : 'Select Item'} --</option>
                    {selectedInvoice.items.map(it => (
                      <option key={it.productId} value={it.productId}>
                        {it.productName} ({it.quantity} مباع بقيمة {it.priceUSD}$)
                      </option>
                    ))}
                  </select>
                </div>

                {returnProductId && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 text-right mb-1">
                          {lang === 'ar' ? 'سبب الإرجاع المعالج:' : 'Reason:'}
                        </label>
                        <select
                          value={returnReason}
                          onChange={e => setReturnReason(e.target.value as any)}
                          className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded-lg text-xs font-bold text-right"
                        >
                          <option value="customer_change">{lang === 'ar' ? 'تبديل رغبة الزبون' : 'Customer change'}</option>
                          <option value="damaged">{lang === 'ar' ? 'تالف في المصنع' : 'Damaged / Spoil'}</option>
                          <option value="expired">{lang === 'ar' ? 'انتهاء صلاحية لاحق' : 'Expired product'}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 text-right mb-1">
                          {lang === 'ar' ? 'كمية الإرجاع:' : 'Qty:'}
                        </label>
                        <input
                          type="number"
                          value={returnQty}
                          min="0.01"
                          step="any"
                          onChange={e => setReturnQty(e.target.value)}
                          className="w-full text-center bg-slate-50 border border-slate-200 p-1 rounded-lg text-sm font-mono font-bold"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 text-right mb-1">
                        {lang === 'ar' ? 'آلية التعويض المالي:' : 'Refund Method:'}
                      </label>
                      <select
                        value={refundType}
                        onChange={e => setRefundType(e.target.value as any)}
                        className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded-lg text-xs font-bold text-right"
                      >
                        <option value="cash">{lang === 'ar' ? 'دفع كاش نقداً ($)' : 'Cash Refund ($)'}</option>
                        {selectedInvoice.customerId && (
                          <option value="credit">{lang === 'ar' ? 'خصم وتنزيل من قيمة المديونية العامة العميل' : 'Store Credit / Account Balance'}</option>
                        )}
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 rounded-xl transition text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Undo2 className="w-4 h-4" />
                      <span>{lang === 'ar' ? 'تأكيد الإرجاع وتصفية المخزون' : 'Commit Return'}</span>
                    </button>
                  </>
                )}
              </form>
            )}
          </div>

          {/* Right Column: Historic logs */}
          <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs h-[525px] flex flex-col">
            <h3 className="font-extrabold text-slate-800 text-base mb-4 pb-2 border-b border-slate-100 text-right flex items-center gap-2 flex-row-reverse justify-between">
              <span className="flex items-center gap-2 flex-row-reverse animate-pulse">
                <RefreshCw className="w-5 h-5 text-emerald-600" />
                <span>{lang === 'ar' ? 'دفتر قيود المبيعات المسترجعة' : 'Sales Returns History'}</span>
              </span>
            </h3>

            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 scrollbar-thin">
              {returns.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  {lang === 'ar' ? 'لا توجد مبيعات مرتجعة مسجلة في هذا الجرد.' : 'No return records registered yet.'}
                </div>
              ) : (
                returns.map(ret => (
                  <div key={ret.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50 text-right text-xs text-slate-600 flex justify-between items-center flex-row-reverse gap-4">
                    <div className="space-y-1">
                      <div className="font-extrabold text-slate-800 text-sm">
                        {ret.productName} ( {ret.quantity} {lang === 'ar' ? 'قطع' : 'pcs'} )
                      </div>
                      <div>{lang === 'ar' ? 'رقم الفاتورة الأصلية:' : 'Orig Inv:'} <span className="font-mono font-semibold">{ret.invoiceNumber}</span></div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setActivePrintReturn(ret)}
                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold px-2 py-1.5 rounded-lg border border-emerald-200 text-[10px] flex items-center gap-1 cursor-pointer transition select-none"
                        title={lang === 'ar' ? 'طباعة ومعاينة الفاتورة الحرارية' : 'Print Return Invoice'}
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>{lang === 'ar' ? 'طباعة' : 'Print'}</span>
                      </button>
                      <div className="text-left space-y-1 whitespace-nowrap">
                        <div className="text-rose-600 font-extrabold font-mono text-sm">+{((ret.refundAmountUSD !== undefined && ret.refundAmountUSD !== null) ? ret.refundAmountUSD : 0).toFixed(2)} $</div>
                        <div className="text-[10px] text-slate-400 font-mono">{ret.date}</div>
                        <span className="inline-block bg-slate-200/80 text-slate-700 px-1.5 py-0.5 rounded text-[10px]">
                          {ret.reason === 'damaged' ? (lang === 'ar' ? 'بضائع معطوبة' : 'damaged') : (lang === 'ar' ? 'رغبة الزبون' : 'customer change')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        /* WASTE AND LOST DIVISION SCREEN */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: register waste */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs h-fit space-y-5">
            <h3 className="font-extrabold text-slate-800 text-base mb-2 pb-2 border-b border-slate-100 text-right flex items-center gap-2 flex-row-reverse">
              <AlertTriangle className="w-5 h-5 text-rose-500 animate-pulse" />
              <span>{lang === 'ar' ? 'تسجيل وشطب تالف / منتهي الصلاحية' : 'Log Loss or Damaged Spoils'}</span>
            </h3>

            <form onSubmit={handleProcessWaste} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 text-right mb-1">
                  {lang === 'ar' ? 'اختر المنتج من الجرود الحالية:' : 'Choose Stock Item:'}
                </label>
                <select
                  value={wasteProductId}
                  onChange={e => setWasteProductId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs font-semibold text-right"
                  required
                >
                  <option value="">-- {lang === 'ar' ? 'حدد صنف من المخزون لفتحه' : 'Select Product'} --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({lang === 'ar' ? 'رصيد:' : 'Stock:'} {p.quantity} قطع / بـ {p.priceUSD}$)
                    </option>
                  ))}
                </select>
              </div>

              {wasteProductId && (
                <>
                  <div className="grid grid-cols-2 gap-3 text-right">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        {lang === 'ar' ? 'نوع الضرر الحادث:' : 'Loss Reason:'}
                      </label>
                      <select
                        value={wasteReason}
                        onChange={e => setWasteReason(e.target.value as any)}
                        className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded-lg text-xs font-bold text-right"
                      >
                        <option value="expired">{lang === 'ar' ? 'إكسباير منتهي تاريخية' : 'Expired'}</option>
                        <option value="damaged_on_shelf">{lang === 'ar' ? 'تلف صدمات / تكسير بالرف' : 'Damaged'}</option>
                        <option value="theft_loss">{lang === 'ar' ? 'عجز سرقة وبضائع ضائعة' : 'Missing/Stolen'}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        {lang === 'ar' ? 'الكمية التالفة:' : 'Damage Qty:'}
                      </label>
                      <input
                        type="number"
                        value={wasteQty}
                        min="0.01"
                        step="any"
                        onChange={e => setWasteQty(e.target.value)}
                        className="w-full text-center bg-slate-50 border border-slate-200 p-1 rounded-lg text-sm font-mono font-bold"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 text-right mb-1">
                      {lang === 'ar' ? 'بند تحميل التكلفة المالية:' : 'Cost Allocation:'}
                    </label>
                    <select
                      value={wasteCompensated}
                      onChange={e => setWasteCompensated(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded-lg text-xs font-bold text-right"
                    >
                      <option value="loss">{lang === 'ar' ? 'شطب بقيمتها بالكامل (خسارة على السوبر ماركت)' : 'Uncompensated loss (100% shop burden)'}</option>
                      <option value="compensated">{lang === 'ar' ? 'تعويض من الموزع / المورد لاحقاً' : 'Compensated/Returned by supplier'}</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl transition text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Trash className="w-4 h-4" />
                    <span>{lang === 'ar' ? 'شطب وتنزيل صك الإتلاف والتبديد' : 'Commit Damaged/Loss'}</span>
                  </button>
                </>
              )}
            </form>
          </div>

          {/* Right Column: Spoil List Logs & Financial Total estimation */}
          <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs h-[525px] flex flex-col">
            <h3 className="font-extrabold text-slate-800 text-base mb-4 pb-2 border-b border-slate-100 text-right flex items-center gap-2 flex-row-reverse justify-between">
              <span className="flex items-center gap-2 flex-row-reverse text-rose-600">
                <Trash className="w-5 h-5" />
                <span>{lang === 'ar' ? 'دفتر تسويات التوالف والجرود التالفة' : 'Damaged Stock & Expired Ledger'}</span>
              </span>
              {currentUserRole === 'admin' && (
                <div className="text-left text-xs text-rose-700 font-extrabold">
                  {lang === 'ar' ? 'خسائر الإتلاف:' : 'Net spoilage burden:'} <strong className="font-mono text-sm">{totalLossFromWaste.toFixed(2)}$</strong>
                </div>
              )}
            </h3>

            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 scrollbar-thin">
              {waste.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  {lang === 'ar' ? 'لا يوجد أصناف تالفة مسجلة في جردة التفتيش الحالية.' : 'No spoils registered in this audit interval.'}
                </div>
              ) : (
                waste.map(wst => (
                  <div key={wst.id} className="p-3 rounded-lg border border-rose-100 bg-rose-50/20 text-right text-xs text-slate-600 flex justify-between items-center flex-row-reverse gap-4">
                    <div className="space-y-1">
                      <div className="font-extrabold text-slate-800 text-sm">
                        {wst.productName} ( {wst.quantity} {lang === 'ar' ? 'وحدة' : 'units'} )
                      </div>
                      <div className="text-xs text-slate-400">
                        {lang === 'ar' ? 'السبب:' : 'Type:'} {wst.reason === 'expired' ? (lang === 'ar' ? 'تاريخ انتهاء صلاحية' : 'Expired date') : (lang === 'ar' ? 'تلف رفوف' : 'Shelf damage')}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setActivePrintWaste(wst)}
                        className="bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold px-2 py-1.5 rounded-lg border border-amber-200 text-[10px] flex items-center gap-1 cursor-pointer transition select-none"
                        title={lang === 'ar' ? 'طباعة ومعاينة السند التفصيلي للإهلاك' : 'Print Spoil Voucher'}
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>{lang === 'ar' ? 'طباعة' : 'Print'}</span>
                      </button>
                      <div className="text-left space-y-1">
                        {currentUserRole === 'admin' && (
                          <div className="text-rose-600 font-extrabold font-mono text-sm">-{((wst.estimatedLossUSD !== undefined && wst.estimatedLossUSD !== null) ? wst.estimatedLossUSD : 0).toFixed(2)} $</div>
                        )}
                        <div className="text-[10px] text-slate-400 font-mono">{wst.date}</div>
                        <span className={`inline-block px-1 rounded text-[10px] font-bold ${wst.compensationStatus === 'compensated' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                          {wst.compensationStatus === 'compensated' ? (lang === 'ar' ? 'الموزع معوض' : 'compensated') : (lang === 'ar' ? 'المحل يتحمل الخسارة' : 'direct shop loss')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL OVERLAYS FOR COLOURED THERMAL INVOICING & SHARING
          ========================================== */}
      {activePrintReturn && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in no-print" id="receipt-modal-container">
          <div className="bg-slate-900 text-white rounded-3xl p-6 w-full max-w-sm border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <button 
                onClick={() => setActivePrintReturn(null)}
                className="hover:bg-slate-800 p-1 rounded-full text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <h4 className="font-bold text-sm text-right">معاينة إيصال مرتجع المبيعات 📑</h4>
            </div>

            {/* Simulated Paper block */}
            <div 
              className="bg-slate-50 text-slate-900 font-mono text-[11px] p-5 rounded-2xl overflow-y-auto max-h-[380px] space-y-2.5 text-right font-sans border-t-4 border-rose-500 shadow-inner"
              style={{ fontFamily: 'Courier New, monospace' }}
            >
              <div className="text-center font-bold text-sm text-slate-950 block">{settings.shopName}</div>
              <div className="text-center text-xs text-rose-600 font-bold block">إيصال مرتجع مبيعات رسمي</div>
              <div className="text-center text-slate-400 text-[9px] block">************************************</div>
              
              <div className="space-y-0.5 text-slate-550 text-right">
                <div>رقم مستند المرتجعات: <strong className="font-mono text-slate-900">{activePrintReturn.id}</strong></div>
                <div>المرجع للفاتورة الأصلية: <strong className="font-mono text-slate-900">{activePrintReturn.invoiceNumber || activePrintReturn.invoiceId}</strong></div>
                <div>تاريخ المعالجة: <span className="font-mono">{activePrintReturn.date}</span></div>
                <div>الجهة المصدرة: <span className="font-bold text-slate-800">قسم المراقبة العينية والجرود</span></div>
                {activePrintReturn.customerId && (
                  <div>
                    الزبون المرتبط: <strong className="text-emerald-700">
                      {customers.find(c => c.id === activePrintReturn.customerId)?.name || "زبون معرف"}
                    </strong>
                  </div>
                )}
              </div>

              <div className="text-slate-400 text-[9px] block">------------------------------------+</div>
              <div className="grid grid-cols-12 gap-1 font-bold text-slate-950 text-right">
                <span className="col-span-8">الصنف المرتجع</span>
                <span className="col-span-2 text-center">الكمية</span>
                <span className="col-span-2 text-left">القيمة</span>
              </div>
              <div className="text-slate-400 text-[9px] block">------------------------------------+</div>

              {/* Receipt Item */}
              <div className="text-slate-800">
                <div className="grid grid-cols-12 gap-1 text-right items-center">
                  <span className="col-span-8 text-right font-bold text-slate-900 truncate">{activePrintReturn.productName}</span>
                  <span className="col-span-2 text-center font-bold text-slate-900">{activePrintReturn.quantity || activePrintReturn.qty}</span>
                  <span className="col-span-2 text-left font-bold text-rose-600">{(activePrintReturn.refundAmountUSD || 0).toFixed(2)}$</span>
                </div>
              </div>

              <div className="text-slate-400 text-[9px] block">------------------------------------+</div>

              {/* pricing */}
              <div className="space-y-0.5 text-slate-800 text-right">
                <div className="flex justify-between font-black text-rose-700 text-xs">
                  <span className="font-mono">{((activePrintReturn.refundAmountUSD || 0)).toFixed(2)} $</span>
                  <span>المبلغ المرتجع الصافي للزبون:</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-600">
                  <span className="font-mono">{Math.ceil((activePrintReturn.refundAmountUSD || 0) * settings.exchangeRate).toLocaleString()} ل.ل</span>
                  <span>القيمة المسترجعة باللبناني:</span>
                </div>
                <div className="text-slate-400 text-[8px] my-0.5 text-center">-----------------------------------</div>
                <div className="flex justify-between font-bold text-slate-700">
                  <span>{activePrintReturn.refundMethod === 'credit' ? (lang === 'ar' ? 'تنزيل من حساب الديون' : 'Store Credit') : (lang === 'ar' ? 'تعويض نقدي كاش' : 'Cash Refund')}</span>
                  <span>طريقة التعويض:</span>
                </div>
              </div>

              {/* BARCODE */}
              <div className="flex flex-col items-center justify-center my-3 pb-1 border-t border-dashed border-slate-300">
                <div className="flex h-10 items-end justify-center bg-white px-3 py-1.5 rounded-lg border border-slate-300 gap-[1.5px] w-full">
                  {(activePrintReturn.id).split('').map((char, index) => {
                    const charCode = char.charCodeAt(0);
                    const barHeight = charCode % 2 === 0 ? "h-7" : "h-6";
                    const barWidth = charCode % 3 === 0 ? "w-[3px]" : charCode % 2 === 0 ? "w-[2px]" : "w-[1px]";
                    const barColor = charCode % 5 === 0 ? "bg-red-900/80" : "bg-rose-950";
                    return (
                      <div key={index} className={`${barColor} ${barWidth} ${barHeight}`} />
                    );
                  })}
                </div>
                <div className="text-[9px] tracking-widest font-mono text-rose-800 font-extrabold mt-1 text-center select-all">
                  * {activePrintReturn.id} *
                </div>
              </div>

              <div className="text-slate-400 text-[9px] pt-1 block text-center">************************************</div>
              <div className="text-center font-bold text-slate-500 text-[9px] block">
                {settings.receiptFooter}
              </div>
            </div>

            {/* WA details */}
            <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-800 space-y-2 mt-2">
              <label className="block text-slate-400 text-[10.5px] font-bold text-right">إرسال تفاصيل الإرجاع مباشرة للزبون بواتساب 💬</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const phoneInput = document.getElementById('wa-ret-phone') as HTMLInputElement;
                    const phone = phoneInput ? phoneInput.value.replace(/[^0-9]/g, '') : '';
                    if (!phone) {
                      showToast('warning', lang === 'ar' ? 'الرجاء إدخال رقم هاتف الزبون أولاً لإرسال الرسالة!' : 'Enter client phone first');
                      return;
                    }
                    
                    const linkedCust = customers.find(c => c.id === activePrintReturn.customerId);
                    const custName = linkedCust ? linkedCust.name : (lang === 'ar' ? 'زبون نقدي' : 'Cash Customer');

                    let text = `*إيصال مرتجع مبيعات من ${settings.shopName}*\n`;
                    text += `*الزبون:* ${custName}\n`;
                    text += `*رقم المرتجع:* ${activePrintReturn.id}\n`;
                    text += `*تاريخ المعالجة:* ${activePrintReturn.date}\n`;
                    text += `------------------------------------\n`;
                    text += `• تم إرجاع: ${activePrintReturn.productName} (الكمية: ${activePrintReturn.quantity || activePrintReturn.qty})\n`;
                    text += `*القيمة الإجمالية للمرتجع:* ${((activePrintReturn.refundAmountUSD || 0)).toFixed(2)}$ / ${Math.ceil((activePrintReturn.refundAmountUSD || 0) * settings.exchangeRate).toLocaleString()} ل.ل\n`;
                    text += `*طريقة التعويض:* ${activePrintReturn.refundMethod === 'credit' ? 'تنزيل مالي من حساب الدين العام للزبون بالدفتر' : 'تعويض نقدي كاش من الصندوق الرئيسي'}\n`;
                    text += `------------------------------------\n`;
                    text += `*${settings.receiptFooter}*`;

                    const encoded = encodeURIComponent(text);
                    const link = `https://wa.me/${phone}?text=${encoded}`;
                    window.open(link, '_blank');
                    showToast('success', lang === 'ar' ? 'جاري توجيهك إلى واتساب...' : 'Redirecting to WhatsApp...');
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-3 py-1.5 rounded-xl transition flex items-center gap-1 cursor-pointer shrink-0 text-xs"
                >
                  <Undo2 className="w-3 h-3" />
                  <span>إرسال</span>
                </button>
                <input
                  id="wa-ret-phone"
                  type="text"
                  placeholder="96170123456"
                  defaultValue={(() => {
                    const linkedCust = customers.find(c => c.id === activePrintReturn.customerId);
                    return linkedCust ? linkedCust.phone : '';
                  })()}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl py-1 px-3 text-center font-mono text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 text-xs font-sans">
              <button 
                onClick={() => window.print()}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2.5 rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer border border-emerald-500 shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة الإيصال الحراري</span>
              </button>
              <button 
                onClick={() => setActivePrintReturn(null)}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold px-4 py-2.5 rounded-2xl transition cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {activePrintWaste && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in no-print" id="receipt-modal-container">
          <div className="bg-slate-900 text-white rounded-3xl p-6 w-full max-w-sm border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <button 
                onClick={() => setActivePrintWaste(null)}
                className="hover:bg-slate-800 p-1 rounded-full text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <h4 className="font-bold text-sm text-right">معاينة سند إهلاك وشطب بضاعة تالفة 📑</h4>
            </div>

            {/* Simulated Paper block */}
            <div 
              className="bg-slate-50 text-slate-900 font-mono text-[11px] p-5 rounded-2xl overflow-y-auto max-h-[380px] space-y-2.5 text-right font-sans border-t-4 border-amber-500 shadow-inner"
              style={{ fontFamily: 'Courier New, monospace' }}
            >
              <div className="text-center font-bold text-sm text-slate-950 block">{settings.shopName}</div>
              <div className="text-center text-xs text-amber-600 font-black block">سند إهلاك وشطب توالف وجرد مخزني رسمي</div>
              <div className="text-center text-slate-400 text-[9px] block">************************************</div>
              
              <div className="space-y-0.5 text-slate-550 text-right">
                <div>رقم السند المالي: <strong className="font-mono text-slate-900">{activePrintWaste.id}</strong></div>
                <div>تاريخ المعالجة والشطب: <span className="font-mono">{activePrintWaste.date}</span></div>
                <div>الجهة المدققة: <span className="font-bold text-slate-800">إدارة الرقابة العامة والفرز</span></div>
                <div>تحمل الخسارة المالية: <strong className="text-amber-800 font-bold">{activePrintWaste.compensationStatus === 'compensated' ? 'الموزع / المورد (تعويض لاحق)' : 'خسارة كاملة متكبدة للمحل'}</strong></div>
              </div>

              <div className="text-slate-400 text-[9px] block">------------------------------------+</div>
              <div className="grid grid-cols-12 gap-1 font-bold text-slate-950 text-right">
                <span className="col-span-8">الصنف المشطوب والمبيد</span>
                <span className="col-span-2 text-center">الكمية</span>
                <span className="col-span-2 text-left">التكلفة</span>
              </div>
              <div className="text-slate-400 text-[9px] block">------------------------------------+</div>

              {/* Receipt Item */}
              <div className="text-slate-800">
                <div className="grid grid-cols-12 gap-1 text-right items-center">
                  <span className="col-span-8 text-right font-bold text-slate-900 truncate">{activePrintWaste.productName}</span>
                  <span className="col-span-2 text-center font-bold text-slate-900">{activePrintWaste.quantity || activePrintWaste.qty}</span>
                  <span className="col-span-2 text-left font-bold text-amber-700">{(activePrintWaste.estimatedLossUSD || activePrintWaste.cost || 0).toFixed(2)}$</span>
                </div>
              </div>

              <div className="text-slate-400 text-[9px] block">------------------------------------+</div>

              {/* pricing */}
              <div className="space-y-0.5 text-slate-800 text-right">
                <div className="flex justify-between font-black text-rose-700 text-xs">
                  <span className="font-mono">{((activePrintWaste.estimatedLossUSD || activePrintWaste.cost || 0)).toFixed(2)} $</span>
                  <span>تكلفة البضائع التالفة المهلكة:</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-600">
                  <span className="font-mono">{Math.ceil((activePrintWaste.estimatedLossUSD || activePrintWaste.cost || 0) * settings.exchangeRate).toLocaleString()} ل.ل</span>
                  <span>تكلفة الشطب بالعملة الوطنية:</span>
                </div>
                <div className="text-slate-400 text-[8px] my-0.5 text-center">-----------------------------------</div>
                <div className="flex justify-between font-bold text-slate-700">
                  <span>
                    {activePrintWaste.reason === 'expired' ? 'بضائع منتهية الصلاحية (اكسباير)' : 
                     activePrintWaste.reason === 'damaged_on_shelf' ? 'تلف رفوف وضرر تكسير عيني' : 
                     'عجز سرقة وضياع عينات'}
                  </span>
                  <span>السبب الإداري للشطب:</span>
                </div>
              </div>

              {/* BARCODE */}
              <div className="flex flex-col items-center justify-center my-3 pb-1 border-t border-dashed border-slate-300">
                <div className="flex h-10 items-end justify-center bg-white px-3 py-1.5 rounded-lg border border-slate-300 gap-[1.5px] w-full">
                  {(activePrintWaste.id).split('').map((char, index) => {
                    const charCode = char.charCodeAt(0);
                    const barHeight = charCode % 2 === 0 ? "h-7" : "h-6";
                    const barWidth = charCode % 3 === 0 ? "w-[3px]" : charCode % 2 === 0 ? "w-[2px]" : "w-[1px]";
                    const barColor = charCode % 5 === 0 ? "bg-amber-900/80" : "bg-amber-950";
                    return (
                      <div key={index} className={`${barColor} ${barWidth} ${barHeight}`} />
                    );
                  })}
                </div>
                <div className="text-[9px] tracking-widest font-mono text-amber-800 font-extrabold mt-1 text-center select-all">
                  * {activePrintWaste.id} *
                </div>
              </div>

              <div className="text-slate-400 text-[9px] pt-1 block text-center">************************************</div>
              <div className="text-center font-bold text-slate-500 text-[9px] block">
                تم إتلاف وشطب الكمية من جرد المستودع والرفوف بنجاح ✓
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 text-xs font-sans">
              <button 
                onClick={() => window.print()}
                className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-black py-2.5 rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer border border-amber-500 shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة سند الإتلاف والجرود</span>
              </button>
              <button 
                onClick={() => setActivePrintWaste(null)}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold px-4 py-2.5 rounded-2xl transition cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
