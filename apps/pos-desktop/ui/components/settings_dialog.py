from PyQt6.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QTabWidget, QWidget,
    QLabel, QLineEdit, QComboBox, QCheckBox, QPushButton,
    QMessageBox, QGroupBox, QFormLayout
)
from PyQt6.QtCore import Qt
from config import config
from hardware.printer import printer_service

class SettingsDialog(QDialog):
    """
    POS System Configuration modal for Hardware, Store metadata, and Cloud Sync.
    """
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("POS Hardware & Store Settings")
        self.setMinimumWidth(480)
        self.init_ui()

    def init_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(16, 16, 16, 16)
        layout.setSpacing(14)

        tabs = QTabWidget()
        tabs.setStyleSheet("""
            QTabWidget::pane { border: 1px solid #E2E8F0; border-radius: 8px; background: white; }
            QTabBar::tab { padding: 8px 20px; font-weight: bold; font-size: 13px; color: #475569; background: #F8FAFC; border: 1px solid #E2E8F0; border-bottom: none; border-top-left-radius: 6px; border-top-right-radius: 6px; margin-right: 4px; }
            QTabBar::tab:selected { background: #16A34A; color: white; border-color: #16A34A; }
        """)

        # TAB 1: HARDWARE (Scale & Printer)
        hw_tab = QWidget()
        hw_layout = QVBoxLayout(hw_tab)
        hw_layout.setSpacing(12)

        # Scale Section
        scale_box = QGroupBox("⚖️ Digital Weighing Scale (RS-232 / USB Serial)")
        scale_form = QFormLayout(scale_box)

        self.scale_sim_check = QCheckBox("Enable Virtual Scale Simulator (Dev / Offline Mode)")
        self.scale_sim_check.setChecked(config.get("hardware", "scale_simulator", True))
        scale_form.addRow(self.scale_sim_check)

        self.scale_port_input = QLineEdit(config.get("hardware", "scale_port", "COM3"))
        scale_form.addRow("Serial COM Port:", self.scale_port_input)

        self.scale_baud_combo = QComboBox()
        self.scale_baud_combo.addItems(["2400", "4800", "9600", "19200", "38400", "115200"])
        current_baud = str(config.get("hardware", "scale_baudrate", "9600"))
        idx = self.scale_baud_combo.findText(current_baud)
        if idx >= 0:
            self.scale_baud_combo.setCurrentIndex(idx)
        scale_form.addRow("Baud Rate:", self.scale_baud_combo)

        hw_layout.addWidget(scale_box)

        # Printer Section
        print_box = QGroupBox("🖨️ Thermal Receipt Printer (ESC/POS)")
        print_form = QFormLayout(print_box)

        self.print_type_combo = QComboBox()
        self.print_type_combo.addItems(["dummy", "network", "usb"])
        self.print_type_combo.setCurrentText(config.get("hardware", "printer_type", "dummy"))
        print_form.addRow("Printer Type:", self.print_type_combo)

        self.paper_width_combo = QComboBox()
        self.paper_width_combo.addItems(["58mm", "80mm"])
        self.paper_width_combo.setCurrentText(config.get("hardware", "printer_paper_width", "58mm"))
        print_form.addRow("Paper Width:", self.paper_width_combo)

        self.printer_ip_input = QLineEdit(config.get("hardware", "printer_ip", "192.168.1.200"))
        print_form.addRow("Printer IP (for Network):", self.printer_ip_input)

        test_print_btn = QPushButton("Test Print Receipt")
        test_print_btn.clicked.connect(self.test_print)
        print_form.addRow("", test_print_btn)

        hw_layout.addWidget(print_box)
        hw_layout.addStretch()
        tabs.addTab(hw_tab, "Hardware")

        # TAB 2: STORE PROFILE
        store_tab = QWidget()
        store_form = QFormLayout(store_tab)

        self.store_name_input = QLineEdit(config.get("store", "name", "Veggies Fresh Market"))
        store_form.addRow("Store Name:", self.store_name_input)

        self.store_addr_input = QLineEdit(config.get("store", "address", "Shop 4, Green Plaza"))
        store_form.addRow("Address:", self.store_addr_input)

        self.store_phone_input = QLineEdit(config.get("store", "phone", "+91 98765 43210"))
        store_form.addRow("Phone:", self.store_phone_input)

        self.store_gst_input = QLineEdit(config.get("store", "gstin", ""))
        store_form.addRow("GSTIN:", self.store_gst_input)

        self.store_upi_input = QLineEdit(config.get("store", "upi_id", "veggies@upi"))
        store_form.addRow("UPI VPA (QR payments):", self.store_upi_input)

        self.store_footer_input = QLineEdit(config.get("store", "receipt_footer", "Thank you for visiting!"))
        store_form.addRow("Receipt Footer:", self.store_footer_input)

        tabs.addTab(store_tab, "Store Profile")

        # TAB 3: SUPABASE CLOUD SYNC
        sync_tab = QWidget()
        sync_form = QFormLayout(sync_tab)

        self.sync_url_input = QLineEdit(config.get("sync", "supabase_url", ""))
        sync_form.addRow("Supabase URL:", self.sync_url_input)

        self.sync_key_input = QLineEdit(config.get("sync", "supabase_anon_key", ""))
        self.sync_key_input.setEchoMode(QLineEdit.EchoMode.PasswordEchoOnEdit)
        sync_form.addRow("Supabase Anon Key:", self.sync_key_input)

        tabs.addTab(sync_tab, "Cloud Sync")

        layout.addWidget(tabs)

        # Bottom Buttons
        btn_row = QHBoxLayout()
        btn_row.addStretch()

        cancel_btn = QPushButton("Cancel")
        cancel_btn.clicked.connect(self.reject)
        btn_row.addWidget(cancel_btn)

        save_btn = QPushButton("Save Settings")
        save_btn.setStyleSheet("background-color: #16A34A; color: white; font-weight: bold; padding: 8px 16px; border-radius: 6px;")
        save_btn.clicked.connect(self.save_settings)
        btn_row.addWidget(save_btn)

        layout.addLayout(btn_row)

    def test_print(self):
        sample_bill = {
            "bill_no": "TEST-0001",
            "cashier_name": "Admin",
            "total_amount": 77.0,
            "discount_amount": 0.0,
            "net_amount": 77.0,
            "payment_mode": "CASH",
            "cash_tendered": 100.0,
            "change_returned": 23.0,
            "items": [
                {"name": "Fresh Tomato", "quantity": 1.250, "unit": "kg", "unit_price": 32.0, "line_total": 40.0},
                {"name": "Palak Bunch", "quantity": 1.0, "unit": "bunch", "unit_price": 20.0, "line_total": 20.0},
                {"name": "Coriander", "quantity": 1.0, "unit": "bunch", "unit_price": 17.0, "line_total": 17.0},
            ]
        }
        success, msg, text = printer_service.print_bill(sample_bill)
        if success:
            QMessageBox.information(self, "Test Print", f"Print triggered successfully: {msg}")
        else:
            QMessageBox.warning(self, "Print Warning", f"Could not print: {msg}")

    def save_settings(self):
        # Save hardware
        config.set("hardware", "scale_simulator", self.scale_sim_check.isChecked())
        config.set("hardware", "scale_port", self.scale_port_input.text().strip())
        config.set("hardware", "scale_baudrate", int(self.scale_baud_combo.currentText()))
        config.set("hardware", "printer_type", self.print_type_combo.currentText())
        config.set("hardware", "printer_paper_width", self.paper_width_combo.currentText())
        config.set("hardware", "printer_ip", self.printer_ip_input.text().strip())

        # Save store
        config.set("store", "name", self.store_name_input.text().strip())
        config.set("store", "address", self.store_addr_input.text().strip())
        config.set("store", "phone", self.store_phone_input.text().strip())
        config.set("store", "gstin", self.store_gst_input.text().strip())
        config.set("store", "upi_id", self.store_upi_input.text().strip())
        config.set("store", "receipt_footer", self.store_footer_input.text().strip())

        # Save sync
        config.set("sync", "supabase_url", self.sync_url_input.text().strip())
        config.set("sync", "supabase_anon_key", self.sync_key_input.text().strip())

        QMessageBox.information(self, "Settings Saved", "Settings saved successfully! Some hardware changes may require app restart.")
        self.accept()
