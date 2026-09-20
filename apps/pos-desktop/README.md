# 🥕 Veggies POS - In-Store Counter Billing Software

A high-speed, offline-first Point-of-Sale (POS) counter billing system custom-built for physical vegetable and fruit retail stores.

Designed to eliminate annual software licensing fees (saving ₹10,000–₹18,000/yr), give 100% control over daily rate updates, and ensure checkout counters **never freeze or stop billing** even when broadband internet drops.

---

## 🚀 Key Highlights

1. **Lightning-Fast Offline-First Architecture**:
   - Built on local **SQLite (WAL Mode)**. Counter bills take sub-milliseconds to save.
   - Background thread (`SyncWorker`) automatically syncs walk-in sales to Supabase cloud whenever internet is active and pulls down latest store pricing updates.
2. **Native Digital Weighing Scale Integration**:
   - Connects to digital retail scales via RS-232 / USB Serial (`pyserial`).
   - Parses continuous weight indicators in real-time (with tare/zero support and motion/stability detection).
   - **Built-in Scale Simulator Mode**: Sliders and quick buttons (+100g, +250g, +500g, +1kg) so you can test and operate without physical scale hardware.
3. **Thermal Receipt Printing & Cash Drawer (ESC/POS)**:
   - Supports 2-inch (58mm) and 3-inch (80mm) thermal rolls.
   - Outputs itemized breakdown, taxes/discounts, and dynamic BharatQR / UPI QR code.
   - Direct cash drawer kick pulse (`ESC p 0 50 250`).
   - **Virtual Thermal Preview**: Monospace paper modal displays authentic receipt preview on screen without wasting paper rolls.
4. **Numpad & Keyboard Optimized for Counter Speed**:
   - Quick PLU Codes (e.g. `101` for Tomato, `102` for Onion, `103` for Potato).
   - `F1` - Help & Shortcut Cheat Sheet
   - `F2` - Focus Search / PLU Bar
   - `F3` - Tare Scale
   - `F4` - Zero Scale
   - `F7` - Hold Bill (Park cart for indecisive customer)
   - `F8` - Recall Parked Bill
   - `F9` - Instant Bill Discount
   - `F12` or `Enter` - Rapid Checkout & Payment

---

## 🛠️ Installation & Quickstart

### 1. Requirements
Ensure Python 3.10+ is installed on the counter PC.

```bash
cd apps/pos-desktop
pip install -r requirements.txt
```

*(Core dependencies: `PyQt6`, `pyserial`, `python-escpos`, `qrcode[pil]`, `supabase`, `requests`)*

### 2. Launching the POS Application
```bash
python main.py
```

On first launch, the local SQLite database (`pos_data.db`) is automatically initialized and seeded with 22 common fresh vegetables, fruits, and pre-assigned PLU codes.

---

## 🔌 Connecting Physical Hardware

### A. Connecting Digital Weighing Scales
1. Connect your digital scale to the counter PC using an **RS-232 to USB converter cable** (e.g. CH340 or FTDI chipset).
2. Check your Windows Device Manager under **Ports (COM & LPT)** to find the assigned port (e.g. `COM3`).
3. In the POS app, click **⚙️ Settings -> Hardware**:
   - Uncheck *"Enable Virtual Scale Simulator"*.
   - Enter your COM port (e.g., `COM3`).
   - Set the Baud Rate to match your scale indicator (standard scales typically use `9600` or `2400` baud, 8 data bits, no parity, 1 stop bit).
4. Ensure your digital scale indicator is set to **Continuous Stream Mode** (sometimes labeled `Print: Cont` or `Baud: 9600`).

### B. Connecting Thermal Receipt Printers
- **Virtual Preview Mode**: Set Printer Type to `dummy`. Every completed sale opens a visual thermal slip preview dialog.
- **Network / LAN Thermal Printer**: Set Printer Type to `network` and enter printer's local IP (e.g., `192.168.1.200`, port `9100`).
- **USB Thermal Printer**: Set Printer Type to `usb` with vendor & product ID.

---

## ☁️ Supabase Cloud Synchronization

To link the counter POS to your Veggies Supabase backend:
1. Open **⚙️ Settings -> Cloud Sync**.
2. Enter your `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Set your preferred auto-sync interval (default: 60 seconds).
4. Completed offline counter bills will automatically sync into the Supabase `orders` table as delivered walk-in sales.

---

## 🧪 Running Automated Tests

Run the comprehensive unit test suite verifying scale string parsing, SQLite transactions, and receipt calculations:

```bash
cd apps/pos-desktop
python -m unittest tests/test_pos_engine.py
```
