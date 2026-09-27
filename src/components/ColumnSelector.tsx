import React, { useState, useRef, useEffect } from 'react';
import { Eye, Check } from 'lucide-react';

interface Column {
  key: string;
  label: string;
}

interface ColumnSelectorProps {
  columns: Column[];
  visibleCols: { [key: string]: boolean };
  onChange: (key: string) => void;
  lang: string;
  id?: string;
}

export const ColumnSelector: React.FC<ColumnSelectorProps> = ({
  columns,
  visibleCols,
  onChange,
  lang,
  id = 'col-sel'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const activeCount = columns.filter(col => visibleCols[col.key]).length;

  return (
    <div className="relative inline-block text-right no-print" ref={dropdownRef} id={id}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl shadow-xs transition duration-150 cursor-pointer select-none"
      >
        <Eye className="w-3.5 h-3.5 text-[#1D9E75]" />
        <span>
          {lang === 'ar' ? 'تخصيص الأعمدة' : 'Customize Columns'}
        </span>
        <span className="font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md text-[10px] ml-0.5">
          {activeCount}/{columns.length}
        </span>
      </button>

      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 max-h-72 overflow-y-auto divide-y divide-slate-50 text-right"
          style={{ position: 'absolute', zIndex: 9999 }}
        >
          <div className="px-3 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">
            {lang === 'ar' ? 'إظهار / إخفاء الأعمدة:' : 'Show / Hide Columns:'}
          </div>
          <div className="py-1">
            {columns.map((col) => {
              const isVisible = visibleCols[col.key] !== false; // default true
              return (
                <button
                  key={col.key}
                  type="button"
                  onClick={() => onChange(col.key)}
                  className="w-full text-right px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition duration-100 flex items-center justify-between gap-2.5 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
                      isVisible 
                        ? 'bg-[#1D9E75] border-[#1D9E75] text-white' 
                        : 'border-slate-300 hover:border-slate-400 bg-white'
                    }`}>
                      {isVisible && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                    <span>{col.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="pt-1.5 px-3 text-center">
            <button
              type="button"
              onClick={() => {
                // Reset to show all
                columns.forEach(col => {
                  if (!visibleCols[col.key]) {
                    onChange(col.key);
                  }
                });
              }}
              className="text-[10px] font-bold text-[#1D9E75] hover:underline"
            >
              {lang === 'ar' ? 'إظهار الكل' : 'Show All'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
