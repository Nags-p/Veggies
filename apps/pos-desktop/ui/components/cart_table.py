from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QTableWidget, QTableWidgetItem,
    QPushButton, QLabel, QHeaderView, QFrame, QAbstractItemView, QInputDialog, QLineEdit
)
from PyQt6.QtCore import Qt, pyqtSignal, QRegularExpression
from PyQt6.QtGui import QFont, QRegularExpressionValidator
from sync.supabase_sync import supabase_sync

class CartTableWidget(QWidget):
    """
    GoFrugal-style Invoice / Billed Items Table taking central prominence.
    Wide, clear columns with instant item removal, line totals, and full-width checkout deck.
    Includes inline customer phone lookup (no overlay popups).
    """
    cart_updated = pyqtSignal(list, float, float, float)  # items, gross, discount, net
    checkout_requested = pyqtSignal()
    clear_requested = pyqtSignal()
    hold_requested = pyqtSignal()
    recall_requested = pyqtSignal()
    discount_requested = pyqtSignal()
    customer_changed = pyqtSignal(dict)
    customer_clicked = pyqtSignal()

    def __init__(self, parent=None):
        super().__init__(parent)
        self.items = []
        self.discount_amount = 0.0
        self.customer = {"phone": None, "name": "Walk-in Customer", "profile_id": None}
        self.init_ui()

    def init_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(6)

        # 1. Top Sub-Bar: Customer Info & Bill Status
        top_bar = QHBoxLayout()
        top_bar.setSpacing(8)

        # Customer Bar
        self.customer_bar = QFrame()
        self.customer_bar.setObjectName("customerBar")
        self.customer_bar.setFixedHeight(38)
        self.customer_bar.setStyleSheet("""
            #customerBar {
                background-color: #FFFFFF;
                border: 1px solid #E2E8F0;
                border-radius: 6px;
                padding: 2px 8px;
            }
        """)
        c_layout = QHBoxLayout(self.customer_bar)
        c_layout.setContentsMargins(10, 2, 10, 2)
        c_layout.setSpacing(10)

        self.cust_label = QLabel("Customer: Walk-in")
        self.cust_label.setStyleSheet("font-weight: 700; color: #334155; font-size: 12px;")
        c_layout.addWidget(self.cust_label)

        self.change_cust_btn = QPushButton("Change (F5)")
        self.change_cust_btn.setStyleSheet("""
            QPushButton {
                background-color: #F8FAFC;
                color: #059669;
                border: 1px solid #A7F3D0;
                border-radius: 4px;
                padding: 3px 8px;
                font-size: 11px;
                font-weight: 600;
            }
            QPushButton:hover {
                background-color: #ECFDF5;
                color: #047857;
            }
        """)
        self.change_cust_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        self.change_cust_btn.clicked.connect(self.customer_clicked.emit)
        c_layout.addWidget(self.change_cust_btn)

        self.reset_cust_btn = QPushButton("Reset")
        self.reset_cust_btn.setToolTip("Reset to Walk-in Customer")
        self.reset_cust_btn.setStyleSheet("""
            QPushButton {
                background-color: #F1F5F9;
                color: #475569;
                border: 1px solid #E2E8F0;
                border-radius: 4px;
                padding: 3px 8px;
                font-size: 11px;
                font-weight: 600;
            }
            QPushButton:hover {
                background-color: #E2E8F0;
                color: #0F172A;
            }
        """)
        self.reset_cust_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        self.reset_cust_btn.clicked.connect(self.reset_customer)
        c_layout.addWidget(self.reset_cust_btn)

        top_bar.addWidget(self.customer_bar)

        top_bar.addSpacing(6)

        # Active Bill Counter Tag
        self.count_label = QLabel("Active Invoice (0 items)")
        self.count_label.setStyleSheet("font-size: 13px; font-weight: 700; color: #0F172A;")
        top_bar.addWidget(self.count_label)

        top_bar.addStretch()

        hint_lbl = QLabel("Double-click row to edit Qty  |  Click Remove to delete")
        hint_lbl.setStyleSheet("color: #64748B; font-size: 11px; font-weight: 500;")
        top_bar.addWidget(hint_lbl)

        clear_btn = QPushButton("Clear Bill")
        clear_btn.setStyleSheet("""
            QPushButton {
                color: #DC2626;
                font-weight: 600;
                font-size: 11px;
                background-color: #FEF2F2;
                border: 1px solid #FECACA;
                border-radius: 6px;
                padding: 5px 12px;
            }
            QPushButton:hover {
                background-color: #FEE2E2;
            }
        """)
        clear_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        clear_btn.clicked.connect(self.clear_cart)
        top_bar.addWidget(clear_btn)

        layout.addLayout(top_bar)

        # 2. Main Wide Billed Items Table
        self.table = QTableWidget(0, 8)
        self.table.setHorizontalHeaderLabels([
            "#", "PLU", "ITEM DESCRIPTION", "UNIT", "QTY / WT", "RATE (₹)", "TOTAL (₹)", ""
        ])
        self.table.setSelectionBehavior(QAbstractItemView.SelectionBehavior.SelectRows)
        self.table.setEditTriggers(QAbstractItemView.EditTrigger.NoEditTriggers)
        self.table.cellDoubleClicked.connect(self.on_cell_double_clicked)
        self.table.verticalHeader().setVisible(False)
        self.table.setStyleSheet("""
            QTableWidget {
                background-color: #FFFFFF;
                border: 1px solid #E2E8F0;
                border-radius: 8px;
                gridline-color: #F1F5F9;
                alternate-background-color: #FAFAFA;
                font-size: 13px;
            }
            QTableWidget::item {
                padding: 6px 8px;
            }
            QHeaderView::section {
                background-color: #F8FAFC;
                color: #475569;
                font-weight: 700;
                font-size: 11px;
                padding: 8px;
                border: none;
                border-bottom: 1px solid #E2E8F0;
                letter-spacing: 0.3px;
            }
        """)
        self.table.setAlternatingRowColors(True)

        header = self.table.horizontalHeader()
        header.setSectionResizeMode(0, QHeaderView.ResizeMode.ResizeToContents)
        header.setSectionResizeMode(1, QHeaderView.ResizeMode.ResizeToContents)
        header.setSectionResizeMode(2, QHeaderView.ResizeMode.Stretch)
        header.setSectionResizeMode(3, QHeaderView.ResizeMode.ResizeToContents)
        header.setSectionResizeMode(4, QHeaderView.ResizeMode.ResizeToContents)
        header.setSectionResizeMode(5, QHeaderView.ResizeMode.ResizeToContents)
        header.setSectionResizeMode(6, QHeaderView.ResizeMode.ResizeToContents)
        header.setSectionResizeMode(7, QHeaderView.ResizeMode.Fixed)
        self.table.setColumnWidth(7, 68)

        layout.addWidget(self.table, 1)

        # 3. Bottom Deck: Wide Bill Summary & Fast Settlement
        bottom_deck = QFrame()
        bottom_deck.setObjectName("bottomDeckFrame")
        bottom_deck.setStyleSheet("""
            #bottomDeckFrame {
                background-color: #FFFFFF;
                border: 1px solid #E2E8F0;
                border-radius: 8px;
                padding: 6px 14px;
            }
        """)
        deck_layout = QHBoxLayout(bottom_deck)
        deck_layout.setContentsMargins(12, 6, 12, 6)
        deck_layout.setSpacing(16)

        # Left Side: Bill Stats & Quick Parking Actions
        left_box = QVBoxLayout()
        left_box.setSpacing(4)

        # Stats strip
        stats_row = QHBoxLayout()
        stats_row.setSpacing(16)

        self.lbl_items_stat = QLabel("Items: 0")
        self.lbl_items_stat.setStyleSheet("font-size: 12px; font-weight: 700; color: #475569;")
        stats_row.addWidget(self.lbl_items_stat)

        self.lbl_weight_stat = QLabel("Total Weight: 0.000 kg")
        self.lbl_weight_stat.setStyleSheet("font-size: 12px; font-weight: 700; color: #059669;")
        stats_row.addWidget(self.lbl_weight_stat)
        stats_row.addStretch()
        left_box.addLayout(stats_row)

        # Action Buttons
        btn_row = QHBoxLayout()
        btn_row.setSpacing(6)

        hold_btn = QPushButton("Hold Bill (F7)")
        hold_btn.setStyleSheet("""
            QPushButton {
                background-color: #F8FAFC;
                color: #334155;
                border: 1px solid #CBD5E1;
                border-radius: 6px;
                padding: 6px 12px;
                font-weight: 600;
                font-size: 11px;
            }
            QPushButton:hover {
                background-color: #F1F5F9;
                border-color: #94A3B8;
            }
        """)
        hold_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        hold_btn.clicked.connect(self.hold_requested.emit)
        btn_row.addWidget(hold_btn)

        recall_btn = QPushButton("Recall (F8)")
        recall_btn.setStyleSheet("""
            QPushButton {
                background-color: #F8FAFC;
                color: #334155;
                border: 1px solid #CBD5E1;
                border-radius: 6px;
                padding: 6px 12px;
                font-weight: 600;
                font-size: 11px;
            }
            QPushButton:hover {
                background-color: #F1F5F9;
                border-color: #94A3B8;
            }
        """)
        recall_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        recall_btn.clicked.connect(self.recall_requested.emit)
        btn_row.addWidget(recall_btn)

        disc_btn = QPushButton("Discount (F9)")
        disc_btn.setStyleSheet("""
            QPushButton {
                background-color: #F8FAFC;
                color: #334155;
                border: 1px solid #CBD5E1;
                border-radius: 6px;
                padding: 6px 12px;
                font-weight: 600;
                font-size: 11px;
            }
            QPushButton:hover {
                background-color: #F1F5F9;
                border-color: #94A3B8;
            }
        """)
        disc_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        disc_btn.clicked.connect(self.discount_requested.emit)
        btn_row.addWidget(disc_btn)

        left_box.addLayout(btn_row)
        deck_layout.addLayout(left_box, 1)

        # Right Side: Financial Breakdown & NET PAYABLE
        right_box = QHBoxLayout()
        right_box.setSpacing(14)

        # Subtotals Column
        subtot_col = QVBoxLayout()
        subtot_col.setSpacing(2)
        subtot_col.setAlignment(Qt.AlignmentFlag.AlignVCenter)

        row_g = QHBoxLayout()
        lbl_g = QLabel("Gross:")
        lbl_g.setStyleSheet("color: #64748B; font-weight: 600; font-size: 11px;")
        self.val_gross = QLabel("₹ 0.00")
        self.val_gross.setStyleSheet("font-weight: 700; color: #1E293B; font-size: 12px; font-family: 'Segoe UI', monospace;")
        row_g.addWidget(lbl_g)
        row_g.addSpacing(6)
        row_g.addWidget(self.val_gross)
        subtot_col.addLayout(row_g)

        row_d = QHBoxLayout()
        lbl_d = QLabel("Discount:")
        lbl_d.setStyleSheet("color: #64748B; font-weight: 600; font-size: 11px;")
        self.val_disc = QLabel("- ₹ 0.00")
        self.val_disc.setStyleSheet("font-weight: 700; color: #059669; font-size: 12px; font-family: 'Segoe UI', monospace;")
        row_d.addWidget(lbl_d)
        row_d.addSpacing(6)
        row_d.addWidget(self.val_disc)
        subtot_col.addLayout(row_d)

        right_box.addLayout(subtot_col)

        # NET PAYABLE Card
        net_card = QFrame()
        net_card.setStyleSheet("""
            background-color: #ECFDF5;
            border: 1px solid #A7F3D0;
            border-radius: 6px;
            padding: 4px 16px;
        """)
        net_card_layout = QVBoxLayout(net_card)
        net_card_layout.setContentsMargins(6, 2, 6, 2)
        net_card_layout.setSpacing(0)
        net_card_layout.setAlignment(Qt.AlignmentFlag.AlignCenter)

        lbl_net_title = QLabel("NET PAYABLE")
        lbl_net_title.setStyleSheet("font-size: 10px; font-weight: 800; color: #065F46; letter-spacing: 0.5px;")
        lbl_net_title.setAlignment(Qt.AlignmentFlag.AlignCenter)
        net_card_layout.addWidget(lbl_net_title)

        self.val_net = QLabel("₹ 0.00")
        self.val_net.setStyleSheet("""
            font-size: 22px;
            font-weight: 800;
            color: #047857;
            font-family: 'Segoe UI', monospace;
        """)
        self.val_net.setAlignment(Qt.AlignmentFlag.AlignCenter)
        net_card_layout.addWidget(self.val_net)

        right_box.addWidget(net_card)

        # Checkout Button
        self.checkout_btn = QPushButton("PAY & PRINT (F12)")
        self.checkout_btn.setObjectName("checkoutBtn")
        self.checkout_btn.setStyleSheet("""
            #checkoutBtn {
                background-color: #059669;
                color: #FFFFFF;
                font-size: 14px;
                font-weight: 800;
                letter-spacing: 0.3px;
                border-radius: 6px;
                padding: 8px 20px;
                min-height: 40px;
                border: none;
            }
            #checkoutBtn:hover {
                background-color: #047857;
            }
            #checkoutBtn:pressed {
                background-color: #065F46;
            }
        """)
        self.checkout_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        self.checkout_btn.clicked.connect(self.checkout_requested.emit)
        right_box.addWidget(self.checkout_btn)

        deck_layout.addLayout(right_box)
        layout.addWidget(bottom_deck)

    def focus_customer_input(self):
        self.customer_clicked.emit()

    def reset_customer(self):
        self.customer = {"phone": None, "name": "Walk-in Customer", "profile_id": None}
        self.set_customer(self.customer)
        self.customer_changed.emit(self.customer)

    def set_customer(self, customer_data):
        self.customer = customer_data or {"phone": None, "name": "Walk-in Customer", "profile_id": None}
        if self.customer.get("phone"):
            self.cust_label.setText(f"{self.customer['name']} ({self.customer['phone']})")
            self.cust_label.setStyleSheet("font-weight: 700; color: #047857; font-size: 12px;")
            self.customer_bar.setStyleSheet("""
                #customerBar {
                    background-color: #ECFDF5;
                    border: 1px solid #A7F3D0;
                    border-radius: 6px;
                    padding: 2px 8px;
                }
            """)
        else:
            self.cust_label.setText("Customer: Walk-in")
            self.cust_label.setStyleSheet("font-weight: 700; color: #334155; font-size: 12px;")
            self.customer_bar.setStyleSheet("""
                #customerBar {
                    background-color: #FFFFFF;
                    border: 1px solid #E2E8F0;
                    border-radius: 6px;
                    padding: 2px 8px;
                }
            """)

    def add_item(self, item_data):
        self.items.append(item_data)
        self.refresh_table()

    def remove_item(self, index):
        if 0 <= index < len(self.items):
            self.items.pop(index)
            self.refresh_table()

    def on_cell_double_clicked(self, row, col):
        self.prompt_edit_quantity(row)

    def prompt_edit_quantity(self, row):
        if not (0 <= row < len(self.items)):
            return
        item = self.items[row]
        unit = item.get("unit", "kg")
        curr_qty = item.get("quantity", 1.0)
        item_name = item.get("name", "Item")
        title = f"Edit Item - {item_name}"
        label = f"Enter new {'weight (kg)' if unit == 'kg' else 'quantity (pcs)'} for {item_name}:"
        val, ok = QInputDialog.getDouble(
            self, title, label, float(curr_qty), 0.0, 9999.0, 3 if unit == "kg" else 0
        )
        if ok:
            if val <= 0.0001:
                self.remove_item(row)
            else:
                item["quantity"] = val
                item["line_total"] = round(val * item["unit_price"], 2)
                self.refresh_table()

    def clear_cart(self):
        self.items = []
        self.discount_amount = 0.0
        self.refresh_table()
        self.clear_requested.emit()

    def set_discount(self, amount):
        self.discount_amount = max(0.0, float(amount))
        self.refresh_table()

    def refresh_table(self):
        self.table.setRowCount(len(self.items))
        gross = 0.0
        total_wt = 0.0

        for row, item in enumerate(self.items):
            gross += item["line_total"]
            unit = item.get("unit", "kg")
            qty = item.get("quantity", 1.0)
            if unit == "kg":
                total_wt += qty

            # 0: #
            it_idx = QTableWidgetItem(str(row + 1))
            it_idx.setTextAlignment(Qt.AlignmentFlag.AlignCenter)
            self.table.setItem(row, 0, it_idx)

            # 1: PLU
            plu_val = str(item.get("plu") or "-")
            it_plu = QTableWidgetItem(plu_val)
            it_plu.setTextAlignment(Qt.AlignmentFlag.AlignCenter)
            it_plu.setForeground(Qt.GlobalColor.darkGray)
            self.table.setItem(row, 1, it_plu)

            # 2: Item Description
            it_name = QTableWidgetItem(item["name"])
            it_name.setFont(QFont("Segoe UI", 10, QFont.Weight.DemiBold))
            self.table.setItem(row, 2, it_name)

            # 3: Unit
            it_unit = QTableWidgetItem(unit)
            it_unit.setTextAlignment(Qt.AlignmentFlag.AlignCenter)
            self.table.setItem(row, 3, it_unit)

            # 4: Qty / Weight
            if unit == "kg":
                qty_str = f"{qty:.3f} kg"
            else:
                qty_str = f"{qty:.0f} pcs"
            it_qty = QTableWidgetItem(qty_str)
            it_qty.setTextAlignment(Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter)
            it_qty.setFont(QFont("Segoe UI", 10, QFont.Weight.DemiBold))
            self.table.setItem(row, 4, it_qty)

            # 5: Rate
            it_rate = QTableWidgetItem(f"₹ {item['unit_price']:.2f}")
            it_rate.setTextAlignment(Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter)
            self.table.setItem(row, 5, it_rate)

            # 6: Line Total
            it_total = QTableWidgetItem(f"₹ {item['line_total']:.2f}")
            it_total.setTextAlignment(Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter)
            it_total.setFont(QFont("Segoe UI", 10, QFont.Weight.Bold))
            it_total.setForeground(Qt.GlobalColor.darkGreen)
            self.table.setItem(row, 6, it_total)

            # 7: Delete button
            del_btn = QPushButton("Remove")
            del_btn.setStyleSheet("""
                QPushButton {
                    color: #DC2626;
                    font-size: 11px;
                    font-weight: 600;
                    background: #FEF2F2;
                    border: 1px solid #FECACA;
                    border-radius: 4px;
                    padding: 3px 6px;
                }
                QPushButton:hover {
                    background: #FEE2E2;
                    border-color: #F87171;
                }
            """)
            del_btn.setCursor(Qt.CursorShape.PointingHandCursor)
            del_btn.clicked.connect(lambda _, r=row: self.remove_item(r))
            self.table.setCellWidget(row, 7, del_btn)

            self.table.setRowHeight(row, 36)

        net = max(0.0, gross - self.discount_amount)
        self.count_label.setText(f"Active Invoice ({len(self.items)} items)")
        self.lbl_items_stat.setText(f"Items: {len(self.items)}")
        self.lbl_weight_stat.setText(f"Total Weight: {total_wt:.3f} kg")
        self.val_gross.setText(f"₹ {gross:.2f}")
        self.val_disc.setText(f"- ₹ {self.discount_amount:.2f}")
        self.val_net.setText(f"₹ {net:.2f}")
        self.cart_updated.emit(self.items, gross, self.discount_amount, net)
