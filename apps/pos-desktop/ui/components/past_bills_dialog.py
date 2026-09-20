from PyQt6.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QTableWidget, QTableWidgetItem,
    QPushButton, QLabel, QLineEdit, QHeaderView, QAbstractItemView,
    QFrame, QMessageBox, QSplitter
)
from PyQt6.QtCore import Qt, pyqtSignal
from PyQt6.QtGui import QFont
from db.repository import PosRepository
from hardware.printer import printer_service
from hardware.virtual_printer import VirtualReceiptDialog

class PastBillsDialog(QDialog):
    """
    Past Bills Management:
    - View recent bills and their items
    - Search by Bill No or Phone
    - Reprint receipt
    - Recall/Load into Cart to make corrections and re-bill
    """
    bill_recalled = pyqtSignal(dict)  # emits the selected bill record

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("📜 Past Bills History & Reprint")
        self.setMinimumWidth(880)
        self.setMinimumHeight(560)
        self.bills = []
        self.filtered_bills = []
        self.selected_bill = None
        self.init_ui()
        self.load_bills()

    def init_ui(self):
        main_layout = QVBoxLayout(self)
        main_layout.setContentsMargins(16, 16, 16, 16)
        main_layout.setSpacing(12)

        # Header Row
        hdr_row = QHBoxLayout()
        title = QLabel("📜 Past Bills & Transactions")
        title.setStyleSheet("font-size: 17px; font-weight: 900; color: #0F172A;")
        hdr_row.addWidget(title)
        hdr_row.addStretch()

        # Search box
        self.search_input = QLineEdit()
        self.search_input.setPlaceholderText("🔍 Search by Bill No or Customer Phone...")
        self.search_input.setStyleSheet("""
            QLineEdit {
                border: 1px solid #CBD5E1;
                border-radius: 6px;
                padding: 6px 12px;
                font-size: 13px;
                min-width: 300px;
                background-color: #FFFFFF;
            }
            QLineEdit:focus {
                border: 2px solid #16A34A;
            }
        """)
        self.search_input.textChanged.connect(self.filter_bills)
        hdr_row.addWidget(self.search_input)
        main_layout.addLayout(hdr_row)

        # Main Splitter: Left is Bills List, Right is Bill Details & Items
        splitter = QSplitter(Qt.Orientation.Horizontal)
        splitter.setStyleSheet("QSplitter::handle { background-color: #E2E8F0; width: 2px; }")

        # 1. Left Table: Bills List
        left_widget = QFrame()
        left_layout = QVBoxLayout(left_widget)
        left_layout.setContentsMargins(0, 0, 8, 0)
        left_layout.setSpacing(6)

        self.bills_table = QTableWidget(0, 6)
        self.bills_table.setHorizontalHeaderLabels([
            "Bill No", "Time", "Customer", "Items", "Total (₹)", "Mode"
        ])
        self.bills_table.setSelectionBehavior(QAbstractItemView.SelectionBehavior.SelectRows)
        self.bills_table.setEditTriggers(QAbstractItemView.EditTrigger.NoEditTriggers)
        self.bills_table.verticalHeader().setVisible(False)
        self.bills_table.setAlternatingRowColors(True)
        self.bills_table.setStyleSheet("""
            QTableWidget {
                background-color: #FFFFFF;
                border: 1px solid #CBD5E1;
                border-radius: 8px;
                gridline-color: #F1F5F9;
                alternate-background-color: #F8FAFC;
                font-size: 12px;
            }
            QTableWidget::item:selected {
                background-color: #DCFCE7;
                color: #14532D;
            }
            QHeaderView::section {
                background-color: #F1F5F9;
                color: #334155;
                font-weight: 800;
                font-size: 11px;
                padding: 6px 4px;
                border: none;
                border-bottom: 2px solid #CBD5E1;
            }
        """)
        hdr = self.bills_table.horizontalHeader()
        hdr.setSectionResizeMode(0, QHeaderView.ResizeMode.ResizeToContents)
        hdr.setSectionResizeMode(1, QHeaderView.ResizeMode.ResizeToContents)
        hdr.setSectionResizeMode(2, QHeaderView.ResizeMode.Stretch)
        hdr.setSectionResizeMode(3, QHeaderView.ResizeMode.ResizeToContents)
        hdr.setSectionResizeMode(4, QHeaderView.ResizeMode.ResizeToContents)
        hdr.setSectionResizeMode(5, QHeaderView.ResizeMode.ResizeToContents)
        self.bills_table.itemSelectionChanged.connect(self.on_bill_selected)

        left_layout.addWidget(self.bills_table)
        splitter.addWidget(left_widget)

        # 2. Right Pane: Selected Bill Preview & Line Items
        right_widget = QFrame()
        right_layout = QVBoxLayout(right_widget)
        right_layout.setContentsMargins(8, 0, 0, 0)
        right_layout.setSpacing(8)

        self.bill_summary_lbl = QLabel("Select a bill to view details")
        self.bill_summary_lbl.setStyleSheet("font-size: 13px; font-weight: 800; color: #1E293B;")
        right_layout.addWidget(self.bill_summary_lbl)

        self.items_table = QTableWidget(0, 4)
        self.items_table.setHorizontalHeaderLabels(["Item", "Unit", "Qty/Wt", "Total (₹)"])
        self.items_table.setSelectionBehavior(QAbstractItemView.SelectionBehavior.SelectRows)
        self.items_table.setEditTriggers(QAbstractItemView.EditTrigger.NoEditTriggers)
        self.items_table.verticalHeader().setVisible(False)
        self.items_table.setStyleSheet("""
            QTableWidget {
                background-color: #FFFFFF;
                border: 1px solid #CBD5E1;
                border-radius: 8px;
                font-size: 12px;
            }
            QHeaderView::section {
                background-color: #F1F5F9;
                color: #334155;
                font-weight: 800;
                font-size: 11px;
                padding: 6px;
                border: none;
                border-bottom: 2px solid #CBD5E1;
            }
        """)
        ihdr = self.items_table.horizontalHeader()
        ihdr.setSectionResizeMode(0, QHeaderView.ResizeMode.Stretch)
        ihdr.setSectionResizeMode(1, QHeaderView.ResizeMode.ResizeToContents)
        ihdr.setSectionResizeMode(2, QHeaderView.ResizeMode.ResizeToContents)
        ihdr.setSectionResizeMode(3, QHeaderView.ResizeMode.ResizeToContents)
        right_layout.addWidget(self.items_table)

        # Right Action Buttons: Load into Cart & Reprint
        actions_box = QHBoxLayout()
        actions_box.setSpacing(8)

        self.reprint_btn = QPushButton("🧾 View / Reprint Receipt")
        self.reprint_btn.setEnabled(False)
        self.reprint_btn.setStyleSheet("""
            QPushButton {
                background-color: #F1F5F9;
                color: #0F172A;
                border: 1px solid #CBD5E1;
                border-radius: 6px;
                padding: 8px 12px;
                font-weight: 800;
                font-size: 12px;
            }
            QPushButton:hover { background-color: #E2E8F0; }
            QPushButton:disabled { color: #94A3B8; background-color: #F8FAFC; }
        """)
        self.reprint_btn.clicked.connect(self.reprint_bill)
        actions_box.addWidget(self.reprint_btn)

        self.load_cart_btn = QPushButton("🔄 Load into Cart / Re-bill")
        self.load_cart_btn.setEnabled(False)
        self.load_cart_btn.setStyleSheet("""
            QPushButton {
                background-color: #16A34A;
                color: #FFFFFF;
                border: none;
                border-radius: 6px;
                padding: 8px 14px;
                font-weight: 900;
                font-size: 12px;
            }
            QPushButton:hover { background-color: #15803D; }
            QPushButton:disabled { background-color: #94A3B8; }
        """)
        self.load_cart_btn.clicked.connect(self.recall_to_cart)
        actions_box.addWidget(self.load_cart_btn)

        right_layout.addLayout(actions_box)
        splitter.addWidget(right_widget)

        # 60% Left, 40% Right
        splitter.setStretchFactor(0, 3)
        splitter.setStretchFactor(1, 2)
        main_layout.addWidget(splitter, 1)

        # Bottom Done Button
        bot_row = QHBoxLayout()
        bot_row.addStretch()
        close_btn = QPushButton("Close (Esc)")
        close_btn.setStyleSheet("""
            background-color: #E2E8F0;
            color: #334155;
            font-weight: 800;
            border-radius: 6px;
            padding: 8px 20px;
        """)
        close_btn.clicked.connect(self.reject)
        bot_row.addWidget(close_btn)
        main_layout.addLayout(bot_row)

    def load_bills(self):
        try:
            self.bills = PosRepository.get_recent_bills(limit=100)
            self.filter_bills(self.search_input.text())
        except Exception as e:
            QMessageBox.critical(self, "Error", f"Failed to load bills: {e}")

    def filter_bills(self, search_text=""):
        search = (search_text or "").strip().lower()
        if not search:
            self.filtered_bills = list(self.bills)
        else:
            self.filtered_bills = [
                b for b in self.bills
                if search in str(b.get("bill_no", "")).lower()
                or search in str(b.get("customer_phone", "")).lower()
                or search in str(b.get("customer_name", "")).lower()
            ]
        self.render_bills_table()

    def render_bills_table(self):
        self.bills_table.setRowCount(len(self.filtered_bills))
        for row, bill in enumerate(self.filtered_bills):
            # Bill No
            it_no = QTableWidgetItem(bill.get("bill_no", ""))
            it_no.setFont(QFont("Segoe UI", 10, QFont.Weight.Bold))
            self.bills_table.setItem(row, 0, it_no)

            # Time
            created = bill.get("created_at", "")
            time_str = created[11:16] if len(created) >= 16 else created
            it_time = QTableWidgetItem(time_str)
            it_time.setTextAlignment(Qt.AlignmentFlag.AlignCenter)
            self.bills_table.setItem(row, 1, it_time)

            # Customer
            cust_name = bill.get("customer_name") or "Walk-in"
            cust_phone = bill.get("customer_phone")
            cust_str = f"{cust_name} ({cust_phone})" if cust_phone else cust_name
            self.bills_table.setItem(row, 2, QTableWidgetItem(cust_str))

            # Items count
            items_cnt = len(bill.get("items", []))
            it_cnt = QTableWidgetItem(str(items_cnt))
            it_cnt.setTextAlignment(Qt.AlignmentFlag.AlignCenter)
            self.bills_table.setItem(row, 3, it_cnt)

            # Net Total
            net_amt = bill.get("net_amount", 0.0)
            it_amt = QTableWidgetItem(f"₹ {net_amt:.2f}")
            it_amt.setFont(QFont("Segoe UI", 10, QFont.Weight.Bold))
            it_amt.setTextAlignment(Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter)
            self.bills_table.setItem(row, 4, it_amt)

            # Payment mode
            mode = bill.get("payment_mode", "CASH")
            it_mode = QTableWidgetItem(mode)
            it_mode.setTextAlignment(Qt.AlignmentFlag.AlignCenter)
            self.bills_table.setItem(row, 5, it_mode)

            self.bills_table.setRowHeight(row, 32)

        if self.filtered_bills:
            self.bills_table.selectRow(0)
        else:
            self.selected_bill = None
            self.items_table.setRowCount(0)
            self.bill_summary_lbl.setText("No bills found")
            self.reprint_btn.setEnabled(False)
            self.load_cart_btn.setEnabled(False)

    def on_bill_selected(self):
        selected_rows = self.bills_table.selectedIndexes()
        if not selected_rows:
            return
        row = selected_rows[0].row()
        if 0 <= row < len(self.filtered_bills):
            self.selected_bill = self.filtered_bills[row]
            self.display_bill_details(self.selected_bill)
            self.reprint_btn.setEnabled(True)
            self.load_cart_btn.setEnabled(True)

    def display_bill_details(self, bill):
        bill_no = bill.get("bill_no", "")
        cust_name = bill.get("customer_name") or "Walk-in"
        cust_phone = bill.get("customer_phone") or "None"
        net_amt = bill.get("net_amount", 0.0)
        mode = bill.get("payment_mode", "CASH")

        self.bill_summary_lbl.setText(
            f"<b>{bill_no}</b> • {cust_name} ({cust_phone}) • <b>₹ {net_amt:.2f} ({mode})</b>"
        )

        items = bill.get("items", [])
        self.items_table.setRowCount(len(items))
        for row, it in enumerate(items):
            self.items_table.setItem(row, 0, QTableWidgetItem(it.get("name", "Item")))
            unit = it.get("unit", "kg")
            it_unit = QTableWidgetItem(unit)
            it_unit.setTextAlignment(Qt.AlignmentFlag.AlignCenter)
            self.items_table.setItem(row, 1, it_unit)

            qty = it.get("quantity", 1.0)
            qty_str = f"{qty:.3f} kg" if unit == "kg" else f"{qty:.0f} pcs"
            it_qty = QTableWidgetItem(qty_str)
            it_qty.setTextAlignment(Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter)
            self.items_table.setItem(row, 2, it_qty)

            tot = it.get("line_total", 0.0)
            it_tot = QTableWidgetItem(f"₹ {tot:.2f}")
            it_tot.setFont(QFont("Segoe UI", 10, QFont.Weight.Bold))
            it_tot.setTextAlignment(Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter)
            self.items_table.setItem(row, 3, it_tot)
            self.items_table.setRowHeight(row, 28)

    def reprint_bill(self):
        if not self.selected_bill:
            return
        receipt_text = printer_service.format_receipt_text(self.selected_bill)
        dlg = VirtualReceiptDialog(receipt_text, self)
        dlg.exec()

    def recall_to_cart(self):
        if not self.selected_bill:
            return
        confirm = QMessageBox.question(
            self,
            "Load Bill into Active Cart",
            f"Load items from {self.selected_bill.get('bill_no')} into the active cart for editing/re-billing?\n\n"
            "(Any unsaved active bill items will be replaced)",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
        )
        if confirm == QMessageBox.StandardButton.Yes:
            self.bill_recalled.emit(self.selected_bill)
            self.accept()
