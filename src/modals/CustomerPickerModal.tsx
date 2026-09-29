import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { Customer } from '../types';
import React from 'react';
import * as storage from '../lib/storage';

interface CustomerPickerModalProps {
  syncWriteToCloud: (collectionName: string, docId: string, data: any, isDelete?: boolean) => Promise<void>;
  lang: "ar" | "en";
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  selectedCustomerId: string;
  setSelectedCustomerId: React.Dispatch<React.SetStateAction<string>>;
  setIsCustomerModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  modalCustomerSearch: string;
  setModalCustomerSearch: React.Dispatch<React.SetStateAction<string>>;
  isAddingNewCustomerInModal: boolean;
  setIsAddingNewCustomerInModal: React.Dispatch<React.SetStateAction<boolean>>;
  newCustName: string;
  setNewCustName: React.Dispatch<React.SetStateAction<string>>;
  newCustPhone: string;
  setNewCustPhone: React.Dispatch<React.SetStateAction<string>>;
  newCustType: "retail" | "wholesale";
  setNewCustType: React.Dispatch<React.SetStateAction<"retail" | "wholesale">>;
  newCustLimit: number;
  setNewCustLimit: React.Dispatch<React.SetStateAction<number>>;
  theme: "light" | "dark";
  showToast: (type: "success" | "error" | "warning", message: string) => void;
}

export function CustomerPickerModal({
  syncWriteToCloud,
  lang,
  customers,
  setCustomers,
  selectedCustomerId,
  setSelectedCustomerId,
  setIsCustomerModalOpen,
  modalCustomerSearch,
  setModalCustomerSearch,
  isAddingNewCustomerInModal,
  setIsAddingNewCustomerInModal,
  newCustName,
  setNewCustName,
  newCustPhone,
  setNewCustPhone,
  newCustType,
  setNewCustType,
  newCustLimit,
  setNewCustLimit,
  theme,
  showToast,
}: CustomerPickerModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans" id="customer-selector-modal">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`rounded-3xl p-6 w-full max-w-lg text-right shadow-2xl border flex flex-col max-h-[90vh] ${theme === 'dark' ? 'bg-[#1C1C1E] border-stone-800 text-stone-100' : 'bg-white border-slate-150 text-slate-800'}`}
      >
        {/* Modal Header */}
        <div className="flex justify-between items-center flex-row-reverse border-b pb-3 mb-4 border-stone-805/30 shrink-0">
          <span className="text-xl">👥</span>
          <h3 className="text-base font-black tracking-wide">
            {isAddingNewCustomerInModal 
              ? (lang === 'ar' ? 'تسجيل زبون جديد سريع بالسيستم' : 'Quick Register New Customer')
              : (lang === 'ar' ? 'ربط وتحديد زبون الفاتورة الحالية' : 'Link Invoice Customer')}
          </h3>
          <button
            onClick={() => setIsCustomerModalOpen(false)}
            className="p-1.5 rounded-lg hover:bg-stone-500/10 text-stone-400 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Toggle - Add Customer vs Search Customer */}
        <div className="flex justify-between items-center mb-4 shrink-0 flex-row-reverse">
          <span className="text-xs font-bold text-slate-400">
            {!isAddingNewCustomerInModal && (lang === 'ar' ? `عدد الزبائن الكلي: ${customers.length}` : `Total: ${customers.length}`)}
          </span>
          <button
            type="button"
            onClick={() => setIsAddingNewCustomerInModal(!isAddingNewCustomerInModal)}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 flex-row-reverse ${isAddingNewCustomerInModal ? 'bg-slate-100 dark:bg-stone-800 text-slate-600' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'}`}
          >
            <span>➕</span>
            <span>{isAddingNewCustomerInModal ? (lang === 'ar' ? 'رجوع للبحث والاختيار' : 'Back to selection') : (lang === 'ar' ? 'إنشاء زبون جديد سريع' : 'Quick register')}</span>
          </button>
        </div>

        {/* MODAL WORKSPACE - INLINE FORM VS SEARCH LIST */}
        <div className="flex-1 overflow-y-auto min-h-0 pr-1 pl-1 mb-4">
          {isAddingNewCustomerInModal ? (
            /* INLINE FORM FOR CREATING CUSTOMER DIRECTLY */
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newCustName.trim()) {
                  showToast('error', lang === 'ar' ? 'الاسم مطلوب لإنشاء زبون!' : 'Name is required to create customer!');
                  return;
                }
                const newCust: Customer = {
                  id: `cust-${Date.now()}`,
                  name: newCustName.trim(),
                  phone: newCustPhone.trim() || 'N/A',
                  type: newCustType,
                  loyaltyPoints: 0,
                  creditBalance: 0,
                  debtLimit: newCustLimit
                };
                const updated = [newCust, ...customers];
                setCustomers(updated);
                storage.setJSON('pos_customers', updated);
                if (typeof syncWriteToCloud === 'function') {
                  syncWriteToCloud('customers', newCust.id, newCust);
                }
                setSelectedCustomerId(newCust.id);
                setIsCustomerModalOpen(false);
                showToast('success', lang === 'ar' ? `🎉 تم تسجيل وتحديد الزبون الجديد: ${newCust.name}` : `🎉 Created and linked new customer: ${newCust.name}`);
              }}
              className="space-y-4 font-sans text-right"
            >
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-550 block">
                  {lang === 'ar' ? 'اسم الزبون الكامل (مطلوب) *' : 'Customer Name (Required) *'}
                </label>
                <input
                  type="text"
                  value={newCustName}
                  onChange={e => setNewCustName(e.target.value)}
                  required
                  className="w-full bg-slate-50 dark:bg-stone-900 border border-slate-200 dark:border-stone-800 rounded-xl py-2.5 px-3 text-right text-sm focus:outline-none focus:ring-1 focus:ring-[#1D9E75]"
                  placeholder={lang === 'ar' ? 'مثال: أبو علي صيداوي' : 'e.g. John Doe'}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-550 block">
                  {lang === 'ar' ? 'رقم الهاتف/الجوال' : 'Phone Number'}
                </label>
                <input
                  type="text"
                  value={newCustPhone}
                  onChange={e => setNewCustPhone(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-stone-900 border border-slate-200 dark:border-stone-800 rounded-xl py-2.5 px-3 text-right text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#1D9E75]"
                  placeholder="e.g. 70123456"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-550 block">
                    {lang === 'ar' ? 'فئة الزبون والأسعار:' : 'Sales Pricing Tier:'}
                  </label>
                  <select
                    value={newCustType}
                    onChange={e => setNewCustType(e.target.value as 'retail' | 'wholesale')}
                    className="w-full bg-white dark:bg-stone-900 border border-slate-200 dark:border-stone-800 text-slate-700 dark:text-stone-300 rounded-xl py-2 px-2 text-xs text-right cursor-pointer"
                  >
                    <option value="retail">{lang === 'ar' ? 'مفرّق (قائمة التجزئة)' : 'Retail (Standard)'}</option>
                    <option value="wholesale">{lang === 'ar' ? 'جملة (خصم الجملة)' : 'Wholesale (Wholesale Prices)'}</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-550 block">
                    {lang === 'ar' ? 'سقف الدين المسموح ($):' : 'Debt Upper Ceiling Limit ($):'}
                  </label>
                  <input
                    type="number"
                    value={newCustLimit}
                    onChange={e => setNewCustLimit(Number(e.target.value))}
                    min="0"
                    className="w-full bg-slate-50 dark:bg-stone-900 border border-slate-200 dark:border-stone-800 rounded-xl py-2 px-3 text-right text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#1D9E75]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-[#1D9E75] hover:bg-emerald-600 text-white font-extrabold py-3 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1 shadow-md shadow-emerald-500/10 active:scale-95 mt-4"
              >
                <span>💾</span>
                <span>{lang === 'ar' ? 'تسجيل وحفظ والربط مع الفاتورة الحالية' : 'Register Customer & Select'}</span>
              </button>
            </form>
          ) : (
            /* INTERACTIVE SELECTION COMPONENT WITH SEARCH & SCROLL */
            <div className="space-y-3 font-sans">
              {/* Search box with Icon */}
              <div className="relative">
                <input
                  type="text"
                  value={modalCustomerSearch}
                  onChange={e => setModalCustomerSearch(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-stone-900 border border-slate-200 dark:border-stone-800 rounded-xl py-2.5 px-4 pr-10 text-right text-xs focus:outline-none focus:ring-1 focus:ring-[#1D9E75]"
                  placeholder={lang === 'ar' ? '🔍 ابحث باسم الزبون أو الهاتف...' : '🔍 Search by name or phone...'}
                />
              </div>

              {/* Customer Records Scroll Deck */}
              <div className="space-y-2 mt-2 max-h-[340px] overflow-y-auto pr-0.5">
                {(() => {
                  const qFiltered = customers.filter(c => {
                    const qStr = modalCustomerSearch.trim().toLowerCase();
                    if (!qStr) return true;
                    return c.name.toLowerCase().includes(qStr) || (c.phone && c.phone.toLowerCase().includes(qStr));
                  });

                  if (qFiltered.length === 0) {
                    return (
                      <div className="text-center py-8 text-xs text-slate-400">
                        😞 {lang === 'ar' ? 'لم يتم العثور على زبائن مطابقة للبحث.' : 'No matching customer found.'}
                      </div>
                    );
                  }

                  return qFiltered.map(c => {
                    const isSelected = selectedCustomerId === c.id;
                    return (
                      <div
                        key={c.id}
                        className={`p-3 rounded-2xl border transition-all flex items-center justify-between text-right cursor-pointer hover:-translate-x-0.5 ${isSelected ? 'bg-[#1D9E75]/10 border-[#1D9E75]/40 text-[#1D9E75]' : 'bg-white dark:bg-[#1E1E20] border-slate-150 dark:border-stone-800'}`}
                        onClick={() => {
                          setSelectedCustomerId(isSelected ? '' : c.id);
                          setIsCustomerModalOpen(false);
                          showToast('success', isSelected 
                            ? (lang === 'ar' ? 'تم إلغاء ربط الزبون بالفاتورة' : 'Unlinked customer')
                            : `${lang === 'ar' ? 'تم ربط الزبون بنجاح:' : 'Linked Customer:'} ${c.name}`
                          );
                        }}
                      >
                        {/* Link/Unlink Action Button */}
                        <button
                          type="button"
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition cursor-pointer flex items-center gap-1 justify-center shrink-0 ml-2 ${isSelected ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-slate-50 dark:bg-stone-800 text-slate-700 dark:text-stone-300 hover:bg-slate-100'}`}
                        >
                          <span>{isSelected ? '✖ إلغاء الربط' : '🔗 ربط بالفاتورة'}</span>
                        </button>

                        {/* Customer Bio details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-row-reverse">
                            <span className="font-extrabold text-slate-900 dark:text-stone-100 text-xs truncate">
                              {c.name}
                            </span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full inline-block font-black font-sans leading-none ${c.type === 'wholesale' ? 'bg-[#1C73E8]/10 text-[#1C73E8]' : 'bg-slate-100 dark:bg-stone-850 text-slate-500'}`}>
                              {c.type === 'wholesale' ? (lang === 'ar' ? 'جملة' : 'Whls') : (lang === 'ar' ? 'مفرق' : 'Rtl')}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 justify-end text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-1 flex-wrap font-sans">
                            {c.phone && <span>{lang === 'ar' ? 'الهاتف:' : 'Phone:'} {c.phone}</span>}
                            {c.phone && <span>•</span>}
                            <span className="text-emerald-600 font-bold">{lang === 'ar' ? 'النقاط:' : 'Points:'} {c.loyaltyPoints}</span>
                            <span>•</span>
                            <span className={`font-black ${c.creditBalance > 0 ? 'text-red-500' : 'text-slate-400'}`}>
                              {lang === 'ar' ? 'الدين المترتب:' : 'Balance:'} ${c.creditBalance.toFixed(1)} / ${(c.debtLimit || 1000).toFixed(0)}$
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="flex gap-2 border-t pt-3 border-stone-805/30 shrink-0">
          {/* Optional conversion to cash default checkout (unlinked) */}
          {selectedCustomerId && (
            <button
              type="button"
              onClick={() => {
                setSelectedCustomerId('');
                setIsCustomerModalOpen(false);
                showToast('success', lang === 'ar' ? 'تم إلغاء ربط الزبون والتحويل للفاتورة النقدية الافتراضية.' : 'Default anonymous invoice set');
              }}
              className={`flex-1 font-bold text-xs py-2.5 rounded-xl transition cursor-pointer shadow-xs active:scale-95 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200`}
            >
              {lang === 'ar' ? '🔄 تصفير والتحويل لزبون نقدي ومجهول' : 'Convert to Cash customer'}
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsCustomerModalOpen(false)}
            className={`flex-1 py-2.5 rounded-xl font-extrabold text-xs transition active:scale-95 cursor-pointer text-center ${theme === 'dark' ? 'bg-stone-800 text-stone-400 hover:bg-stone-750' : 'bg-slate-200 text-slate-600 hover:bg-slate-250 border border-slate-300'}`}
          >
            {lang === 'ar' ? 'إغلاق النافذة' : 'Close selector'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
