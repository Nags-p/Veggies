import os
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
CONFIG_FILE = BASE_DIR / "pos_config.json"

DEFAULT_CONFIG = {
    "store": {
        "name": "Veggies Store Malleswaram",
        "tagline": "Fresh Organics & Daily Veggies • Malleswaram Branch",
        "address": "11th B Cross Road, Lower Palace Orchard, Guttahalli, Malleswaram, Bengaluru 560003",
        "phone": "+91 98765 43210",
        "gstin": "29ABCDE1234F1Z5",
        "upi_id": "8050103865@upi",
        "currency_symbol": "₹",
        "receipt_footer": "Thank you for supporting local farmers! Visit again."
    },
    "hardware": {
        "scale_enabled": True,
        "scale_simulator": True,  # True = Virtual Scale Simulator; False = Real RS-232 COM
        "scale_port": "COM3",
        "scale_baudrate": 9600,
        "scale_databits": 8,
        "scale_parity": "N",
        "scale_stopbits": 1,
        "scale_timeout": 1.0,
        "printer_enabled": True,
        "printer_type": "dummy",  # "dummy" (virtual preview), "usb", "serial", "network"
        "printer_paper_width": "58mm",  # "58mm" (2-inch) or "80mm" (3-inch)
        "printer_ip": "192.168.1.200",
        "printer_port": 9100,
        "printer_usb_vendor": "0x0416",
        "printer_usb_product": "0x5011",
        "cash_drawer_enabled": True
    },
    "sync": {
        "supabase_url": "https://zuoqvvyiklcltacmgojz.supabase.co",
        "supabase_anon_key": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1b3F2dnlpa2xjbHRhY21nb2p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NzQwMzMsImV4cCI6MjA5NjE1MDAzM30.Av9H6ZTVXvy6YyxCAhyaI9xffHsPlNo_Q0R3Y7DCmcw",
        "auto_sync_interval_seconds": 30,
        "store_id": "f1111111-1111-1111-1111-111111111111"
    }
}

class ConfigManager:
    """Manages POS configuration with local JSON persistence."""
    def __init__(self):
        self.config = DEFAULT_CONFIG.copy()
        self.load()

    def load(self):
        if CONFIG_FILE.exists():
            try:
                with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                    loaded = json.load(f)
                    # Deep merge with defaults
                    for section, values in loaded.items():
                        if section in self.config and isinstance(values, dict):
                            self.config[section].update(values)
                        else:
                            self.config[section] = values
            except Exception as e:
                print(f"[Config] Error loading {CONFIG_FILE}: {e}. Using defaults.")
        else:
            self.save()

    def save(self):
        try:
            with open(CONFIG_FILE, "w", encoding="utf-8") as f:
                json.dump(self.config, f, indent=4)
        except Exception as e:
            print(f"[Config] Error saving config: {e}")

    def get(self, section, key, default=None):
        return self.config.get(section, {}).get(key, default)

    def set(self, section, key, value):
        if section not in self.config:
            self.config[section] = {}
        self.config[section][key] = value
        self.save()

config = ConfigManager()
