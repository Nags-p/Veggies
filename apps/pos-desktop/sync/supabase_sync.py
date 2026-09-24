import datetime
import requests
from config import config
from db.database import get_connection
from db.repository import PosRepository

class SupabaseSyncService:
    """
    Handles 2-way data synchronization between local SQLite POS and Supabase cloud.
    - Pushes pending in-store counter bills to Supabase `orders` and `order_items`
    - Links orders with customer profiles via phone number for customer order tracking
    - Pulls current product catalog and prices from Supabase `products`
    """
    def __init__(self):
        self.url = config.get("sync", "supabase_url", "").rstrip("/")
        self.key = config.get("sync", "supabase_anon_key", "")

    def _get_headers(self, prefer="return=representation"):
        self.url = config.get("sync", "supabase_url", "").rstrip("/")
        self.key = config.get("sync", "supabase_anon_key", "")
        return {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
            "Prefer": prefer
        }

    def is_configured(self):
        self.url = config.get("sync", "supabase_url", "").rstrip("/")
        self.key = config.get("sync", "supabase_anon_key", "")
        return bool(self.url and self.key and not self.url.startswith("https://your-project"))

    def check_online(self):
        """Quick network ping to determine internet connectivity."""
        try:
            r = requests.get(f"{self.url}/rest/v1/", headers=self._get_headers(), timeout=2.5)
            return r.status_code in (200, 404, 401)
        except Exception:
            try:
                r = requests.get("https://1.1.1.1", timeout=2.0)
                return r.status_code == 200
            except Exception:
                return False

    def find_profile_by_phone(self, phone):
        """Look up customer profile in Supabase using phone number."""
        if not self.is_configured() or not phone:
            return None
        clean_digits = "".join(filter(str.isdigit, str(phone)))[-10:]
        if not clean_digits:
            return None
        try:
            endpoint = f"{self.url}/rest/v1/profiles?select=id,full_name,phone&phone=like.*{clean_digits}*&limit=1"
            res = requests.get(endpoint, headers=self._get_headers(), timeout=4)
            if res.status_code == 200:
                data = res.json()
                if data and len(data) > 0:
                    return data[0]
        except Exception as e:
            print(f"[Sync] Error finding profile by phone {phone}: {e}")
        return None

    def lookup_customer_by_phone(self, phone):
        """Helper returning (found: bool, name: str | None, profile_id: str | None)."""
        p = self.find_profile_by_phone(phone)
        if p:
            return True, p.get("full_name"), p.get("id")
        return False, None, None

    def push_pending_bills(self):
        """Pushes pending local bills to cloud database."""
        if not self.is_configured():
            return 0

        pending_bills = PosRepository.get_pending_sync_bills(limit=25)
        if not pending_bills:
            return 0

        headers = self._get_headers(prefer="resolution=merge-duplicates,return=representation")
        synced_ids = []

        for bill in pending_bills:
            try:
                profile_id = bill.get("customer_profile_id")
                cust_phone = bill.get("customer_phone")
                cust_name = bill.get("customer_name") or "Walk-in Customer"

                if not profile_id and cust_phone:
                    p = self.find_profile_by_phone(cust_phone)
                    if p:
                        profile_id = p["id"]
                        cust_name = p.get("full_name") or cust_name

                store_id = config.get("sync", "store_id", "f1111111-1111-1111-1111-111111111111")
                branch_name = config.get("store", "name", "Veggies Store Malleswaram")

                order_payload = {
                    "id": bill["id"],
                    "profile_id": profile_id,
                    "store_id": store_id,
                    "customer_phone": cust_phone,
                    "order_source": "pos",
                    "status": "instore",
                    "total_amount": float(bill["total_amount"]),
                    "discount_amount": float(bill["discount_amount"]),
                    "delivery_fee": 0.0,
                    "net_amount": float(bill["net_amount"]),
                    "payment_method": "online" if bill["payment_mode"] == "UPI" else "COD",
                    "payment_status": "paid",
                    "delivery_notes": f"In-Store Purchase • {branch_name} (Bill #{bill['bill_no']})",
                    "created_at": bill["created_at"]
                }

                order_res = requests.post(
                    f"{self.url}/rest/v1/orders",
                    json=order_payload,
                    headers=headers,
                    timeout=8
                )

                if order_res.status_code not in (200, 201):
                    print(f"[Sync] Failed to upsert order: {order_res.status_code} {order_res.text}")
                    continue

                items_payload = []
                for item in bill.get("items", []):
                    unit = item.get("unit", "kg")
                    qty = item.get("quantity", 1.0)

                    if unit == "kg":
                        display_name = f"{item['item_name']} ({qty:.3f} kg)"
                        item_qty = 1
                        item_price = float(item["line_total"])
                    else:
                        display_name = f"{item['item_name']}"
                        item_qty = max(1, int(round(qty)))
                        item_price = float(item["unit_price"])

                    items_payload.append({
                        "order_id": bill["id"],
                        "product_id": item.get("product_id"),
                        "name": display_name,
                        "price": item_price,
                        "quantity": item_qty,
                        "created_at": bill["created_at"]
                    })

                if items_payload:
                    items_res = requests.post(
                        f"{self.url}/rest/v1/order_items",
                        json=items_payload,
                        headers=headers,
                        timeout=8
                    )
                    if items_res.status_code not in (200, 201):
                        print(f"[Sync] Item insert warning: {items_res.status_code} {items_res.text}. Retrying with product_id=None...")
                        fallback_items = [{**it, "product_id": None} for it in items_payload]
                        retry_res = requests.post(
                            f"{self.url}/rest/v1/order_items",
                            json=fallback_items,
                            headers=headers,
                            timeout=8
                        )
                        if retry_res.status_code not in (200, 201):
                            print(f"[Sync] Fallback item insert error: {retry_res.status_code} {retry_res.text}")

                synced_ids.append(bill["id"])

            except Exception as e:
                print(f"[Sync] Error pushing bill {bill['bill_no']}: {e}")

        if synced_ids:
            PosRepository.mark_bills_synced(synced_ids)

        return len(synced_ids)

    def pull_products(self):
        """Pulls latest product catalog and daily prices from Supabase into local SQLite."""
        if not self.is_configured():
            return 0

        try:
            endpoint = f"{self.url}/rest/v1/products?select=*&or=(is_hidden.is.null,is_hidden.eq.false)"
            res = requests.get(endpoint, headers=self._get_headers(), timeout=8)
            if res.status_code != 200:
                print(f"[Sync] Error fetching products: {res.status_code} {res.text}")
                return 0

            cloud_products = res.json() or []
            if not cloud_products:
                return 0

            conn = get_connection()
            cursor = conn.cursor()
            now = datetime.datetime.now().isoformat()
            updated_count = 0

            for idx, cp in enumerate(cloud_products, 1):
                p_id = cp["id"]
                price = float(cp.get("price") or 0.0)
                name = cp.get("name") or "Product"
                unit = "kg" if ("kg" in str(cp.get("weight", "")).lower()) else "unit"
                images = cp.get("images")
                img_url = images[0] if (images and isinstance(images, list) and len(images) > 0) else None

                # Check if product exists locally
                cursor.execute("SELECT id, plu FROM products WHERE id = ? OR name = ?", (p_id, name))
                existing = cursor.fetchone()
                if existing:
                    cursor.execute("""
                        UPDATE products SET 
                            id = ?, price = ?, is_active = 1, updated_at = ?
                        WHERE id = ?
                    """, (p_id, price, now, existing[0]))
                else:
                    plu = f"{200 + idx}"
                    cursor.execute("""
                        INSERT INTO products (
                            id, plu, barcode, name, regional_name, category, unit, price, stock, is_active, image_url, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 100.0, 1, ?, ?)
                    """, (p_id, plu, plu, name, cp.get("regional_name", ""), "Vegetables", unit, price, img_url, now))
                updated_count += 1

            conn.commit()
            conn.close()
            return updated_count
        except Exception as e:
            print(f"[Sync] Error pulling products: {e}")
            return 0

    def find_profile_by_phone(self, phone_str: str):
        """
        Query Supabase profiles table for customer with matching phone number.
        Returns dict with profile or None.
        """
        if not self.is_configured:
            return None
        try:
            digits = "".join(filter(str.isdigit, str(phone_str)))
            if not digits:
                return None
            clean_10 = digits[-10:]
            endpoint = f"{self.url}/rest/v1/profiles?or=(phone.ilike.*{clean_10}*)&select=id,full_name,phone&limit=1"
            res = requests.get(endpoint, headers=self._get_headers(), timeout=4)
            if res.status_code == 200:
                data = res.json()
                if data and len(data) > 0:
                    return data[0]
            return None
        except Exception as e:
            print(f"[Sync] Customer lookup failed: {e}")
            return None

    def lookup_customer_by_phone(self, phone_str: str):
        """
        Helper returning (found_bool, name_str, profile_id).
        """
        profile = self.find_profile_by_phone(phone_str)
        if profile:
            digits = "".join(filter(str.isdigit, str(phone_str)))[-4:]
            name = profile.get("full_name") or f"Customer ({digits})"
            return True, name, profile.get("id")
        digits = "".join(filter(str.isdigit, str(phone_str)))[-4:]
        return False, f"Customer ({digits})" if digits else "Walk-in Customer", None

supabase_sync = SupabaseSyncService()
