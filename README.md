# نظام مبيعات الكاشير المطور (Advanced POS System)

نظام متكامل لإدارة نقاط البيع والمخازن والمشتريات والفواتير والعملاء، مبني باستخدام React 19 + TypeScript + Vite + Tailwind CSS + Express + Firebase مع دعم Electron لتشغيله كبرنامج سطح مكتب مستقل.

---

## 🚀 متطلبات التشغيل (Prerequisites)
- [Node.js](https://nodejs.org/) (الإصدار 18 أو 20 أو أحدث يفضل LTS).
- مدير الحزم `npm` (يأتي مدمجاً مع Node.js).

---

## 🛠️ خطوات التشغيل لأول مرة (Getting Started)

1. **فك ضغط الملف (Unzip)** في المجلد الذي تريده على جهازك.
2. افتح موجه الأوامر (Terminal / Command Prompt / PowerShell) داخل مجلد المشروع.
3. قم بتثبيت الحزم والمكتبات:
   ```bash
   npm install
   ```
4. لبدء تشغيل البرنامج في بيئة التطوير (Web Server):
   ```bash
   npm run dev
   ```
   سيتم تشغيل البرنامج تلقائياً على الرابط:
   `http://localhost:3000`

---

## 💻 التشغيل كبرنامج سطح مكتب (Electron Desktop App)

- لتشغيل البرنامج كنافذة سطح مكتب أثناء التطوير:
  ```bash
  npm run electron:dev
  ```

- لبناء ملف التثبيت المكتبي لنظام ويندوز (`.exe` installer):
  ```bash
  npm run electron:build
  ```
  ستجد الملف المكتبي النهائي داخل مجلد `dist_electron/`.

---

## 📁 هيكلية المشروع (Project Structure)
- `src/App.tsx`: الغلاف الرئيسي: تسجيل الدخول، القائمة الجانبية، شاشة البيع (POS)، النوافذ المنبثقة، والحالة المشتركة (المنتجات، الفواتير، الإعدادات...).
- `src/features/`: كل تاب بمجلد لحاله:
  - `inventory/` إدارة المخزن والأصناف · `stock-count/` جرد المخزون والتسوية
  - `purchases/` فواتير المشتريات والموردين · `warehouse/` التحويل بين المستودعات
  - `customers/` الزبائن والديون · `returns-waste/` المرتجعات والتالف
  - `reports/` التقارير والأرباح والمصاريف · `invoices/` سجل فواتير المبيعات
  - `promotions/` العروض والخصومات · `price-labels/` ملصقات الأسعار
  - `users/` المستخدمين والصلاحيات · `settings/` الإعدادات والطابعات والتفعيل
  - `firebase-sync/` المزامنة السحابية
- `src/hooks/`: `useResizableColumns` (تغيير عرض أعمدة الجداول)، `usePrinterHardware` (طباعة USB/Serial ودرج الكاش).
- `src/lib/`: `storage` (التخزين المحلي)، `date` (تاريخ اليوم بالتوقيت المحلي)، `print`، `barcode`.
- `src/components/`: مكونات صغيرة مشتركة (`ColumnSelector`، `LockScreenClock`).
- `src/types.ts`: أنواع البيانات · `src/mockData.ts`: البيانات التجريبية الافتراضية.
- `server.ts`: مخدم Express (استعادة كلمة المرور + تشغيل Vite/الملفات المبنية).
- `main.js` & `preload.js`: ملفات إعداد نافذة Electron لسطح المكتب.
- `firebase-applet-config.json` & `firestore.rules`: إعدادات وتصاريح Firebase Firestore.

---

## 🔐 حساب الإدارة الافتراضي (Default Admin)
- في حال طُلب منك كلمة سر المدير لإلغاء المنتجات أو تصفير النظام، يمكنك ضبطها أو استخدام كلمة المرور المعينة من إعدادات النظام داخل شاشة الإعدادات.
