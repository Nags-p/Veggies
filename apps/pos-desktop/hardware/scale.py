import re
import time
import threading

try:
    import serial
    SERIAL_AVAILABLE = True
except ImportError:
    SERIAL_AVAILABLE = False

class ScaleReader:
    """
    RS-232 / USB-to-Serial Electronic Weighing Scale Listener.
    Continuously polls the serial port and extracts numeric weight in kilograms.
    """
    def __init__(self, port="COM3", baudrate=9600, timeout=1.0, callback=None):
        self.port = port
        self.baudrate = int(baudrate)
        self.timeout = float(timeout)
        self.callback = callback
        self.is_running = False
        self.thread = None
        self.serial_conn = None
        self.tare_offset = 0.0
        self.last_weight = 0.0
        self.is_stable = True
        self.status = "Disconnected"

    def start(self):
        if self.is_running:
            return
        self.is_running = True
        self.thread = threading.Thread(target=self._read_loop, daemon=True)
        self.thread.start()

    def stop(self):
        self.is_running = False
        if self.serial_conn and self.serial_conn.is_open:
            try:
                self.serial_conn.close()
            except Exception:
                pass
        self.status = "Stopped"

    def tare(self):
        """Set current weight as tare zero offset."""
        self.tare_offset += self.last_weight
        # Also attempt to send hardware tare command if scale supports it
        if self.serial_conn and self.serial_conn.is_open:
            try:
                self.serial_conn.write(b"T\r\n")
            except Exception:
                pass

    def zero(self):
        """Reset tare offset to absolute zero."""
        self.tare_offset = 0.0
        if self.serial_conn and self.serial_conn.is_open:
            try:
                self.serial_conn.write(b"Z\r\n")
            except Exception:
                pass

    def _read_loop(self):
        if not SERIAL_AVAILABLE:
            self.status = "pyserial not installed"
            if self.callback:
                self.callback(0.0, False, self.status)
            return

        while self.is_running:
            try:
                if not self.serial_conn or not self.serial_conn.is_open:
                    self.serial_conn = serial.Serial(
                        port=self.port,
                        baudrate=self.baudrate,
                        bytesize=serial.EIGHTBITS,
                        parity=serial.PARITY_NONE,
                        stopbits=serial.STOPBITS_ONE,
                        timeout=self.timeout
                    )
                    self.status = f"Connected ({self.port})"

                raw_line = self.serial_conn.readline().decode("latin1", errors="ignore").strip()
                if raw_line:
                    weight, is_stable = self.parse_scale_output(raw_line)
                    if weight is not None:
                        # Apply local tare offset
                        net_weight = max(0.0, round(weight - self.tare_offset, 3))
                        self.last_weight = net_weight
                        self.is_stable = is_stable
                        if self.callback:
                            self.callback(net_weight, is_stable, self.status)
                time.sleep(0.05)
            except Exception as e:
                self.status = f"Error: {str(e)[:25]}"
                if self.serial_conn and self.serial_conn.is_open:
                    try:
                        self.serial_conn.close()
                    except Exception:
                        pass
                self.serial_conn = None
                time.sleep(1.0)

    @staticmethod
    def parse_scale_output(raw_str):
        """
        Extracts numeric weight and stability status from various digital scale protocols.
        Examples:
          - "ST,GS,+001.450kg" -> (1.450, True)
          - "US,GS,+000.320kg" -> (0.320, False) [Unstable]
          - "+001.250"         -> (1.250, True)
          - "WT: 2.100 KG"     -> (2.100, True)
        """
        if not raw_str:
            return None, False

        clean = raw_str.upper()
        is_stable = True
        if "US" in clean:  # Unstable flag in many indicators (Essae/CAS/Toledo)
            is_stable = False

        # Match signed float pattern like +001.250, -0.050, 1.450
        match = re.search(r"[-+]?\d*\.?\d+", clean)
        if match:
            try:
                val = float(match.group())
                # Handle scales transmitting in grams (e.g. 1450g)
                if "G" in clean and "KG" not in clean and val > 50:
                    val = val / 1000.0
                return val, is_stable
            except ValueError:
                pass
        return None, False
