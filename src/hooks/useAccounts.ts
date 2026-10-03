import React, { useState, useRef, useEffect } from 'react';
import * as storage from '../lib/storage';
import { User } from '../types';
import { hashPassword, verifyPassword, needsRehash } from '../lib/password';
import { PASSCODES_CHANGED_EVENT } from '../lib/cloudSync';

export interface UseAccountsDeps {
  lang: "ar" | "en";
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  currentUser: User;
  setCurrentUser: React.Dispatch<React.SetStateAction<User>>;
  loginUsername: string;
  loginPassword: string;
  setLoginError: React.Dispatch<React.SetStateAction<string>>;
  showToast: (type: "success" | "error" | "warning", message: string) => void;
}

export function useAccounts({
  lang,
  users,
  setUsers,
  currentUser,
  setCurrentUser,
  loginUsername,
  loginPassword,
  setLoginError,
  showToast,
}: UseAccountsDeps) {
  // --- SCREEN LOCK STATES ---
  const [isScreenLocked, setIsScreenLocked] = useState<boolean>(() => {
    return storage.getItem('pos_screen_locked') === 'true';
  });

  const [lockPasscode, setLockPasscode] = useState<string>('');

  const [lockError, setLockError] = useState<string>('');

  const [isLockShaking, setIsLockShaking] = useState<boolean>(false);

  const [autoLockMinutes, setAutoLockMinutes] = useState<number>(() => {
    const saved = storage.getItem('pos_auto_lock_minutes');
    return saved ? parseInt(saved) : 5; // default is 5 mins, 0 means disabled
  });

  // Setup wizard states for custom admin/cashier customization after purchase
  const [adminPasscode, setAdminPasscode] = useState<string>(() => {
    return storage.getItem('pos_admin_passcode') || 'admin123';
  });

  const [cashierPasscode, setCashierPasscode] = useState<string>(() => {
    return storage.getItem('pos_cashier_passcode') || '1234';
  });

  // Passwords changed on another device arrive through cloud sync
  useEffect(() => {
    const reload = () => {
      setAdminPasscode(storage.getItem('pos_admin_passcode') || 'admin123');
      setCashierPasscode(storage.getItem('pos_cashier_passcode') || '1234');
    };
    window.addEventListener(PASSCODES_CHANGED_EVENT, reload);
    return () => window.removeEventListener(PASSCODES_CHANGED_EVENT, reload);
  }, []);

  const [adminRealName, setAdminRealName] = useState<string>(() => {
    return storage.getItem('pos_admin_real_name') || 'المدير المسؤول';
  });

  const [cashierRealName, setCashierRealName] = useState<string>(() => {
    return storage.getItem('pos_cashier_real_name') || 'كاشير الورديات';
  });

  // Open the owner setup wizard on start if a licence was activated but the wizard was never finished
  const [showSetupWizard, setShowSetupWizard] = useState<boolean>(() =>
    !!storage.getItem('pos_license_token') && storage.getItem('pos_setup_wizard_completed') !== 'true'
  );

  // --- ADMIN PASSWORD VERIFICATION MODAL STATES ---
  const [adminVerificationAction, setAdminVerificationAction] = useState<(() => void) | null>(null);

  const [adminVerificationOpen, setAdminVerificationOpen] = useState<boolean>(false);

  const [adminVerificationPasswordInput, setAdminVerificationPasswordInput] = useState<string>('');

  const [adminVerificationError, setAdminVerificationError] = useState<string>('');

  const [adminVerificationTitle, setAdminVerificationTitle] = useState<string>('');

  const executeWithAdminAuth = (title: string, action: () => void) => {
    setAdminVerificationTitle(title);
    setAdminVerificationAction(() => action);
    setAdminVerificationPasswordInput('');
    setAdminVerificationError('');
    setAdminVerificationOpen(true);
  };

  const saveWizardData = async (adminName: string, adminPass: string, cashierName: string, cashierPass: string) => {
    storage.setItem('pos_admin_real_name', adminName.trim());
    storage.setItem('pos_cashier_real_name', cashierName.trim());
    setAdminRealName(adminName.trim());
    setCashierRealName(cashierName.trim());
    await setAccountPassword('admin', adminPass.trim());
    await setAccountPassword('kaseer', cashierPass.trim());

    // Update initial/current users local list
    const updatedUsers = users.map(u => {
      if (u.username === 'admin') {
        return { ...u, name: adminName.trim() };
      }
      if (u.username === 'kaseer') {
        return { ...u, name: cashierName.trim() };
      }
      return u;
    });
    setUsers(updatedUsers);
    storage.setJSON('pos_users', updatedUsers);
    storage.setItem('pos_setup_wizard_completed', 'true');
    setShowSetupWizard(false);

    // Sync active session if logged in
    if (currentUser) {
      if (currentUser.username === 'admin') {
        setCurrentUser(prev => prev ? { ...prev, name: adminName.trim() } : null);
      } else if (currentUser.username === 'kaseer') {
        setCurrentUser(prev => prev ? { ...prev, name: cashierName.trim() } : null);
      }
    }

    showToast('success', lang === 'ar' ? '🎉 تم حفظ وتعيين بيانات المدير والكاشير بنجاح!' : '🎉 Admin & cashier details saved successfully!');
  };

  const lastActivityRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!currentUser || isScreenLocked || autoLockMinutes <= 0) return;

    const handleActivity = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('mousedown', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    window.addEventListener('scroll', handleActivity);

    const interval = setInterval(() => {
      const inactiveMs = Date.now() - lastActivityRef.current;
      if (inactiveMs >= autoLockMinutes * 60 * 1000) {
        setIsScreenLocked(true);
        storage.setItem('pos_screen_locked', 'true');
        setLockPasscode('');
        setLockError('');
        showToast('warning', lang === 'ar' ? '🔒 تم قفل الشاشة تلقائياً بسبب الخمول' : '🔒 Screen locked automatically due to inactivity');
      }
    }, 5000); // Check every 5 seconds

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('mousedown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      clearInterval(interval);
    };
  }, [currentUser, isScreenLocked, autoLockMinutes, lang]);

  // --- ACCOUNT PASSWORDS ---
  // admin / kaseer keep their password in dedicated keys (set by the setup wizard); other accounts on the user record
  const getStoredPassword = (user: User) =>
    user.username === 'admin' ? adminPasscode : user.username === 'kaseer' ? cashierPasscode : user.password;

  const setAccountPassword = async (username: string, plain: string) => {
    const hashed = await hashPassword(plain);
    if (username === 'admin') {
      storage.setItem('pos_admin_passcode', hashed);
      setAdminPasscode(hashed);
    } else if (username === 'kaseer') {
      storage.setItem('pos_cashier_passcode', hashed);
      setCashierPasscode(hashed);
    }
    // Other accounts keep the hash on their user record; for admin/kaseer drop any old copy there
    const isBuiltIn = username === 'admin' || username === 'kaseer';
    setUsers(prev => {
      const updated = prev.map(u => (u.username !== username ? u : { ...u, password: isBuiltIn ? undefined : hashed }));
      storage.setJSON('pos_users', updated);
      return updated;
    });
  };

  /** Checks a password and upgrades a legacy plaintext one to a hash on success. */
  const checkUserPassword = async (user: User, input: string) => {
    const stored = getStoredPassword(user);
    const ok = await verifyPassword(input, stored);
    if (ok && needsRehash(stored)) await setAccountPassword(user.username, input);
    return ok;
  };

  const handleUnlock = async () => {
    setLockError('');
    if (!currentUser) return;

    // Each account unlocks with its own password
    const isCorrect = await checkUserPassword(currentUser, lockPasscode);

    if (isCorrect) {
      setIsScreenLocked(false);
      storage.setItem('pos_screen_locked', 'false');
      setLockPasscode('');
      showToast('success', lang === 'ar' ? '🔓 أهلاً بك من جديد، تم إلغاء قفل الشاشة' : '🔓 Welcome back, screen unlocked');
    } else {
      setIsLockShaking(true);
      setLockError(lang === 'ar' ? 'رمز المرور غير صحيح!' : 'Incorrect passcode!');
      setTimeout(() => setIsLockShaking(false), 1000); // 1s match for visual shake animation
    }
  };

  // Handle keys typed while the screen is locked
  useEffect(() => {
    if (!isScreenLocked || !currentUser) return;

    const handleWindowKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleUnlock();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        setLockPasscode(prev => prev.slice(0, -1));
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // any printable character, so passwords with symbols or Arabic letters can unlock
        e.preventDefault();
        setLockPasscode(prev => prev + e.key);
      }
    };

    window.addEventListener('keydown', handleWindowKeyDown);
    return () => window.removeEventListener('keydown', handleWindowKeyDown);
  }, [isScreenLocked, currentUser, lockPasscode, lang]);

  // --- LOGIN HANDLER ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const id = loginUsername.trim().toLowerCase();
    const matched = users.find(u => u.username === id || (!!u.email && u.email === id));
    if (!matched) {
      setLoginError('لا يوجد حساب بهذا الإيميل أو اسم المستخدم!');
      return;
    }

    if (!getStoredPassword(matched)) {
      setLoginError('لم يتم تعيين كلمة مرور لهذا الحساب بعد. اطلب من المدير تعيينها من شاشة المستخدمين والصلاحيات.');
      return;
    }
    const isValidPass = await checkUserPassword(matched, loginPassword);

    if (isValidPass) {
      setCurrentUser(matched);
      showToast('success', `مرحباً بك مجدداً د. ${matched.name}! تم الدخول بنجاح.`);
    } else {
      setLoginError('كلمة المرور غير صحيحة!');
    }
  };

  return {
    isScreenLocked,
    setIsScreenLocked,
    lockPasscode,
    setLockPasscode,
    lockError,
    setLockError,
    isLockShaking,
    adminPasscode,
    adminRealName,
    setAdminRealName,
    cashierRealName,
    setCashierRealName,
    showSetupWizard,
    setShowSetupWizard,
    adminVerificationAction,
    adminVerificationOpen,
    setAdminVerificationOpen,
    adminVerificationPasswordInput,
    setAdminVerificationPasswordInput,
    adminVerificationError,
    setAdminVerificationError,
    adminVerificationTitle,
    executeWithAdminAuth,
    saveWizardData,
    setAccountPassword,
    handleUnlock,
    handleLogin,
  };
}
