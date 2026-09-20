from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QGridLayout, QScrollArea,
    QPushButton, QLineEdit, QLabel, QButtonGroup
)
from PyQt6.QtCore import Qt, pyqtSignal
from db.repository import PosRepository

class ItemGridWidget(QWidget):
    """
    Touch-friendly visual product grid with category filter chips and instant PLU search.
    """
    product_selected = pyqtSignal(dict)
    direct_add_requested = pyqtSignal(dict)

    def __init__(self, parent=None):
        super().__init__(parent)
        self.current_category = "All"
        self.init_ui()

    def init_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(10)

        # 1. Search Bar & Fast PLU Lookup
        search_row = QHBoxLayout()
        self.search_input = QLineEdit()
        self.search_input.setPlaceholderText("🔍 Search vegetable, fruit, or type PLU / Barcode (F2)...")
        self.search_input.textChanged.connect(self.on_search_changed)
        self.search_input.returnPressed.connect(self.on_search_enter)
        search_row.addWidget(self.search_input)

        clear_search_btn = QPushButton("Clear")
        clear_search_btn.setStyleSheet("padding: 8px 14px; background-color: #E2E8F0; border-radius: 6px;")
        clear_search_btn.clicked.connect(lambda: self.search_input.clear())
        search_row.addWidget(clear_search_btn)
        layout.addLayout(search_row)

        # 2. Category Filter Pills
        self.cat_layout = QHBoxLayout()
        self.cat_layout.setSpacing(6)
        self.cat_btn_group = QButtonGroup(self)
        self.cat_btn_group.setExclusive(True)

        categories = ["All", "Daily Veggies", "Leafy Veggies", "Roots", "Gourds", "Fruits", "Exotic & Special"]
        for idx, cat in enumerate(categories):
            btn = QPushButton(cat)
            btn.setProperty("class", "categoryChip")
            btn.setCheckable(True)
            if idx == 0:
                btn.setChecked(True)
            btn.clicked.connect(lambda _, c=cat: self.filter_category(c))
            self.cat_btn_group.addButton(btn)
            self.cat_layout.addWidget(btn)

        self.cat_layout.addStretch()
        layout.addLayout(self.cat_layout)

        # 3. Product Cards Grid (Scrollable)
        self.scroll_area = QScrollArea()
        self.scroll_area.setWidgetResizable(True)
        self.scroll_area.setStyleSheet("QScrollArea { border: 1px solid #E2E8F0; border-radius: 10px; background-color: white; }")

        self.grid_container = QWidget()
        self.grid_layout = QGridLayout(self.grid_container)
        self.grid_layout.setContentsMargins(10, 10, 10, 10)
        self.grid_layout.setSpacing(10)

        self.scroll_area.setWidget(self.grid_container)
        layout.addWidget(self.scroll_area)

        # Initial population
        self.reload_products()

    def filter_category(self, category):
        self.current_category = category
        self.search_input.clear()
        self.reload_products()

    def on_search_changed(self, text):
        if text.strip():
            products = PosRepository.search_products(text)
            self.populate_grid(products)
        else:
            self.reload_products()

    def on_search_enter(self):
        query = self.search_input.text().strip()
        if not query:
            return
        # If matches an exact PLU or barcode, select it immediately
        product = PosRepository.find_by_plu_or_barcode(query)
        if product:
            self.product_selected.emit(product)
            self.search_input.clear()
        else:
            # Check if search results have exactly 1 item
            results = PosRepository.search_products(query)
            if len(results) >= 1:
                self.product_selected.emit(results[0])
                self.search_input.clear()

    def reload_products(self):
        products = PosRepository.get_all_products(self.current_category)
        self.populate_grid(products)

    def populate_grid(self, products):
        # Clear existing grid items
        while self.grid_layout.count():
            item = self.grid_layout.takeAt(0)
            widget = item.widget()
            if widget:
                widget.deleteLater()

        if not products:
            empty_lbl = QLabel("No items found. Try another search or category.")
            empty_lbl.setStyleSheet("color: #94A3B8; font-size: 14px; padding: 40px;")
            empty_lbl.setAlignment(Qt.AlignmentFlag.AlignCenter)
            self.grid_layout.addWidget(empty_lbl, 0, 0, 1, 3)
            return

        cols = 3
        for idx, prod in enumerate(products):
            row = idx // cols
            col = idx % cols
            card = self.create_product_card(prod)
            self.grid_layout.addWidget(card, row, col)

    def create_product_card(self, prod):
        btn = QPushButton()
        btn.setProperty("class", "productCard")
        btn.setMinimumHeight(92)
        btn.setCursor(Qt.CursorShape.PointingHandCursor)

        card_layout = QVBoxLayout(btn)
        card_layout.setContentsMargins(10, 8, 10, 8)
        card_layout.setSpacing(4)

        # Header: Name & PLU badge
        h_row = QHBoxLayout()
        name_lbl = QLabel(prod["name"])
        name_lbl.setWordWrap(True)
        name_lbl.setStyleSheet("font-weight: 800; font-size: 13px; color: #0F172A;")
        h_row.addWidget(name_lbl, 1)

        if prod.get("plu"):
            plu_lbl = QLabel(f"#{prod['plu']}")
            plu_lbl.setStyleSheet("background-color: #EEF2FF; color: #4338CA; border: 1px solid #C7D2FE; font-size: 10px; font-weight: 800; border-radius: 4px; padding: 2px 6px;")
            h_row.addWidget(plu_lbl, 0, Qt.AlignmentFlag.AlignTop | Qt.AlignmentFlag.AlignRight)
        card_layout.addLayout(h_row)

        # Regional Name (e.g. Tamatar, Pyaz)
        if prod.get("regional_name"):
            reg_lbl = QLabel(prod["regional_name"])
            reg_lbl.setStyleSheet("color: #64748B; font-size: 11px; font-weight: 500;")
            card_layout.addWidget(reg_lbl)

        card_layout.addStretch()

        # Footer: Rate per kg
        f_row = QHBoxLayout()
        unit_str = prod.get("unit", "kg")
        rate_lbl = QLabel(f"₹ {prod['price']:.2f} / {unit_str}")
        rate_lbl.setStyleSheet("color: #15803D; font-weight: 900; font-size: 13px;")
        f_row.addWidget(rate_lbl)
        card_layout.addLayout(f_row)

        btn.clicked.connect(lambda _, p=prod: self.product_selected.emit(p))
        return btn
