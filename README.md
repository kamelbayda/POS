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
- `src/App.tsx`: واجهة الكاشير ونقطة البيع الرئيسية ولوحة التحكم وإدارة الفواتير والعملات والموظفين.
- `src/components/`:
  - `WarehouseTab.tsx`: إدارة المستودع والجرد وحركات المخزون.
  - `PurchasesTab.tsx`: إدارة فواتير الشراء والموردين وتكلفة البضائع.
  - `FirebaseSyncTab.tsx`: المزامنة السحابية وقواعد البيانات.
  - `DatabaseExtensions.tsx`: أدوات قاعدة البيانات والنسخ الاحتياطي.
  - `ColumnSelector.tsx`: تخصيص أعمدة الجداول.
- `server.ts`: مخدم Express وواجهات API المحلية والمصادقة.
- `main.js` & `preload.js`: ملفات إعداد نافذة Electron لسطح المكتب.
- `package.json`: قائمة الاعتماديات وأوامر التشغيل والبناء.
- `firebase-applet-config.json` & `firestore.rules`: إعدادات وتصاريح Firebase Firestore.

---

## 🔐 حساب الإدارة الافتراضي (Default Admin)
- في حال طُلب منك كلمة سر المدير لإلغاء المنتجات أو تصفير النظام، يمكنك ضبطها أو استخدام كلمة المرور المعينة من إعدادات النظام داخل شاشة الإعدادات.
