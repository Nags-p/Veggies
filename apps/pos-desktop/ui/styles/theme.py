"""
Premium, crisp, high-contrast LIGHT THEME tailored for modern grocery & supermarket checkout counters.
Utilizes fresh emerald green (#059669), clean slate neutrals (#F8FAFC, #FFFFFF, #E2E8F0, #CBD5E1),
and deep legible typography (#0F172A, #334155).
"""

APP_STYLE = """
/* =========================================================================
   GLOBAL RESET & BASE STYLES
   ========================================================================= */
* {
    font-family: 'Segoe UI Variable Text', 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Inter', Roboto, sans-serif;
}

QMainWindow, QDialog {
    background-color: #F8FAFC;
    color: #0F172A;
}

QWidget {
    color: #0F172A;
    selection-background-color: #DCFCE7;
    selection-color: #14532D;
}

QLabel {
    background: transparent;
}

/* =========================================================================
   1. TOP STATUS HEADER (PREMIUM LIGHT THEME)
   ========================================================================= */
#topHeader {
    background-color: #FFFFFF;
    border-bottom: 1px solid #E2E8F0;
    padding: 8px 18px;
}

#brandTitle {
    color: #0F172A;
    font-size: 17px;
    font-weight: 800;
    letter-spacing: -0.2px;
}

#brandSubtitle {
    color: #059669;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.2px;
}

#clockLabel {
    color: #334155;
    background-color: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 6px;
    padding: 5px 12px;
    font-family: 'Segoe UI', 'Consolas', monospace;
    font-size: 12px;
    font-weight: 600;
}

#cashierBadge {
    color: #334155;
    background-color: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 6px;
    padding: 5px 12px;
    font-weight: 700;
    font-size: 12px;
}

#statusBadgeOnline {
    background-color: #ECFDF5;
    color: #047857;
    border: 1px solid #A7F3D0;
    padding: 5px 12px;
    border-radius: 6px;
    font-weight: 700;
    font-size: 11px;
}

#statusBadgeOffline {
    background-color: #FEF2F2;
    color: #B91C1C;
    border: 1px solid #FECACA;
    padding: 5px 12px;
    border-radius: 6px;
    font-weight: 700;
    font-size: 11px;
}

QPushButton.headerActionBtn {
    background-color: #FFFFFF;
    color: #334155;
    border: 1px solid #E2E8F0;
    border-radius: 6px;
    padding: 6px 12px;
    font-weight: 600;
    font-size: 12px;
}
QPushButton.headerActionBtn:hover {
    background-color: #F1F5F9;
    border-color: #CBD5E1;
    color: #0F172A;
}
QPushButton.headerActionBtn:pressed {
    background-color: #E2E8F0;
}

/* =========================================================================
   2. SCALE PANEL (DIGITAL INDICATOR)
   ========================================================================= */
#scalePanel {
    background-color: #FFFFFF;
    border-radius: 8px;
    border: 1px solid #E2E8F0;
    padding: 10px 14px;
}

#scaleItemTitle {
    color: #0F172A;
    font-size: 14px;
    font-weight: 700;
}

#scaleRateLabel {
    color: #1D4ED8;
    background-color: #EFF6FF;
    border: 1px solid #DBEAFE;
    border-radius: 4px;
    padding: 2px 8px;
    font-size: 12px;
    font-weight: 600;
}

#scaleWeightDisplay {
    font-family: 'Segoe UI', 'Consolas', monospace;
    font-size: 32px;
    font-weight: 800;
    color: #065F46;
    background-color: #ECFDF5;
    border-radius: 6px;
    padding: 4px 12px;
    border: 1px solid #A7F3D0;
}

#scaleUnitLabel {
    color: #047857;
    font-size: 13px;
    font-weight: 700;
}

#scaleItemTotalFrame {
    background-color: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 6px;
    padding: 4px 10px;
}

#scaleTotalAmount {
    font-family: 'Segoe UI', 'Consolas', monospace;
    font-size: 22px;
    font-weight: 800;
    color: #059669;
}

QPushButton#addScaleItemBtn {
    background-color: #059669;
    color: #FFFFFF;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.3px;
    border-radius: 6px;
    padding: 8px 16px;
    min-height: 38px;
    border: none;
}
QPushButton#addScaleItemBtn:hover {
    background-color: #047857;
}
QPushButton#addScaleItemBtn:pressed {
    background-color: #065F46;
}

QPushButton.scaleToolBtn {
    background-color: #F8FAFC;
    color: #334155;
    border: 1px solid #E2E8F0;
    border-radius: 4px;
    padding: 4px 10px;
    font-weight: 600;
    font-size: 11px;
}
QPushButton.scaleToolBtn:hover {
    background-color: #F1F5F9;
    border-color: #CBD5E1;
}

#simulatorFrame {
    background-color: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 6px;
    padding: 6px;
}

QPushButton.simWeightBtn {
    background-color: #FFFFFF;
    color: #334155;
    border: 1px solid #E2E8F0;
    border-radius: 4px;
    padding: 4px 8px;
    min-height: 24px;
    font-size: 11px;
    font-weight: 600;
}
QPushButton.simWeightBtn:hover {
    background-color: #ECFDF5;
    border-color: #059669;
    color: #047857;
}

/* =========================================================================
   3. CART & BILLING TABLE
   ========================================================================= */
QTableWidget {
    background-color: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 8px;
    gridline-color: #F1F5F9;
    alternate-background-color: #FAFAFA;
}
QHeaderView::section {
    background-color: #F8FAFC;
    color: #475569;
    font-weight: 700;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 10px 8px;
    border: none;
    border-bottom: 1px solid #E2E8F0;
}

#customerBar {
    background-color: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 6px;
    padding: 2px 8px;
}

#bottomDeckFrame {
    background-color: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 8px;
    padding: 6px 12px;
}

#netTotalFrame {
    background-color: #ECFDF5;
    border: 1px solid #A7F3D0;
    border-radius: 6px;
    padding: 4px 14px;
}

QPushButton#checkoutBtn {
    background-color: #059669;
    color: #FFFFFF;
    font-size: 14px;
    font-weight: 800;
    letter-spacing: 0.3px;
    border-radius: 6px;
    padding: 10px 20px;
    border: none;
}
QPushButton#checkoutBtn:hover {
    background-color: #047857;
}
QPushButton#checkoutBtn:pressed {
    background-color: #065F46;
}

QPushButton.cartActionBtn {
    background-color: #FFFFFF;
    color: #334155;
    border: 1px solid #E2E8F0;
    border-radius: 6px;
    padding: 6px 12px;
    font-weight: 600;
    font-size: 12px;
}
QPushButton.cartActionBtn:hover {
    background-color: #F1F5F9;
    border-color: #CBD5E1;
}

/* =========================================================================
   4. PRODUCT CATALOG GRID & SEARCH
   ========================================================================= */
QLineEdit {
    background-color: #FFFFFF;
    color: #0F172A;
    border: 1px solid #CBD5E1;
    border-radius: 6px;
    padding: 7px 12px;
    font-size: 13px;
}
QLineEdit:focus {
    border: 1px solid #059669;
    background-color: #FFFFFF;
}

QListView {
    background-color: #FFFFFF;
    color: #0F172A;
    border: 1px solid #059669;
    border-radius: 6px;
    padding: 4px;
    selection-background-color: #ECFDF5;
    selection-color: #065F46;
    font-size: 13px;
    font-weight: 600;
}
QListView::item {
    padding: 8px 12px;
    border-radius: 4px;
    color: #0F172A;
}
QListView::item:hover {
    background-color: #F1F5F9;
    color: #0F172A;
}
QListView::item:selected {
    background-color: #ECFDF5;
    color: #065F46;
    font-weight: 700;
}

QPushButton.categoryChip {
    background-color: #FFFFFF;
    color: #475569;
    border: 1px solid #E2E8F0;
    border-radius: 14px;
    padding: 5px 14px;
    font-weight: 600;
    font-size: 12px;
}
QPushButton.categoryChip:hover {
    background-color: #F1F5F9;
    border-color: #CBD5E1;
}
QPushButton.categoryChip:checked {
    background-color: #059669;
    color: #FFFFFF;
    border-color: #059669;
}

QPushButton.productCard {
    background-color: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 8px;
    padding: 10px;
    text-align: left;
}
QPushButton.productCard:hover {
    border: 1px solid #059669;
    background-color: #FAFAFA;
}

/* Form Controls & Dialogs (Light Theme) */
QComboBox {
    background-color: #FFFFFF;
    color: #0F172A;
    border: 1px solid #CBD5E1;
    border-radius: 6px;
    padding: 6px 10px;
    font-size: 13px;
}
QComboBox:hover {
    border-color: #94A3B8;
}
QComboBox::drop-down {
    border: none;
    padding-right: 8px;
}

QGroupBox {
    font-weight: 700;
    color: #0F172A;
    border: 1px solid #E2E8F0;
    border-radius: 8px;
    margin-top: 14px;
    padding: 14px 10px 10px 10px;
    background-color: #FFFFFF;
}
QGroupBox::title {
    subcontrol-origin: margin;
    left: 10px;
    padding: 0 6px;
    background-color: #FFFFFF;
    color: #0F172A;
}

QCheckBox {
    color: #334155;
    font-weight: 600;
    spacing: 8px;
}
QCheckBox::indicator {
    width: 16px;
    height: 16px;
    border: 1px solid #CBD5E1;
    border-radius: 4px;
    background-color: #FFFFFF;
}
QCheckBox::indicator:checked {
    background-color: #059669;
    border-color: #059669;
}

/* Clean minimal scrollbars */
QScrollBar:vertical {
    border: none;
    background: #F8FAFC;
    width: 6px;
    border-radius: 3px;
}
QScrollBar::handle:vertical {
    background: #CBD5E1;
    border-radius: 3px;
    min-height: 24px;
}
QScrollBar::handle:vertical:hover {
    background: #94A3B8;
}

QScrollBar:horizontal {
    border: none;
    background: #F8FAFC;
    height: 6px;
    border-radius: 3px;
}
QScrollBar::handle:horizontal {
    background: #CBD5E1;
    border-radius: 3px;
    min-width: 24px;
}
QScrollBar::handle:horizontal:hover {
    background: #94A3B8;
}
"""
