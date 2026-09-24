from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QGridLayout, QLabel,
    QLineEdit, QPushButton, QFrame
)
from PyQt6.QtGui import QFont, QRegularExpressionValidator
from PyQt6.QtCore import Qt, pyqtSignal, QRegularExpression
from sync.supabase_sync import supabase_sync

class CustomerEntryScreen(QWidget):
    """
    Dedicated start screen for cashier to capture customer phone number
    before starting each bill. Transitions seamlessly into the billing cockpit
    without floating modal window overlays.
    """
    customer_confirmed = pyqtSignal(dict)  # {"phone": ..., "name": ..., "profile_id": ...}

    def __init__(self, parent=None):
        super().__init__(parent)
        self.init_ui()

    def init_ui(self):
        root_layout = QVBoxLayout(self)
        root_layout.setContentsMargins(20, 20, 20, 20)
        root_layout.setAlignment(Qt.AlignmentFlag.AlignCenter)

        # Centered Container Card
        card = QFrame()
        card.setObjectName("customerEntryCard")
        card.setFixedWidth(520)
        card.setStyleSheet("""
            #customerEntryCard {
                background-color: #FFFFFF;
                border: 1px solid #E2E8F0;
                border-radius: 12px;
                padding: 10px;
            }
        """)
        card_layout = QVBoxLayout(card)
        card_layout.setContentsMargins(28, 28, 28, 28)
        card_layout.setSpacing(16)

        # 1. Header Section
        header_layout = QVBoxLayout()
        header_layout.setSpacing(4)
        header_layout.setAlignment(Qt.AlignmentFlag.AlignCenter)

        title_lbl = QLabel("Customer Check-in")
        title_lbl.setStyleSheet("font-size: 20px; font-weight: 800; color: #0F172A; letter-spacing: -0.3px;")
        title_lbl.setAlignment(Qt.AlignmentFlag.AlignCenter)

        sub_lbl = QLabel("Enter mobile number for digital receipt & store rewards")
        sub_lbl.setStyleSheet("font-size: 13px; color: #64748B; font-weight: 500;")
        sub_lbl.setAlignment(Qt.AlignmentFlag.AlignCenter)

        header_layout.addWidget(title_lbl)
        header_layout.addWidget(sub_lbl)
        card_layout.addLayout(header_layout)

        card_layout.addSpacing(6)

        # 2. Phone Input Box with Country Code Prefix
        input_container = QFrame()
        input_container.setStyleSheet("""
            QFrame {
                background-color: #F8FAFC;
                border: 2px solid #CBD5E1;
                border-radius: 8px;
            }
            QFrame:focus-within {
                border-color: #059669;
                background-color: #FFFFFF;
            }
        """)
        input_layout = QHBoxLayout(input_container)
        input_layout.setContentsMargins(12, 6, 12, 6)
        input_layout.setSpacing(8)

        prefix_lbl = QLabel("+91")
        prefix_lbl.setStyleSheet("""
            color: #334155;
            font-size: 18px;
            font-weight: 700;
            padding: 4px 8px;
            background-color: #E2E8F0;
            border-radius: 4px;
        """)
        input_layout.addWidget(prefix_lbl)

        self.phone_input = QLineEdit()
        self.phone_input.setPlaceholderText("Enter 10-digit mobile number...")
        self.phone_input.setFont(QFont("Segoe UI", 18, QFont.Weight.Bold))
        self.phone_input.setMaxLength(10)
        self.phone_input.setStyleSheet("""
            QLineEdit {
                border: none;
                background: transparent;
                color: #0F172A;
                padding: 4px 6px;
            }
        """)
        rx = QRegularExpression(r"^[0-9]{0,10}$")
        self.phone_input.setValidator(QRegularExpressionValidator(rx, self))
        self.phone_input.textChanged.connect(self.on_phone_changed)
        self.phone_input.returnPressed.connect(self.on_confirm)
        input_layout.addWidget(self.phone_input, 1)

        card_layout.addWidget(input_container)

        # 3. Dynamic Status / Hint Banner
        self.status_banner = QFrame()
        self.status_banner.setFixedHeight(34)
        self.status_banner.setStyleSheet("background-color: #F8FAFC; border-radius: 6px; padding: 2px 10px;")
        banner_layout = QHBoxLayout(self.status_banner)
        banner_layout.setContentsMargins(8, 2, 8, 2)

        self.status_lbl = QLabel("Press Enter to start billing as Walk-in Customer")
        self.status_lbl.setStyleSheet("color: #64748B; font-size: 11px; font-weight: 500;")
        self.status_lbl.setAlignment(Qt.AlignmentFlag.AlignCenter)
        banner_layout.addWidget(self.status_lbl)

        card_layout.addWidget(self.status_banner)

        # 4. Touch NumPad
        numpad_frame = QFrame()
        numpad_layout = QGridLayout(numpad_frame)
        numpad_layout.setContentsMargins(0, 4, 0, 4)
        numpad_layout.setSpacing(6)

        btn_style = """
            QPushButton {
                background-color: #FFFFFF;
                color: #0F172A;
                border: 1px solid #E2E8F0;
                border-radius: 6px;
                font-size: 15px;
                font-weight: 700;
                min-height: 42px;
            }
            QPushButton:hover {
                background-color: #F1F5F9;
                border-color: #CBD5E1;
            }
            QPushButton:pressed {
                background-color: #E2E8F0;
            }
        """

        digits = [
            ('1', 0, 0), ('2', 0, 1), ('3', 0, 2),
            ('4', 1, 0), ('5', 1, 1), ('6', 1, 2),
            ('7', 2, 0), ('8', 2, 1), ('9', 2, 2),
            ('Clear', 3, 0), ('0', 3, 1), ('Del', 3, 2),
        ]

        for text, r, c in digits:
            b = QPushButton(text)
            b.setStyleSheet(btn_style)
            b.setCursor(Qt.CursorShape.PointingHandCursor)
            if text == 'Clear':
                b.clicked.connect(self.clear_input)
            elif text == 'Del':
                b.clicked.connect(self.backspace_input)
            else:
                b.clicked.connect(lambda _, d=text: self.append_digit(d))
            numpad_layout.addWidget(b, r, c)

        card_layout.addWidget(numpad_frame)

        # 5. Bottom Action Buttons
        btn_box = QHBoxLayout()
        btn_box.setSpacing(10)

        self.walkin_btn = QPushButton("Walk-in Customer")
        self.walkin_btn.setStyleSheet("""
            QPushButton {
                background-color: #F1F5F9;
                color: #475569;
                border: 1px solid #CBD5E1;
                border-radius: 6px;
                padding: 12px 18px;
                font-weight: 600;
                font-size: 13px;
                min-height: 44px;
            }
            QPushButton:hover {
                background-color: #E2E8F0;
                color: #0F172A;
            }
        """)
        self.walkin_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        self.walkin_btn.clicked.connect(self.on_walkin_clicked)
        btn_box.addWidget(self.walkin_btn)

        self.confirm_btn = QPushButton("Start as Walk-in (Enter)")
        self.confirm_btn.setStyleSheet("""
            QPushButton {
                background-color: #059669;
                color: #FFFFFF;
                border: none;
                border-radius: 6px;
                padding: 12px 22px;
                font-weight: 700;
                font-size: 14px;
                letter-spacing: 0.3px;
                min-height: 44px;
            }
            QPushButton:hover {
                background-color: #047857;
            }
            QPushButton:pressed {
                background-color: #065F46;
            }
        """)
        self.confirm_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        self.confirm_btn.clicked.connect(self.on_confirm)
        btn_box.addWidget(self.confirm_btn, 1)

        card_layout.addLayout(btn_box)

        root_layout.addWidget(card)

    def prepare_screen(self, current_phone=""):
        """Reset and focus input for next customer."""
        if current_phone:
            clean = "".join(filter(str.isdigit, str(current_phone)))[-10:]
            self.phone_input.setText(clean)
        else:
            self.phone_input.clear()
            self.on_phone_changed("")
        self.phone_input.setFocus()

    def append_digit(self, d):
        if len(self.phone_input.text()) < 10:
            self.phone_input.setText(self.phone_input.text() + d)

    def clear_input(self):
        self.phone_input.clear()

    def backspace_input(self):
        txt = self.phone_input.text()
        if txt:
            self.phone_input.setText(txt[:-1])

    def on_phone_changed(self, text):
        digits = "".join(filter(str.isdigit, text))
        count = len(digits)

        if count == 0:
            self.confirm_btn.setText("Start as Walk-in (Enter)")
            self.status_lbl.setText("Press Enter on empty input to start billing as Walk-in Customer")
            self.status_lbl.setStyleSheet("color: #64748B; font-size: 11px; font-weight: 500;")
            self.status_banner.setStyleSheet("background-color: #F8FAFC; border-radius: 6px; padding: 2px 10px;")
        elif count < 10:
            self.confirm_btn.setText(f"Need 10 Digits ({count}/10)")
            self.status_lbl.setText(f"Incomplete mobile number: {10 - count} more digit(s) required")
            self.status_lbl.setStyleSheet("color: #D97706; font-size: 11px; font-weight: 600;")
            self.status_banner.setStyleSheet("background-color: #FFFBEB; border: 1px solid #FDE68A; border-radius: 6px; padding: 2px 10px;")
        else:
            self.confirm_btn.setText("Continue to Billing (Enter)")
            self.status_lbl.setText("10-digit number verified. Press Enter to start billing.")
            self.status_lbl.setStyleSheet("color: #047857; font-size: 11px; font-weight: 600;")
            self.status_banner.setStyleSheet("background-color: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 6px; padding: 2px 10px;")

    def on_confirm(self):
        digits = "".join(filter(str.isdigit, self.phone_input.text()))
        if len(digits) == 10:
            clean_phone = f"+91{digits}"
            cust_name = f"Customer ({digits[-4:]})"
            profile_id = None
            try:
                profile = supabase_sync.find_profile_by_phone(clean_phone)
                if profile:
                    cust_name = profile.get("full_name") or cust_name
                    profile_id = profile.get("id")
            except Exception:
                pass

            self.customer_confirmed.emit({
                "phone": clean_phone,
                "name": cust_name,
                "profile_id": profile_id
            })
        elif len(digits) == 0:
            self.on_walkin_clicked()

    def on_walkin_clicked(self):
        self.customer_confirmed.emit({
            "phone": None,
            "name": "Walk-in Customer",
            "profile_id": None
        })
