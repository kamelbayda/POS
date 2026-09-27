import { motion } from 'motion/react';
import { Layers } from 'lucide-react';
import React, { useState } from 'react';

interface AddCategoryModalProps {
  setShowAddCategoryModal: React.Dispatch<React.SetStateAction<boolean>>;
  showToast: (type: "success" | "error" | "warning", message: string) => void;
  handleAddNewCategory: (name: string, emoji?: string) => void;
}

export function AddCategoryModal({
  setShowAddCategoryModal,
  showToast,
  handleAddNewCategory,
}: AddCategoryModalProps) {
  const [newCategoryNameInput, setNewCategoryNameInput] = useState<string>('');
  const [newCategoryEmojiInput, setNewCategoryEmojiInput] = useState<string>('📦');

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="add-category-modal">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl p-6 w-full max-w-sm text-right border border-emerald-150 shadow-2xl space-y-4"
      >
        <div className="text-center space-y-2 flex flex-col items-center justify-center">
          <div className="p-3 bg-emerald-50 rounded-2xl inline-block">
            <Layers className="w-6 h-6 text-[#1D9E75]" />
          </div>
          <h3 className="text-base font-black text-slate-800">إضافة تصنيف أو فئة منتجات جديدة</h3>
          <p className="text-[11px] text-slate-400">سجل لقباً أو فئة لتنظيم جرودات ومبيعات الأصناف بدقة بالدكان.</p>
        </div>

        <div className="space-y-3 text-right">
          <div>
            <label className="block text-slate-500 mb-1 text-[11px] font-bold">اسم الفئة الجديدة:</label>
            <input 
              type="text" 
              value={newCategoryNameInput} 
              onChange={e => setNewCategoryNameInput(e.target.value)}
              placeholder="مثال: شوكولا، أجبان، مشروبات طاقة..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-right font-medium focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-slate-500 mb-1 text-[11px] font-bold">الرمز التعبيري المصاحب:</label>
            <div className="flex gap-1.5 justify-center flex-wrap py-1.5 bg-slate-50 rounded-xl border border-slate-100 mb-2">
              {['🍎', '🥩', '🥛', '🍫', '🥤', '🍞', '🥫', '📦', '🧼', '🔋', '🍦'].map(em => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setNewCategoryEmojiInput(em)}
                  className={`text-lg p-1.5 rounded-lg hover:bg-white border transition cursor-pointer ${newCategoryEmojiInput === em ? 'bg-white border-emerald-500 scale-110 shadow-xs' : 'border-transparent'}`}
                >
                  {em}
                </button>
              ))}
            </div>
            <input 
              type="text" 
              value={newCategoryEmojiInput} 
              onChange={e => setNewCategoryEmojiInput(e.target.value)}
              placeholder="📦"
              className="w-12 mx-auto bg-slate-50 border border-slate-200 rounded-xl py-2 px-1 text-center font-bold"
            />
          </div>
        </div>

        <div className="flex gap-2 text-xs font-sans">
          <button 
            type="button"
            onClick={() => {
              if (!newCategoryNameInput.trim()) {
                showToast('warning', 'الرجاء إدخال اسم الفئة أولاً!');
                return;
              }
              handleAddNewCategory(newCategoryNameInput, newCategoryEmojiInput);
              setNewCategoryNameInput('');
              setNewCategoryEmojiInput('📦');
              setShowAddCategoryModal(false);
            }}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3 rounded-xl transition cursor-pointer"
          >
            تأكيد وبناء الفئة 💾
          </button>
          <button 
            type="button"
            onClick={() => {
              setNewCategoryNameInput('');
              setNewCategoryEmojiInput('📦');
              setShowAddCategoryModal(false);
            }}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl transition cursor-pointer"
          >
            تراجع
          </button>
        </div>
      </motion.div>
    </div>
  );
}
