import { Archive, ArrowLeftRight, Barcode, ClipboardList, Cloud, FileText, Layers, Menu, Settings, ShoppingBag, ShoppingCart, Tag, TrendingUp, User, Users } from 'lucide-react';
import { CartItem } from '../types';
import React from 'react';


// Sidebar navigation entries (id is used by tests and deep links)
const menuItems = [
  { id: 'btn-nav-pos', tab: 'pos', labelAr: 'شاشة البيع المباشر', labelEn: 'Direct POS Screen', icon: ShoppingCart },
  { id: 'btn-nav-inventory', tab: 'inventory', labelAr: 'إدارة المخزن والموردين', labelEn: 'Inventory & Stock', icon: Layers },
  { id: 'btn-nav-customers', tab: 'customers', labelAr: 'حسابات الزبائن والديون', labelEn: 'Customers & Debts', icon: Users },
  { id: 'btn-nav-returns', tab: 'returns_waste', labelAr: 'المرتجعات والتالف', labelEn: 'Returns & Waste', icon: ArrowLeftRight },
  { id: 'btn-nav-purchases', tab: 'purchases', labelAr: 'فواتير المشتريات', labelEn: 'Purchase Invoices', icon: ShoppingBag },
  { id: 'btn-nav-warehouse', tab: 'warehouse', labelAr: 'التحويل بين المستودعات', labelEn: 'Warehouse Transfers', icon: Archive },
  { id: 'btn-nav-stock-count', tab: 'stock_count', labelAr: 'جرد المخزون والتدقيق', labelEn: 'Stock Count & Audit', icon: ClipboardList },
  { id: 'btn-nav-reports', tab: 'reports', labelAr: 'التقارير والأرباح', labelEn: 'Reports & Diagnostics', icon: TrendingUp },
  { id: 'btn-nav-invoices', tab: 'invoices', labelAr: 'سجل فواتير المبيعات', labelEn: 'Sales Invoices', icon: FileText },
  { id: 'btn-nav-promotions', tab: 'promotions', labelAr: 'العروض الترويجية والخصم', labelEn: 'Promotions & Discounts', icon: Tag },
  { id: 'btn-nav-users', tab: 'users', labelAr: 'المستخدمين والصلاحيات', labelEn: 'Users & Permissions', icon: User },
  { id: 'btn-nav-firebase', tab: 'firebase_sync', labelAr: 'مزامنة السحاب', labelEn: 'Cloud Synchronization', icon: Cloud },
  { id: 'btn-nav-price-labels', tab: 'price_labels', labelAr: 'بطاقات وملصقات الأسعار', labelEn: 'Price Labels Designer', icon: Barcode },
  { id: 'btn-nav-settings', tab: 'settings', labelAr: 'إعدادات النظام المتكاملة', labelEn: 'System Settings', icon: Settings },
];

interface SidebarProps {
  lang: "ar" | "en";
  activeTab: string;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
  cart: CartItem[];
  posLayoutMode: "modern" | "terminal";
  sidebarCollapsed: boolean;
  setSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
}

export function Sidebar({
  lang,
  activeTab,
  setActiveTab,
  cart,
  posLayoutMode,
  sidebarCollapsed,
  setSidebarCollapsed,
}: SidebarProps) {
  return (
    <aside className={`w-full ${sidebarCollapsed ? 'md:w-20' : 'md:w-64'} shrink-0 flex flex-col gap-2 h-full overflow-y-auto pr-1 transition-all duration-300 ${activeTab === 'pos' && posLayoutMode === 'terminal' ? 'hidden' : ''}`} id="sidebar-navigation">
      <div className={`bg-white ${sidebarCollapsed ? 'p-2' : 'p-4'} rounded-2xl shadow-xs border border-slate-200 transition-all duration-300`}>
        <div className={`flex items-center justify-between mb-3 px-2 text-right uppercase tracking-wider ${sidebarCollapsed ? 'flex-col gap-2' : ''}`}>
          {!sidebarCollapsed ? (
            <div className="text-xs font-bold text-slate-400">
              {lang === 'ar' ? 'لوحة التحكم والتشغيل' : 'Control & Operation Panel'}
            </div>
          ) : null}
          <button 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition cursor-pointer shrink-0"
            title={sidebarCollapsed ? (lang === 'ar' ? 'توسيع القائمة' : 'Expand Sidebar') : (lang === 'ar' ? 'تصغير القائمة' : 'Collapse Sidebar')}
          >
            <Menu className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <nav className="space-y-1 flex flex-col" aria-label="Sidebar Navigation">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeTab === item.tab;
            const label = lang === 'ar' ? item.labelAr : item.labelEn;
            const isPos = item.tab === 'pos';
            const totalQty = isPos ? cart.reduce((sum, i) => sum + i.quantity, 0) : 0;

            return (
              <button 
                key={item.tab}
                id={item.id}
                onClick={() => setActiveTab(item.tab)}
                title={label}
                className={`w-full relative rounded-xl transition-all duration-150 flex items-center font-bold text-right ${
                  sidebarCollapsed 
                    ? 'justify-center p-3' 
                    : 'px-4 py-3 justify-between'
                } ${
                  isActive 
                    ? 'bg-[#1D9E75] text-white shadow-md shadow-emerald-700/10' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className={`flex items-center gap-2.5 ${sidebarCollapsed ? 'justify-center w-full' : ''}`}>
                  <IconComponent className="w-5 h-5 shrink-0" />
                  {!sidebarCollapsed && <span className="text-xs leading-none">{label}</span>}
                </div>

                {isPos && totalQty > 0 && (
                  sidebarCollapsed ? (
                    <span className="absolute top-1 right-1 bg-red-500 text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full font-mono font-bold">
                      {totalQty}
                    </span>
                  ) : (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${isActive ? 'bg-white text-emerald-800' : 'bg-red-500 text-white'}`}>
                      {totalQty}
                    </span>
                  )
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
