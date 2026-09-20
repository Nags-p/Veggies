import unittest
import os
import sys
from pathlib import Path

# Add pos-desktop root to path
pos_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(pos_dir))

from hardware.scale import ScaleReader
from hardware.printer import printer_service
from db.database import init_db, get_connection
from db.repository import PosRepository

class TestPosEngine(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()

    def test_scale_string_parsing(self):
        # Format A: Standard ASCII Essae / CAS / Toledo indicator
        wt, stable = ScaleReader.parse_scale_output("ST,GS,+001.450kg\r\n")
        self.assertEqual(wt, 1.450)
        self.assertTrue(stable)

        # Format B: Unstable motion flag
        wt, stable = ScaleReader.parse_scale_output("US,GS,+000.320kg\r\n")
        self.assertEqual(wt, 0.320)
        self.assertFalse(stable)

        # Format C: Clean numeric stream
        wt, stable = ScaleReader.parse_scale_output("+002.100\r\n")
        self.assertEqual(wt, 2.100)

        # Format D: Grams indicator (e.g. 750g)
        wt, stable = ScaleReader.parse_scale_output("750 g\r\n")
        self.assertEqual(wt, 0.750)

    def test_product_repository_and_plu(self):
        products = PosRepository.get_all_products()
        self.assertGreater(len(products), 0)

        # Test PLU search for Onion (#102) or Tomato (#101)
        tomato = PosRepository.find_by_plu_or_barcode("101")
        self.assertIsNotNone(tomato)
        self.assertIn("Tomato", tomato["name"])

        # Test fuzzy search
        results = PosRepository.search_products("Gajar")
        self.assertTrue(any("Carrot" in r["name"] for r in results))

    def test_bill_creation_and_math(self):
        sample_items = [
            {"product_id": None, "name": "Fresh Tomato", "quantity": 1.500, "unit": "kg", "unit_price": 30.0, "line_total": 45.0},
            {"product_id": None, "name": "Palak", "quantity": 2.0, "unit": "bunch", "unit_price": 20.0, "line_total": 40.0}
        ]

        bill = PosRepository.save_bill(
            cashier_name="Test Cashier",
            items=sample_items,
            discount_amount=5.0,
            payment_mode="CASH",
            cash_tendered=100.0,
            change_returned=20.0
        )

        self.assertEqual(bill["total_amount"], 85.0)
        self.assertEqual(bill["discount_amount"], 5.0)
        self.assertEqual(bill["net_amount"], 80.0)
        self.assertEqual(bill["change_returned"], 20.0)
        self.assertTrue(bill["bill_no"].startswith("BILL-"))

    def test_receipt_formatting(self):
        bill_data = {
            "bill_no": "BILL-20260920-0099",
            "cashier_name": "Ramesh",
            "total_amount": 120.0,
            "discount_amount": 10.0,
            "net_amount": 110.0,
            "payment_mode": "CASH",
            "cash_tendered": 200.0,
            "change_returned": 90.0,
            "items": [
                {"name": "Fresh Tomato", "quantity": 1.5, "unit": "kg", "unit_price": 40.0, "line_total": 60.0},
                {"name": "Farm Onion", "quantity": 2.0, "unit": "kg", "unit_price": 30.0, "line_total": 60.0}
            ]
        }

        receipt_text = printer_service.format_receipt_text(bill_data)
        self.assertIn("BILL-20260920-0099", receipt_text)
        self.assertIn("TOTAL AMOUNT", receipt_text)
        self.assertIn("110.00", receipt_text)
        self.assertIn("Change Due", receipt_text)

    def test_scale_simulator(self):
        from hardware.scale_simulator import ScaleSimulator
        sim = ScaleSimulator()
        sim.set_weight(0.500)
        self.assertEqual(sim.net_weight, 0.500)

        sim.add_weight(0.250)
        self.assertEqual(sim.net_weight, 0.750)

        # Test Tare
        sim.tare()
        self.assertEqual(sim.net_weight, 0.0)

        # Add item into tared container
        sim.add_weight(0.350)
        self.assertEqual(sim.net_weight, 0.350)

        # Reset Zero
        sim.zero()
        self.assertEqual(sim.net_weight, 0.0)

if __name__ == "__main__":
    unittest.main()

