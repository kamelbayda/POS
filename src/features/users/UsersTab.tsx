import React, { useState } from 'react';
import { Users, Edit, Trash2 } from 'lucide-react';
import { User } from '../../types';
import * as storage from '../../lib/storage';
import { hashPassword } from '../../lib/password';

type Role = User['role'];
const PASSWORD_MASK = '••••••••';

interface UsersTabProps {
  users: User[];
  setUsers: (users: User[]) => void;
  currentUser: User;
  setCurrentUser: (user: User) => void;
  lang: 'ar' | 'en';
  showToast: (type: 'success' | 'error' | 'warning', message: string) => void;
  /** Called when one of the built-in accounts (admin / kaseer) is renamed or gets a new password. */
  onDefaultAccountUpdated: (username: 'admin' | 'kaseer', name: string, newPassword: string | null) => void;
}

export function UsersTab({ users, setUsers, currentUser, setCurrentUser, lang, showToast, onDefaultAccountUpdated }: UsersTabProps) {
  const [usersSearchQuery, setUsersSearchQuery] = useState<string>('');
  const [newUserUsername, setNewUserUsername] = useState<string>('');
  const [newUserFullname, setNewUserFullname] = useState<string>('');
  const [newUserPassword, setNewUserPassword] = useState<string>('');
  const [newUserRole, setNewUserRole] = useState<Role>('cashier');
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const saveUsers = (updated: User[]) => {
    setUsers(updated);
    storage.setJSON('pos_users', updated);
  };

  const resetForm = () => {
    setEditingUser(null);
    setNewUserUsername('');
    setNewUserFullname('');
    setNewUserPassword('');
    setNewUserRole('cashier');
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const username = newUserUsername.trim().toLowerCase();
    const name = newUserFullname.trim();
    const newPassword = newUserPassword && newUserPassword !== PASSWORD_MASK ? newUserPassword.trim() : null;

    if (!username || !name) {
      showToast('error', 'الرجاء كتابة تفاصيل حساب الموظف بالكامل.');
      return;
    }
    const hashedPassword = newPassword ? await hashPassword(newPassword) : undefined;

    if (editingUser) {
      const exists = users.some(u => u.username === username && u.id !== editingUser.id);
      if (exists) {
        showToast('error', 'تنبيه: اسم الدخول هذا مسجل بالفعل لموظف آخر!');
        return;
      }

      if (editingUser.username === 'admin' || editingUser.username === 'kaseer') {
        onDefaultAccountUpdated(editingUser.username, name, newPassword);
      }

      const updated = users.map(u => {
        if (u.id !== editingUser.id) return u;
        const updatedUser: User = { ...u, username, name, role: newUserRole };
        if (newPassword) updatedUser.password = hashedPassword;
        return updatedUser;
      });

      saveUsers(updated);
      showToast('success', `تم تعديل حساب وبيانات الموظف [${name}] بنجاح.`);

      if (currentUser.id === editingUser.id) {
        setCurrentUser({ ...currentUser, username, name, role: newUserRole });
      }
      resetForm();
    } else {
      if (!newUserPassword) {
        showToast('error', 'الرجاء كتابة كلمة المرور لتسجيل حساب جديد.');
        return;
      }

      const exists = users.some(u => u.username === username);
      if (exists) {
        showToast('error', 'تنبيه: اسم الدخول هذا مسجل بالفعل لموظف آخر!');
        return;
      }

      const newUser: User = { id: `usr-${Date.now()}`, username, name, role: newUserRole };
      if (newPassword) newUser.password = hashedPassword;

      saveUsers([...users, newUser]);
      showToast('success', `تم تسجيل الموظف الجديد [${name}] بنجاح بالنظام.`);
      resetForm();
    }
  };

  const startEditUser = (user: User) => {
    setEditingUser(user);
    setNewUserUsername(user.username);
    setNewUserFullname(user.name);
    setNewUserPassword(PASSWORD_MASK); // never show the stored password (it is a hash)
    setNewUserRole(user.role);
    document.getElementById('reg-user-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const cancelEditUser = resetForm;

  const deleteUser = (id: string, username: string) => {
    if (username === 'admin') {
      showToast('error', 'محظور: لا يمكن حذف حساب المدير الرئيسي admin للنظام!');
      return;
    }
    if (window.confirm(`هل تريد سحب صلاحية الدخول وحذف الموظف [${username}]؟`)) {
      saveUsers(users.filter(u => u.id !== id));
      showToast('success', 'تم حذف حساب الموظف وصلاحية دخوله.');
      if (editingUser && editingUser.id === id) {
        cancelEditUser();
      }
    }
  };

  return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Register User card */}
          <div id="reg-user-form" className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs h-fit text-right scroll-mt-24">
            <h3 className="font-bold text-slate-800 text-base pb-3 border-b border-slate-100 mb-4 flex items-center gap-2 justify-end">
              <span>{editingUser ? (lang === 'ar' ? 'تعديل بيانات الحساب والمدراء' : 'Edit User Account') : (lang === 'ar' ? 'إدراج مستخدم جديد أو كاشير' : 'Create New User / Cashier')}</span>
              <Users className="w-5 h-5 text-[#1D9E75]" />
            </h3>

            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-slate-600 mb-1 text-xs font-bold text-right font-mono">اسم الدخول الفريد (Username):</label>
                <input 
                  type="text"
                  value={newUserUsername}
                  onChange={e => setNewUserUsername(e.target.value)}
                  disabled={editingUser?.username === 'admin' || editingUser?.username === 'kaseer'}
                  className={`w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm text-right font-mono ${
                    (editingUser?.username === 'admin' || editingUser?.username === 'kaseer') ? 'opacity-65 cursor-not-allowed bg-slate-100' : ''
                  }`}
                  placeholder="مثلاً: ahmad_pos"
                  required
                />
                {(editingUser?.username === 'admin' || editingUser?.username === 'kaseer') && (
                  <span className="text-[9.5px] text-amber-600 font-bold block mt-1">
                    * {lang === 'ar' ? 'لا يمكن تعديل اسم المستخدم للحساب الرئيسي الافتراضي.' : 'Default username cannot be changed.'}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-slate-600 mb-1 text-xs font-bold">{lang === 'ar' ? 'الاسم الكامل العرضي للموظف:' : 'Full Corporate Name:'}</label>
                <input 
                  type="text"
                  value={newUserFullname}
                  onChange={e => setNewUserFullname(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm text-right"
                  placeholder="مثلاً: أحمد فؤاد"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 text-xs font-bold font-mono">
                  {editingUser ? (lang === 'ar' ? 'كلمة المرور الجديدة (اختياري للتعيين):' : 'New Password (Optional):') : (lang === 'ar' ? 'كلمة المرور المسجلة:' : 'Password:')}
                </label>
                <input 
                  type="password"
                  value={newUserPassword}
                  onChange={e => setNewUserPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm text-right font-mono"
                  placeholder="••••••••"
                  required={!editingUser}
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 text-xs font-bold">{lang === 'ar' ? 'صلاحيات النظام:' : 'System Access Role:'}</label>
                <select 
                  value={newUserRole}
                  onChange={e => setNewUserRole(e.target.value as 'admin' | 'cashier' | 'accountant')}
                  disabled={editingUser?.username === 'admin'}
                  className={`w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm text-right cursor-pointer ${
                    editingUser?.username === 'admin' ? 'opacity-65 cursor-not-allowed bg-slate-100' : ''
                  }`}
                >
                  <option value="cashier">{lang === 'ar' ? 'كاشير ورديات مبيعات (cashier)' : 'Cashier Shift Employee'}</option>
                  <option value="accountant">{lang === 'ar' ? 'محاسب عام مالي للمخزن وصلاحيات أوسع (accountant)' : 'General Accountant'}</option>
                  <option value="admin">{lang === 'ar' ? 'مدير النظام المسؤول (admin)' : 'Administrator'}</option>
                </select>
              </div>

              <div className="flex gap-2">
                {editingUser && (
                  <button 
                    type="button"
                    onClick={cancelEditUser}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
                  >
                    {lang === 'ar' ? 'إلغاء التعديل ❌' : 'Cancel ❌'}
                  </button>
                )}
                <button 
                  type="submit"
                  className={`${editingUser ? 'flex-1' : 'w-full'} bg-[#1D9E75] hover:bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs transition cursor-pointer`}
                >
                  {editingUser ? (lang === 'ar' ? 'حفظ التعديلات 💾' : 'Save 💾') : (lang === 'ar' ? 'حفظ وإدراج المستخدم 💾' : 'Save User 💾')}
                </button>
              </div>
            </form>
          </div>

          {/* Users list */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs lg:col-span-2 text-right">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-3 border-b border-slate-100 mb-4">
              <div className="relative w-full sm:w-60">
                <input
                  type="text"
                  placeholder={lang === 'ar' ? 'ابحث باسم الموظف أو اسم الدخول...' : 'Search employees...'}
                  value={usersSearchQuery}
                  onChange={e => setUsersSearchQuery(e.target.value)}
                  className="w-full text-right bg-slate-50 border border-slate-200 py-1.5 px-3 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
                />
              </div>
              <h3 className="font-bold text-slate-800 text-base">
                {lang === 'ar' ? 'الموظفون المستحدَمون للنظام حالياً' : 'Active System Users'}
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(() => {
                const filteredUsers = users.filter(u => {
                  const q = usersSearchQuery.toLowerCase().trim();
                  if (!q) return true;
                  return (
                    u.name.toLowerCase().includes(q) ||
                    u.username.toLowerCase().includes(q)
                  );
                });

                if (filteredUsers.length === 0) {
                  return (
                    <div className="col-span-1 sm:col-span-2 text-center p-8 text-slate-400 font-sans text-xs">
                      {lang === 'ar' ? 'لا يوجد موظفون يطابقون عبارة البحث الحالية.' : 'No users found.'}
                    </div>
                  );
                }

                return filteredUsers.map(u => (
                  <div key={u.id} className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex gap-1.5 align-middle">
                      <button 
                        onClick={() => startEditUser(u)}
                        className="bg-amber-50 p-2 rounded hover:bg-amber-100 text-amber-700 transition cursor-pointer"
                        title="تعديل"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => deleteUser(u.id, u.username)}
                        className="bg-rose-50 p-2 rounded hover:bg-rose-100 text-rose-600 transition cursor-pointer"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="text-right">
                      <span className="font-bold text-slate-855 text-sm block">{u.name}</span>
                      <span className="text-xs text-slate-400 font-mono block">اسم الدخول: @{u.username}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-1 ${
                        u.role === 'admin' ? 'bg-indigo-50 text-indigo-700 border border-indigo-150' : u.role === 'accountant' ? 'bg-emerald-50 text-emerald-700 border border-emerald-150' : 'bg-amber-50 text-amber-700 border border-amber-100'
                      }`}>
                        {u.role === 'admin' ? (lang === 'ar' ? 'مدير عام المسؤول' : 'Admin') : u.role === 'accountant' ? (lang === 'ar' ? 'محاسب عام مالي' : 'Accountant') : (lang === 'ar' ? 'موظف كاشير مبيعات' : 'Cashier')}
                      </span>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>

        </div>
  );
}
