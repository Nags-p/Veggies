from datetime import datetime
from PyQt6.QtWidgets import (
    QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, QLabel,
    QPushButton, QSplitter, QMessageBox, QInputDialog, QDialog
)
from PyQt6.QtCore import Qt, QTimer
from PyQt6.QtGui import QKeySequence, QShortcut

from config import config
from db.repository import PosRepository
from hardware.scale import ScaleReader
from hardware.scale_simulator import ScaleSimulator
from hardware.printer import printer_service
from hardware.virtual_printer import VirtualReceiptDialog
from sync.sync_worker import SyncWorker
from ui.components.weight_display import WeightDisplayWidget
from ui.components.cart_table import CartTableWidget
from ui.components.fast_entry_bar import FastEntryBarWidget
from ui.components.catalog_dialog import CatalogDialog
from ui.components.payment_dialog import PaymentDialog
from ui.components.settings_dialog import SettingsDialog
from ui.components.customer_dialog import CustomerPhoneDialog
from ui.components.past_bills_dialog import PastBillsDialog

class PosMainWindow(QMainWindow):
    """
    Main POS Counter Window for Veggies physical retail store.
    """
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Veggies POS - Fresh Vegetable & Fruit Retail Terminal")
        self.resize(1280, 800)
        self.cashier_name = "Cashier 1"
        self.active_cart_items = []
        self.gross_amount = 0.0
        self.discount_amount = 0.0
        self.net_amount = 0.0
        self.active_customer = {
            "phone": None,
            "name": "Walk-in Customer",
            "profile_id": None
        }

        self.init_ui()
        self.init_hardware()
        self.init_sync()
        self.setup_shortcuts()
        QTimer.singleShot(150, self.prompt_customer_phone)

    def init_ui(self):
        root_widget = QWidget()
        root_layout = QVBoxLayout(root_widget)
        root_layout.setContentsMargins(0, 0, 0, 0)
        root_layout.setSpacing(0)

        # 1. Top Status Header
        top_header = QWidget()
        top_header.setObjectName("topHeader")
        top_header.setFixedHeight(46)
        h_layout = QHBoxLayout(top_header)
        h_layout.setContentsMargins(16, 4, 16, 4)
        h_layout.setSpacing(12)

        # Brand title & store
        brand_col = QVBoxLayout()
        brand_col.setSpacing(0)
        store_name = config.get("store", "name", "Veggies Fresh Market")
        lbl_title = QLabel(store_name)
        lbl_title.setObjectName("brandTitle")
        lbl_sub = QLabel("POS Checkout Counter • Superfast Weigh & Bill")
        lbl_sub.setObjectName("brandSubtitle")
        brand_col.addWidget(lbl_title)
        brand_col.addWidget(lbl_sub)
        h_layout.addLayout(brand_col)

        h_layout.addStretch()

        # Real-time Clock
        self.clock_lbl = QLabel()
        self.clock_lbl.setObjectName("clockLabel")
        self.update_clock()
        self.clock_timer = QTimer(self)
        self.clock_timer.timeout.connect(self.update_clock)
        self.clock_timer.start(1000)
        h_layout.addWidget(self.clock_lbl)

        # Cashier Tag
        self.cashier_lbl = QLabel(f"Cashier: {self.cashier_name}")
        self.cashier_lbl.setObjectName("cashierBadge")
        h_layout.addWidget(self.cashier_lbl)

        # Network / Cloud Sync status badge
        self.status_badge = QLabel("• Online")
        self.status_badge.setObjectName("statusBadgeOnline")
        h_layout.addWidget(self.status_badge)

        # Sync button
        sync_btn = QPushButton("Sync Cloud")
        sync_btn.setProperty("class", "headerActionBtn")
        sync_btn.clicked.connect(self.on_manual_sync)
        h_layout.addWidget(sync_btn)

        # Daily Sales Summary button
        daily_btn = QPushButton("Day Summary")
        daily_btn.setProperty("class", "headerActionBtn")
        daily_btn.clicked.connect(self.show_daily_stats)
        h_layout.addWidget(daily_btn)

        # Past Bills / History button
        past_btn = QPushButton("Past Bills (F6)")
        past_btn.setProperty("class", "headerActionBtn")
        past_btn.clicked.connect(self.open_past_bills)
        h_layout.addWidget(past_btn)

        # Settings button
        settings_btn = QPushButton("Settings")
        settings_btn.setProperty("class", "headerActionBtn")
        settings_btn.clicked.connect(self.open_settings)
        h_layout.addWidget(settings_btn)

        root_layout.addWidget(top_header, 0)

        # 2. Top Cockpit: Fast Item Search & Speed Keys (Left) + Digital Scale & Weighing (Right)
        top_section = QWidget()
        top_layout = QHBoxLayout(top_section)
        top_layout.setContentsMargins(14, 6, 14, 4)
        top_layout.setSpacing(10)

        self.fast_entry_widget = FastEntryBarWidget()
        self.fast_entry_widget.product_selected.connect(self.on_product_selected)
        self.fast_entry_widget.open_catalog_requested.connect(self.open_full_catalog)
        self.fast_entry_widget.enter_pressed_on_empty.connect(self.on_enter_pressed_on_empty)
        top_layout.addWidget(self.fast_entry_widget, 3)

        self.weight_widget = WeightDisplayWidget()
        self.weight_widget.item_added.connect(self.on_scale_item_added)
        self.weight_widget.tare_requested.connect(self.on_tare)
        self.weight_widget.zero_requested.connect(self.on_zero)
        top_layout.addWidget(self.weight_widget, 2)

        root_layout.addWidget(top_section, 0)

        # 3. Center & Bottom: Full-Width Billed Items Table
        center_widget = QWidget()
        center_layout = QVBoxLayout(center_widget)
        center_layout.setContentsMargins(14, 2, 14, 8)
        center_layout.setSpacing(0)

        self.cart_widget = CartTableWidget()
        self.cart_widget.cart_updated.connect(self.on_cart_updated)
        self.cart_widget.checkout_requested.connect(self.on_checkout)
        self.cart_widget.hold_requested.connect(self.on_hold_bill)
        self.cart_widget.recall_requested.connect(self.on_recall_bill)
        self.cart_widget.discount_requested.connect(self.on_quick_discount)
        self.cart_widget.customer_changed.connect(self.on_customer_changed)
        self.cart_widget.customer_clicked.connect(self.prompt_customer_phone)
        center_layout.addWidget(self.cart_widget, 1)

        root_layout.addWidget(center_widget, 1)

        self.setCentralWidget(root_widget)

    def update_clock(self):
        self.clock_lbl.setText(datetime.now().strftime("%d %b %Y | %I:%M:%S %p"))

    def init_hardware(self):
        use_sim = config.get("hardware", "scale_simulator", True)
        if use_sim:
            self.scale = ScaleSimulator(callback=self.on_hardware_weight_event)
        else:
            port = config.get("hardware", "scale_port", "COM3")
            baud = config.get("hardware", "scale_baudrate", 9600)
            self.scale = ScaleReader(port=port, baudrate=baud, callback=self.on_hardware_weight_event)

        self.scale.start()
        self.weight_widget.set_scale_controller(self.scale)

    def on_hardware_weight_event(self, weight_kg, is_stable, status):
        # Dispatch to UI thread safe widget
        self.weight_widget.update_weight(weight_kg, is_stable, status)

    def on_tare(self):
        if hasattr(self, "scale"):
            self.scale.tare()

    def on_zero(self):
        if hasattr(self, "scale"):
            self.scale.zero()

    def init_sync(self):
        self.sync_worker = SyncWorker(self)
        self.sync_worker.sync_status.connect(self.on_sync_status_updated)
        self.sync_worker.sync_completed.connect(self.on_sync_completed)
        self.sync_worker.start()

    def on_sync_status_updated(self, is_online, message):
        if is_online:
            self.status_badge.setText(f"● {message}")
            self.status_badge.setObjectName("statusBadgeOnline")
        else:
            self.status_badge.setText(f"○ {message}")
            self.status_badge.setObjectName("statusBadgeOffline")
        self.status_badge.setStyleSheet("")
        self.status_badge.style().unpolish(self.status_badge)
        self.status_badge.style().polish(self.status_badge)

    def on_sync_completed(self, pushed, pulled):
        if pushed > 0 or pulled > 0:
            self.statusBar().showMessage(f"Cloud Sync: {pushed} bills uploaded, {pulled} items refreshed.", 4000)
            self.fast_entry_widget.load_products()

    def on_manual_sync(self):
        pushed, pulled = self.sync_worker.trigger_immediate_sync()
        QMessageBox.information(self, "Cloud Sync", f"Manual sync completed!\nUploaded: {pushed} bills\nCatalog updated: {pulled} items")

    def on_product_selected(self, product):
        self.weight_widget.set_selected_product(product)
        self.fast_entry_widget.set_active_product(product)

    def on_scale_item_added(self, item_data):
        self.cart_widget.add_item(item_data)
        # Clear product selection ready for next item
        self.weight_widget.set_selected_product(None)
        self.fast_entry_widget.set_active_product(None)
        self.fast_entry_widget.search_input.setFocus()

    def on_cart_updated(self, items, gross, discount, net):
        self.active_cart_items = items
        self.gross_amount = gross
        self.discount_amount = discount
        self.net_amount = net

    def setup_shortcuts(self):
        # Keep permanent references to QShortcut objects so they are not garbage collected
        self._shortcuts = []
        shortcut_map = [
            (Qt.Key.Key_F1, self.show_shortcuts_help),
            (Qt.Key.Key_F2, self.focus_search),
            (Qt.Key.Key_F3, self.on_tare),
            (Qt.Key.Key_F4, self.on_zero),
            (Qt.Key.Key_F5, self.prompt_customer_phone),
            (Qt.Key.Key_F6, self.open_past_bills),
            (Qt.Key.Key_F7, self.on_hold_bill),
            (Qt.Key.Key_F8, self.on_recall_bill),
            (Qt.Key.Key_F9, self.on_quick_discount),
            (Qt.Key.Key_F10, self.open_full_catalog),
            (Qt.Key.Key_F12, self.on_checkout),
        ]
        for key, handler in shortcut_map:
            sc = QShortcut(QKeySequence(key), self)
            sc.setContext(Qt.ShortcutContext.WindowShortcut)
            sc.activated.connect(handler)
            self._shortcuts.append(sc)

    def open_full_catalog(self):
        """Open full catalog popup dialog if cashier wants to browse by category."""
        dlg = CatalogDialog(self)
        if dlg.exec():
            prod = dlg.get_selected_product()
            if prod:
                self.on_product_selected(prod)

    def prompt_customer_phone(self):
        """Show customer mobile popup dialog."""
        dlg = CustomerPhoneDialog(self, initial_phone=self.active_customer.get("phone") or "")
        if dlg.exec():
            cust = dlg.get_customer_data()
            self.active_customer = cust
            self.cart_widget.set_customer(cust)
        self.fast_entry_widget.search_input.setFocus()
        self.fast_entry_widget.search_input.selectAll()

    def on_customer_changed(self, cust):
        self.active_customer = cust

    def focus_search(self):
        self.fast_entry_widget.search_input.setFocus()
        self.fast_entry_widget.search_input.selectAll()

    def on_enter_pressed_on_empty(self):
        """Called when cashier presses Enter on empty search input -> immediately bills active scale item!"""
        if self.weight_widget.selected_product:
            self.weight_widget.on_add_clicked()
            self.fast_entry_widget.search_input.setFocus()

    def on_enter_pressed(self):
        # 1. If search input has text, process search/PLU selection
        if self.fast_entry_widget.search_input.text().strip():
            self.fast_entry_widget.on_search_enter()
            return
        # 2. If search input is empty, and an item is active on the scale, add to bill!
        if self.weight_widget.selected_product:
            self.weight_widget.on_add_clicked()
            self.fast_entry_widget.search_input.setFocus()

    def keyPressEvent(self, event):
        """Global keypress fallback ensuring F-keys and continuous Enter always trigger regardless of focus."""
        key = event.key()
        if key == Qt.Key.Key_F1:
            self.show_shortcuts_help()
            event.accept()
            return
        elif key == Qt.Key.Key_F2:
            self.focus_search()
            event.accept()
            return
        elif key == Qt.Key.Key_F3:
            self.on_tare()
            event.accept()
            return
        elif key == Qt.Key.Key_F4:
            self.on_zero()
            event.accept()
            return
        elif key == Qt.Key.Key_F5:
            self.prompt_customer_phone()
            event.accept()
            return
        elif key == Qt.Key.Key_F7:
            self.on_hold_bill()
            event.accept()
            return
        elif key == Qt.Key.Key_F8:
            self.on_recall_bill()
            event.accept()
            return
        elif key == Qt.Key.Key_F9:
            self.on_quick_discount()
            event.accept()
            return
        elif key == Qt.Key.Key_F10:
            self.open_full_catalog()
            event.accept()
            return
        elif key == Qt.Key.Key_F12:
            self.on_checkout()
            event.accept()
            return
        elif key in (Qt.Key.Key_Return, Qt.Key.Key_Enter):
            # If search input has text, select the item
            if self.fast_entry_widget.search_input.text().strip():
                self.fast_entry_widget.on_search_enter()
                event.accept()
                return
            # If search input is empty and an item is active on the scale, ADD TO BILL!
            if self.weight_widget.selected_product:
                self.weight_widget.on_add_clicked()
                self.fast_entry_widget.search_input.setFocus()
                event.accept()
                return
        super().keyPressEvent(event)

    def on_quick_discount(self):
        val, ok = QInputDialog.getDouble(self, "Apply Discount", "Enter discount amount in ₹:", 0.0, 0.0, self.gross_amount, 2)
        if ok:
            self.cart_widget.set_discount(val)

    def on_checkout(self):
        if not self.active_cart_items:
            QMessageBox.information(
                self, 
                "Empty Bill", 
                "Please select a vegetable or fruit and add it to the bill before checkout."
            )
            return

        dlg = PaymentDialog(self.net_amount, self)
        if dlg.exec():
            pay_info = dlg.get_payment_details()
            self.complete_sale(pay_info)

    def complete_sale(self, pay_info):
        try:
            # 1. Save Bill in SQLite
            bill_record = PosRepository.save_bill(
                cashier_name=self.cashier_name,
                items=self.active_cart_items,
                discount_amount=self.discount_amount,
                payment_mode=pay_info["payment_mode"],
                cash_tendered=pay_info["cash_tendered"],
                change_returned=pay_info["change_returned"],
                upi_ref=pay_info.get("upi_ref"),
                customer_phone=self.active_customer.get("phone"),
                customer_name=self.active_customer.get("name"),
                customer_profile_id=self.active_customer.get("profile_id")
            )

            # 2. Print Thermal Receipt
            success, msg, receipt_text = printer_service.print_bill(bill_record)

            # 3. Show Virtual Receipt Modal if using virtual preview mode
            if config.get("hardware", "printer_type") == "dummy":
                preview_dlg = VirtualReceiptDialog(receipt_text, self)
                preview_dlg.exec()

            # 4. Clear active cart & prepare fresh customer for next bill
            self.cart_widget.clear_cart()
            self.active_customer = {
                "phone": None,
                "name": "Walk-in Customer",
                "profile_id": None
            }
            self.cart_widget.set_customer(self.active_customer)
            self.fast_entry_widget.set_active_product(None)

            # Prompt customer popup for next customer
            QTimer.singleShot(250, self.prompt_customer_phone)

        except Exception as e:
            QMessageBox.critical(self, "Checkout Error", f"Failed to finalize bill: {e}")

    def on_hold_bill(self):
        if not self.active_cart_items:
            QMessageBox.information(
                self, 
                "Hold Bill", 
                "The active bill is empty. Please add items to the bill before holding."
            )
            return
        tag, ok = QInputDialog.getText(self, "Hold Current Bill", "Enter customer name or basket number:", text="Customer")
        if ok and tag:
            PosRepository.hold_bill(tag, self.active_cart_items)
            self.cart_widget.clear_cart()
            QMessageBox.information(self, "Bill Held", f"Bill for '{tag}' has been parked.")

    def on_recall_bill(self):
        held = PosRepository.get_held_bills()
        if not held:
            QMessageBox.information(self, "Recall Bills", "No held bills in queue.")
            return

        items_str = [f"{h['customer_tag']} ({len(h['items'])} items, {h['created_at'][11:16]})" for h in held]
        choice, ok = QInputDialog.getItem(self, "Recall Held Bill", "Select bill to restore:", items_str, 0, False)
        if ok and choice:
            idx = items_str.index(choice)
            selected_held = held[idx]
            self.cart_widget.clear_cart()
            for item in selected_held["items"]:
                self.cart_widget.add_item(item)
            PosRepository.delete_held_bill(selected_held["id"])

    def show_daily_stats(self):
        stats = PosRepository.get_today_summary()
        msg = f"""
        <b>Today's Counter Sales Summary</b><br><br>
        • Total Bills Generated: <b>{stats['bill_count']}</b><br>
        • Total Revenue: <b>₹ {stats['total_sales']:.2f}</b><br>
        • Cash Collections: <b>₹ {stats['cash_sales']:.2f}</b><br>
        • UPI / Digital Sales: <b>₹ {stats['upi_sales']:.2f}</b>
        """
        QMessageBox.information(self, "Daily Sales Summary", msg)

    def open_past_bills(self):
        dlg = PastBillsDialog(self)
        dlg.bill_recalled.connect(self.on_bill_recalled)
        dlg.exec()

    def on_bill_recalled(self, bill):
        # 1. Clear cart
        self.cart_widget.clear_cart()

        # 2. Set customer
        cust = {
            "phone": bill.get("customer_phone"),
            "name": bill.get("customer_name") or "Walk-in Customer",
            "profile_id": bill.get("customer_profile_id")
        }
        self.active_customer = cust
        self.cart_widget.set_customer(cust)

        # 3. Add items
        for item in bill.get("items", []):
            cart_item = {
                "product_id": item.get("product_id"),
                "name": item.get("name") or item.get("item_name"),
                "unit": item.get("unit", "kg"),
                "quantity": float(item.get("quantity", 1.0)),
                "unit_price": float(item.get("unit_price", 0.0)),
                "line_total": float(item.get("line_total", 0.0)),
                "plu": item.get("plu") or ""
            }
            self.cart_widget.add_item(cart_item)

        # 4. Set discount if any
        if bill.get("discount_amount"):
            self.cart_widget.set_discount(bill["discount_amount"])

        self.statusBar().showMessage(
            f"Bill {bill.get('bill_no')} loaded into cart! Double-click any row to edit Qty, or add/remove items.",
            7000
        )
        self.fast_entry_widget.search_input.setFocus()

    def show_shortcuts_help(self):
        shortcuts_text = """
        <b>Keyboard Shortcuts for Fast Billing:</b><br><br>
        • <b>F1</b> - View Help & Shortcuts<br>
        • <b>F2</b> - Focus Search & PLU Input Box<br>
        • <b>F3</b> - Tare Scale (Set zero with container)<br>
        • <b>F4</b> - Zero Scale (Reset zero offset)<br>
        • <b>F5</b> - Customer Mobile Entry<br>
        • <b>F6</b> - Past Bills History & Reprint / Recall<br>
        • <b>F7</b> - Hold Current Bill (Park cart)<br>
        • <b>F8</b> - Recall Parked Bill<br>
        • <b>F9</b> - Apply Instant Bill Discount<br>
        • <b>F10</b> - Browse Full Product Catalog<br>
        • <b>F12 / Enter</b> - Pay & Print Bill<br>
        • <b>Enter</b> - Add Selected Weighed Item to Bill<br>
        • <b>Esc</b> - Cancel / Close Dialog
        """
        QMessageBox.information(self, "Keyboard Shortcuts", shortcuts_text)

    def open_settings(self):
        dlg = SettingsDialog(self)
        if dlg.exec():
            # Refresh products and store title
            store_name = config.get("store", "name", "Veggies Store Malleswaram")
            self.findChild(QLabel, "brandTitle").setText(store_name)
            self.fast_entry_widget.load_products()

    def closeEvent(self, event):
        if hasattr(self, "scale"):
            self.scale.stop()
        if hasattr(self, "sync_worker"):
            self.sync_worker.stop()
        event.accept()
