from PyQt6.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QTextEdit, QPushButton, QLabel
)
from PyQt6.QtGui import QFont, QColor
from PyQt6.QtCore import Qt

class VirtualReceiptDialog(QDialog):
    """
    Renders a realistic visual thermal paper receipt slip.
    Allows store managers and cashiers to visually inspect receipts without wasting paper.
    """
    def __init__(self, receipt_text, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Thermal Receipt Preview")
        self.setMinimumWidth(380)
        self.setMinimumHeight(550)
        self.receipt_text = receipt_text
        self.init_ui()

    def init_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(20, 20, 20, 20)
        layout.setSpacing(15)

        # Header Info
        title = QLabel("Receipt Preview")
        title.setStyleSheet("font-size: 15px; font-weight: 700; color: #065F46;")
        title.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(title)

        # Thermal Paper Container
        self.text_area = QTextEdit()
        self.text_area.setReadOnly(True)
        self.text_area.setFont(QFont("Consolas", 10))
        self.text_area.setPlainText(self.receipt_text)
        self.text_area.setStyleSheet("""
            QTextEdit {
                background-color: #FAF9F5;
                color: #1A1A1A;
                border: 1px dashed #CBD5E1;
                border-radius: 8px;
                padding: 12px;
                line-height: 1.3;
            }
        """)
        layout.addWidget(self.text_area)

        # Button row
        btn_layout = QHBoxLayout()
        btn_layout.setSpacing(10)

        copy_btn = QPushButton("Copy Text")
        copy_btn.setStyleSheet("padding: 8px 16px; background-color: #F1F5F9; color: #475569; border: 1px solid #CBD5E1; border-radius: 6px; font-weight: 600;")
        copy_btn.clicked.connect(self.copy_to_clipboard)
        btn_layout.addWidget(copy_btn)

        close_btn = QPushButton("Done (Esc / Enter)")
        close_btn.setStyleSheet("padding: 8px 20px; background-color: #059669; color: white; border-radius: 6px; font-weight: 700; border: none;")
        close_btn.setDefault(True)
        close_btn.clicked.connect(self.accept)
        btn_layout.addWidget(close_btn)

        layout.addLayout(btn_layout)

    def copy_to_clipboard(self):
        from PyQt6.QtWidgets import QApplication
        QApplication.clipboard().setText(self.receipt_text)
