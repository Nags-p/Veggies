"""
Modern, crisp, high-contrast LIGHT THEME tailored for grocery checkout counters.
Utilizes fresh emerald green (#16A34A), clean whites, soft slate neutrals (#F8FAFC, #E2E8F0),
and deep legible typography (#0F172A).
"""

APP_STYLE = """
/* Base Window & Global Rules */
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
   1. TOP STATUS HEADER (LIGHT THEME)
   ========================================================================= */
#topHeader {
    background-color: #FFFFFF;
    border-bottom: 2px solid #E2E8F0;
    padding: 10px 18px;
}

#brandTitle {
    color: #0F172A;
    font-size: 19px;
    font-weight: 800;
}

#brandSubtitle {
    color: #16A34A;
    font-size: 11px;
    font-weight: 700;
}

#clockLabel {
    color: #334155;
    background-color: #F1F5F9;
    border: 1px solid #E2E8F0;
    border-radius: 8px;
    padding: 6px 12px;
    font-family: 'Consolas', monospace;
    font-size: 13px;
    font-weight: 700;
}

#cashierBadge {
    color: #334155;
    background-color: #F1F5F9;
    border: 1px solid #E2E8F0;
    border-radius: 8px;
    padding: 6px 12px;
    font-weight: 700;
    font-size: 12px;
}

#statusBadgeOnline {
    background-color: #DCFCE7;
    color: #15803D;
    border: 1px solid #86EFAC;
    padding: 6px 12px;
    border-radius: 8px;
    font-weight: 800;
    font-size: 11px;
}

#statusBadgeOffline {
    background-color: #FEE2E2;
    color: #B91C1C;
    border: 1px solid #FCA5A5;
    padding: 6px 12px;
    border-radius: 8px;
    font-weight: 800;
    font-size: 11px;
}

QPushButton.headerActionBtn {
    background-color: #FFFFFF;
    color: #334155;
    border: 1px solid #CBD5E1;
    border-radius: 8px;
    padding: 7px 14px;
    font-weight: 700;
    font-size: 12px;
}
QPushButton.headerActionBtn:hover {
    background-color: #F1F5F9;
    border-color: #94A3B8;
}
QPushButton.headerActionBtn:pressed {
    background-color: #E2E8F0;
}

/* =========================================================================
   2. SCALE PANEL (LIGHT THEME)
   ========================================================================= */
#scalePanel {
    background-color: #FFFFFF;
    border-radius: 12px;
    border: 1px solid #E2E8F0;
    padding: 14px;
}

#scaleItemTitle {
    color: #0F172A;
    font-size: 15px;
    font-weight: 800;
}

#scaleRateLabel {
    color: #1D4ED8;
    background-color: #EFF6FF;
    border: 1px solid #BFDBFE;
    border-radius: 6px;
    padding: 3px 8px;
    font-size: 13px;
    font-weight: 700;
}

#scaleWeightDisplay {
    font-family: 'Consolas', monospace;
    font-size: 42px;
    font-weight: 900;
    color: #065F46;
    background-color: #F0FDF4;
    border-radius: 8px;
    padding: 6px 14px;
    border: 2px solid #86EFAC;
}

#scaleUnitLabel {
    color: #047857;
    font-size: 16px;
    font-weight: 800;
}

#scaleItemTotalFrame {
    background-color: #F0FDF4;
    border: 1px solid #BBF7D0;
    border-radius: 8px;
    padding: 8px 12px;
}

#scaleTotalAmount {
    font-family: 'Consolas', monospace;
    font-size: 26px;
    font-weight: 900;
    color: #15803D;
}

QPushButton#addScaleItemBtn {
    background-color: #16A34A;
    color: #FFFFFF;
    font-size: 14px;
    font-weight: 800;
    border-radius: 8px;
    padding: 10px 16px;
    border: none;
}
QPushButton#addScaleItemBtn:hover {
    background-color: #15803D;
}
QPushButton#addScaleItemBtn:pressed {
    background-color: #166534;
}

QPushButton.scaleToolBtn {
    background-color: #F8FAFC;
    color: #334155;
    border: 1px solid #CBD5E1;
    border-radius: 6px;
    padding: 6px 12px;
    font-weight: 700;
    font-size: 12px;
}
QPushButton.scaleToolBtn:hover {
    background-color: #F1F5F9;
}

#simulatorFrame {
    background-color: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 8px;
    padding: 8px;
}

QPushButton.simWeightBtn {
    background-color: #FFFFFF;
    color: #1E293B;
    border: 1px solid #CBD5E1;
    border-radius: 6px;
    padding: 6px 12px;
    min-height: 28px;
    font-size: 12px;
    font-weight: 800;
}
QPushButton.simWeightBtn:hover {
    background-color: #F0FDF4;
    border-color: #16A34A;
    color: #15803D;
}

/* =========================================================================
   3. CART & BILLING TABLE (LIGHT THEME)
   ========================================================================= */
QTableWidget {
    background-color: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 10px;
    gridline-color: #F1F5F9;
    alternate-background-color: #F8FAFC;
}
QHeaderView::section {
    background-color: #F8FAFC;
    color: #475569;
    font-weight: 800;
    padding: 10px 8px;
    border: none;
    border-bottom: 2px solid #E2E8F0;
}

#summaryBox {
    background-color: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 10px;
    padding: 14px;
}

#netTotalFrame {
    background-color: #F0FDF4;
    border: 1px solid #BBF7D0;
    border-radius: 8px;
    padding: 8px 12px;
}

QPushButton#checkoutBtn {
    background-color: #16A34A;
    color: #FFFFFF;
    font-size: 15px;
    font-weight: 900;
    border-radius: 10px;
    padding: 12px 20px;
    border: none;
}
QPushButton#checkoutBtn:hover {
    background-color: #15803D;
}
QPushButton#checkoutBtn:pressed {
    background-color: #166534;
}

QPushButton.cartActionBtn {
    background-color: #F8FAFC;
    color: #334155;
    border: 1px solid #CBD5E1;
    border-radius: 8px;
    padding: 10px 14px;
    font-weight: 700;
}
QPushButton.cartActionBtn:hover {
    background-color: #F1F5F9;
}

/* =========================================================================
   4. PRODUCT CATALOG GRID & SEARCH (LIGHT THEME)
   ========================================================================= */
QLineEdit {
    background-color: #FFFFFF;
    color: #0F172A;
    border: 2px solid #CBD5E1;
    border-radius: 8px;
    padding: 8px 12px;
    font-size: 14px;
}
QLineEdit:focus {
    border-color: #16A34A;
}

QListView {
    background-color: #FFFFFF;
    color: #0F172A;
    border: 2px solid #16A34A;
    border-radius: 8px;
    padding: 4px;
    selection-background-color: #16A34A;
    selection-color: #FFFFFF;
    font-size: 13px;
    font-weight: 700;
}
QListView::item {
    padding: 8px 12px;
    border-radius: 6px;
    color: #0F172A;
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

QPushButton.categoryChip {
    background-color: #FFFFFF;
    color: #475569;
    border: 1px solid #CBD5E1;
    border-radius: 16px;
    padding: 6px 14px;
    font-weight: 700;
    font-size: 12px;
}
QPushButton.categoryChip:hover {
    background-color: #F1F5F9;
    border-color: #94A3B8;
}
QPushButton.categoryChip:checked {
    background-color: #16A34A;
    color: #FFFFFF;
    border-color: #16A34A;
}

QPushButton.productCard {
    background-color: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 10px;
    padding: 10px;
    text-align: left;
}
QPushButton.productCard:hover {
    border: 2px solid #16A34A;
    background-color: #F0FDF4;
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
    font-weight: 800;
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
    width: 18px;
    height: 18px;
    border: 1px solid #CBD5E1;
    border-radius: 4px;
    background-color: #FFFFFF;
}
QCheckBox::indicator:checked {
    background-color: #16A34A;
    border-color: #16A34A;
}

/* Scrollbars */
QScrollBar:vertical {
    border: none;
    background: #F1F5F9;
    width: 8px;
    border-radius: 4px;
}
QScrollBar::handle:vertical {
    background: #CBD5E1;
    border-radius: 4px;
    min-height: 20px;
}
QScrollBar::handle:vertical:hover {
    background: #94A3B8;
}
"""
