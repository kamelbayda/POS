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
- `src/App.tsx`: بيربط الـ hooks بالشاشات والنوافذ، وبيحدّد شو بينعرض (الدخول، القفل، أو النظام).
- `src/features/`: كل تاب بمجلد لحاله:
  - `inventory/` إدارة المخزن والأصناف · `stock-count/` جرد المخزون والتسوية
  - `purchases/` فواتير المشتريات والموردين · `warehouse/` التحويل بين المستودعات
  - `customers/` الزبائن والديون · `returns-waste/` المرتجعات والتالف
  - `reports/` التقارير والأرباح والمصاريف · `invoices/` سجل فواتير المبيعات
  - `promotions/` العروض والخصومات · `price-labels/` ملصقات الأسعار
  - `users/` المستخدمين والصلاحيات · `settings/` الإعدادات والطابعات والتفعيل
  - `firebase-sync/` المزامنة السحابية
- `src/hooks/`: منطق مشترك بعيد عن الواجهة. `useStoreData` بيحمّل الداتا ويحفظها، و`useStoreActions` فيه عمليات المنتجات والعروض والمصاريف، و`useAccounts` للدخول والقفل وكلمات السر، و`useLicense` للتفعيل، و`usePrintSpooler` و`usePrinterHardware` للطباعة ودرج الكاش، و`useDataMaintenance` لحفظ الإعدادات والمسح، و`useUiPreferences` للثيم والأحجام، و`useResizableColumns` لأعمدة الجداول. وبـ `src/features/` في كمان `usePosRegister` (السلة والدفع) و`useExcelImport` و`useInvoiceActions`.
- `src/lib/`: `storage` (التخزين المحلي)، `date` (تاريخ اليوم بالتوقيت المحلي)، `print`، `barcode`.
- `src/components/`: مكونات صغيرة مشتركة (`ColumnSelector`، `LockScreenClock`).
- `src/types.ts`: أنواع البيانات · `src/mockData.ts`: البيانات التجريبية الافتراضية.
- `server.ts`: مخدم Express (استعادة كلمة المرور + تشغيل Vite/الملفات المبنية).
- `main.js` & `preload.js`: ملفات إعداد نافذة Electron لسطح المكتب.
- `firebase-applet-config.json` & `firestore.rules`: إعدادات وتصاريح Firebase Firestore.

---

## 🔑 التفعيل والترخيص (Licensing)
- **سيرفر التفعيل** هو Cloudflare Worker مجاني بـ `super-app-backend/worker`، وخطوات نشره بالـ README تبعه.
- **صفحة الإدارة `/admin` على السيرفر** بتشتغل من الموبايل والـ iPad. منها بتعمل المفاتيح للزباين وبتلغيها وبتنقلها لجهاز تاني.
- **إعدادات السيرفر:** رابط السيرفر ومفتاح التحقق العام محطوطين بـ `.env.production` (معلومات عامة)، فالـ build بيطلع مربوط بالسيرفر لحالو. إذا تغيّر السيرفر، خود القيم الجديدة من زر "نسخ إعدادات البرنامج (.env)" بصفحة `/admin` وحطها بهالملف.
- **الرخصة:**
  - موقّعة رقمياً ومربوطة بالجهاز، وبتشتغل بلا إنترنت.
  - لما يكون في إنترنت البرنامج بيتأكد من السيرفر، فإذا لغيت مفتاح بيوقف.
- **الأجهزة المفعّلة بالنظام القديم:** بتاخد فترة سماح 30 يوم لتدخّل كود جديد.

## ☁️ المزامنة السحابية (Firebase)
- كل محل بيسجّل دخول بحساب Firebase حقيقي (إيميل وكلمة سر، أو Google)، وداتاه بتنحفظ بمساحة خاصة فيه (`shops/{uid}/...`).
- القواعد بـ `firestore.rules` بتسمح لكل حساب يقرا ويكتب بس بمساحته. كل شي تاني مسكّر.
- **بعد أي تعديل على القواعد لازم تنشرها:**
  ```bash
  npx firebase login
  npx firebase deploy --only firestore:rules
  ```
- **بـ Firebase Console → Authentication → Sign-in method:** فعّل **Email/Password**، و **Google** إذا بدّك ياه.
- **التجربة محلياً بلا ما تلمس المشروع الحقيقي:**
  - `npm run emulators` مع `VITE_FIREBASE_EMULATOR=true` بـ `.env`.
  - تجارب القواعد: `npm run test:rules` (بدها Java 11+).

## 🔐 الحسابات وكلمات المرور
- أول دخول: `admin` / `admin123` (مدير) و `kaseer` / `1234` (كاشير). بعد التفعيل البرنامج بيطلب تغييرهن.
- كلمات المرور بتنحفظ مشفّرة (PBKDF2)، وما في كلمة سر رئيسية.
- أي حساب جديد (متل المحاسب) لازم المدير يعطيه كلمة سر من شاشة المستخدمين والصلاحيات.
