from PyQt6.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QLabel, QLineEdit,
    QPushButton, QFrame
)
from PyQt6.QtGui import QFont, QRegularExpressionValidator
from PyQt6.QtCore import Qt, QRegularExpression
from sync.supabase_sync import supabase_sync

class CustomerPhoneDialog(QDialog):
    """
    Rapid modal asking for customer phone number before billing.
    - If empty: pressing Enter skips immediately for walk-in customers.
    - If entering number: Enter is blocked until exactly 10 digits are typed.
    """
    def __init__(self, parent=None, initial_phone=""):
        super().__init__(parent)
        self.setWindowTitle("Customer Lookup & Digital Receipt")
        self.setFixedWidth(460)
        self.customer_data = {"phone": None, "name": "Walk-in Customer", "profile_id": None}
        self.init_ui(initial_phone)

    def init_ui(self, current_phone):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(24, 24, 24, 24)
        layout.setSpacing(14)

        # Header Box
        header_frame = QFrame()
        header_frame.setStyleSheet("background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 10px; padding: 12px;")
        h_layout = QVBoxLayout(header_frame)
        h_layout.setSpacing(4)

        title = QLabel("📱 Customer Phone Number")
        title.setStyleSheet("font-size: 16px; font-weight: 800; color: #15803D;")
        title.setAlignment(Qt.AlignmentFlag.AlignCenter)

        sub = QLabel("For instant Digital Receipt & Customer App order history")
        sub.setStyleSheet("font-size: 11px; color: #166534; font-weight: 600;")
        sub.setAlignment(Qt.AlignmentFlag.AlignCenter)

        h_layout.addWidget(title)
        h_layout.addWidget(sub)
        layout.addWidget(header_frame)

        # Input Row
        self.phone_input = QLineEdit()
        self.phone_input.setPlaceholderText("Enter 10-digit mobile number (or Enter to skip)...")
        self.phone_input.setFont(QFont("Consolas", 16, QFont.Weight.Bold))
        self.phone_input.setMaxLength(10)

        # Enforce digits only (0-9) up to 10 digits
        rx = QRegularExpression(r"^[0-9]{0,10}$")
        self.phone_input.setValidator(QRegularExpressionValidator(rx, self))

        self.phone_input.returnPressed.connect(self.on_confirm)
        self.phone_input.textChanged.connect(self.on_phone_text_changed)
        layout.addWidget(self.phone_input)

        # Dynamic Status / Hint label
        self.hint_label = QLabel("💡 Press [Enter] on empty input to skip as Walk-in Customer")
        self.hint_label.setStyleSheet("color: #64748B; font-size: 11px; font-style: italic;")
        self.hint_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(self.hint_label)

        # Action Buttons
        btn_row = QHBoxLayout()
        btn_row.setSpacing(10)

        self.skip_btn = QPushButton("Skip (Walk-in)")
        self.skip_btn.setStyleSheet("padding: 10px 16px; background-color: #F1F5F9; color: #475569; border: 1px solid #CBD5E1; border-radius: 8px; font-weight: bold;")
        self.skip_btn.clicked.connect(self.on_skip)
        btn_row.addWidget(self.skip_btn)

        self.confirm_btn = QPushButton("Skip as Walk-in (Enter)")
        self.confirm_btn.setDefault(True)
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
                    border-radius: 8px;
                    font-weight: 800;
                    font-size: 13px;
                    border: none;
                }
                QPushButton:hover {
                    background-color: #475569;
                }
            """)
            self.hint_label.setText("💡 Press [Enter] on empty input to skip as Walk-in Customer")
            self.hint_label.setStyleSheet("color: #64748B; font-size: 11px; font-style: italic;")
            self.phone_input.setStyleSheet("padding: 10px; border: 2px solid #CBD5E1; border-radius: 8px; background: white;")
        elif count < 10:
            # Entering number but not yet 10 digits -> DISABLE Enter button!
            self.confirm_btn.setEnabled(False)
            self.confirm_btn.setText(f"Need 10 Digits ({count}/10)")
            self.confirm_btn.setStyleSheet("""
                QPushButton {
                    padding: 10px 20px;
                    background-color: #E2E8F0;
                    color: #94A3B8;
                    border: 1px solid #CBD5E1;
                    border-radius: 8px;
                    font-weight: 800;
                    font-size: 13px;
                }
            """)
            self.hint_label.setText(f"⚠️ Incomplete phone number: {10 - count} more digit(s) required")
            self.hint_label.setStyleSheet("color: #DC2626; font-size: 11px; font-weight: 700;")
            self.phone_input.setStyleSheet("padding: 10px; border: 2px solid #EF4444; border-radius: 8px; background: #FEF2F2;")
        else:
            # Exactly 10 digits -> ENABLE Enter button!
            self.confirm_btn.setEnabled(True)
            self.confirm_btn.setText("Confirm Customer (Enter)")
            self.confirm_btn.setStyleSheet("""
                QPushButton {
                    padding: 10px 20px;
                    background-color: #16A34A;
                    color: #FFFFFF;
                    border-radius: 8px;
                    font-weight: 800;
                    font-size: 13px;
                    border: none;
                }
                QPushButton:hover {
                    background-color: #15803D;
                }
            """)
            self.hint_label.setText(f"✅ 10-digit number complete! Press [Enter] to confirm.")
            self.hint_label.setStyleSheet("color: #15803D; font-size: 11px; font-weight: 700;")
            self.phone_input.setStyleSheet("padding: 10px; border: 2px solid #16A34A; border-radius: 8px; background: #F0FDF4;")

    def on_confirm(self):
        raw = self.phone_input.text().strip()
        digits = "".join(filter(str.isdigit, raw))

        if not digits:
            # Empty -> Skip as walk-in
            self.on_skip()
            return

        if len(digits) < 10:
            # If there is no 10 digit, DO NOT allow Enter button!
            return

        # Exactly 10 digits
        clean_phone = f"+91{digits}"
        cust_name = f"Customer ({digits[-4:]})"
        profile_id = None

        # Check Supabase online profile lookup
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
