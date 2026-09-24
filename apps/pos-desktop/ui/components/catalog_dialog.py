from PyQt6.QtWidgets import QDialog, QVBoxLayout, QPushButton, QHBoxLayout, QLabel
from PyQt6.QtCore import Qt
from ui.components.item_grid import ItemGridWidget

class CatalogDialog(QDialog):
    """
    Optional popup dialog to browse the full product catalog by category,
    without cluttering the main active billing screen.
    """
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Browse Full Product Catalog")
        self.resize(860, 600)
        self.selected_product = None

        layout = QVBoxLayout(self)
        layout.setContentsMargins(16, 16, 16, 16)
        layout.setSpacing(12)

        # Header
        header = QHBoxLayout()
        lbl = QLabel("Product Catalog")
        lbl.setStyleSheet("font-size: 16px; font-weight: 700; color: #0F172A;")
        header.addWidget(lbl)
        header.addStretch()

        close_btn = QPushButton("Close (Esc)")
        close_btn.setStyleSheet("padding: 6px 14px; background-color: #F1F5F9; color: #475569; border: 1px solid #CBD5E1; border-radius: 6px; font-weight: 600;")
        close_btn.clicked.connect(self.reject)
        header.addWidget(close_btn)
        layout.addLayout(header)

        # Item Grid Widget
        self.grid = ItemGridWidget(self)
        self.grid.product_selected.connect(self.on_product_chosen)
        layout.addWidget(self.grid, 1)

    def on_product_chosen(self, product):
        self.selected_product = product
        self.accept()

    def get_selected_product(self):
        return self.selected_product
