import sqlite3
import datetime
import uuid
from pathlib import Path

DB_FILE = Path(__file__).resolve().parent.parent / "pos_data.db"

def get_connection():
    conn = sqlite3.connect(DB_FILE, timeout=10.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    # 1. Products Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        plu TEXT UNIQUE,
        barcode TEXT UNIQUE,
        name TEXT NOT NULL,
        regional_name TEXT,
        category TEXT NOT NULL,
        unit TEXT NOT NULL DEFAULT 'kg',
        price REAL NOT NULL,
        stock REAL NOT NULL DEFAULT 100.0,
        is_active INTEGER NOT NULL DEFAULT 1,
        image_url TEXT,
        updated_at TEXT NOT NULL
    )
    """)

    # Indexes
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_products_plu ON products(plu)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)")

    # 2. Bills Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS bills (
        id TEXT PRIMARY KEY,
        bill_no TEXT UNIQUE NOT NULL,
        cashier_name TEXT NOT NULL DEFAULT 'Cashier 1',
        total_amount REAL NOT NULL,
        discount_amount REAL NOT NULL DEFAULT 0.0,
        net_amount REAL NOT NULL,
        payment_mode TEXT NOT NULL DEFAULT 'CASH',
        cash_tendered REAL NOT NULL DEFAULT 0.0,
        change_returned REAL NOT NULL DEFAULT 0.0,
        upi_ref TEXT,
        sync_status TEXT NOT NULL DEFAULT 'pending',
        customer_phone TEXT,
        customer_name TEXT,
        customer_profile_id TEXT,
        created_at TEXT NOT NULL,
        synced_at TEXT
    )
    """)

    # Safe migrations for existing DB
    for col in ["customer_phone", "customer_name", "customer_profile_id"]:
        try:
            cursor.execute(f"ALTER TABLE bills ADD COLUMN {col} TEXT")
        except Exception:
            pass

    cursor.execute("CREATE INDEX IF NOT EXISTS idx_bills_sync ON bills(sync_status)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_bills_created ON bills(created_at)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_bills_customer ON bills(customer_phone)")

    # 3. Bill Items Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS bill_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bill_id TEXT NOT NULL,
        product_id TEXT,
        item_name TEXT NOT NULL,
        unit TEXT NOT NULL DEFAULT 'kg',
        quantity REAL NOT NULL,
        unit_price REAL NOT NULL,
        line_total REAL NOT NULL,
        FOREIGN KEY(bill_id) REFERENCES bills(id) ON DELETE CASCADE
    )
    """)

    cursor.execute("CREATE INDEX IF NOT EXISTS idx_bill_items_bill ON bill_items(bill_id)")

    # 4. Held Bills (Park & Recall queue)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS held_bills (
        id TEXT PRIMARY KEY,
        customer_tag TEXT NOT NULL,
        cart_json TEXT NOT NULL,
        created_at TEXT NOT NULL
    )
    """)

    conn.commit()
    seed_default_products(conn)
    conn.close()

def seed_default_products(conn):
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM products")
    if cursor.fetchone()[0] > 0:
        return  # Already seeded

    now = datetime.datetime.now().isoformat()
    # Baseline vegetable catalog with common Indian retail PLU shortcuts
    default_items = [
        # (id, plu, barcode, name, regional_name, category, unit, price, stock, updated_at)
        (str(uuid.uuid4()), "101", "8901001", "Fresh Red Tomato", "Tamatar", "Daily Veggies", "kg", 32.0, 150.0, now),
        (str(uuid.uuid4()), "102", "8901002", "Farm Fresh Onion", "Pyaz", "Daily Veggies", "kg", 45.0, 200.0, now),
        (str(uuid.uuid4()), "103", "8901003", "Golden Potato", "Aloo", "Daily Veggies", "kg", 28.0, 300.0, now),
        (str(uuid.uuid4()), "104", "8901004", "Green Spinach (Palak)", "Palak", "Leafy Veggies", "bunch", 20.0, 80.0, now),
        (str(uuid.uuid4()), "105", "8901005", "Fresh Coriander", "Dhaniya", "Leafy Veggies", "bunch", 15.0, 100.0, now),
        (str(uuid.uuid4()), "106", "8901006", "Crisp Carrot (Ooty)", "Gajar", "Roots", "kg", 55.0, 80.0, now),
        (str(uuid.uuid4()), "107", "8901007", "Green Chilli", "Hari Mirch", "Daily Veggies", "kg", 60.0, 40.0, now),
        (str(uuid.uuid4()), "108", "8901008", "Fresh Ginger", "Adrak", "Roots", "kg", 120.0, 30.0, now),
        (str(uuid.uuid4()), "109", "8901009", "Desi Garlic", "Lehsun", "Roots", "kg", 180.0, 50.0, now),
        (str(uuid.uuid4()), "110", "8901010", "Crisp Cucumber", "Kheera", "Daily Veggies", "kg", 35.0, 90.0, now),
        (str(uuid.uuid4()), "111", "8901011", "Green Bell Pepper (Capsicum)", "Shimla Mirch", "Exotic & Special", "kg", 75.0, 45.0, now),
        (str(uuid.uuid4()), "112", "8901012", "Fresh Cauliflower", "Phool Gobhi", "Daily Veggies", "piece", 40.0, 50.0, now),
        (str(uuid.uuid4()), "113", "8901013", "Green Cabbage", "Patta Gobhi", "Daily Veggies", "kg", 30.0, 60.0, now),
        (str(uuid.uuid4()), "114", "8901014", "Tender Bottle Gourd (Lauki)", "Lauki", "Gourds", "piece", 35.0, 40.0, now),
        (str(uuid.uuid4()), "115", "8901015", "Bitter Gourd (Karela)", "Karela", "Gourds", "kg", 48.0, 35.0, now),
        (str(uuid.uuid4()), "116", "8901016", "Tender Lady Finger (Bhindi)", "Bhindi", "Daily Veggies", "kg", 50.0, 70.0, now),
        (str(uuid.uuid4()), "117", "8901017", "Fresh Lemon", "Nimbu", "Daily Veggies", "piece", 5.0, 200.0, now),
        (str(uuid.uuid4()), "118", "8901018", "Organic Broccoli", "Broccoli", "Exotic & Special", "kg", 120.0, 30.0, now),
        (str(uuid.uuid4()), "119", "8901019", "Fresh Button Mushrooms", "Khumb", "Exotic & Special", "piece", 55.0, 40.0, now),
        (str(uuid.uuid4()), "120", "8901020", "Sweet Banana (Robusta)", "Kela", "Fruits", "kg", 45.0, 100.0, now),
        (str(uuid.uuid4()), "121", "8901021", "Royal Gala Apples", "Seb", "Fruits", "kg", 180.0, 60.0, now),
        (str(uuid.uuid4()), "122", "8901022", "Pomegranate (Anar)", "Anar", "Fruits", "kg", 160.0, 50.0, now),
    ]

    cursor.executemany("""
    INSERT INTO products (id, plu, barcode, name, regional_name, category, unit, price, stock, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, default_items)
    conn.commit()
    print(f"[DB] Initialized with {len(default_items)} default products.")
