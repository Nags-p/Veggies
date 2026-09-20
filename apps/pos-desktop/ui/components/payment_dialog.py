import io
from PyQt6.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QLabel, QPushButton,
    QLineEdit, QTabWidget, QWidget, QFrame
)
from PyQt6.QtGui import QFont, QPixmap, QImage
from PyQt6.QtCore import Qt
from config import config

try:
    import qrcode
    QR_AVAILABLE = True
except ImportError:
    QR_AVAILABLE = False

class PaymentDialog(QDialog):
    """
    Rapid checkout payment modal.
    Handles Cash tender & change calculation, Dynamic UPI QR codes, and Card payments.
    """
    def __init__(self, net_amount, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Bill Payment & Settlement")
        self.setMinimumWidth(440)
        self.net_amount = round(float(net_amount), 2)
        self.selected_mode = "CASH"
        self.cash_tendered = self.net_amount
        self.change_due = 0.0
        self.upi_ref = ""
        self.payment_confirmed = False
        self.init_ui()

    def init_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(20, 20, 20, 20)
        layout.setSpacing(14)

        # 1. Total Bill Amount Header Banner (Light Mint Emerald)
        banner = QFrame()
        banner.setStyleSheet("background-color: #F0FDF4; border: 2px solid #86EFAC; border-radius: 10px; padding: 14px;")
        b_layout = QVBoxLayout(banner)
        b_layout.setSpacing(2)

        lbl_top = QLabel("TOTAL PAYABLE AMOUNT")
        lbl_top.setStyleSheet("color: #166534; font-size: 11px; font-weight: 800;")
        lbl_top.setAlignment(Qt.AlignmentFlag.AlignCenter)

        self.lbl_net = QLabel(f"₹ {self.net_amount:.2f}")
        self.lbl_net.setStyleSheet("color: #15803D; font-size: 34px; font-weight: 900; font-family: 'Consolas', monospace;")
        self.lbl_net.setAlignment(Qt.AlignmentFlag.AlignCenter)

        b_layout.addWidget(lbl_top)
        b_layout.addWidget(self.lbl_net)
        layout.addWidget(banner)

        # 2. Payment Method Tabs
        self.tabs = QTabWidget()
        self.tabs.setStyleSheet("""
            QTabWidget::pane { border: 1px solid #E2E8F0; border-radius: 8px; background: white; }
            QTabBar::tab { padding: 10px 24px; font-weight: bold; font-size: 13px; color: #475569; background: #F8FAFC; border: 1px solid #E2E8F0; border-bottom: none; border-top-left-radius: 6px; border-top-right-radius: 6px; margin-right: 4px; }
            QTabBar::tab:selected { background: #16A34A; color: white; border-color: #16A34A; }
        """)

        # Tab A: CASH
        cash_tab = QWidget()
        c_layout = QVBoxLayout(cash_tab)
        c_layout.setContentsMargins(16, 16, 16, 16)
        c_layout.setSpacing(10)

        lbl_tender = QLabel("Cash Tendered from Customer (₹):")
        lbl_tender.setStyleSheet("font-weight: bold; color: #334155;")
        c_layout.addWidget(lbl_tender)

        self.tender_input = QLineEdit(f"{self.net_amount:.2f}")
        self.tender_input.setFont(QFont("Consolas", 18, QFont.Weight.Bold))
        self.tender_input.setStyleSheet("padding: 8px; border: 2px solid #16A34A; border-radius: 8px;")
        self.tender_input.textChanged.connect(self.calculate_change)
        c_layout.addWidget(self.tender_input)

        # Quick Cash Denomination Buttons
        denom_row = QHBoxLayout()
        denom_row.setSpacing(6)
        quick_vals = [
            ("Exact", self.net_amount),
            ("₹ 100", 100.0),
            ("₹ 200", 200.0),
            ("₹ 500", 500.0),
        ]
        for label, val in quick_vals:
            btn = QPushButton(label)
            btn.setStyleSheet("background-color: #F1F5F9; font-weight: bold; padding: 6px; border-radius: 6px;")
            btn.clicked.connect(lambda _, v=val: self.set_tender(v))
            denom_row.addWidget(btn)
        c_layout.addLayout(denom_row)

        # Change Due Display
        change_frame = QFrame()
        change_frame.setStyleSheet("background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 10px;")
        ch_layout = QHBoxLayout(change_frame)
        lbl_ch_title = QLabel("CHANGE TO RETURN:")
        lbl_ch_title.setStyleSheet("font-weight: 800; color: #166534; font-size: 13px;")
        self.lbl_change = QLabel("₹ 0.00")
        self.lbl_change.setStyleSheet("font-size: 22px; font-weight: 900; color: #15803D; font-family: 'Consolas', monospace;")
        ch_layout.addWidget(lbl_ch_title)
        ch_layout.addStretch()
        ch_layout.addWidget(self.lbl_change)
        c_layout.addWidget(change_frame)

        self.tabs.addTab(cash_tab, "💵 CASH")

        # Tab B: UPI / QR
        upi_tab = QWidget()
        u_layout = QVBoxLayout(upi_tab)
        u_layout.setContentsMargins(16, 14, 16, 14)
        u_layout.setSpacing(8)
        u_layout.setAlignment(Qt.AlignmentFlag.AlignCenter)

        upi_id = config.get("store", "upi_id", "veggies@upi")
        lbl_scan = QLabel(f"Scan QR code with GPay / PhonePe / Paytm\nPaying to: {upi_id}")
        lbl_scan.setStyleSheet("color: #475569; font-weight: 600; text-align: center;")
        lbl_scan.setAlignment(Qt.AlignmentFlag.AlignCenter)
        u_layout.addWidget(lbl_scan)

        # Dynamic QR image
        self.qr_label = QLabel()
        self.qr_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.render_upi_qr()
        u_layout.addWidget(self.qr_label)

        self.tabs.addTab(upi_tab, "📱 UPI / QR")

        # Tab C: CARD
        card_tab = QWidget()
        card_layout = QVBoxLayout(card_tab)
        card_layout.setContentsMargins(16, 20, 16, 20)
        card_layout.setSpacing(12)
        lbl_card = QLabel("Swipe or tap customer card on EDC POS Terminal.")
        lbl_card.setStyleSheet("color: #475569; font-size: 13px; font-weight: 600;")
        card_layout.addWidget(lbl_card)

        self.card_ref_input = QLineEdit()
        self.card_ref_input.setPlaceholderText("Enter card approval / invoice code (Optional)")
        card_layout.addWidget(self.card_ref_input)
        card_layout.addStretch()
        self.tabs.addTab(card_tab, "💳 CARD")

        self.tabs.currentChanged.connect(self.on_tab_changed)
        layout.addWidget(self.tabs)

        # 3. Action Buttons (Print & Finish, Cancel)
        btn_row = QHBoxLayout()
        btn_row.setSpacing(10)

        cancel_btn = QPushButton("Cancel (Esc)")
        cancel_btn.setStyleSheet("padding: 10px 16px; background-color: #E2E8F0; font-weight: bold; border-radius: 8px;")
        cancel_btn.clicked.connect(self.reject)
        btn_row.addWidget(cancel_btn)

        self.confirm_btn = QPushButton("🖨️ PRINT RECEIPT & COMPLETE (Enter)")
        self.confirm_btn.setStyleSheet("padding: 12px 20px; background-color: #16A34A; color: white; font-weight: 900; font-size: 14px; border-radius: 8px;")
        self.confirm_btn.setDefault(True)
        self.confirm_btn.clicked.connect(self.on_confirm)
        btn_row.addWidget(self.confirm_btn, 1)

        layout.addLayout(btn_row)

        # Focus tender input
        self.tender_input.selectAll()
        self.tender_input.setFocus()

    def set_tender(self, val):
        self.tender_input.setText(f"{val:.2f}")
        self.calculate_change()

    def calculate_change(self):
        try:
            tender = float(self.tender_input.text() or 0.0)
            self.cash_tendered = tender
            self.change_due = max(0.0, tender - self.net_amount)
            self.lbl_change.setText(f"₹ {self.change_due:.2f}")
        except ValueError:
            self.lbl_change.setText("₹ 0.00")

    def render_upi_qr(self):
        upi_id = config.get("store", "upi_id", "veggies@upi")
        store_name = config.get("store", "name", "Veggies")
        upi_payload = f"upi://pay?pa={upi_id}&pn={store_name}&am={self.net_amount:.2f}&cu=INR"

        if QR_AVAILABLE:
            try:
                qr = qrcode.QRCode(box_size=4, border=1)
                qr.add_data(upi_payload)
                qr.make(fit=True)
                img = qr.make_image(fill_color="black", back_color="white")

                buffer = io.BytesIO()
                img.save(buffer, format="PNG")
                qimage = QImage.fromData(buffer.getvalue())
                pixmap = QPixmap.fromImage(qimage)
                self.qr_label.setPixmap(pixmap)
                return
            except Exception as e:
                print(f"[QR] Error: {e}")

        self.qr_label.setText(f"[Scan to pay ₹{self.net_amount:.2f} to {upi_id}]")
        self.qr_label.setStyleSheet("border: 2px dashed #94A3B8; padding: 20px; font-weight: bold;")

    def on_tab_changed(self, index):
        modes = ["CASH", "UPI", "CARD"]
        self.selected_mode = modes[index] if index < len(modes) else "CASH"

    def on_confirm(self):
        if self.selected_mode == "CASH":
            try:
                tender = float(self.tender_input.text() or 0.0)
                if tender < self.net_amount:
                    self.tender_input.setStyleSheet("border: 2px solid #EF4444; border-radius: 8px; padding: 8px;")
                    return
            except ValueError:
                return

        self.payment_confirmed = True
        self.accept()

    def get_payment_details(self):
        return {
            "payment_mode": self.selected_mode,
            "cash_tendered": self.cash_tendered if self.selected_mode == "CASH" else self.net_amount,
            "change_returned": self.change_due if self.selected_mode == "CASH" else 0.0,
            "upi_ref": "UPI_SCAN" if self.selected_mode == "UPI" else (self.card_ref_input.text().strip() if self.selected_mode == "CARD" else None)
        }
