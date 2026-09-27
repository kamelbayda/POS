/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const PYTHON_POS_CODE = `import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import sqlite3
import hashlib
from datetime import datetime, timedelta
import csv
import os

# ==========================================
# 1. CONSTANTS, THEME & FONT SETUP
# ==========================================
FONT_FAMILY = "Tahoma" # Tahoma font requested
COLOR_BG = "#F8FAFC"
COLOR_PRIMARY = "#1D9E75" # Deep Green UI Theme
COLOR_PRIMARY_DARK = "#157A5A"
COLOR_SIDEBAR = "#0F172A"
COLOR_CARD_BG = "#FFFFFF"
COLOR_TEXT = "#1E293B"
COLOR_MUTED = "#64748B"
COLOR_ALERT = "#EF4444"
COLOR_WARNING = "#F59E0B"
COLOR_SUCCESS = "#10B981"

# ==========================================
# 2. DATABASE SYSTEM INITIALIZATION
# ==========================================
DB_FILE = "pos_supermarket.db"

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # 1. Users table (Passwords hashed with SHA-256)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password_hash TEXT,
            name TEXT,
            role TEXT
        )
    ''')
    
    # 2. Categories table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS categories (
            id TEXT PRIMARY KEY,
            name TEXT,
            emoji TEXT
        )
    ''')
    
    # 3. Products table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            barcode TEXT UNIQUE,
            category TEXT,
            price_usd REAL,
            quantity REAL,
            expiry_date TEXT,
            FOREIGN KEY(category) REFERENCES categories(id)
        )
    ''')
    
    # 4. Invoices table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS invoices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            invoice_number TEXT UNIQUE,
            date TEXT,
            time TEXT,
            subtotal_usd REAL,
            discount_usd REAL,
            total_usd REAL,
            total_lbp REAL,
            payment_method TEXT,
            cashier TEXT,
            exchange_rate REAL,
            paid_usd REAL,
            paid_lbp REAL,
            change_usd REAL,
            change_lbp REAL
        )
    ''')
    
    # 5. Invoice items
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS invoice_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            invoice_id INTEGER,
            product_id INTEGER,
            product_name TEXT,
            price_usd REAL,
            quantity REAL,
            total_usd REAL,
            FOREIGN KEY(invoice_id) REFERENCES invoices(id)
        )
    ''')
    
    # 6. Settings table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    ''')
    
    # SEED DEFAULT DATA IF TABLE IS EMPTY
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        admin_pass = hashlib.sha256("admin123".encode()).hexdigest()
        cashier_pass = hashlib.sha256("1234".encode()).hexdigest()
        cursor.execute("INSERT INTO users (username, password_hash, name, role) VALUES (?, ?, ?, ?)",
                       ("admin", admin_pass, "المدير المسؤول", "admin"))
        cursor.execute("INSERT INTO users (username, password_hash, name, role) VALUES (?, ?, ?, ?)",
                       ("kaseer", cashier_pass, "كاشير أحمد", "cashier"))
        
    cursor.execute("SELECT COUNT(*) FROM categories")
    if cursor.fetchone()[0] == 0:
        categories = [
            ("dairy", "ألبان وأجبان", "🥛"),
            ("bakery", "مخبوزات وحلويات", "🍞"),
            ("beverages", "المشروبات والعصائر", "🥤"),
            ("canned", "المعلبات والمونة", "🥫"),
            ("snacks", "تسالي وشيبس", "🍿"),
            ("cleaning", "منظفات ومواد عناية", "🧼")
        ]
        cursor.executemany("INSERT INTO categories VALUES (?, ?, ?)", categories)

    cursor.execute("SELECT COUNT(*) FROM settings")
    if cursor.fetchone()[0] == 0:
        settings = [
            ("shop_name", "سوبرماركت البركة"),
            ("exchange_rate", "90000"),
            ("low_stock_threshold", "10"),
            ("expiry_alert_days", "10"),
            ("receipt_footer", "شكراً لزيارتكم! يرجى مراجعة الفاتورة قبل المغادرة.")
        ]
        cursor.executemany("INSERT INTO settings VALUES (?, ?)", settings)

    cursor.execute("SELECT COUNT(*) FROM products")
    if cursor.fetchone()[0] == 0:
        # Default products matching Seeded React system
        curr_dt = datetime.now()
        p1_exp = (curr_dt + timedelta(days=180)).strftime("%Y-%m-%d") # Safe
        p2_exp = (curr_dt - timedelta(days=3)).strftime("%Y-%m-%d")   # Expired (3 days ago)
        p3_exp = (curr_dt + timedelta(days=4)).strftime("%Y-%m-%d")   # Near Expiry
        p4_exp = (curr_dt + timedelta(days=2)).strftime("%Y-%m-%d")   # Near Expiry bakery
        p5_exp = (curr_dt - timedelta(days=1)).strftime("%Y-%m-%d")   # Expired bakery
        p6_exp = (curr_dt + timedelta(days=360)).strftime("%Y-%m-%d") # Safe Beverages
        p7_exp = (curr_dt + timedelta(days=120)).strftime("%Y-%m-%d") # Safe snacks
        
        products = [
            ("حليب نيدو مجفف 900غ", "1111", "dairy", 14.50, 15, p1_exp),
            ("لبنة بلدية طازجة 1كغ", "2222", "dairy", 4.20, 12, p2_exp),
            ("جبنة قشقوان عكاوي 500غ", "3333", "dairy", 6.80, 8, p3_exp),
            ("ربطة خبز لبناني كبير", "4444", "bakery", 1.00, 45, p4_exp),
            ("كرواسون شوكولاتة طازج", "5555", "bakery", 1.20, 4, p5_exp),
            ("بيبسي عائلي 2.25 لتر", "6666", "beverages", 1.50, 30, p6_exp),
            ("شيبس ديربي ملح وخل كبير", "1010", "snacks", 0.50, 60, p7_exp)
        ]
        cursor.executemany("INSERT INTO products (name, barcode, category, price_usd, quantity, expiry_date) VALUES (?, ?, ?, ?, ?, ?)", products)

    conn.commit()
    conn.close()

# Helper to fetch system settings
def get_setting(key, default_val=""):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT value FROM settings WHERE key=?", (key,))
    res = c.fetchone()
    conn.close()
    return res[0] if res else default_val

def update_setting(key, val):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (key, str(val)))
    conn.commit()
    conn.close()

# ==========================================
# 3. BASE WINDOW & MULTI-PAGE DESKTOP SYSTEM
# ==========================================
class POSApplication(tk.Tk):
    def __init__(self):
        super().__init__()
        init_db()
        
        # Window attributes
        self.title("نظام مبيعات السوبرماركت المطور - Python Tkinter & SQLite")
        self.geometry("1100x700")
        self.minsize(1000, 650)
        
        # RTL Setup - We will handle text alignments
        self.current_user = None # Set upon login
        self.current_user_role = None
        self.exchange_rate = float(get_setting("exchange_rate", "90000"))
        self.shop_name = get_setting("shop_name", "سوبرماركت البركة")
        
        # Configure overall styles
        self.style = ttk.Style()
        self.style.theme_use("clam")
        
        # Tahoma Font Style configurations
        self.style.configure(".", font=(FONT_FAMILY, 10))
        self.style.configure("Treeview.Heading", font=(FONT_FAMILY, 10, "bold"), background="#E2E8F0", foreground=COLOR_TEXT)
        self.style.configure("Treeview", font=(FONT_FAMILY, 10), rowheight=25)
        self.style.configure("Sidebar.TButton", font=(FONT_FAMILY, 10, "bold"), anchor="e", background=COLOR_SIDEBAR, foreground="white", borderwidth=0)
        self.style.map("Sidebar.TButton", background=[("active", COLOR_PRIMARY)], foreground=[("active", "white")])
        
        # Start Login Screen
        self.show_login_screen()

    def show_img_fallback(self):
        # We use purely clean TK widgets to avoid OS system library dependency (PIL)
        pass

    def show_login_screen(self):
        # Clean current children
        for widget in self.winfo_children():
            widget.destroy()
            
        login_frame = tk.Frame(self, bg=COLOR_BG)
        login_frame.pack(expand=True, fill="both")
        
        card = tk.LabelFrame(login_frame, text=" تسجيل الدخول - نظام المبيعات ", font=(FONT_FAMILY, 12, "bold"), fg=COLOR_PRIMARY, bg=COLOR_CARD_BG, padx=40, pady=30, bd=2)
        card.place(relx=0.5, rely=0.5, anchor="center")
        
        # Shop Name header
        tk.Label(card, text=self.shop_name, font=(FONT_FAMILY, 16, "bold"), fg=COLOR_PRIMARY, bg=COLOR_CARD_BG).pack(pady=(0, 20))
        
        # Username
        lbl_user = tk.Label(card, text="اسم المستخدم", font=(FONT_FAMILY, 10, "bold"), bg=COLOR_CARD_BG, fg=COLOR_TEXT)
        lbl_user.pack(anchor="e")
        self.ent_user = ttk.Entry(card, font=(FONT_FAMILY, 11), justify="right", width=25)
        self.ent_user.pack(pady=(5, 15))
        self.ent_user.insert(0, "admin") # default for easy testing
        
        # Password
        lbl_pass = tk.Label(card, text="كلمة المرور", font=(FONT_FAMILY, 10, "bold"), bg=COLOR_CARD_BG, fg=COLOR_TEXT)
        lbl_pass.pack(anchor="e")
        self.ent_pass = ttk.Entry(card, font=(FONT_FAMILY, 11), show="*", justify="right", width=25)
        self.ent_pass.pack(pady=(5, 20))
        self.ent_pass.insert(0, "admin123") # default
        
        # Bind login to Enter
        self.ent_pass.bind("<Return>", lambda e: self.process_login())
        
        # Submit Btn
        btn_login = tk.Button(card, text="دخول للنظام 🔓", font=(FONT_FAMILY, 11, "bold"), bg=COLOR_PRIMARY, fg="white", activebackground=COLOR_PRIMARY_DARK, activeforeground="white", bd=0, padx=20, pady=8, cursor="hand2", command=self.process_login)
        btn_login.pack(fill="x", pady=5)
        
        # Hint info
        lbl_hint = tk.Label(card, text="المدير: admin / admin123\\nالكاشير: kaseer / 1234", font=(FONT_FAMILY, 8), fg=COLOR_MUTED, bg=COLOR_CARD_BG)
        lbl_hint.pack(pady=(15, 0))

    def process_login(self):
        usr = self.ent_user.get().strip()
        pwd = self.ent_pass.get().strip()
        
        if not usr or not pwd:
            messagebox.showerror("خطأ", "يجب ملء كافة الحقول!")
            return
            
        hashed = hashlib.sha256(pwd.encode()).hexdigest()
        
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute("SELECT id, username, name, role FROM users WHERE username=? AND password_hash=?", (usr, hashed))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            self.current_user = row[2] # Name
            self.current_user_role = row[3] # admin / cashier
            self.show_main_app()
        else:
            messagebox.showerror("خطأ في تسجيل الدخول", "اسم المستخدم أو كلمة المرور غير صحيحة!")

    def show_main_app(self):
        for widget in self.winfo_children():
            widget.destroy()
            
        # Re-fetch settings
        self.exchange_rate = float(get_setting("exchange_rate", "90000"))
        self.shop_name = get_setting("shop_name", "سوبرماركت البركة")
        
        # Main layout
        # Sidebar Right, Content Left
        self.sidebar_frame = tk.Frame(self, bg=COLOR_SIDEBAR, width=220)
        self.sidebar_frame.pack(side="right", fill="y")
        self.sidebar_frame.pack_propagate(False)
        
        self.content_frame = tk.Frame(self, bg=COLOR_BG)
        self.content_frame.pack(side="left", fill="both", expand=True)
        
        # Sidebar Content
        # Store metadata
        tk.Label(self.sidebar_frame, text=self.shop_name, font=(FONT_FAMILY, 13, "bold"), fg="white", bg=COLOR_SIDEBAR, wraplength=180, justify="center").pack(pady=(20, 5))
        
        badge_color = COLOR_PRIMARY if self.current_user_role == 'admin' else COLOR_WARNING
        lbl_user_role = tk.Label(self.sidebar_frame, text=f"{self.current_user} ({'مدير' if self.current_user_role == 'admin' else 'كاشير'})", font=(FONT_FAMILY, 9), fg="white", bg=badge_color, padx=6, pady=3, wraplength=180)
        lbl_user_role.pack(pady=(0, 20))
        
        # Sidebar Menu Items
        self.nav_buttons = {}
        menu_items = [
            ("pos", "🧾 شاشة البيع المباشر"),
            ("inventory", "📦 جردة وإدارة المنتجات"),
            ("add_product", "➕ إضافة منتج جديد"),
            ("stock_count", "📋 جردة المطابقة والتسوية"),
            ("reports", "📊 التقارير والإحصائيات"),
            ("invoices", "🧾 فواتير المبيعات السابقة"),
            ("users", "👥 إدارة الموظفين المستخدمين"),
            ("settings", "⚙️ الإعدادات العامة")
        ]
        
        for key, text in menu_items:
            # Check permissions
            if key in ["reports", "users", "settings"] and self.current_user_role != 'admin':
                continue # Block access for cashier
                
            btn = tk.Button(self.sidebar_frame, text=text, font=(FONT_FAMILY, 10, "bold"), bg=COLOR_SIDEBAR, fg="#CBD5E1", bd=0, activebackground=COLOR_PRIMARY, activeforeground="white", anchor="e", padx=15, pady=10, cursor="hand2", command=lambda k=key: self.switch_page(k))
            btn.pack(fill="x", pady=2)
            self.nav_buttons[key] = btn
            
        # Logout bottom button
        tk.Frame(self.sidebar_frame, bg="#334155", height=1).pack(fill="x", side="bottom", pady=10)
        btn_logout = tk.Button(self.sidebar_frame, text="🚪 تسجيل خروج", font=(FONT_FAMILY, 10, "bold"), bg=COLOR_ALERT, fg="white", bd=0, activebackground="#E11D48", activeforeground="white", pady=10, cursor="hand2", command=self.show_login_screen)
        btn_logout.pack(fill="x", side="bottom")
        
        # Load first page: POS Screen
        self.switch_page("pos")

    def switch_page(self, page_key):
        # Deselect all buttons
        for btn in self.nav_buttons.values():
            btn.configure(bg=COLOR_SIDEBAR, fg="#CBD5E1")
            
        # Select active
        if page_key in self.nav_buttons:
            self.nav_buttons[page_key].configure(bg=COLOR_PRIMARY, fg="white")
            
        # Clean content frame
        for widget in self.content_frame.winfo_children():
            widget.destroy()
            
        # Load page UI
        if page_key == "pos":
            self.load_page_pos()
        elif page_key == "inventory":
            self.load_page_inventory()
        elif page_key == "add_product":
            self.load_page_add_product()
        elif page_key == "stock_count":
            self.load_page_stock_count()
        elif page_key == "reports":
            self.load_page_reports()
        elif page_key == "invoices":
            self.load_page_invoices()
        elif page_key == "users":
            self.load_page_users()
        elif page_key == "settings":
            self.load_page_settings()

    # ==========================================
    # PAGE 1: POS - BILLING SCREEN (🧾)
    # ==========================================
    def load_page_pos(self):
        # Cart memory list
        self.cart_items = [] # list of dict: {"id", "name", "barcode", "price_usd", "expiry", "qty_in_cart", "stock_qty"}
        self.discount_val = 0.0
        
        # Outer splits (Right: catalog/search, Left: Cart & totals)
        # Note: Right hand side is Catalog for easy scanning, Left is Cart
        right_panel = tk.Frame(self.content_frame, bg=COLOR_BG)
        right_panel.pack(side="right", fill="both", expand=True, padx=10, pady=10)
        
        left_panel = tk.Frame(self.content_frame, bg="#EFF6F0", width=420)
        left_panel.pack(side="left", fill="both", padx=10, pady=10)
        left_panel.pack_propagate(False)
        
        # ================== RIGHT CATALOG PANEL ==================
        # Barcode & Search Header
        hdr_frame = tk.Frame(right_panel, bg=COLOR_BG)
        hdr_frame.pack(fill="x", pady=(0, 10))
        
        tk.Label(hdr_frame, text="🔎 ابحث بالاسم:", font=(FONT_FAMILY, 10, "bold"), bg=COLOR_BG, fg=COLOR_TEXT).pack(side="right", padx=5)
        self.ent_search_pos = ttk.Entry(hdr_frame, font=(FONT_FAMILY, 11), justify="right")
        self.ent_search_pos.pack(side="right", fill="x", expand=True, padx=5)
        self.ent_search_pos.bind("<KeyRelease>", lambda e: self.filter_pos_items())
        
        tk.Label(hdr_frame, text="📟 الباركود (مسح بالماسح):", font=(FONT_FAMILY, 10, "bold"), bg=COLOR_BG, fg=COLOR_TEXT).pack(side="right", padx=(15, 5))
        self.ent_barcode_pos = ttk.Entry(hdr_frame, font=(FONT_FAMILY, 11), justify="center", width=18)
        self.ent_barcode_pos.pack(side="right", padx=5)
        self.ent_barcode_pos.bind("<Return>", lambda e: self.on_barcode_scanned())
        self.ent_barcode_pos.focus_set()
        
        # Category Filter Bar
        cat_frame = tk.Frame(right_panel, bg=COLOR_BG)
        cat_frame.pack(fill="x", pady=(0, 10))
        
        btn_all = tk.Button(cat_frame, text="كل الفئات🏷️", font=(FONT_FAMILY, 9, "bold"), bg=COLOR_PRIMARY, fg="white", bd=0, padx=8, pady=3, cursor="hand2", command=lambda: self.filter_cat("all"))
        btn_all.pack(side="right", padx=3)
        
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("SELECT id, name, emoji FROM categories")
        categories = c.fetchall()
        conn.close()
        
        for cid, cname, emoji in categories:
            btn_cat = tk.Button(cat_frame, text=f"{emoji} {cname}", font=(FONT_FAMILY, 9), bg=COLOR_CARD_BG, fg=COLOR_TEXT, bd=1, relief="solid", padx=8, pady=3, cursor="hand2", command=lambda x=cid: self.filter_cat(x))
            btn_cat.pack(side="right", padx=3)
            
        # Catalog Canvas Scrollable Widget
        canvas_container = tk.Frame(right_panel, bg=COLOR_CARD_BG, relief="solid", bd=1)
        canvas_container.pack(fill="both", expand=True)
        
        self.pos_canvas = tk.Canvas(canvas_container, bg=COLOR_CARD_BG, highlightthickness=0)
        self.pos_scrollbar = ttk.Scrollbar(canvas_container, orient="vertical", command=self.pos_canvas.yview)
        self.pos_scrollable_frame = tk.Frame(self.pos_canvas, bg=COLOR_CARD_BG)
        
        self.pos_scrollable_frame.bind(
            "<Configure>",
            lambda e: self.pos_canvas.configure(scrollregion=self.pos_canvas.bbox("all"))
        )
        
        self.pos_canvas.create_window((0, 0), window=self.pos_scrollable_frame, anchor="nw")
        self.pos_canvas.configure(yscrollcommand=self.pos_scrollbar.set)
        
        self.pos_canvas.pack(side="left", fill="both", expand=True)
        self.pos_scrollbar.pack(side="right", fill="y")
        
        # Store current list & filters
        self.selected_category = "all"
        self.all_products_cache = []
        self.load_all_products_cache()
        self.render_catalog()
        
        # ================== LEFT CART PANEL ==================
        tk.Label(left_panel, text="🛒 سلة المبيعات والطلب الحالية", font=(FONT_FAMILY, 11, "bold"), bg="#1D9E75", fg="white", pady=8).pack(fill="x")
        
        # Cart Table (Treeview)
        cols = ("total", "qty", "price", "name")
        self.tree_cart = ttk.Treeview(left_panel, columns=cols, show="headings", height=12)
        self.tree_cart.heading("total", text="المجموع ($)")
        self.tree_cart.heading("qty", text="الكمية")
        self.tree_cart.heading("price", text="السعر")
        self.tree_cart.heading("name", text="المنتج")
        
        self.tree_cart.column("total", width=80, anchor="center")
        self.tree_cart.column("qty", width=65, anchor="center")
        self.tree_cart.column("price", width=75, anchor="center")
        self.tree_cart.column("name", width=180, anchor="e")
        
        self.tree_cart.pack(fill="both", expand=True, padx=5, pady=5)
        self.tree_cart.bind("<Double-1>", lambda e: self.remove_item_from_cart())
        
        # Hotkeys Label
        tk.Label(left_panel, text="💡 انقر مرتين مفرطتين على عنصر لحذفه من السلة", font=(FONT_FAMILY, 8), fg=COLOR_MUTED, bg="#EFF6F0").pack()
        
        # Math Summary Frame
        summary_frame = tk.Frame(left_panel, bg="#E8F4EC", padx=10, pady=10, bd=1, relief="solid")
        summary_frame.pack(fill="x", padx=5, pady=5)
        
        # Subtotal
        tk.Label(summary_frame, text="المجموع الفرعي:", font=(FONT_FAMILY, 10), bg="#E8F4EC", fg=COLOR_TEXT).grid(row=0, column=1, sticky="e")
        self.lbl_subtotal_val = tk.Label(summary_frame, text="0.00 $", font=(FONT_FAMILY, 10, "bold"), bg="#E8F4EC", fg=COLOR_TEXT)
        self.lbl_subtotal_val.grid(row=0, column=0, sticky="w", pady=2)
        
        # Discount Input
        tk.Label(summary_frame, text="خصم ($):", font=(FONT_FAMILY, 10), bg="#E8F4EC", fg=COLOR_TEXT).grid(row=1, column=1, sticky="e")
        self.ent_discount = ttk.Entry(summary_frame, font=(FONT_FAMILY, 9), width=8, justify="center")
        self.ent_discount.grid(row=1, column=0, sticky="w", pady=2)
        self.ent_discount.insert(0, "0.0")
        self.ent_discount.bind("<KeyRelease>", lambda e: self.update_cart_totals())
        
        # Total USD & LBP Big Highlight
        tk.Label(summary_frame, text="المطلوب الكلي ($):", font=(FONT_FAMILY, 11, "bold"), bg="#E8F4EC", fg=COLOR_TEXT).grid(row=2, column=1, sticky="e", pady=5)
        self.lbl_total_usd = tk.Label(summary_frame, text="0.00 $", font=(FONT_FAMILY, 14, "bold"), bg="#E8F4EC", fg=COLOR_ALERT)
        self.lbl_total_usd.grid(row=2, column=0, sticky="w")
        
        tk.Label(summary_frame, text="المطلوب بالليرة (L.L):", font=(FONT_FAMILY, 11, "bold"), bg="#E8F4EC", fg=COLOR_TEXT).grid(row=3, column=1, sticky="e", pady=2)
        self.lbl_total_lbp = tk.Label(summary_frame, text="0 ل.ل.", font=(FONT_FAMILY, 12, "bold"), bg="#E8F4EC", fg=COLOR_PRIMARY_DARK)
        self.lbl_total_lbp.grid(row=3, column=0, sticky="w")
        
        # Currency/Paid details
        payment_opt_frame = tk.Frame(left_panel, bg="#EFF6F0", padx=5, pady=5)
        payment_opt_frame.pack(fill="x")
        
        tk.Label(payment_opt_frame, text="طريقة الدفع:", font=(FONT_FAMILY, 9, "bold"), bg="#EFF6F0").pack(side="right")
        self.cmb_payment_mode = ttk.Combobox(payment_opt_frame, values=["كاش (Cash)", "بطاقة (Card)", "تحويل الموبايل"], state="readonly", width=14, font=(FONT_FAMILY, 9))
        self.cmb_payment_mode.set("كاش (Cash)")
        self.cmb_payment_mode.pack(side="right", padx=5)
        
        # Payment details modal-like input in bottom panel
        cash_received_frame = tk.Frame(left_panel, bg="#DDF0E3", padx=5, pady=5, bd=1, relief="ridge")
        cash_received_frame.pack(fill="x", padx=5, pady=5)
        
        tk.Label(cash_received_frame, text="المدفوع دولار ($):", font=(FONT_FAMILY, 9), bg="#DDF0E3").grid(row=0, column=3, sticky="e")
        self.ent_paid_usd = ttk.Entry(cash_received_frame, font=(FONT_FAMILY, 9), width=8, justify="center")
        self.ent_paid_usd.grid(row=0, column=2, padx=4, pady=2)
        self.ent_paid_usd.bind("<KeyRelease>", lambda e: self.calculate_change())
        
        tk.Label(cash_received_frame, text="أو ليرة (L.L):", font=(FONT_FAMILY, 9), bg="#DDF0E3").grid(row=0, column=1, sticky="e")
        self.ent_paid_lbp = ttk.Entry(cash_received_frame, font=(FONT_FAMILY, 9), width=10, justify="center")
        self.ent_paid_lbp.grid(row=0, column=0, padx=4, pady=2)
        self.ent_paid_lbp.bind("<KeyRelease>", lambda e: self.calculate_change())
        
        # Change values
        tk.Label(cash_received_frame, text="الباقي دولار ($):", font=(FONT_FAMILY, 9, "bold"), bg="#DDF0E3", fg=COLOR_TEXT).grid(row=1, column=3, sticky="e")
        self.lbl_change_usd = tk.Label(cash_received_frame, text="0.00 $", font=(FONT_FAMILY, 10, "bold"), bg="#DDF0E3", fg=COLOR_PRIMARY_DARK)
        self.lbl_change_usd.grid(row=1, column=2, pady=4)
        
        tk.Label(cash_received_frame, text="الباقي ليرة (L.L):", font=(FONT_FAMILY, 9, "bold"), bg="#DDF0E3", fg=COLOR_TEXT).grid(row=1, column=1, sticky="e")
        self.lbl_change_lbp = tk.Label(cash_received_frame, text="0 ل.ل.", font=(FONT_FAMILY, 10, "bold"), bg="#DDF0E3", fg=COLOR_PRIMARY_DARK)
        self.lbl_change_lbp.grid(row=1, column=0, pady=4)
        
        # Checkout buttons
        btn_checkout = tk.Button(left_panel, text="💾 حفظ الفاتورة وإتمام البيع (F1)", font=(FONT_FAMILY, 12, "bold"), bg=COLOR_PRIMARY, fg="white", activebackground=COLOR_PRIMARY_DARK, activeforeground="white", bd=0, pady=12, cursor="hand2", command=self.checkout_bill)
        btn_checkout.pack(fill="x", padx=5, pady=5)
        
        btn_clear = tk.Button(left_panel, text="❌ إلغاء السلة بالكامل", font=(FONT_FAMILY, 9), bg="#E2E8F0", fg=COLOR_TEXT, bd=0, pady=5, cursor="hand2", command=self.clear_cart)
        btn_clear.pack(fill="x", padx=5, pady=(0, 5))
        
        # Global Hotkey for Checkout
        self.bind_all("<F1>", lambda e: self.checkout_bill())

    def load_all_products_cache(self):
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("""
            SELECT p.id, p.name, p.barcode, p.category, p.price_usd, p.quantity, p.expiry_date, cat.name, cat.emoji
            FROM products p
            LEFT JOIN categories cat ON p.category = cat.id
        """)
        rows = c.fetchall()
        conn.close()
        
        self.all_products_cache = []
        for r in rows:
            expiry_dt = datetime.strptime(r[6], "%Y-%m-%d")
            is_expired = expiry_dt < datetime.now()
            
            self.all_products_cache.append({
                "id": r[0],
                "name": r[1],
                "barcode": r[2],
                "category": r[3],
                "price_usd": r[4],
                "quantity": r[5],
                "expiry_date": r[6],
                "cat_name": r[7],
                "cat_emoji": r[8],
                "is_expired": is_expired
            })

    def render_catalog(self):
        # Clear previous elements in self.pos_scrollable_frame
        for widget in self.pos_scrollable_frame.winfo_children():
            widget.destroy()
            
        # Get filtered
        search_txt = self.ent_search_pos.get().strip().lower()
        
        col_count = 3
        curr_row = 0
        curr_col = 0
        
        for item in self.all_products_cache:
            # Filter Category
            if self.selected_category != "all" and item["category"] != self.selected_category:
                continue
                
            # Filter text
            if search_txt and (search_txt not in item["name"].lower() and search_txt not in item["barcode"]):
                continue
                
            # Render item card
            card_bd = 2 if item["is_expired"] else 1
            card_relief = "solid"
            card_bg = "#FFF5F5" if item["is_expired"] else COLOR_CARD_BG
            fg_text = COLOR_TEXT
            
            # Setup Card Frame
            f = tk.Frame(self.pos_scrollable_frame, bg=card_bg, relief=card_relief, bd=card_bd, padx=10, pady=10, width=170, height=130)
            f.grid(row=curr_row, column=curr_col, padx=8, pady=8)
            f.grid_propagate(False)
            
            # Click events
            if item["is_expired"]:
                block_lbl = tk.Label(f, text="❌ منتهي الصلاحية", font=(FONT_FAMILY, 9, "bold"), fg=COLOR_ALERT, bg=card_bg)
                block_lbl.pack(pady=2)
                f.configure(cursor="no")
                # Popup trigger on click for expired warning popup
                f.bind("<Button-1>", lambda e, p=item: self._show_expired_popup(p))
                block_lbl.bind("<Button-1>", lambda e, p=item: self._show_expired_popup(p))
            else:
                f.configure(cursor="hand2")
                f.bind("<Button-1>", lambda e, p=item: self.add_to_cart(p))
                
            # Product details labels inside card
            lbl_emoji = tk.Label(f, text=f"{item['cat_emoji'] or '📦'} - {item['barcode']}", font=(FONT_FAMILY, 8), bg=card_bg, fg=COLOR_MUTED)
            lbl_emoji.pack(anchor="e")
            if not item["is_expired"]:
                lbl_emoji.bind("<Button-1>", lambda e, p=item: self.add_to_cart(p))
            
            p_name_lbl = tk.Label(f, text=item["name"], font=(FONT_FAMILY, 9, "bold"), bg=card_bg, fg=fg_text, justify="center", wraplength=140)
            p_name_lbl.pack(fill="x", pady=2)
            if not item["is_expired"]:
                p_name_lbl.bind("<Button-1>", lambda e, p=item: self.add_to_cart(p))
            
            # Price / Expiry
            price_txt = f"{item['price_usd']:.2f} $ ({item['price_usd']*self.exchange_rate:,.0f} ل.ل)"
            lbl_price = tk.Label(f, text=price_txt, font=(FONT_FAMILY, 8, "bold"), bg=card_bg, fg=COLOR_PRIMARY_DARK)
            lbl_price.pack()
            if not item["is_expired"]:
                lbl_price.bind("<Button-1>", lambda e, p=item: self.add_to_cart(p))
            
            lbl_qty_exp = tk.Label(f, text=f"المخزن: {item['quantity']} | ص: {item['expiry_date']}", font=(FONT_FAMILY, 8), bg=card_bg, fg=COLOR_MUTED)
            lbl_qty_exp.pack()
            if not item["is_expired"]:
                lbl_qty_exp.bind("<Button-1>", lambda e, p=item: self.add_to_cart(p))
            
            # Grid increments
            curr_col += 1
            if curr_col >= col_count:
                curr_col = 0
                curr_row += 1

    def _show_expired_popup(self, item):
        # Strict popup warning requested for expired products!
        msg = f"❌ المنتج منتهي الصلاحية!\\n\\nالاسم: {item['name']}\\nالباركود: {item['barcode']}\\nتاريخ الانتهاء: {item['expiry_date']}\\n\\nلا يمكن بيع هذا المنتج! يرجى سحبه فوراً من صالة العرض والمخازن حفاظاً على سلامة الزبائن."
        messagebox.showerror("🚫 تحذير انتهاء الصلاحية!", msg)

    def filter_pos_items(self):
        self.render_catalog()

    def filter_cat(self, cat_id):
        self.selected_category = cat_id
        self.render_catalog()

    def on_barcode_scanned(self):
        barcode = self.ent_barcode_pos.get().strip()
        self.ent_barcode_pos.delete(0, "end")
        
        if not barcode:
            return
            
        # Search in cache
        matched = None
        for item in self.all_products_cache:
            if item["barcode"] == barcode:
                matched = item
                break
                
        if matched:
            if matched["is_expired"]:
                self._show_expired_popup(matched)
            else:
                self.add_to_cart(matched)
        else:
            messagebox.showwarning("غير موجود", "هذا الباركود غير معرّف بالمخزن!")

    def add_to_cart(self, item_cache):
        # Check stock limits
        # Find in current cart
        qty_already_in_cart = 0
        cart_idx = -1
        for i, c in enumerate(self.cart_items):
            if c["id"] == item_cache["id"]:
                qty_already_in_cart = c["qty_in_cart"]
                cart_idx = i
                break
                
        if qty_already_in_cart + 1 > item_cache["quantity"]:
            messagebox.showwarning("المخزون غير كافٍ", f"الكمية المتاحة في المخزن هي {item_cache['quantity']} فقط!")
            return
            
        if cart_idx != -1:
            self.cart_items[cart_idx]["qty_in_cart"] += 1
        else:
            self.cart_items.append({
                "id": item_cache["id"],
                "name": item_cache["name"],
                "barcode": item_cache["barcode"],
                "price_usd": item_cache["price_usd"],
                "qty_in_cart": 1,
                "stock_qty": item_cache["quantity"]
            })
            
        self.update_cart_ui()

    def remove_item_from_cart(self):
        sel = self.tree_cart.selection()
        if not sel:
            return
        # Get index
        idx_in_tree = self.tree_cart.index(sel[0])
        # Decrement qty or delete
        if self.cart_items[idx_in_tree]["qty_in_cart"] > 1:
            self.cart_items[idx_in_tree]["qty_in_cart"] -= 1
        else:
            self.cart_items.pop(idx_in_tree)
            
        self.update_cart_ui()

    def update_cart_ui(self):
        # Clear listbox tree
        for row in self.tree_cart.get_children():
            self.tree_cart.delete(row)
            
        for c in self.cart_items:
            tot = c["price_usd"] * c["qty_in_cart"]
            self.tree_cart.insert("", "end", values=(
                f"{tot:.2f}",
                c["qty_in_cart"],
                f"{c['price_usd']:.2f}",
                c["name"]
            ))
            
        self.update_cart_totals()

    def update_cart_totals(self):
        subtotal = sum(c["price_usd"] * c["qty_in_cart"] for c in self.cart_items)
        
        # Read discount safely
        try:
            self.discount_val = float(self.ent_discount.get().strip())
        except ValueError:
            self.discount_val = 0.0
            
        total_usd = max(0.0, subtotal - self.discount_val)
        total_lbp = total_usd * self.exchange_rate
        
        self.lbl_subtotal_val.configure(text=f"{subtotal:.2f} $")
        self.lbl_total_usd.configure(text=f"{total_usd:.2f} $")
        self.lbl_total_lbp.configure(text=f"{total_lbp:,.0f} L.L.")
        
        self.calculate_change()

    def calculate_change(self):
        # Read total USD
        try:
            subtotal = sum(c["price_usd"] * c["qty_in_cart"] for c in self.cart_items)
            total_usd = max(0.0, subtotal - self.discount_val)
        except:
            total_usd = 0.0
            
        total_lbp = total_usd * self.exchange_rate
        
        # Read paid amounts
        paid_usd = 0.0
        paid_lbp = 0.0
        try:
            p_usd = self.ent_paid_usd.get().strip()
            if p_usd: paid_usd = float(p_usd)
        except ValueError: pass
        
        try:
            p_lbp = self.ent_paid_lbp.get().strip()
            if p_lbp: paid_lbp = float(p_lbp)
        except ValueError: pass
        
        # Compute combined equivalent in USD
        total_paid_in_usd = paid_usd + (paid_lbp / self.exchange_rate)
        
        diff_usd = total_paid_in_usd - total_usd
        if diff_usd > 0:
            diff_lbp = diff_usd * self.exchange_rate
            self.lbl_change_usd.configure(text=f"{diff_usd:.2f} $")
            self.lbl_change_lbp.configure(text=f"{diff_lbp:,.0f} ل.ل.")
        else:
            self.lbl_change_usd.configure(text="0.00 $")
            self.lbl_change_lbp.configure(text="0 ل.ل.")

    def clear_cart(self):
        self.cart_items = []
        self.ent_discount.delete(0, "end")
        self.ent_discount.insert(0, "0.0")
        self.ent_paid_lbp.delete(0, "end")
        self.ent_paid_usd.delete(0, "end")
        self.update_cart_ui()

    def checkout_bill(self):
        if not self.cart_items:
            messagebox.showwarning("سلة فارغة", "لا يوجد منتجات بالسلة لإتمام البيع!")
            return
            
        # Re-calc totals
        subtotal = sum(c["price_usd"] * c["qty_in_cart"] for c in self.cart_items)
        try:
            disc = float(self.ent_discount.get().strip())
        except ValueError:
            disc = 0.0
            
        total_usd = max(0.0, subtotal - disc)
        total_lbp = total_usd * self.exchange_rate
        
        paid_usd = 0.0
        paid_lbp = 0.0
        try:
            if self.ent_paid_usd.get().strip(): paid_usd = float(self.ent_paid_usd.get().strip())
        except: pass
        try:
            if self.ent_paid_lbp.get().strip(): paid_lbp = float(self.ent_paid_lbp.get().strip())
        except: pass
        
        total_paid_equiv = paid_usd + (paid_lbp / self.exchange_rate)
        
        # Calculate change
        change_usd = 0.0
        change_lbp = 0.0
        if total_paid_equiv >= total_usd:
            change_usd = total_paid_equiv - total_usd
            change_lbp = change_usd * self.exchange_rate
            
        pm_mode = self.cmb_payment_mode.get()
        
        # Save to SQLite
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        
        now = datetime.now()
        date_str = now.strftime("%Y-%m-%d")
        time_str = now.strftime("%H:%M")
        
        # Generate Invoice Number
        cursor.execute("SELECT COUNT(*) FROM invoices")
        count_invoices = cursor.fetchone()[0] + 1
        inv_number = f"INV-{now.strftime('%Y%H%M')}-{count_invoices:04d}"
        
        try:
            # 1. Insert invoice
            cursor.execute("""
                INSERT INTO invoices (invoice_number, date, time, subtotal_usd, discount_usd, total_usd, total_lbp, payment_method, cashier, exchange_rate, paid_usd, paid_lbp, change_usd, change_lbp)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (inv_number, date_str, time_str, subtotal, disc, total_usd, total_lbp, pm_mode, self.current_user, self.exchange_rate, paid_usd, paid_lbp, change_usd, change_lbp))
            
            invoice_id = cursor.lastrowid
            
            # 2. Insert items and decrement stock
            for c in self.cart_items:
                c_total = c["price_usd"] * c["qty_in_cart"]
                cursor.execute("""
                    INSERT INTO invoice_items (invoice_id, product_id, product_name, price_usd, quantity, total_usd)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (invoice_id, c["id"], c["name"], c["price_usd"], c["qty_in_cart"], c_total))
                
                # Decrement stock count
                cursor.execute("""
                    UPDATE products
                    SET quantity = MAX(0, quantity - ?)
                    WHERE id=?
                """, (c["qty_in_cart"], c["id"]))
                
            conn.commit()
            
            # Print physical thermal receipt confirmation with text layout
            receipt_txt = self.generate_thermal_receipt_text(inv_number, date_str, time_str, subtotal, disc, total_usd, total_lbp, pm_mode, paid_usd, paid_lbp, change_usd, change_lbp)
            
            # Display Thermal Print Dialogue
            self.show_receipt_popup(receipt_txt)
            
            # Refresh POS
            self.clear_cart()
            self.load_all_products_cache()
            self.render_catalog()
            
        except Exception as ex:
            conn.rollback()
            messagebox.showerror("خطأ قاعدة بيانات", f"فشل حفظ الفاتورة: {ex}")
        finally:
            conn.close()

    def generate_thermal_receipt_text(self, inv_no, date_s, time_s, subt, disc, tot_u, tot_l, pm, p_usd, p_lbp, ch_usd, ch_lbp):
        footer = get_setting("receipt_footer", "شكرا لزيارتكم!")
        stars = "*" * 36
        
        # Build tabular alignment text
        txt = f"\\n        {self.shop_name} \\n"
        txt += f"      {stars}\\n"
        txt += f" فاتورة رقم: {inv_no}\\n"
        txt += f" التاريخ: {date_s}   الوقت: {time_s}\\n"
        txt += f" البائع: {self.current_user}\\n"
        txt += f" وسيلة الدفع: {pm}\\n"
        txt += f" سعر الصرف المعتمد: {self.exchange_rate:,.0f} L.L.\\n"
        txt += f"------------------------------------+\\n"
        txt += f" المنتج                     الكمية  السعر\\n"
        txt += f"------------------------------------+\\n"
        
        for c in self.cart_items:
            # truncate name if too long for thermal columns
            name_trunc = c["name"][:18].ljust(18)
            qty_s = str(c["qty_in_cart"]).rjust(4)
            price_s = f"{c['price_usd']:.2f}$".rjust(7)
            txt += f" {name_trunc}  {qty_s}  {price_s}\\n"
            
        total_p_usd_equiv = p_usd + (p_lbp / self.exchange_rate)
        
        txt += f"------------------------------------+\\n"
        txt += f" المجموع لزبون: {subt:.2f} $\\n"
        txt += f" الخصم: {disc:.2f} $\\n"
        txt += f" الكلي للدفع: {tot_u:.2f} $ ({tot_l:,.0f} ل.ل)\\n"
        txt += f" المدفوع كاش: USD({p_usd:.2f}$) L.L.({p_lbp:,.0f})\\n"
        txt += f" الباقي للزبون: USD({ch_usd:.2f}$) L.L.({ch_lbp:,.0f})\\n"
        txt += f"      {stars}\\n"
        txt += f"     {footer}\\n"
        return txt

    def show_receipt_popup(self, text_content):
        pop = tk.Toplevel(self)
        pop.title("🧾 معاينة فاتورة الطباعة الحرارية")
        pop.geometry("400x520")
        pop.configure(bg="#1E293B")
        pop.grab_set() # Modal focused
        
        tk.Label(pop, text="تم حفظ الفاتورة بنجاح في قاعدة البيانات! 📑", font=(FONT_FAMILY, 10, "bold"), fg="white", bg="#1E293B", pady=10).pack()
        
        tx_box = tk.Text(pop, font=("Courier New", 10), bg="#F8FAFC", fg="black", padx=15, pady=15, wrap="none")
        tx_box.insert("1.0", text_content)
        tx_box.configure(state="disabled")
        tx_box.pack(fill="both", expand=True, padx=20, pady=5)
        
        btn_close = tk.Button(pop, text="إغلاق المعاينة والبدء بزبون جديد ✔️", font=(FONT_FAMILY, 11, "bold"), bg=COLOR_PRIMARY, fg="white", activebackground=COLOR_PRIMARY_DARK, activeforeground="white", command=pop.destroy, bd=0, pady=8)
        btn_close.pack(fill="x", padx=20, pady=15)

    # ==========================================
    # PAGE 2: INVENTORY LIST & SEARCH (📦)
    # ==========================================
    def load_page_inventory(self):
        title_lbl = tk.Label(self.content_frame, text="📦 قائمة الجرد وإدارة المخزون والأسعار الحالي", font=(FONT_FAMILY, 12, "bold"), fg=COLOR_PRIMARY, bg=COLOR_BG)
        title_lbl.pack(anchor="e", padx=15, pady=10)
        
        # Stats summary top banners
        stat_bar = tk.Frame(self.content_frame, bg=COLOR_BG)
        stat_bar.pack(fill="x", padx=15, pady=5)
        
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        
        cursor.execute("SELECT COUNT(*) FROM products")
        total_p = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM products WHERE quantity <= 5")
        low_stk_c = cursor.fetchone()[0]
        
        # Calculate expired
        cursor.execute("SELECT expiry_date FROM products")
        rows = cursor.fetchall()
        expired_c = 0
        now_str = datetime.now().strftime("%Y-%m-%d")
        for r in rows:
            if r[0] < now_str:
                expired_c += 1
        conn.close()
        
        # Cards
        f1 = tk.Frame(stat_bar, bg="#EEF2F6", padx=15, pady=8, h=50, cursor="hand2")
        f1.pack(side="right", expand=True, fill="x", padx=5)
        tk.Label(f1, text="إجمالي المنتجات بالمحل", font=(FONT_FAMILY, 9), bg="#EEF2F6", fg=COLOR_MUTED).pack()
        tk.Label(f1, text=str(total_p), font=(FONT_FAMILY, 14, "bold"), bg="#EEF2F6", fg=COLOR_PRIMARY).pack()
        
        f2 = tk.Frame(stat_bar, bg="#FFFBEB", padx=15, pady=8, h=50)
        f2.pack(side="right", expand=True, fill="x", padx=5)
        tk.Label(f2, text="تنبيه مخزون منخفض (≤ 5)", font=(FONT_FAMILY, 9), bg="#FFFBEB", fg=COLOR_MUTED).pack()
        tk.Label(f2, text=str(low_stk_c), font=(FONT_FAMILY, 14, "bold"), bg="#FFFBEB", fg=COLOR_WARNING).pack()
        
        f3 = tk.Frame(stat_bar, bg="#FEF2F2", padx=15, pady=8, h=50)
        f3.pack(side="right", expand=True, fill="x", padx=5)
        tk.Label(f3, text="عناصر منتهية الصلاحية ❌", font=(FONT_FAMILY, 9), bg="#FEF2F2", fg=COLOR_MUTED).pack()
        tk.Label(f3, text=str(expired_c), font=(FONT_FAMILY, 14, "bold"), bg="#FEF2F2", fg=COLOR_ALERT).pack()
        
        # Search panel
        search_f = tk.Frame(self.content_frame, bg=COLOR_BG)
        search_f.pack(fill="x", padx=15, pady=10)
        
        tk.Label(search_f, text="فلترة المنتجات بالاسم أو الباركود:", font=(FONT_FAMILY, 9, "bold"), bg=COLOR_BG).pack(side="right", padx=5)
        self.ent_search_inv = ttk.Entry(search_f, font=(FONT_FAMILY, 10), justify="right")
        self.ent_search_inv.pack(side="right", fill="x", expand=True, padx=5)
        self.ent_search_inv.bind("<KeyRelease>", lambda e: self.filter_inventory_table())
        
        # Button actions
        if self.current_user_role == 'admin':
            btn_del = tk.Button(search_f, text="🗑️ حذف منتج", font=(FONT_FAMILY, 9, "bold"), bg=COLOR_ALERT, fg="white", bd=0, padx=12, pady=5, cursor="hand2", command=self.delete_product)
            btn_del.pack(side="left", padx=5)
            
        btn_excel = tk.Button(search_f, text="📊 تصدير Excel (CSV)", font=(FONT_FAMILY, 9, "bold"), bg="#3B82F6", fg="white", bd=0, padx=12, pady=5, cursor="hand2", command=self.export_inventory_to_csv)
        btn_excel.pack(side="left", padx=5)
        
        # Table Scroll View
        tbl_frame = tk.Frame(self.content_frame, relief="sunken", bd=1)
        tbl_frame.pack(fill="both", expand=True, padx=15, pady=5)
        
        cols = ("expiry", "qty", "price", "category", "barcode", "name", "id")
        self.tree_inv = ttk.Treeview(tbl_frame, columns=cols, show="headings")
        self.tree_inv.heading("expiry", text="صلاحية الانتهاء 📅")
        self.tree_inv.heading("qty", text="الكمية المتاحة")
        self.tree_inv.heading("price", text="السعر كاش ($)")
        self.tree_inv.heading("category", text="الفئة")
        self.tree_inv.heading("barcode", text="الباركود")
        self.tree_inv.heading("name", text="اسم المنتج")
        self.tree_inv.heading("id", text="ID")
        
        self.tree_inv.column("expiry", width=120, anchor="center")
        self.tree_inv.column("qty", width=90, anchor="center")
        self.tree_inv.column("price", width=95, anchor="center")
        self.tree_inv.column("category", width=110, anchor="center")
        self.tree_inv.column("barcode", width=100, anchor="center")
        self.tree_inv.column("name", width=220, anchor="e")
        self.tree_inv.column("id", width=40, anchor="center")
        
        # Scroll bar
        scrol = ttk.Scrollbar(tbl_frame, orient="vertical", command=self.tree_inv.yview)
        self.tree_inv.configure(yscrollcommand=scrol.set)
        
        self.tree_inv.pack(side="left", fill="both", expand=True)
        scrol.pack(side="right", fill="y")
        
        # Load and color rows based on state
        self.load_inventory_data()

    def load_inventory_data(self):
        for row in self.tree_inv.get_children():
            self.tree_inv.delete(row)
            
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("""
            SELECT p.id, p.name, p.barcode, cat.name, p.price_usd, p.quantity, p.expiry_date
            FROM products p
            LEFT JOIN categories cat ON p.category = cat.id
            ORDER BY p.id DESC
        """)
        rows = c.fetchall()
        conn.close()
        
        now_dt = datetime.now()
        
        # Define tree tags for styling
        self.tree_inv.tag_configure("expired", background="#FEE2E2", foreground="#991B1B") # Red row
        self.tree_inv.tag_configure("warning", background="#FEF3C7", foreground="#92400E") # Yellow row (expire soon or low stock)
        self.tree_inv.tag_configure("safe", background="#F0FDF4", foreground="#166534") # Green
        
        search_txt = self.ent_search_inv.get().strip().lower()
        
        for r in rows:
            # Filters
            p_id, name, bar, catname, price, qty, expiry = r
            if search_txt and (search_txt not in name.lower() and search_txt not in str(bar)):
                continue
                
            # Compute status
            exp_date = datetime.strptime(expiry, "%Y-%m-%d")
            diff_days = (exp_date - now_dt).days
            
            tag = "safe"
            if exp_date < now_dt:
                tag = "expired"
            elif diff_days <= 10 or qty <= 5:
                tag = "warning"
                
            qty_label = f"{qty} 🚨 منخفض" if qty <= 5 else f"{qty}"
            expiry_label = f"{expiry} ⚠️ منتهي" if exp_date < now_dt else f"{expiry}"
            
            self.tree_inv.insert("", "end", values=(
                expiry_label,
                qty_label,
                f"{price:.2f} $",
                catname,
                bar,
                name,
                p_id
            ), tags=(tag,))

    def filter_inventory_table(self):
        self.load_inventory_data()

    def delete_product(self):
        sel = self.tree_inv.selection()
        if not sel:
            messagebox.showwarning("تحديد ناقص", "يرجى تحديد المنتج المراد حذفه من الجدول.")
            return
            
        vals = self.tree_inv.item(sel[0], "values")
        p_id = vals[6]
        name = vals[5]
        
        if messagebox.askyesno("تأكيد الحذف ⚠️", f"هل أنت متأكد من حذف المنتج: {name} نهائياً؟"):
            try:
                conn = sqlite3.connect(DB_FILE)
                c = conn.cursor()
                c.execute("DELETE FROM products WHERE id=?", (p_id,))
                conn.commit()
                conn.close()
                messagebox.showinfo("نجاح", "تم حذف المنتج بنجاح!")
                self.load_inventory_data()
            except Exception as e:
                messagebox.showerror("خطأ", f"فشل الحذف: {e}")

    def export_inventory_to_csv(self):
        filename = filedialog.asksaveasfilename(defaultextension=".csv", filetypes=[("ملفات CSV", "*.csv")], title="حفظ ملف المخزون")
        if not filename:
            return
            
        try:
            conn = sqlite3.connect(DB_FILE)
            c = conn.cursor()
            c.execute("""
                SELECT p.name, p.barcode, c.name, p.price_usd, p.quantity, p.expiry_date
                FROM products p
                LEFT JOIN categories c ON p.category = c.id
            """)
            rows = c.fetchall()
            conn.close()
            
            with open(filename, "w", newline="", encoding="utf-8-sig") as f:
                writer = csv.writer(f)
                # UTF-8 signature BOM so MS Excel reads Arabic labels correctly
                writer.writerow(["اسم المنتج", "الباركود", "الفئة", "السعر بالدولار ($)", "كمية المخزن الحالي", "تاريخ الصلاحية"])
                writer.writerows(rows)
                
            messagebox.showinfo("تصدير ناجح", "تم تصدير المخزون بنجاح متناسباً مع صيغة إكسل!")
        except Exception as e:
            messagebox.showerror("خطأ", f"فشل تصدير البيانات: {e}")

    # ==========================================
    # PAGE 3: ADD/EDIT PRODUCT (➕)
    # ==========================================
    def load_page_add_product(self):
        title_lbl = tk.Label(self.content_frame, text="➕ إضافة منتج جديد أو تعديل كميات", font=(FONT_FAMILY, 12, "bold"), fg=COLOR_PRIMARY, bg=COLOR_BG)
        title_lbl.pack(anchor="e", padx=15, pady=15)
        
        # Form Container
        form_frame = tk.LabelFrame(self.content_frame, text=" تفاصيل بطاقة الصنف ", font=(FONT_FAMILY, 10, "bold"), bg=COLOR_CARD_BG, fg=COLOR_PRIMARY, bd=1, padx=25, pady=20)
        form_frame.pack(padx=20, pady=10, fill="x")
        
        # Input alignments (Grid RTL-friendly)
        tk.Label(form_frame, text="اسم المنتج:", font=(FONT_FAMILY, 10, "bold"), bg=COLOR_CARD_BG).grid(row=0, column=3, sticky="e", pady=8, padx=10)
        self.ent_pname = ttk.Entry(form_frame, font=(FONT_FAMILY, 10), justify="right", width=30)
        self.ent_pname.grid(row=0, column=2, sticky="ew", pady=8)
        
        tk.Label(form_frame, text="الباركود (مسح/كتابة):", font=(FONT_FAMILY, 10, "bold"), bg=COLOR_CARD_BG).grid(row=0, column=1, sticky="e", pady=8, padx=10)
        self.ent_pbarcode = ttk.Entry(form_frame, font=(FONT_FAMILY, 10), justify="center", width=20)
        self.ent_pbarcode.grid(row=0, column=0, sticky="ew", pady=8)
        
        tk.Label(form_frame, text="الفئة:", font=(FONT_FAMILY, 10, "bold"), bg=COLOR_CARD_BG).grid(row=1, column=3, sticky="e", pady=8, padx=10)
        
        # Category options combobox
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("SELECT id, name FROM categories")
        self.categories_list = c.fetchall()
        conn.close()
        
        cat_names = [x[1] for x in self.categories_list]
        self.cmb_pcategory = ttk.Combobox(form_frame, values=cat_names, state="readonly", font=(FONT_FAMILY, 10))
        if cat_names: self.cmb_pcategory.set(cat_names[0])
        self.cmb_pcategory.grid(row=1, column=2, sticky="ew", pady=8)
        
        tk.Label(form_frame, text="السعر بالدولار ($):", font=(FONT_FAMILY, 10, "bold"), bg=COLOR_CARD_BG).grid(row=1, column=1, sticky="e", pady=8, padx=10)
        self.ent_pprice = ttk.Entry(form_frame, font=(FONT_FAMILY, 10), justify="center", width=20)
        self.ent_pprice.grid(row=1, column=0, sticky="ew", pady=8)
        
        tk.Label(form_frame, text="الكمية الابتدائية بالمخزن:", font=(FONT_FAMILY, 10, "bold"), bg=COLOR_CARD_BG).grid(row=2, column=3, sticky="e", pady=8, padx=10)
        self.ent_pqty = ttk.Entry(form_frame, font=(FONT_FAMILY, 10), justify="center", width=30)
        self.ent_pqty.grid(row=2, column=2, sticky="ew", pady=8)
        self.ent_pqty.insert(0, "10")
        
        tk.Label(form_frame, text="تاريخ الصلاحية (YYYY-MM-DD):", font=(FONT_FAMILY, 10, "bold"), bg=COLOR_CARD_BG).grid(row=2, column=1, sticky="e", pady=8, padx=10)
        self.ent_pexpiry = ttk.Entry(form_frame, font=(FONT_FAMILY, 10), justify="center", width=20)
        self.ent_pexpiry.grid(row=2, column=0, sticky="ew", pady=8)
        self.ent_pexpiry.insert(0, datetime.now().strftime("%Y-%m-%d"))
        
        btn_save = tk.Button(self.content_frame, text="💾 حفظ المنتج الجديد في قاعدة المعطيات", font=(FONT_FAMILY, 11, "bold"), bg=COLOR_PRIMARY, fg="white", activebackground=COLOR_PRIMARY_DARK, activeforeground="white", bd=0, padx=25, pady=10, cursor="hand2", command=self.save_new_product)
        btn_save.pack(pady=15)
        
        # Info notice
        notice_f = tk.Frame(self.content_frame, bg="#EFF6FF", padx=15, pady=10, relief="solid", bd=1)
        notice_f.pack(padx=20, pady=5, fill="x")
        tk.Label(notice_f, text="ℹ️ إرشاد الباركود: يمكنك إدخال باركود مسجل بالفعل، وسوف تقوم قاعدة البيانات بتحديث الكمية بدلاً من التكرار.", font=(FONT_FAMILY, 9), bg="#EFF6FF", fg="#1E40AF").pack()

    def save_new_product(self):
        name = self.ent_pname.get().strip()
        barcode = self.ent_pbarcode.get().strip()
        cat_disp = self.cmb_pcategory.get()
        price_s = self.ent_pprice.get().strip()
        qty_s = self.ent_pqty.get().strip()
        expiry = self.ent_pexpiry.get().strip()
        
        if not name or not barcode or not price_s or not qty_s or not expiry:
            messagebox.showerror("حقول ناقصة", "يرجى تعبئة كافة حقول المنتج!")
            return
            
        try:
            price = float(price_s)
            qty = float(qty_s)
        except ValueError:
            messagebox.showerror("نوع خطأ", "يجب أن تكون قيم السعر والكمية أرقاماً صحيحة!")
            return
            
        # Validate date
        try:
            datetime.strptime(expiry, "%Y-%m-%d")
        except ValueError:
            messagebox.showerror("تنسيق التاريخ خطأ", "تنسيق تاريخ انتهاء الصلاحية يجب أن يكون كـ YYYY-MM-DD")
            return
            
        # Match category ID
        cat_id = ""
        for c_item in self.categories_list:
            if c_item[1] == cat_disp:
                cat_id = c_item[0]
                break
                
        # Insert or update
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        
        try:
            # Check if barcode exists and increase qty
            c.execute("SELECT id, quantity FROM products WHERE barcode=?", (barcode,))
            row = c.fetchone()
            
            if row:
                p_id, cur_q = row
                new_q = cur_q + qty
                c.execute("""
                    UPDATE products
                    SET name=?, category=?, price_usd=?, quantity=?, expiry_date=?
                    WHERE id=?
                """, (name, cat_id, price, new_q, expiry, p_id))
                messagebox.showinfo("تحديث ناجح", f"هذا الباركود [{barcode}] مسجل مسبقاً! تم ترفيع تزويد الكمية بـ ({qty}) ليصبح الإجمالي: ({new_q})")
            else:
                c.execute("""
                    INSERT INTO products (name, barcode, category, price_usd, quantity, expiry_date)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (name, barcode, cat_id, price, qty, expiry))
                messagebox.showinfo("نجاح الحفظ", "تم إدراج الصنف الجديد في سجلات المخزن!")
                
            conn.commit()
            
            # Clear Form
            self.ent_pname.delete(0, "end")
            self.ent_pbarcode.delete(0, "end")
            self.ent_pprice.delete(0, "end")
            self.ent_pqty.delete(0, "end")
            self.ent_pqty.insert(0, "10")
            
        except Exception as e:
            conn.rollback()
            messagebox.showerror("خطأ", f"حدث خلل في حفظ المعطيات: {e}")
        finally:
            conn.close()

    # ==========================================
    # PAGE 4: STOCK COUNT PAGE (📋) EXTREME FIDELITY
    # ==========================================
    def load_page_stock_count(self):
        title_lbl = tk.Label(self.content_frame, text="📋 جردة مطابقة المخزون والتسوية الفعلية والفرق المالي", font=(FONT_FAMILY, 12, "bold"), fg=COLOR_PRIMARY, bg=COLOR_BG)
        title_lbl.pack(anchor="e", padx=15, pady=10)
        
        # Load products into grid structure
        header_text = "💡 يسجل كشف جرد المخزون الفروق بين الكميات المسجلة بالنظام والعدد الواقعي على الرف، مع تعديل المخزن تلقائياً."
        tk.Label(self.content_frame, text=header_text, font=(FONT_FAMILY, 9), fg=COLOR_MUTED, bg=COLOR_BG).pack(anchor="e", padx=15)
        
        # Table of items to edit
        tbl_frame = tk.Frame(self.content_frame, relief="sunken", bd=1)
        tbl_frame.pack(fill="both", expand=True, padx=15, pady=10)
        
        cols = ("diff_value", "diff_qty", "actual_qty", "sys_qty", "price", "barcode", "name")
        self.tree_count = ttk.Treeview(tbl_frame, columns=cols, show="headings")
        self.tree_count.heading("diff_value", text="فروقات القيمة ($)")
        self.tree_count.heading("diff_qty", text="فرق الكمية")
        self.tree_count.heading("actual_qty", text="الكمية الواقعية (جرد)")
        self.tree_count.heading("sys_qty", text="الكمية بالنظام")
        self.tree_count.heading("price", text="السعر")
        self.tree_count.heading("barcode", text="باركود")
        self.tree_count.heading("name", text="اسم المنتج")
        
        self.tree_count.column("diff_value", width=110, anchor="center")
        self.tree_count.column("diff_qty", width=90, anchor="center")
        self.tree_count.column("actual_qty", width=120, anchor="center")
        self.tree_count.column("sys_qty", width=100, anchor="center")
        self.tree_count.column("price", width=70, anchor="center")
        self.tree_count.column("barcode", width=90, anchor="center")
        self.tree_count.column("name", width=220, anchor="e")
        
        scrol = ttk.Scrollbar(tbl_frame, orient="vertical", command=self.tree_count.yview)
        self.tree_count.configure(yscrollcommand=scrol.set)
        
        self.tree_count.pack(side="left", fill="both", expand=True)
        scrol.pack(side="right", fill="y")
        
        # Active editing side fields for Tkinter
        edit_frame = tk.Frame(self.content_frame, bg="#EFF6F0", padx=10, pady=5, bd=1, relief="solid")
        edit_frame.pack(fill="x", padx=15, pady=(0, 10))
        
        tk.Label(edit_frame, text="✏️ تحديث الجرد الفعلي للمنتج المحدد:", font=(FONT_FAMILY, 9, "bold"), bg="#EFF6F0").pack(side="right", padx=5)
        self.lbl_selected_count_p = tk.Label(edit_frame, text="الرجاء اختيار منتج من الجدول", font=(FONT_FAMILY, 9, "bold"), bg="#EFF6F0", fg=COLOR_PRIMARY_DARK)
        self.lbl_selected_count_p.pack(side="right", padx=15)
        
        self.ent_counted_qty = ttk.Entry(edit_frame, font=(FONT_FAMILY, 10), justify="center", width=10)
        self.ent_counted_qty.pack(side="right", padx=5)
        self.ent_counted_qty.bind("<Return>", lambda e: self.apply_counted_qty())
        
        btn_apply = tk.Button(edit_frame, text="تثبيت تعديل الصنف", font=(FONT_FAMILY, 9, "bold"), bg=COLOR_PRIMARY, fg="white", command=self.apply_counted_qty, cursor="hand2")
        btn_apply.pack(side="right", padx=5)
        
        # Load from DB
        self.stock_count_data = [] # Dict values: {id, name, barcode, price_usd, system_qty, actual_qty}
        self.load_stock_count_data()
        
        # Double click sets input field easily
        self.tree_count.bind("<<TreeviewSelect>>", self.on_stock_count_row_selected)
        
        # Summary metrics
        self.summary_count_frame = tk.Frame(self.content_frame, bg=COLOR_BG)
        self.summary_count_frame.pack(fill="x", padx=15, pady=(5, 10))
        
        # Actions Row
        action_row = tk.Frame(self.content_frame, bg=COLOR_BG)
        action_row.pack(fill="x", padx=15, pady=5)
        
        btn_final_submit = tk.Button(action_row, text="✅ تطبيق الجردة و تسوية مخازن النظام مع الواقع", font=(FONT_FAMILY, 11, "bold"), bg=COLOR_SUCCESS, fg="white", activebackground=COLOR_PRIMARY_DARK, activeforeground="white", command=self.finalize_stock_count, cursor="hand2", bd=0, padx=15, pady=10)
        btn_final_submit.pack(side="right")

    def load_stock_count_data(self):
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("SELECT id, name, barcode, price_usd, quantity FROM products")
        rows = c.fetchall()
        conn.close()
        
        self.stock_count_data = []
        for r in rows:
            self.stock_count_data.append({
                "id": r[0],
                "name": r[1],
                "barcode": r[2],
                "price_usd": r[3],
                "sys_qty": r[4],
                "actual_qty": r[4] # Starts equal
            })
            
        self.render_stock_count_table()

    def render_stock_count_table(self):
        for row in self.tree_count.get_children():
            self.tree_count.delete(row)
            
        self.tree_count.tag_configure("diff_negative", background="#FEE2E2", foreground="#EF4444")
        self.tree_count.tag_configure("diff_positive", background="#ECFDF5", foreground="#10B981")
        self.tree_count.tag_configure("match", background="white", foreground=COLOR_TEXT)
        
        total_sys = 0.0
        total_actual = 0.0
        diff_count = 0
        diff_value_usd = 0.0
        
        for p in self.stock_count_data:
            sys_q = p["sys_qty"]
            act_q = p["actual_qty"]
            diff = act_q - sys_q
            diff_val = diff * p["price_usd"]
            
            total_sys += sys_q
            total_actual += act_q
            
            tag = "match"
            diff_label = f"{diff:+.2f}" if diff != 0 else "0.00"
            if diff < 0:
                tag = "diff_negative"
                diff_count += 1
                diff_value_usd += diff_val
            elif diff > 0:
                tag = "diff_positive"
                diff_count += 1
                diff_value_usd += diff_val
                
            self.tree_count.insert("", "end", values=(
                f"{diff_val:+.2f} $",
                diff_label,
                f"{act_q:.2f}",
                f"{sys_q:.2f}",
                f"{p['price_usd']:.2f} $",
                p["barcode"],
                p["name"]
            ), tags=(tag,))
            
        # Update text labels
        # Clear summary
        for w in self.summary_count_frame.winfo_children():
            w.destroy()
            
        metrics_box = tk.LabelFrame(self.summary_count_frame, text=" إحصائيات المطابقة الجارية ", bg=COLOR_CARD_BG, font=(FONT_FAMILY, 9, "bold"), fg=COLOR_PRIMARY, padx=10, pady=5)
        metrics_box.pack(fill="x")
        
        tk.Label(metrics_box, text=f"المنتجات التي فيها فروقات فعليّة: {diff_count}", font=(FONT_FAMILY, 10, "bold"), bg=COLOR_CARD_BG, fg=COLOR_ALERT if diff_count>0 else COLOR_MUTED).pack(side="right", padx=15)
        tk.Label(metrics_box, text=f"إجمالي قيمة التباين المالي بالمحل: {diff_value_usd:+.2f} $", font=(FONT_FAMILY, 10, "bold"), bg=COLOR_CARD_BG, fg=COLOR_ALERT if diff_value_usd<0 else COLOR_SUCCESS).pack(side="left", padx=15)

    def on_stock_count_row_selected(self, event):
        sel = self.tree_count.selection()
        if not sel:
            return
            
        idx = self.tree_count.index(sel[0])
        p = self.stock_count_data[idx]
        self.lbl_selected_count_p.configure(text=p["name"])
        self.ent_counted_qty.delete(0, "end")
        self.ent_counted_qty.insert(0, str(p["actual_qty"]))
        self.ent_counted_qty.focus_set()

    def apply_counted_qty(self):
        sel = self.tree_count.selection()
        if not sel:
            messagebox.showwarning("لم يتم التحديد", "اختر منتجاً أولاً من الجدول بالأعلى لتعديل كميته الفعليّة!")
            return
            
        idx = self.tree_count.index(sel[0])
        try:
            val = float(self.ent_counted_qty.get().strip())
        except ValueError:
            messagebox.showerror("خطأ إدخال", "الكمية الواقعية المدخلة يجب أن تكون رقماً!")
            return
            
        self.stock_count_data[idx]["actual_qty"] = val
        self.render_stock_count_table()

    def finalize_stock_count(self):
        # Update all quantities in SQLite DB on click
        diffs = [x for x in self.stock_count_data if x["actual_qty"] != x["sys_qty"]]
        if not diffs:
            messagebox.showinfo("تطابق تام", "المخزون الفعلي يتطابق تماماً مع نظام البرمجة. لا يوجد تسوية مطلوبة!")
            return
            
        confirm_msg = f"لقد قمت بإحداث تعديلات على جرد الكميات لـ ({len(diffs)}) منتج.\\n\\nهل أنت متأكد من ترحيل وتسوية هذه الكميات الواقعية إلى مخازن النظام بشكل نهائي وللأبد؟"
        if messagebox.askyesno("تأكيد ترحيل جرد المخزون 📜", confirm_msg):
            conn = sqlite3.connect(DB_FILE)
            c = conn.cursor()
            try:
                for p in diffs:
                    c.execute("UPDATE products SET quantity=? WHERE id=?", (p["actual_qty"], p["id"]))
                conn.commit()
                messagebox.showinfo("تم الافتتاح بنجاح 💎", "تم نقل وحفظ جردة المخازن الفعلية الجديدة بنجاح للمحل!")
                self.load_stock_count_data() # reload System quantities too
            except Exception as e:
                conn.rollback()
                messagebox.showerror("خلل ترحيل البيانات", f"فشل تحديث قاعدة البيانات: {e}")
            finally:
                conn.close()

    # ==========================================
    # PAGE 5: REPORTS & STATS (📊)
    # ==========================================
    def load_page_reports(self):
        title_lbl = tk.Label(self.content_frame, text="📊 التقارير الأسبوعية والمبيعات وإحصائيات السوبرماركت", font=(FONT_FAMILY, 12, "bold"), fg=COLOR_PRIMARY, bg=COLOR_BG)
        title_lbl.pack(anchor="e", padx=15, pady=10)
        
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        
        # 1. Financial totals
        c.execute("SELECT SUM(total_usd), SUM(total_lbp) FROM invoices")
        tot = c.fetchone()
        tot_u = tot[0] if tot[0] else 0.0
        tot_l = tot[1] if tot[1] else 0.0
        
        # 2. Number of invoices
        c.execute("SELECT COUNT(*) FROM invoices")
        inv_counts_n = c.fetchone()[0]
        
        # 3. Top selling products
        c.execute("""
            SELECT product_name, SUM(quantity) as net_qty
            FROM invoice_items
            GROUP BY product_id
            ORDER BY net_qty DESC
            LIMIT 5
        """)
        top_sellers = c.fetchall()
        
        conn.close()
        
        # Summary widgets
        stats_frame = tk.Frame(self.content_frame, bg=COLOR_BG)
        stats_frame.pack(fill="x", padx=15, pady=5)
        
        # Card 1
        c1 = tk.Frame(stats_frame, bg="#EFF6FF", padx=20, pady=10)
        c1.pack(side="right", fill="x", expand=True, padx=5)
        tk.Label(c1, text="صافي المبيعات الكلية ($)", font=(FONT_FAMILY, 10), bg="#EFF6FF", fg=COLOR_MUTED).pack()
        tk.Label(c1, text=f"{tot_u:,.2f} $", font=(FONT_FAMILY, 14, "bold"), bg="#EFF6FF", fg="#2563EB").pack()
        
        # Card 2
        c2 = tk.Frame(stats_frame, bg="#ECFDF5", padx=20, pady=10)
        c2.pack(side="right", fill="x", expand=True, padx=5)
        tk.Label(c2, text="إجمالي المبيعات بالليرة (L.L)", font=(FONT_FAMILY, 10), bg="#ECFDF5", fg=COLOR_MUTED).pack()
        tk.Label(c2, text=f"{tot_l:,.0f} ل.ل.", font=(FONT_FAMILY, 14, "bold"), bg="#ECFDF5", fg=COLOR_SUCCESS).pack()
        
        # Card 3
        c3 = tk.Frame(stats_frame, bg="#F1F5F9", padx=20, pady=10)
        c3.pack(side="right", fill="x", expand=True, padx=5)
        tk.Label(c3, text="عَدد الفواتير المُصدرة جَميعاً", font=(FONT_FAMILY, 10), bg="#F1F5F9", fg=COLOR_MUTED).pack()
        tk.Label(c3, text=str(inv_counts_n), font=(FONT_FAMILY, 14, "bold"), bg="#F1F5F9", fg=COLOR_SIDEBAR).pack()
        
        # Graphical Display container split
        lower_g_frame = tk.Frame(self.content_frame, bg=COLOR_BG)
        lower_g_frame.pack(fill="both", expand=True, padx=15, pady=15)
        
        # List of top sellers Right, Canvas Chart Left
        top_list_frame = tk.LabelFrame(lower_g_frame, text=" الأصناف الأكثر مبيعاً 🏆 ", font=(FONT_FAMILY, 10, "bold"), bg=COLOR_CARD_BG, fg=COLOR_PRIMARY, padx=15, pady=15)
        top_list_frame.pack(side="right", fill="both", expand=True, padx=5)
        
        if top_sellers:
            for idx, item in enumerate(top_sellers):
                lbl_color = COLOR_PRIMARY_DARK if idx == 0 else COLOR_TEXT
                font_weight = "bold" if idx == 0 else "normal"
                tk.Label(top_list_frame, text=f"{idx+1}. {item[0]} (بيعت كمية: {item[1]})", font=(FONT_FAMILY, 10, font_weight), fg=lbl_color, bg=COLOR_CARD_BG).pack(anchor="e", pady=5)
        else:
            tk.Label(top_list_frame, text="لم يتم بيع أي خدمة/منتج بالمحل بعد.", font=(FONT_FAMILY, 9), fg=COLOR_MUTED, bg=COLOR_CARD_BG).pack(pady=20)
            
        chart_frame = tk.LabelFrame(lower_g_frame, text=" رسم توضيحي بياني نسبي للمبيعات اليومية 📈 ", font=(FONT_FAMILY, 10, "bold"), bg=COLOR_CARD_BG, fg=COLOR_PRIMARY, padx=15, pady=15)
        chart_frame.pack(side="left", fill="both", expand=True, padx=5)
        
        # Let's draw a nice chart on Canvas since we avoid heavy external libraries (matplot)
        chart_canvas = tk.Canvas(chart_frame, bg="#F8FAFC", highlightthickness=0, height=180)
        chart_canvas.pack(fill="both", expand=True)
        
        # Load daily sales
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("""
            SELECT date, SUM(total_usd)
            FROM invoices
            GROUP BY date
            ORDER BY date DESC
            LIMIT 7
        """)
        day_sales = c.fetchall()
        conn.close()
        
        if not day_sales:
            chart_canvas.create_text(150, 80, text="لا يوجد مبيعات كافية في التواريخ لتمثيل المخطط البياني.", font=(FONT_FAMILY, 9), fill=COLOR_MUTED)
        else:
            day_sales.reverse() # Order chronologically to draw left to right
            max_val = max(val for date, val in day_sales)
            if max_val == 0: max_val = 1.0
            
            # Draw chart axes
            chart_canvas.create_line(40, 140, 280, 140, width=2, fill=COLOR_MUTED) # X Axis
            chart_canvas.create_line(40, 20, 40, 140, width=2, fill=COLOR_MUTED)  # Y Axis
            
            # Plot line
            num_points = len(day_sales)
            step_x = 240 / max(1, num_points - 1)
            
            points = []
            for i, (date, val) in enumerate(day_sales):
                x = 40 + i * step_x
                y = 140 - (val / max_val) * 110 # relative scale
                points.append((x, y))
                
                # Draw small circles
                chart_canvas.create_oval(x-3, y-3, x+3, y+3, fill=COLOR_PRIMARY, outline="")
                # Value label
                chart_canvas.create_text(x, y-10, text=f"{val:.0f}$", font=(FONT_FAMILY, 7, "bold"), fill=COLOR_PRIMARY_DARK)
                # Date label underneath
                sh_date = date[5:] # e.g. 05-29
                chart_canvas.create_text(x, 150, text=sh_date, font=(FONT_FAMILY, 7), fill=COLOR_TEXT)
                
            # Connect lines
            for i in range(len(points) - 1):
                chart_canvas.create_line(points[i][0], points[i][1], points[i+1][0], points[i+1][1], width=2, fill=COLOR_PRIMARY)

    # ==========================================
    # PAGE 6: INVOICES LOG VIEW (🧾)
    # ==========================================
    def load_page_invoices(self):
        title_lbl = tk.Label(self.content_frame, text="🧾 سجل الفواتير والمبيعات السابقة للزبائن كلياً", font=(FONT_FAMILY, 12, "bold"), fg=COLOR_PRIMARY, bg=COLOR_BG)
        title_lbl.pack(anchor="e", padx=15, pady=10)
        
        # Grid frame
        tbl_frame = tk.Frame(self.content_frame, relief="sunken", bd=1)
        tbl_frame.pack(fill="both", expand=True, padx=15, pady=5)
        
        cols = ("cashier", "method", "exchange", "total_lbp", "total_usd", "time", "date", "inv_num")
        self.tree_logs = ttk.Treeview(tbl_frame, columns=cols, show="headings")
        self.tree_logs.heading("cashier", text="الكاشير المسؤول")
        self.tree_logs.heading("method", text="الوسيلة")
        self.tree_logs.heading("exchange", text="سعر الصرف")
        self.tree_logs.heading("total_lbp", text="المجموع بالليرة")
        self.tree_logs.heading("total_usd", text="المجموع بالدولار ($)")
        self.tree_logs.heading("time", text="الوقت")
        self.tree_logs.heading("date", text="التاريخ")
        self.tree_logs.heading("inv_num", text="رقم الفاتورة 📲")
        
        self.tree_logs.column("cashier", width=120, anchor="center")
        self.tree_logs.column("method", width=80, anchor="center")
        self.tree_logs.column("exchange", width=100, anchor="center")
        self.tree_logs.column("total_lbp", width=120, anchor="center")
        self.tree_logs.column("total_usd", width=110, anchor="center")
        self.tree_logs.column("time", width=65, anchor="center")
        self.tree_logs.column("date", width=95, anchor="center")
        self.tree_logs.column("inv_num", width=140, anchor="center")
        
        scrol = ttk.Scrollbar(tbl_frame, orient="vertical", command=self.tree_logs.yview)
        self.tree_logs.configure(yscrollcommand=scrol.set)
        
        self.tree_logs.pack(side="left", fill="both", expand=True)
        scrol.pack(side="right", fill="y")
        
        # Load from SQLite log DB
        self.load_invoices_logs()
        
        # Hotkey and double click setup
        self.tree_logs.bind("<Double-1>", lambda e: self.preview_logged_invoice())
        
        btn_view_re = tk.Button(self.content_frame, text="🔍 عرض ومعاينة الفاتورة الحرارية المحددة (Double-Click)", font=(FONT_FAMILY, 10, "bold"), bg=COLOR_PRIMARY, fg="white", command=self.preview_logged_invoice, cursor="hand2", bd=0, padx=15, pady=8)
        btn_view_re.pack(pady=10)

    def load_invoices_logs(self):
        for r in self.tree_logs.get_children():
            self.tree_logs.delete(r)
            
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("""
            SELECT invoice_number, date, time, total_usd, total_lbp, exchange_rate, payment_method, cashier, id
            FROM invoices
            ORDER BY id DESC
        """)
        rows = c.fetchall()
        conn.close()
        
        for r in rows:
            self.tree_logs.insert("", "end", values=(
                r[7],
                r[6],
                f"{r[5]:,.0f}",
                f"{r[4]:,.0f} L.L.",
                f"{r[3]:.2f} $",
                r[2],
                r[1],
                r[0]
            ))

    def preview_logged_invoice(self):
        sel = self.tree_logs.selection()
        if not sel:
            messagebox.showwarning("تحديد مفقود", "يرجى اختيار فاتورة من القائمة أولاً!")
            return
            
        inv_no = self.tree_logs.item(sel[0], "values")[7]
        
        # Query details from database
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("""
            SELECT id, date, time, subtotal_usd, discount_usd, total_usd, total_lbp, payment_method, cashier, exchange_rate, paid_usd, paid_lbp, change_usd, change_lbp
            FROM invoices WHERE invoice_number=?
        """, (inv_no,))
        row = c.fetchone()
        
        if not row:
            conn.close()
            return
            
        inv_id, date, time, sub_u, disc_u, tot_u, tot_l, pm, cashier, ex_r, paid_u, paid_l, ch_u, ch_l = row
        
        # Items details query
        c.execute("""
            SELECT product_name, price_usd, quantity, total_usd
            FROM invoice_items WHERE invoice_id=?
        """, (inv_id,))
        items = c.fetchall()
        conn.close()
        
        # Regenerate text representation
        stars = "*" * 36
        footer = get_setting("receipt_footer", "شكرا لزيارتكم!")
        txt = f"\\n        {self.shop_name} \\n"
        txt += f"      {stars}\\n"
        txt += f" فاتورة رقم: {inv_no}\\n"
        txt += f" التاريخ: {date}   الوقت: {time}\\n"
        txt += f" البائع: {cashier}\\n"
        txt += f" وسيلة الدفع: {pm}\\n"
        txt += f" سعر الصرف المعتمد: {ex_r:,.0f} L.L.\\n"
        txt += f"------------------------------------+\\n"
        txt += f" المنتج                     الكمية  السعر\\n"
        txt += f"------------------------------------+\\n"
        
        for name, price, qty, total in items:
            name_trunc = name[:18].ljust(18)
            qty_s = str(int(qty) if qty.is_integer() else qty).rjust(4)
            price_s = f"{price:.2f}$".rjust(7)
            txt += f" {name_trunc}  {qty_s}  {price_s}\\n"
            
        txt += f"------------------------------------+\\n"
        txt += f" المجموع لزبون: {sub_u:.2f} $\\n"
        txt += f" الخصم: {disc_u:.2f} $\\n"
        txt += f" الكلي للدفع: {tot_u:.2f} $ ({tot_l:,.0f} ل.ل)\\n"
        txt += f" المدفوع كاش: USD({paid_u:.2f}$) L.L.({paid_l:,.0f})\\n"
        txt += f" الباقي للزبون: USD({ch_u:.2f}$) L.L.({ch_l:,.0f})\\n"
        txt += f"      {stars}\\n"
        txt += f"     {footer}\\n"
        
        self.show_receipt_popup(txt)

    # ==========================================
    # PAGE 7: USERS MANAGEMENT (👥)
    # ==========================================
    def load_page_users(self):
        title_lbl = tk.Label(self.content_frame, text="👥 إدارة الموظفين المستخدمين وصلاحيات الدخول", font=(FONT_FAMILY, 12, "bold"), fg=COLOR_PRIMARY, bg=COLOR_BG)
        title_lbl.pack(anchor="e", padx=15, pady=10)
        
        # Left edit actions, Right users table
        p_split = tk.Frame(self.content_frame, bg=COLOR_BG)
        p_split.pack(fill="both", expand=True, padx=15, pady=10)
        
        edit_f = tk.LabelFrame(p_split, text=" إضافة مستخدم جديد للحاسب ", font=(FONT_FAMILY, 10, "bold"), bg=COLOR_CARD_BG, fg=COLOR_PRIMARY, padx=15, pady=15)
        edit_f.pack(side="right", fill="y", padx=5)
        
        tk.Label(edit_f, text="اسم الدخول (Username):", font=(FONT_FAMILY, 9, "bold"), bg=COLOR_CARD_BG).pack(anchor="e", pady=2)
        self.ent_u_username = ttk.Entry(edit_f, font=(FONT_FAMILY, 10), justify="right")
        self.ent_u_username.pack(fill="x", pady=5)
        
        tk.Label(edit_f, text="الاسم الكامل العرضي:", font=(FONT_FAMILY, 9, "bold"), bg=COLOR_CARD_BG).pack(anchor="e", pady=2)
        self.ent_u_fullname = ttk.Entry(edit_f, font=(FONT_FAMILY, 10), justify="right")
        self.ent_u_fullname.pack(fill="x", pady=5)
        
        tk.Label(edit_f, text="كلمة المرور المسجلة:", font=(FONT_FAMILY, 9, "bold"), bg=COLOR_CARD_BG).pack(anchor="e", pady=2)
        self.ent_u_pass = ttk.Entry(edit_f, font=(FONT_FAMILY, 10), show="*", justify="right")
        self.ent_u_pass.pack(fill="x", pady=5)
        
        tk.Label(edit_f, text="صلاحية الموظف بالنظام:", font=(FONT_FAMILY, 9, "bold"), bg=COLOR_CARD_BG).pack(anchor="e", pady=2)
        self.cmb_u_role = ttk.Combobox(edit_f, values=["مدير (admin)", "كاشير (cashier)"], state="readonly", font=(FONT_FAMILY, 10))
        self.cmb_u_role.set("كاشير (cashier)")
        self.cmb_u_role.pack(fill="x", pady=5)
        
        btn_add = tk.Button(edit_f, text="💾 حفظ وإدراج المستخدم", font=(FONT_FAMILY, 10, "bold"), bg=COLOR_PRIMARY, fg="white", activebackground=COLOR_PRIMARY_DARK, activeforeground="white", command=self.save_new_user, bd=0, pady=8)
        btn_add.pack(fill="x", pady=10)
        
        # User List table
        tbl_f = tk.LabelFrame(p_split, text=" قائمة المستخَمين الحاليين بالنظام ", font=(FONT_FAMILY, 10, "bold"), bg=COLOR_BG, fg=COLOR_PRIMARY, padx=5, pady=5)
        tbl_f.pack(side="left", fill="both", expand=True, padx=5)
        
        cols = ("role", "fullname", "username", "id")
        self.tree_users = ttk.Treeview(tbl_f, columns=cols, show="headings")
        self.tree_users.heading("role", text="الصلاحيات للموظف")
        self.tree_users.heading("fullname", text="الاسم الكامل")
        self.tree_users.heading("username", text="اسم المستخدم")
        self.tree_users.heading("id", text="ID")
        
        self.tree_users.column("role", width=120, anchor="center")
        self.tree_users.column("fullname", width=150, anchor="center")
        self.tree_users.column("username", width=120, anchor="center")
        self.tree_users.column("id", width=50, anchor="center")
        
        self.tree_users.pack(fill="both", expand=True)
        
        self.load_users_table()
        
        btn_del = tk.Button(tbl_f, text="🗑️ حذف الحساب المحدد", font=(FONT_FAMILY, 9), bg=COLOR_ALERT, fg="white", activebackground="#D32F2F", activeforeground="white", bd=0, pady=5, command=self.delete_user_row, cursor="hand2")
        btn_del.pack(anchor="w", pady=5)

    def load_users_table(self):
        for r in self.tree_users.get_children():
            self.tree_users.delete(r)
            
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("SELECT id, username, name, role FROM users")
        rows = c.fetchall()
        conn.close()
        
        for r in rows:
            self.tree_users.insert("", "end", values=(
                r[3],
                r[2],
                r[1],
                r[0]
            ))

    def save_new_user(self):
        usr = self.ent_u_username.get().strip()
        name = self.ent_u_fullname.get().strip()
        pwd = self.ent_u_pass.get().strip()
        role_disp = self.cmb_u_role.get()
        
        if not usr or not name or not pwd:
            messagebox.showerror("خطأ", "يجب ملء كافة الحقول لإضافة موظف!")
            return
            
        role = "admin" if "admin" in role_disp else "cashier"
        hashed = hashlib.sha256(pwd.encode()).hexdigest()
        
        try:
            conn = sqlite3.connect(DB_FILE)
            c = conn.cursor()
            c.execute("INSERT INTO users (username, password_hash, name, role) VALUES (?, ?, ?, ?)", (usr, hashed, name, role))
            conn.commit()
            conn.close()
            
            messagebox.showinfo("نجاح", "تمت إضافة المستخدم بنجاح!")
            self.ent_u_username.delete(0, "end")
            self.ent_u_fullname.delete(0, "end")
            self.ent_u_pass.delete(0, "end")
            self.load_users_table()
            
        except sqlite3.IntegrityError:
            messagebox.showerror("خطأ صلاحية", "اسم المستخدم مستخدم بالفعل بالنظام! يرجى اختيار اسم مستخدم مغاير.")
        except Exception as ex:
            messagebox.showerror("خطأ", f"حدث مشكل أثناء تسجيل الموظف: {ex}")

    def delete_user_row(self):
        sel = self.tree_users.selection()
        if not sel:
            messagebox.showwarning("تحديد مفقود", "يرجى اختيار مستخدم من الجدول لحذفه.")
            return
            
        vals = self.tree_users.item(sel[0], "values")
        uid = vals[3]
        username = vals[2]
        
        if username == "admin":
            messagebox.showwarning("ممنوع", "لا يمكنك حذف المدير الافتراضي الرئيسي للنظام!")
            return
            
        if messagebox.askyesno("تأكيد حذف الحساب", f"هل أنت متأكد من رغبتك بإلغاف حساب المستخدم {username} كلياً؟"):
            conn = sqlite3.connect(DB_FILE)
            c = conn.cursor()
            c.execute("DELETE FROM users WHERE id=?", (uid,))
            conn.commit()
            conn.close()
            messagebox.showinfo("نجاح", "تم إسقاط الحساب!")
            self.load_users_table()

    # ==========================================
    # PAGE 8: SYSTEM SETTINGS (⚙️)
    # ==========================================
    def load_page_settings(self):
        title_lbl = tk.Label(self.content_frame, text="⚙️ الإعدادات العامة وتسجيل معطيات سعر الصرف", font=(FONT_FAMILY, 12, "bold"), fg=COLOR_PRIMARY, bg=COLOR_BG)
        title_lbl.pack(anchor="e", padx=15, pady=15)
        
        card = tk.LabelFrame(self.content_frame, text=" إدارة معلمات النظام ", font=(FONT_FAMILY, 10, "bold"), bg=COLOR_CARD_BG, fg=COLOR_PRIMARY, bd=1, padx=25, pady=25)
        card.pack(fill="x", padx=20)
        
        # Inputs alignment
        tk.Label(card, text="اسم السوبرماركت (المتجر):", font=(FONT_FAMILY, 10, "bold"), bg=COLOR_CARD_BG).grid(row=0, column=1, sticky="e", pady=10, padx=10)
        self.ent_s_shopname = ttk.Entry(card, font=(FONT_FAMILY, 10), justify="right", width=35)
        self.ent_s_shopname.grid(row=0, column=0, sticky="w", pady=10)
        self.ent_s_shopname.insert(0, get_setting("shop_name", ""))
        
        tk.Label(card, text="سعر صرف الدولار بالليرة (L.L):", font=(FONT_FAMILY, 10, "bold"), bg=COLOR_CARD_BG).grid(row=1, column=1, sticky="e", pady=10, padx=10)
        self.ent_s_exchange = ttk.Entry(card, font=(FONT_FAMILY, 10), justify="center", width=20)
        self.ent_s_exchange.grid(row=1, column=0, sticky="w", pady=10)
        self.ent_s_exchange.insert(0, get_setting("exchange_rate", "90000"))
        
        tk.Label(card, text="أيام تنبيه انتهاء الصلاحية قبل الحلول:", font=(FONT_FAMILY, 10, "bold"), bg=COLOR_CARD_BG).grid(row=2, column=1, sticky="e", pady=10, padx=10)
        self.ent_s_expiry = ttk.Entry(card, font=(FONT_FAMILY, 10), justify="center", width=20)
        self.ent_s_expiry.grid(row=2, column=0, sticky="w", pady=10)
        self.ent_s_expiry.insert(0, get_setting("expiry_alert_days", "10"))
        
        tk.Label(card, text="تذييل أسفل الفاتورة الحرارية:", font=(FONT_FAMILY, 10, "bold"), bg=COLOR_CARD_BG).grid(row=3, column=1, sticky="e", pady=10, padx=10)
        self.ent_s_footer = ttk.Entry(card, font=(FONT_FAMILY, 10), justify="right", width=35)
        self.ent_s_footer.grid(row=3, column=0, sticky="w", pady=10)
        self.ent_s_footer.insert(0, get_setting("receipt_footer", ""))
        
        btn_update = tk.Button(self.content_frame, text="✅ حفظ وضبط معلمات النظام وتأكيد التغيير", font=(FONT_FAMILY, 11, "bold"), bg=COLOR_PRIMARY, fg="white", activebackground=COLOR_PRIMARY_DARK, activeforeground="white", command=self.save_general_settings, bd=0, padx=25, pady=10, cursor="hand2")
        btn_update.pack(pady=20)

    def save_general_settings(self):
        s_name = self.ent_s_shopname.get().strip()
        s_ex = self.ent_s_exchange.get().strip()
        s_exp = self.ent_s_expiry.get().strip()
        s_foot = self.ent_s_footer.get().strip()
        
        if not s_name or not s_ex or not s_exp:
            messagebox.showerror("خطأ حقول", "يجب توفير حقل الاسم وسعر الصرف وسقف تنبيه الصلاحية!")
            return
            
        try:
            ex_rate = float(s_ex)
            exp_days = int(s_exp)
        except ValueError:
            messagebox.showerror("نوع خطأ", "سعر الصرف يجب أن يكون رقماً (عشري أو كلي)، وأيام التنبيه رقماً صحيحاً فقط!")
            return
            
        update_setting("shop_name", s_name)
        update_setting("exchange_rate", ex_rate)
        update_setting("expiry_alert_days", exp_days)
        update_setting("receipt_footer", s_foot)
        
        # Sync values on runtime
        self.exchange_rate = ex_rate
        self.shop_name = s_name
        
        messagebox.showinfo("تحديث موفق 🔧", "تم تثبيت المعلمات الجديدة لنقطة البيع بنجاح وتعميمها!")
        self.show_main_app()

# Launch Desktop application
if __name__ == "__main__":
    app = POSApplication()
    app.mainloop()
`;
