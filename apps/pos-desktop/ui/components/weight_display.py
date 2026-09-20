from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QPushButton, QFrame, QMessageBox
)
from PyQt6.QtCore import Qt, pyqtSignal
from config import config

class WeightDisplayWidget(QWidget):
    """
    High-visibility digital weight indicator panel.
    Displays real-time scale reading, tare/zero triggers, and computed item subtotal.
    Includes developer/virtual simulator controls when enabled.
    """
    item_added = pyqtSignal(dict)  # Emitted when cashier clicks 'Add Item'
    tare_requested = pyqtSignal()
    zero_requested = pyqtSignal()

    def __init__(self, parent=None):
        super().__init__(parent)
        self.current_weight = 0.0
        self.is_stable = True
        self.selected_product = None
        self.scale_controller = None
        self.is_simulator = config.get("hardware", "scale_simulator", True)
        self.init_ui()

    def set_scale_controller(self, scale):
        self.scale_controller = scale

    def init_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)

        # Outer Scale Container (Light Theme)
        self.panel = QFrame()
        self.panel.setObjectName("scalePanel")
        self.panel.setStyleSheet("""
            #scalePanel {
                background-color: #FFFFFF;
                border-radius: 10px;
                border: 1px solid #CBD5E1;
                padding: 6px 10px;
            }
        """)
        panel_layout = QVBoxLayout(self.panel)
        panel_layout.setContentsMargins(8, 6, 8, 6)
        panel_layout.setSpacing(5)

        # Row 1: Selected Item Title, Rate Pill, and Compact Tare/Zero buttons
        row1 = QHBoxLayout()
        row1.setSpacing(6)
        self.item_title = QLabel("Select an item to weigh")
        self.item_title.setObjectName("scaleItemTitle")
        self.item_title.setStyleSheet("color: #0F172A; font-size: 13px; font-weight: 800;")

        self.rate_label = QLabel("Rate: -")
        self.rate_label.setObjectName("scaleRateLabel")
        self.rate_label.setStyleSheet("color: #1D4ED8; background-color: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 4px; padding: 2px 6px; font-size: 11px; font-weight: 700;")

        row1.addWidget(self.item_title, 1)
        row1.addWidget(self.rate_label)

        self.tare_btn = QPushButton("Tare (F3)")
        self.tare_btn.setStyleSheet("""
            background-color: #F8FAFC;
            color: #334155;
            border: 1px solid #CBD5E1;
            border-radius: 4px;
            padding: 3px 8px;
            font-size: 11px;
            font-weight: 700;
        """)
        self.tare_btn.clicked.connect(self.on_tare_clicked)
        row1.addWidget(self.tare_btn)

        self.zero_btn = QPushButton("Zero (F4)")
        self.zero_btn.setStyleSheet("""
            background-color: #F8FAFC;
            color: #334155;
            border: 1px solid #CBD5E1;
            border-radius: 4px;
            padding: 3px 8px;
            font-size: 11px;
            font-weight: 700;
        """)
        self.zero_btn.clicked.connect(self.on_zero_clicked)
        row1.addWidget(self.zero_btn)

        panel_layout.addLayout(row1)

        # Row 2: Digital Scale Numbers + Computed Subtotal + Add to Bill Button
        row2 = QHBoxLayout()
        row2.setSpacing(8)

        # Live Weight Readout Box
        wt_box = QFrame()
        wt_box.setStyleSheet("background-color: #F0FDF4; border: 2px solid #86EFAC; border-radius: 6px; padding: 2px 6px;")
        wt_layout = QHBoxLayout(wt_box)
        wt_layout.setContentsMargins(6, 2, 6, 2)
        wt_layout.setSpacing(6)

        self.weight_label = QLabel("0.000")
        self.weight_label.setObjectName("scaleWeightDisplay")
        self.weight_label.setStyleSheet("font-family: 'Consolas', monospace; font-size: 26px; font-weight: 900; color: #065F46;")
        self.weight_label.setAlignment(Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter)

        unit_col = QVBoxLayout()
        unit_col.setSpacing(0)
        self.unit_label = QLabel("kg")
        self.unit_label.setStyleSheet("color: #047857; font-size: 11px; font-weight: 800;")
        self.stable_indicator = QLabel("● STABLE")
        self.stable_indicator.setStyleSheet("color: #15803D; font-size: 9px; font-weight: 800;")
        unit_col.addWidget(self.unit_label)
        unit_col.addWidget(self.stable_indicator)
        wt_layout.addWidget(self.weight_label)
        wt_layout.addLayout(unit_col)
        row2.addWidget(wt_box)

        # Item Subtotal Box
        tot_box = QFrame()
        tot_box.setObjectName("scaleItemTotalFrame")
        tot_box.setStyleSheet("background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 2px 8px;")
        price_col = QVBoxLayout(tot_box)
        price_col.setContentsMargins(6, 2, 6, 2)
        price_col.setSpacing(0)
        lbl_amt = QLabel("ITEM TOTAL")
        lbl_amt.setStyleSheet("color: #64748B; font-size: 9px; font-weight: 800;")
        self.amount_label = QLabel("₹ 0.00")
        self.amount_label.setObjectName("scaleTotalAmount")
        self.amount_label.setStyleSheet("font-family: 'Consolas', monospace; font-size: 19px; font-weight: 900; color: #15803D;")
        price_col.addWidget(lbl_amt)
        price_col.addWidget(self.amount_label)
        row2.addWidget(tot_box)

        # Prominent Add to Bill Button
        self.add_btn = QPushButton("➕ ADD TO BILL (Enter)")
        self.add_btn.setObjectName("addScaleItemBtn")
        self.add_btn.setStyleSheet("""
            #addScaleItemBtn {
                background-color: #16A34A;
                color: #FFFFFF;
                font-size: 13px;
                font-weight: 900;
                border-radius: 6px;
                padding: 6px 14px;
                min-height: 38px;
                border: none;
            }
            #addScaleItemBtn:hover {
                background-color: #15803D;
            }
            #addScaleItemBtn:pressed {
                background-color: #166534;
            }
        """)
        self.add_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        self.add_btn.clicked.connect(self.on_add_clicked)
        row2.addWidget(self.add_btn, 1)

        panel_layout.addLayout(row2)

        # Row 3: Simulator Quick Weights (Dev Mode)
        if self.is_simulator:
            sim_row = QHBoxLayout()
            sim_row.setSpacing(4)
            sim_header = QLabel("⚡ Sim:")
            sim_header.setStyleSheet("color: #D97706; font-size: 10px; font-weight: 800;")
            sim_row.addWidget(sim_header)

            for wt_label, wt_val in [("+100g", 0.100), ("+250g", 0.250), ("+500g", 0.500), ("+1kg", 1.000)]:
                b = QPushButton(wt_label)
                b.setStyleSheet("background-color: #FFFFFF; color: #1E293B; border: 1px solid #CBD5E1; border-radius: 4px; padding: 2px 6px; font-size: 10px; font-weight: 700;")
                b.clicked.connect(lambda _, v=wt_val: self.add_sim_weight(v))
                sim_row.addWidget(b)

            clear_sim = QPushButton("Clear")
            clear_sim.setStyleSheet("background-color: #FEE2E2; color: #DC2626; border: 1px solid #FECACA; border-radius: 4px; padding: 2px 6px; font-size: 10px; font-weight: 700;")
            clear_sim.clicked.connect(self.clear_sim_weight)
            sim_row.addWidget(clear_sim)
            sim_row.addStretch()
            panel_layout.addLayout(sim_row)

        layout.addWidget(self.panel)

    def on_tare_clicked(self):
        if self.scale_controller:
            self.scale_controller.tare()
        self.tare_requested.emit()

    def on_zero_clicked(self):
        if self.scale_controller:
            self.scale_controller.zero()
        self.zero_requested.emit()

    def add_sim_weight(self, val):
        if self.scale_controller and hasattr(self.scale_controller, "add_weight"):
            self.scale_controller.add_weight(val)
        else:
            self.update_weight(self.current_weight + val, True)

    def set_sim_weight(self, val):
        if self.scale_controller and hasattr(self.scale_controller, "set_weight"):
            self.scale_controller.set_weight(val)
        else:
            self.update_weight(val, True)

    def clear_sim_weight(self):
        if self.scale_controller and hasattr(self.scale_controller, "zero"):
            self.scale_controller.zero()
        self.set_sim_weight(0.0)

    def set_selected_product(self, product):
        self.selected_product = product
        if product:
            self.item_title.setText(f"{product['name']}")
            self.rate_label.setText(f"Rate: ₹{product['price']:.2f} / {product['unit']}")
            self.unit_label.setText(product["unit"])
            if product["unit"] != "kg":
                # For count/bundle items (e.g. coriander bunch, lemon piece), default to count 1
                self.current_weight = 1.0
                self.weight_label.setText("1.000")
            self.calculate_total()
        else:
            self.item_title.setText("Select an item to weigh")
            self.rate_label.setText("Rate: -")
            self.amount_label.setText("₹ 0.00")

    def update_weight(self, weight_kg, is_stable=True, status=""):
        # If product is unit-based (piece/bunch) and not weight-based, ignore scale weight
        if self.selected_product and self.selected_product.get("unit") != "kg":
            return

        self.current_weight = max(0.0, float(weight_kg))
        self.is_stable = is_stable
        self.weight_label.setText(f"{self.current_weight:.3f}")

        if is_stable:
            self.stable_indicator.setText("● STABLE")
            self.stable_indicator.setStyleSheet("color: #15803D; font-size: 11px; font-weight: 800;")
        else:
            self.stable_indicator.setText("◌ MOTION")
            self.stable_indicator.setStyleSheet("color: #D97706; font-size: 11px; font-weight: 800;")

        self.calculate_total()

    def calculate_total(self):
        if not self.selected_product:
            self.amount_label.setText("₹ 0.00")
            return

        unit_price = float(self.selected_product.get("price", 0.0))
        total = round(self.current_weight * unit_price, 2)
        self.amount_label.setText(f"₹ {total:.2f}")

    def on_add_clicked(self):
        if not self.selected_product:
            return

        weight_to_bill = self.current_weight
        if weight_to_bill <= 0.0:
            if self.is_simulator or self.selected_product.get("unit") != "kg":
                weight_to_bill = 1.0
                self.update_weight(1.0, True)
            else:
                QMessageBox.warning(
                    self, 
                    "Zero Weight", 
                    "The scale reads 0.000 kg. Place the items on the scale before adding."
                )
                return

        unit_price = float(self.selected_product["price"])
        line_total = round(weight_to_bill * unit_price, 2)

        item_data = {
            "product_id": self.selected_product.get("id"),
            "plu": self.selected_product.get("plu", "-"),
            "name": self.selected_product["name"],
            "unit": self.selected_product.get("unit", "kg"),
            "quantity": weight_to_bill,
            "unit_price": unit_price,
            "line_total": line_total
        }
        self.item_added.emit(item_data)
