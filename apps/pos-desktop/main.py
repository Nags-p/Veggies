import sys
import os

# Ensure apps/pos-desktop directory is on sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from PyQt6.QtWidgets import QApplication
from PyQt6.QtCore import Qt

from db.database import init_db
from ui.styles.theme import APP_STYLE
from ui.main_window import PosMainWindow

from PyQt6.QtGui import QFont

def main():
    # 1. Initialize local SQLite database & default vegetable catalog
    init_db()

    # 2. Setup QApplication with high-DPI support
    app = QApplication(sys.argv)
    app.setApplicationName("Veggies POS")
    app.setApplicationDisplayName("Veggies - Fresh Vegetable & Fruit Retail POS")
    app.setFont(QFont("Segoe UI", 10))

    # 3. Apply custom theme
    app.setStyleSheet(APP_STYLE)

    # 4. Launch Main Window
    window = PosMainWindow()
    window.showMaximized()

    # 5. Enter event loop
    sys.exit(app.exec())

if __name__ == "__main__":
    main()
