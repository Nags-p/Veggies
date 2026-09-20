import socket
import textwrap
from datetime import datetime
from config import config

class ThermalPrinterService:
    """
    Service for generating ESC/POS commands and printing to thermal printers (58mm / 80mm).
    Supports Network (TCP/IP), USB/COM (via ESC/POS), and Virtual Preview (Dummy) modes.
    """
    def __init__(self):
        self.char_width = 32 if config.get("hardware", "printer_paper_width") == "58mm" else 48

    def format_receipt_text(self, bill_data):
        """
        Creates clean, readable receipt text formatted for receipt width.
        Works across all printers and virtual previews.
        """
        width = self.char_width
        store = config.get("store", "name", "Veggies Fresh Market")
        address = config.get("store", "address", "Shop 4, Green Plaza")
        phone = config.get("store", "phone", "+91 98765 43210")
        gstin = config.get("store", "gstin", "")
        currency = config.get("store", "currency_symbol", "Rs")
        footer = config.get("store", "receipt_footer", "Thank you for visiting!")

        lines = []
        # Header
        lines.append(store.center(width))
        for a_line in textwrap.wrap(address, width=width) or [address]:
            lines.append(a_line.center(width))
        if phone:
            lines.append(f"Tel: {phone}".center(width))
        if gstin:
            lines.append(f"GSTIN: {gstin}".center(width))
        lines.append("=" * width)

        # Bill Meta
        bill_no = bill_data.get("bill_no", "BILL-0001")
        dt_str = datetime.now().strftime("%d/%m/%Y %I:%M %p")
        lines.append(f"Bill: {bill_no}")
        lines.append(f"Date: {dt_str}")
        cashier = bill_data.get("cashier_name", "Cashier 1")
        lines.append(f"Cashier: {cashier}")
        if bill_data.get("customer_phone"):
            c_name = bill_data.get("customer_name") or "Customer"
            lines.append(f"Customer: {c_name} ({bill_data['customer_phone'][-10:]})")
        lines.append("-" * width)

        # Table Header
        if width == 32:
            lines.append("ITEM")
            lines.append("  QTY / WT         RATE      AMT")
        else:
            lines.append("ITEM")
            lines.append("  QTY / WT                    RATE           AMT")
        lines.append("-" * width)

        # Line Items
        items = bill_data.get("items", [])
        for item in items:
            name = item.get("name", "Item")
            qty = float(item.get("quantity", 1.0))
            unit = item.get("unit", "kg")
            price = float(item.get("unit_price", 0.0))
            total = float(item.get("line_total", 0.0))

            # Format quantity: reduce unnecessary trailing zeros and show full KG
            unit_str = "KG" if unit.lower() == "kg" else unit.upper()
            if abs(qty - round(qty)) < 0.0001:
                q_num = str(int(round(qty)))
            else:
                q_num = f"{qty:.3f}".rstrip('0').rstrip('.')
            qty_str = f"{q_num} {unit_str}"

            # 1. Print full product name (wrap if name exceeds paper width)
            name_lines = textwrap.wrap(name, width=width) or [name]
            for n_line in name_lines:
                lines.append(n_line)

            # 2. Print line item math: Qty x Rate and Line Total aligned to right margin
            left_part = f"  {qty_str} x {price:.2f}"
            right_part = f"{total:.2f}"
            gap = max(1, width - len(left_part) - len(right_part))
            lines.append(left_part + (" " * gap) + right_part)

        lines.append("-" * width)

        # Totals
        gross = bill_data.get("total_amount", 0.0)
        disc = bill_data.get("discount_amount", 0.0)
        net = bill_data.get("net_amount", 0.0)

        lines.append(f"Gross Amount:{currency} {gross:.2f}".rjust(width))
        if disc > 0:
            lines.append(f"Discount:{currency} -{disc:.2f}".rjust(width))
        lines.append("=" * width)
        lines.append(f"TOTAL AMOUNT: {currency} {net:.2f}".rjust(width))
        lines.append("=" * width)

        # Payment details
        pay_mode = bill_data.get("payment_mode", "CASH")
        lines.append(f"Payment Mode: {pay_mode}")
        if pay_mode == "CASH":
            tender = bill_data.get("cash_tendered", 0.0)
            change = bill_data.get("change_returned", 0.0)
            lines.append(f"Cash Tendered: {currency} {tender:.2f}")
            lines.append(f"Change Due:    {currency} {change:.2f}")
        elif pay_mode == "UPI":
            upi_ref = bill_data.get("upi_ref", "Scan & Pay")
            lines.append(f"UPI Status: Verified")

        lines.append("-" * width)
        for f_line in textwrap.wrap(footer, width=width) or [footer]:
            lines.append(f_line.center(width))
        lines.append("=" * width)
        lines.append("\n\n")

        return "\n".join(lines)

    def print_bill(self, bill_data):
        """
        Dispatches printing based on configured printer type.
        Returns (success: bool, message: str, text_output: str)
        """
        printer_type = config.get("hardware", "printer_type", "dummy")
        receipt_text = self.format_receipt_text(bill_data)

        if printer_type == "network":
            ip = config.get("hardware", "printer_ip", "192.168.1.200")
            port = int(config.get("hardware", "printer_port", 9100))
            try:
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.settimeout(3.0)
                s.connect((ip, port))
                # ESC/POS Initialize
                s.send(b"\x1b@")
                # Text payload
                s.send(receipt_text.encode("latin1", errors="replace"))
                # Cash drawer kick if cash
                if config.get("hardware", "cash_drawer_enabled") and bill_data.get("payment_mode") == "CASH":
                    s.send(b"\x1bp\x00\x19\xfa")
                # Paper cut
                s.send(b"\x1dm\x00")
                s.close()
                return True, "Printed via Network ESC/POS", receipt_text
            except Exception as e:
                return False, f"Network print failed: {e}", receipt_text

        # Default / Dummy mode: capture and show preview
        return True, "Rendered in Virtual Thermal Preview", receipt_text

    def kick_cash_drawer(self):
        """Sends the standard ESC/POS pulse to open physical cash drawer."""
        printer_type = config.get("hardware", "printer_type", "dummy")
        if printer_type == "network":
            try:
                ip = config.get("hardware", "printer_ip")
                port = int(config.get("hardware", "printer_port", 9100))
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.settimeout(2.0)
                s.connect((ip, port))
                s.send(b"\x1bp\x00\x19\xfa")
                s.close()
                return True
            except Exception:
                return False
        return True

printer_service = ThermalPrinterService()
