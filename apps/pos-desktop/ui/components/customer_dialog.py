from PyQt6.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QLabel, QLineEdit,
    QPushButton, QFrame
)
from PyQt6.QtGui import QFont, QRegularExpressionValidator
from PyQt6.QtCore import Qt, QRegularExpression
from sync.supabase_sync import supabase_sync

class CustomerPhoneDialog(QDialog):
    """
    Premium modal popup asking for customer phone number before billing.
    - If empty: pressing Enter skips immediately for walk-in customers.
    - If entering number: Enter is blocked until exactly 10 digits are typed.
    """
    def __init__(self, parent=None, initial_phone=""):
        super().__init__(parent)
        self.setWindowTitle("Customer Check-in")
        self.setFixedWidth(460)
        self.setWindowFlags(self.windowFlags() & ~Qt.WindowType.WindowContextHelpButtonHint)
        self.customer_data = {"phone": None, "name": "Walk-in Customer", "profile_id": None}
        self.init_ui(initial_phone)

    def init_ui(self, current_phone):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(24, 24, 24, 24)
        layout.setSpacing(14)

        # Header Box
        header_frame = QFrame()
        header_frame.setStyleSheet("""
            background-color: #ECFDF5;
            border: 1px solid #A7F3D0;
            border-radius: 8px;
            padding: 10px;
        """)
        h_layout = QVBoxLayout(header_frame)
        h_layout.setSpacing(3)

        title = QLabel("Customer Check-in")
        title.setStyleSheet("font-size: 16px; font-weight: 800; color: #065F46; letter-spacing: -0.2px;")
        title.setAlignment(Qt.AlignmentFlag.AlignCenter)

        sub = QLabel("Enter 10-digit mobile for instant digital receipt & rewards")
        sub.setStyleSheet("font-size: 11px; color: #047857; font-weight: 500;")
        sub.setAlignment(Qt.AlignmentFlag.AlignCenter)

        h_layout.addWidget(title)
        h_layout.addWidget(sub)
        layout.addWidget(header_frame)

        # Input Row with +91 Country Code Prefix
        input_container = QFrame()
        input_container.setStyleSheet("""
            QFrame {
                background-color: #FFFFFF;
                border: 2px solid #CBD5E1;
                border-radius: 8px;
            }
            QFrame:focus-within {
                border-color: #059669;
            }
        """)
        input_layout = QHBoxLayout(input_container)
        input_layout.setContentsMargins(10, 4, 10, 4)
        input_layout.setSpacing(8)

        prefix_lbl = QLabel("+91")
        prefix_lbl.setStyleSheet("""
            color: #334155;
            font-size: 16px;
            font-weight: 700;
            padding: 2px 6px;
            background-color: #F1F5F9;
            border-radius: 4px;
        """)
        input_layout.addWidget(prefix_lbl)

        self.phone_input = QLineEdit()
        self.phone_input.setPlaceholderText("Enter 10-digit mobile number...")
        self.phone_input.setFont(QFont("Segoe UI", 16, QFont.Weight.Bold))
        self.phone_input.setMaxLength(10)
        self.phone_input.setStyleSheet("""
            QLineEdit {
                border: none;
                background: transparent;
                color: #0F172A;
                padding: 4px;
            }
        """)

        rx = QRegularExpression(r"^[0-9]{0,10}$")
        self.phone_input.setValidator(QRegularExpressionValidator(rx, self))

        self.phone_input.returnPressed.connect(self.on_confirm)
        self.phone_input.textChanged.connect(self.on_phone_text_changed)
        input_layout.addWidget(self.phone_input, 1)

        layout.addWidget(input_container)

        # Dynamic Status / Hint label
        self.hint_label = QLabel("Press Enter on empty input to skip as Walk-in Customer")
        self.hint_label.setStyleSheet("color: #64748B; font-size: 11px; font-weight: 500;")
        self.hint_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(self.hint_label)

        # Action Buttons
        btn_row = QHBoxLayout()
        btn_row.setSpacing(10)

        self.skip_btn = QPushButton("Skip (Walk-in)")
        self.skip_btn.setStyleSheet("""
            QPushButton {
                padding: 10px 16px;
                background-color: #F1F5F9;
                color: #475569;
                border: 1px solid #CBD5E1;
                border-radius: 6px;
                font-weight: 600;
                font-size: 12px;
                min-height: 40px;
            }
            QPushButton:hover {
                background-color: #E2E8F0;
                color: #0F172A;
            }
        """)
        self.skip_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        self.skip_btn.clicked.connect(self.on_skip)
        btn_row.addWidget(self.skip_btn)

        self.confirm_btn = QPushButton("Skip as Walk-in (Enter)")
        self.confirm_btn.setDefault(True)
        self.confirm_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        self.confirm_btn.clicked.connect(self.on_confirm)
        btn_row.addWidget(self.confirm_btn, 1)

        layout.addLayout(btn_row)

        if current_phone:
            clean = "".join(filter(str.isdigit, str(current_phone)))[-10:]
            self.phone_input.setText(clean)
        else:
            self.on_phone_text_changed("")

        self.phone_input.setFocus()

    def on_phone_text_changed(self, text):
        digits = "".join(filter(str.isdigit, text))
        count = len(digits)

        if count == 0:
            # Empty -> Can press Enter to skip as walk-in
            self.confirm_btn.setEnabled(True)
            self.confirm_btn.setText("Skip as Walk-in (Enter)")
            self.confirm_btn.setStyleSheet("""
                QPushButton {
                    padding: 10px 20px;
                    background-color: #64748B;
                    color: #FFFFFF;
                    border-radius: 6px;
                    font-weight: 700;
                    font-size: 13px;
                    min-height: 40px;
                    border: none;
                }
                QPushButton:hover {
                    background-color: #475569;
                }
            """)
            self.hint_label.setText("Press Enter on empty input to skip as Walk-in Customer")
            self.hint_label.setStyleSheet("color: #64748B; font-size: 11px; font-weight: 500;")
        elif count < 10:
            # Entering number but not yet 10 digits -> DISABLE Enter button!
            self.confirm_btn.setEnabled(False)
            self.confirm_btn.setText(f"Need 10 Digits ({count}/10)")
            self.confirm_btn.setStyleSheet("""
                QPushButton {
                    padding: 10px 20px;
                    background-color: #F1F5F9;
                    color: #94A3B8;
                    border: 1px solid #E2E8F0;
                    border-radius: 6px;
                    font-weight: 700;
                    font-size: 13px;
                    min-height: 40px;
                }
            """)
            self.hint_label.setText(f"Incomplete phone number: {10 - count} more digit(s) required")
            self.hint_label.setStyleSheet("color: #DC2626; font-size: 11px; font-weight: 600;")
        else:
            # Exactly 10 digits -> ENABLE Enter button!
            self.confirm_btn.setEnabled(True)
            self.confirm_btn.setText("Confirm Customer (Enter)")
            self.confirm_btn.setStyleSheet("""
                QPushButton {
                    padding: 10px 20px;
                    background-color: #059669;
                    color: #FFFFFF;
                    border-radius: 6px;
                    font-weight: 700;
                    font-size: 13px;
                    letter-spacing: 0.3px;
                    min-height: 40px;
                    border: none;
                }
                QPushButton:hover {
                    background-color: #047857;
                }
            """)
            self.hint_label.setText("10-digit number verified. Press Enter to confirm.")
            self.hint_label.setStyleSheet("color: #047857; font-size: 11px; font-weight: 600;")

    def on_confirm(self):
        raw = self.phone_input.text().strip()
        digits = "".join(filter(str.isdigit, raw))

        if not digits:
            self.on_skip()
            return

        if len(digits) < 10:
            return

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

        self.customer_data = {
            "phone": clean_phone,
            "name": cust_name,
            "profile_id": profile_id
        }
        self.accept()

    def on_skip(self):
        self.customer_data = {
            "phone": None,
            "name": "Walk-in Customer",
            "profile_id": None
        }
        self.accept()

    def get_customer(self):
        return self.customer_data

    def get_customer_data(self):
        return self.customer_data
