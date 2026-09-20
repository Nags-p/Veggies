import datetime
import json
import uuid
from db.database import get_connection

class PosRepository:
    """Repository handling all local database interactions for high-speed POS billing."""

    @staticmethod
    def get_categories():
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT DISTINCT category FROM products WHERE is_active = 1 ORDER BY category ASC")
        rows = cursor.fetchall()
        conn.close()
        return [row[0] for row in rows]

    @staticmethod
    def get_all_products(category=None):
        conn = get_connection()
        cursor = conn.cursor()
        if category and category != "All":
            cursor.execute("SELECT * FROM products WHERE is_active = 1 AND category = ? ORDER BY name ASC", (category,))
        else:
            cursor.execute("SELECT * FROM products WHERE is_active = 1 ORDER BY name ASC")
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]

    @staticmethod
    def search_products(query):
        if not query or not query.strip():
            return PosRepository.get_all_products()
        q = f"%{query.strip().lower()}%"
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM products 
            WHERE is_active = 1 AND (
                LOWER(name) LIKE ? OR 
                LOWER(regional_name) LIKE ? OR 
                plu = ? OR 
                barcode = ?
            )
            ORDER BY 
                CASE 
                    WHEN plu = ? THEN 1
                    WHEN barcode = ? THEN 2
                    WHEN LOWER(name) LIKE ? THEN 3
                    ELSE 4
                END, name ASC
        """, (q, q, query.strip(), query.strip(), query.strip(), query.strip(), f"{query.strip().lower()}%"))
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]

    @staticmethod
    def find_by_plu_or_barcode(code):
        clean = code.strip()
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM products WHERE is_active = 1 AND (plu = ? OR barcode = ?) LIMIT 1", (clean, clean))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None

    @staticmethod
    def update_product_price(product_id, new_price):
        conn = get_connection()
        cursor = conn.cursor()
        now = datetime.datetime.now().isoformat()
        cursor.execute("UPDATE products SET price = ?, updated_at = ? WHERE id = ?", (new_price, now, product_id))
        conn.commit()
        conn.close()

    @staticmethod
    def generate_bill_number():
        today_str = datetime.datetime.now().strftime("%Y%m%d")
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM bills WHERE bill_no LIKE ?", (f"BILL-{today_str}-%",))
        count = cursor.fetchone()[0] + 1
        conn.close()
        return f"BILL-{today_str}-{count:04d}"

    @staticmethod
    def save_bill(cashier_name, items, discount_amount, payment_mode, cash_tendered, change_returned, upi_ref=None, customer_phone=None, customer_name=None, customer_profile_id=None):
        if not items:
            raise ValueError("Cannot save bill with zero items")

        conn = get_connection()
        cursor = conn.cursor()

        try:
            total_amount = sum(item["line_total"] for item in items)
            net_amount = max(0.0, total_amount - discount_amount)
            bill_id = str(uuid.uuid4())
            bill_no = PosRepository.generate_bill_number()
            now = datetime.datetime.now().isoformat()

            # Insert bill record
            cursor.execute("""
            INSERT INTO bills (
                id, bill_no, cashier_name, total_amount, discount_amount, net_amount, 
                payment_mode, cash_tendered, change_returned, upi_ref, sync_status,
                customer_phone, customer_name, customer_profile_id, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)
            """, (bill_id, bill_no, cashier_name, total_amount, discount_amount, net_amount,
                  payment_mode, cash_tendered, change_returned, upi_ref,
                  customer_phone, customer_name, customer_profile_id, now))

            # Insert line items and adjust local stock
            for item in items:
                cursor.execute("""
                INSERT INTO bill_items (bill_id, product_id, item_name, unit, quantity, unit_price, line_total)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (bill_id, item.get("product_id"), item["name"], item["unit"], item["quantity"], item["unit_price"], item["line_total"]))

                if item.get("product_id"):
                    cursor.execute("""
                    UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?
                    """, (item["quantity"], item["product_id"]))

            conn.commit()
            return {
                "id": bill_id,
                "bill_no": bill_no,
                "total_amount": total_amount,
                "discount_amount": discount_amount,
                "net_amount": net_amount,
                "created_at": now,
                "payment_mode": payment_mode,
                "cash_tendered": cash_tendered,
                "change_returned": change_returned,
                "upi_ref": upi_ref,
                "customer_phone": customer_phone,
                "customer_name": customer_name,
                "customer_profile_id": customer_profile_id,
                "items": items
            }
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()

    @staticmethod
    def get_pending_sync_bills(limit=50):
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM bills WHERE sync_status = 'pending' ORDER BY created_at ASC LIMIT ?", (limit,))
        bills = [dict(r) for r in cursor.fetchall()]

        for bill in bills:
            cursor.execute("SELECT * FROM bill_items WHERE bill_id = ?", (bill["id"],))
            bill["items"] = [dict(it) for it in cursor.fetchall()]

        conn.close()
        return bills

    @staticmethod
    def mark_bills_synced(bill_ids):
        if not bill_ids:
            return
        conn = get_connection()
        cursor = conn.cursor()
        now = datetime.datetime.now().isoformat()
        placeholders = ",".join("?" for _ in bill_ids)
        cursor.execute(f"UPDATE bills SET sync_status = 'synced', synced_at = ? WHERE id IN ({placeholders})", [now] + bill_ids)
        conn.commit()
        conn.close()

    @staticmethod
    def get_today_summary():
        today_prefix = datetime.datetime.now().strftime("%Y-%m-%d")
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 
                COUNT(*) as bill_count,
                COALESCE(SUM(net_amount), 0.0) as total_sales,
                COALESCE(SUM(CASE WHEN payment_mode = 'CASH' THEN net_amount ELSE 0 END), 0.0) as cash_sales,
                COALESCE(SUM(CASE WHEN payment_mode = 'UPI' THEN net_amount ELSE 0 END), 0.0) as upi_sales
            FROM bills
            WHERE created_at LIKE ?
        """, (f"{today_prefix}%",))
        row = dict(cursor.fetchone())
        conn.close()
        return row

    @staticmethod
    def hold_bill(customer_tag, cart_items):
        conn = get_connection()
        cursor = conn.cursor()
        hold_id = str(uuid.uuid4())
        now = datetime.datetime.now().isoformat()
        cart_json = json.dumps(cart_items)
        cursor.execute("""
            INSERT INTO held_bills (id, customer_tag, cart_json, created_at)
            VALUES (?, ?, ?, ?)
        """, (hold_id, customer_tag or "Customer", cart_json, now))
        conn.commit()
        conn.close()
        return hold_id

    @staticmethod
    def get_held_bills():
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM held_bills ORDER BY created_at DESC")
        rows = [dict(r) for r in cursor.fetchall()]
        conn.close()
        for r in rows:
            r["items"] = json.loads(r["cart_json"])
        return rows

    @staticmethod
    def delete_held_bill(hold_id):
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM held_bills WHERE id = ?", (hold_id,))
        conn.commit()
        conn.close()

    @staticmethod
    def get_recent_bills(limit=50):
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, bill_no, cashier_name, total_amount, discount_amount, net_amount, 
                   payment_mode, cash_tendered, change_returned, upi_ref, sync_status,
                   customer_phone, customer_name, customer_profile_id, created_at
            FROM bills
            ORDER BY created_at DESC
            LIMIT ?
        """, (limit,))
        bills = [dict(r) for r in cursor.fetchall()]
        for bill in bills:
            cursor.execute("""
                SELECT id, bill_id, product_id, item_name as name, unit, quantity, unit_price, line_total
                FROM bill_items
                WHERE bill_id = ?
            """, (bill["id"],))
            bill["items"] = [dict(it) for it in cursor.fetchall()]
        conn.close()
        return bills

    @staticmethod
    def get_bill_by_id(bill_id):
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM bills WHERE id = ? OR bill_no = ?", (bill_id, bill_id))
        row = cursor.fetchone()
        if not row:
            conn.close()
            return None
        bill = dict(row)
        cursor.execute("""
            SELECT id, bill_id, product_id, item_name as name, unit, quantity, unit_price, line_total
            FROM bill_items
            WHERE bill_id = ?
        """, (bill["id"],))
        bill["items"] = [dict(it) for it in cursor.fetchall()]
        conn.close()
        return bill
