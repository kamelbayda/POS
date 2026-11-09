/**
 * "What's new" notes shown to the shop after an update. Newest first; add an entry with a new id
 * for every release worth telling the shop about. The app shows the entries the user has not seen
 * once, after the new version starts (never on a first install), and the footer reopens them.
 */
export interface WhatsNewEntry {
  id: string; // also the order: yyyy-mm-dd plus a letter when there are several on one day
  date: string;
  ar: string[];
  en: string[];
}

export const WHATS_NEW: WhatsNewEntry[] = [
  {
    id: '2026-11-09a',
    date: '2026-11-09',
    ar: [
      'شاشة البيع بحلّة جديدة: المجموع يظهر كبيراً بالدولار والليرة مثل شاشة الصندوق، والفاتورة مرتّبة كإيصال، وأزرار الكمية وإلغاء الصنف تظهر عند اختيار سطر.',
    ],
    en: [
      'A new look for the sales screen: a large register display with the total in $ and L.L, a receipt-style bill, and quantity and void buttons that appear when you pick a line.',
    ],
  },
  {
    id: '2026-11-08a',
    date: '2026-11-08',
    ar: [
      'واجهة أنظف: أُزيلت الرموز التعبيرية الملوّنة من الأزرار والعناوين والرسائل ومربّعات الأقسام في كل البرنامج.',
    ],
    en: [
      'A cleaner look: the coloured emoji are gone from buttons, titles, messages and category tiles across the program.',
    ],
  },
  {
    id: '2026-11-07d',
    date: '2026-11-07',
    ar: [
      'إصلاح: قارئ الباركود يعمل الآن على شاشة اللمس أيضاً، فيُضاف الصنف إلى السلة مباشرة عند المسح، سواء كان باركود الصنف أو رقم IMEI للهاتف.',
      'مسح الباركود داخل خانة البحث ثم Enter يضيف الصنف إلى السلة، ويُتعرَّف على الباركود حتى لو اختلف بصفر في أوله أو بمسافة.',
    ],
    en: [
      'Fix: the barcode scanner now works on the touch screen too; a scanned product barcode or phone IMEI goes straight into the cart.',
      'Scanning into the search box (or Enter) adds the item, and barcodes match even with a leading zero or a space.',
    ],
  },
  {
    id: '2026-11-07c',
    date: '2026-11-07',
    ar: [
      'محلات الهواتف: أُلغي تاريخ الصلاحية من فواتير المشتريات والمخزن والتقارير والإعدادات، ولا تظهر تنبيهات انتهاء الصلاحية عند البيع.',
    ],
    en: [
      'Phone shops: no more expiry dates in purchases, inventory, reports and settings, and no expiry warnings at the till.',
    ],
  },
  {
    id: '2026-11-07b',
    date: '2026-11-07',
    ar: [
      'تعديل فواتير المشتريات: من سجل الفواتير افتح الفاتورة واضغط "تعديل الفاتورة". عند الحفظ يُصحَّح المخزون (المحل أو المستودع) والأسعار والمجموع تلقائياً.',
    ],
    en: [
      'Edit purchase invoices: open one in the ledger and tap "Edit invoice". Saving corrects the stock (shop or warehouse), the prices and the total.',
    ],
  },
  {
    id: '2026-11-07a',
    date: '2026-11-07',
    ar: [
      'إصلاح: الأصناف المضافة من فاتورة المشتريات أو من ملف Excel أصبحت تظهر في فئتها على شاشة البيع.',
      'الأصناف التي حُذفت فئتها تظهر الآن في قسم "بدون قسم"، فلا يختفي أي صنف.',
    ],
    en: [
      'Fix: products added from a purchase invoice or an Excel file now show in their category at the till.',
      'Products whose category was deleted now show under "No category", so no product is hidden.',
    ],
  },
  {
    id: '2026-11-05a',
    date: '2026-11-05',
    ar: [
      'شاشة القفل: اختر طريقة الفتح، رمز PIN بأزرار الأرقام أو كلمة المرور بلوحة المفاتيح. البرنامج يتذكّر اختيار كل مستخدم.',
      'عند نزول تحديث جديد تظهر رسالة تطلب إغلاق البرنامج وإعادة فتحه، مع زر "تحديث الآن".',
      'هذه النافذة: ترى فيها ما الجديد بعد كل تحديث، وتفتحها متى شئت من أسفل الصفحة.',
    ],
    en: [
      'Lock screen: choose how to unlock, a PIN on the keypad or a password on the keyboard. Each user\'s choice is remembered.',
      'When an update is ready, a message asks to close and reopen the app, with an "Update now" button.',
      'This window: see what is new after every update, and open it any time from the bottom of the page.',
    ],
  },
  {
    id: '2026-11-04a',
    date: '2026-11-04',
    ar: [
      'كلمات المرور التي فيها أحرف تُكتب الآن على الآيباد في شاشة القفل.',
      'البرنامج المفتوح يبحث عن التحديثات وحده، دون مقاطعة البيع.',
    ],
    en: [
      'Passwords with letters can now be typed on a tablet at the lock screen.',
      'An open app looks for updates by itself, without interrupting a sale.',
    ],
  },
  {
    id: '2026-10-27a',
    date: '2026-10-27',
    ar: [
      'فواتير المشتريات: خانة "الكلفة بعد الضريبة" بجانب الـ TVA. إذا أعطاك المورّد السعر شاملاً الضريبة، اكتبه فيها ويُحسب السعر قبل الضريبة وحده.',
      'سطر "حساب الكلفة" يشرح خطوة بخطوة كيف وصلنا إلى كلفة الحبّة: السعر، الحسم، الضريبة، ثم الحبّات المجانية.',
    ],
    en: [
      'Purchase invoices: a "cost incl. VAT" field next to VAT. If the supplier quotes VAT included, type it there and the price before VAT is worked out.',
      'A "cost" line explains step by step how the unit cost is reached: price, discount, VAT, then the free units.',
    ],
  },
];

export const LATEST_WHATS_NEW = WHATS_NEW[0]?.id ?? '';
const SEEN_KEY = 'beecash_whats_new_seen';

// Read when this module loads, before the app starts and seeds its default data: did this
// browser already hold a shop? (On a first install there is nothing new to announce.)
let hadShopBeforeStart = false;
try { hadShopBeforeStart = localStorage.getItem('pos_settings') !== null || localStorage.getItem('beecash_shops') !== null; } catch {}

/** Entries the user has not seen yet; null on a first install (nothing to announce). */
export function unseenWhatsNew(): WhatsNewEntry[] | null {
  let seen: string | null = null;
  try { seen = localStorage.getItem(SEEN_KEY); } catch { return []; }
  if (seen === null) {
    markWhatsNewSeen();
    // a device that already used the program still hears about this release
    return hadShopBeforeStart ? WHATS_NEW.slice(0, 1) : null;
  }
  return WHATS_NEW.filter((e) => e.id > seen!);
}

export function markWhatsNewSeen() {
  try { localStorage.setItem(SEEN_KEY, LATEST_WHATS_NEW); } catch {}
}

export const OPEN_WHATS_NEW_EVENT = 'beecash-open-whats-new';
export const openWhatsNew = () => window.dispatchEvent(new Event(OPEN_WHATS_NEW_EVENT));
