from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLineEdit, QPushButton,
    QLabel, QFrame, QCompleter, QListWidget, QListWidgetItem
)
from PyQt6.QtCore import Qt, pyqtSignal, QModelIndex
from PyQt6.QtGui import QFont, QIcon, QStandardItemModel, QStandardItem
from db.repository import PosRepository

class FastEntryBarWidget(QWidget):
    """
    GoFrugal-style high-speed item entry bar:
    - Fast PLU & fuzzy name search with autocomplete
    - Speed key buttons for top 10 retail vegetables
    - Active scale product indicator
    """
    product_selected = pyqtSignal(dict)
    open_catalog_requested = pyqtSignal()
    enter_pressed_on_empty = pyqtSignal()

    def __init__(self, parent=None):
        super().__init__(parent)
        self.products = []
        self.active_product = None
        self.init_ui()
        self.load_products()

    def init_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(6)

        # Outer Frame
        outer_frame = QFrame()
        outer_frame.setObjectName("fastEntryFrame")
        outer_frame.setStyleSheet("""
            #fastEntryFrame {
                background-color: #FFFFFF;
                border: 1px solid #CBD5E1;
                border-radius: 10px;
                padding: 6px 10px;
            }
        """)
        frame_layout = QVBoxLayout(outer_frame)
        frame_layout.setContentsMargins(8, 6, 8, 6)
        frame_layout.setSpacing(5)

        # Row 1: Search & PLU Input + Catalog Button
        row1 = QHBoxLayout()
        row1.setSpacing(8)

        self.search_input = QLineEdit()
        self.search_input.setObjectName("fastSearchInput")
        self.search_input.setPlaceholderText("🔍 Scan Barcode / Type PLU (101, 102...) or Item Name (F2)...")
        self.search_input.setFont(QFont("Segoe UI", 12, QFont.Weight.DemiBold))
        self.search_input.setStyleSheet("""
            #fastSearchInput {
                background-color: #F8FAFC;
                border: 2px solid #CBD5E1;
                border-radius: 6px;
                padding: 6px 10px;
                color: #0F172A;
            }
            #fastSearchInput:focus {
                background-color: #FFFFFF;
                border-color: #16A34A;
            }
        """)
        self.search_input.returnPressed.connect(self.on_search_enter)
        row1.addWidget(self.search_input, 1)

        self.catalog_btn = QPushButton("📋 All Items (F10)")
        self.catalog_btn.setStyleSheet("""
            background-color: #F1F5F9;
            color: #334155;
            border: 1px solid #CBD5E1;
            border-radius: 6px;
            padding: 6px 12px;
            font-weight: 700;
            font-size: 11px;
        """)
        self.catalog_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        self.catalog_btn.clicked.connect(self.open_catalog_requested.emit)
        row1.addWidget(self.catalog_btn)

        frame_layout.addLayout(row1)

        # Row 2: Top Fast Vegetables Speed Keys (GoFrugal Supermarket style)
        self.speed_keys_layout = QHBoxLayout()
        self.speed_keys_layout.setSpacing(6)
        frame_layout.addLayout(self.speed_keys_layout)

        # Row 3: Active Item Status Strip (Fixed 24px height - never expands)
        self.status_strip = QFrame()
        self.status_strip.setFixedHeight(24)
        self.status_strip.setStyleSheet("background-color: #F8FAFC; border-radius: 4px; padding: 1px 6px;")
        strip_layout = QHBoxLayout(self.status_strip)
        strip_layout.setContentsMargins(6, 1, 6, 1)

        self.status_label = QLabel("💡 Tip: Type PLU number or click a quick vegetable button to weigh")
        self.status_label.setStyleSheet("color: #64748B; font-size: 11px; font-weight: 600;")
        strip_layout.addWidget(self.status_label)

        frame_layout.addWidget(self.status_strip)

        layout.addWidget(outer_frame)
        self.setMaximumHeight(130)

    def load_products(self):
        self.products = PosRepository.get_all_products()

        # Build QCompleter for search input with PLU & Name ONLY filtering (ignores price numbers!)
        model = QStandardItemModel(self)
        for p in self.products:
            plu = str(p.get("plu") or "")
            name = p["name"]
            price = p["price"]
            unit = p.get("unit", "kg")
            plu_prefix = f"[{plu}] " if plu else ""

            # Visual representation shown in dropdown
            display_text = f"{plu_prefix}{name}  •  ₹{price:.2f}/{unit}"
            item = QStandardItem(display_text)

            # Searchable filter text: ONLY PLU AND ITEM NAME!
            # DOES NOT contain price digits, so searching "120" will ONLY match PLU 120 (Banana), NOT ₹120 items!
            searchable_text = f"[{plu}] {name} {plu}".lower()
            item.setData(searchable_text, Qt.ItemDataRole.UserRole)
            item.setData(p, Qt.ItemDataRole.UserRole + 1)
            model.appendRow(item)

        completer = QCompleter(model, self)
        completer.setCaseSensitivity(Qt.CaseSensitivity.CaseInsensitive)
        completer.setFilterMode(Qt.MatchFlag.MatchContains)
        completer.setCompletionRole(Qt.ItemDataRole.UserRole)
        completer.setMaxVisibleItems(10)
        completer.activated[QModelIndex].connect(self.on_completer_index_activated)
        completer.activated[str].connect(self.on_completer_activated)

        # Style Completer Popup with crystal-clear Light Theme
        popup = completer.popup()
        popup.setStyleSheet("""
            QListView {
                background-color: #FFFFFF;
                color: #0F172A;
                border: 2px solid #16A34A;
                border-radius: 8px;
                padding: 4px;
                font-family: 'Segoe UI', sans-serif;
                font-size: 13px;
                font-weight: 700;
                outline: none;
            }
            QListView::item {
                padding: 8px 12px;
                border-radius: 6px;
                color: #0F172A;
                min-height: 28px;
            }
            QListView::item:hover {
                background-color: #F0FDF4;
                color: #15803D;
            }
            QListView::item:selected {
                background-color: #16A34A;
                color: #FFFFFF;
                font-weight: 800;
            }
        """)
        self.search_input.setCompleter(completer)

        # Build Top 8 Speed Key Pills
        while self.speed_keys_layout.count():
            item = self.speed_keys_layout.takeAt(0)
            widget = item.widget()
            if widget:
                widget.deleteLater()

        # Popular retail items to feature as speed keys
        fav_keywords = [
            ("🍅 Tomato", "Tomato"),
            ("🥔 Potato", "Potato"),
            ("🧅 Onion", "Onion"),
            ("🥕 Carrot", "Carrot"),
            ("🍌 Banana", "Banana"),
            ("🍎 Apple", "Apple"),
            ("🥬 Palak", "Palak"),
            ("🌿 Coriander", "Coriander"),
            ("🌶️ Chilli", "Chilli"),
            ("🥒 Cucumber", "Cucumber")
        ]

        count = 0
        for icon_label, kw in fav_keywords:
            match = next((p for p in self.products if kw.lower() in p["name"].lower()), None)
            if match and count < 8:
                plu_text = f" [{match.get('plu', '')}]" if match.get('plu') else ""
                btn = QPushButton(f"{icon_label}{plu_text}")
                btn.setStyleSheet("""
                    QPushButton {
                        background-color: #FFFFFF;
                        color: #1E293B;
                        border: 1px solid #CBD5E1;
                        border-radius: 6px;
                        padding: 5px 10px;
                        font-size: 11px;
                        font-weight: 700;
                    }
                    QPushButton:hover {
                        background-color: #F0FDF4;
                        border-color: #16A34A;
                        color: #15803D;
                    }
                    QPushButton:pressed {
                        background-color: #DCFCE7;
                    }
                """)
                btn.setCursor(Qt.CursorShape.PointingHandCursor)
                btn.clicked.connect(lambda _, prod=match: self.select_product(prod))
                self.speed_keys_layout.addWidget(btn)
                count += 1

        self.speed_keys_layout.addStretch()

    def select_product(self, product):
        self.set_active_product(product)
        self.product_selected.emit(product)

    def set_active_product(self, product):
        self.active_product = product
        if product:
            self.status_label.setText(f"👉 Active on Scale: <b>{product['name']}</b> • <b>₹{product['price']:.2f}/{product.get('unit', 'kg')}</b> (PLU: {product.get('plu', '-')})")
            self.status_label.setStyleSheet("color: #15803D; font-size: 11px; font-weight: 700;")
            self.status_strip.setStyleSheet("background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 4px; padding: 1px 6px;")
        else:
            self.status_label.setText("💡 Tip: Type PLU number or click a quick vegetable button to weigh")
            self.status_label.setStyleSheet("color: #64748B; font-size: 11px; font-weight: 600;")
            self.status_strip.setStyleSheet("background-color: #F8FAFC; border-radius: 4px; padding: 1px 6px;")

    def on_completer_index_activated(self, index):
        # Directly retrieve the exact product object attached to this item
        prod = index.data(Qt.ItemDataRole.UserRole + 1)
        if prod:
            self.select_product(prod)
            self.search_input.clear()

    def on_completer_activated(self, text):
        clean = text.split("  •  ")[0].split(" (₹")[0].strip()
        if clean.startswith("[") and "]" in clean:
            plu = clean.split("]")[0].strip("[").strip()
            prod = PosRepository.find_by_plu_or_barcode(plu)
            if prod:
                self.select_product(prod)
                self.search_input.clear()
                return

        results = PosRepository.search_products(clean)
        if results:
            self.select_product(results[0])
            self.search_input.clear()

    def on_search_enter(self):
        query = self.search_input.text().strip()
        if not query:
            # When search input is empty, Enter immediately adds the active scale item to the bill!
            self.enter_pressed_on_empty.emit()
            return

        # 1. Exact PLU or Barcode match FIRST!
        # If user types "120", it will directly match Banana (PLU 120), NEVER price!
        prod = PosRepository.find_by_plu_or_barcode(query)
        if prod:
            self.select_product(prod)
            self.search_input.clear()
            return

        # 2. Check if query came from completer text e.g. "[105] Fresh Coriander  •  ₹15.00/bunch"
        clean = query.split("  •  ")[0].split(" (₹")[0].strip()
        if clean.startswith("[") and "]" in clean:
            plu = clean.split("]")[0].strip("[").strip()
            prod = PosRepository.find_by_plu_or_barcode(plu)
            if prod:
                self.select_product(prod)
                self.search_input.clear()
                return

        # 3. Check exact PLU with clean name
        prod = PosRepository.find_by_plu_or_barcode(clean)
        if prod:
            self.select_product(prod)
            self.search_input.clear()
            return

        # 4. Search products by name (clean name or query)
        results = PosRepository.search_products(clean) or PosRepository.search_products(query)
        if results:
            self.select_product(results[0])
            self.search_input.clear()
            return
