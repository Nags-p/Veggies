import time
import threading

class ScaleSimulator:
    """
    Virtual Digital Scale Simulator for local development and offline testing.
    Thread-safe weight management with gross, tare offset, and net weight calculations.
    """
    def __init__(self, callback=None):
        self.callback = callback
        self.gross_weight = 0.0
        self.tare_offset = 0.0
        self.is_stable = True
        self.is_running = False
        self.status = "Simulator Active"
        self._lock = threading.Lock()
        self.thread = None

    def start(self):
        if self.is_running:
            return
        self.is_running = True
        self.thread = threading.Thread(target=self._loop, daemon=True)
        self.thread.start()

    def stop(self):
        self.is_running = False
        self.status = "Simulator Stopped"

    def set_weight(self, weight_kg, is_stable=True):
        with self._lock:
            self.gross_weight = max(0.0, round(float(weight_kg), 3))
            self.is_stable = is_stable
        self._notify()

    def add_weight(self, delta_kg):
        with self._lock:
            self.gross_weight = max(0.0, round(self.gross_weight + float(delta_kg), 3))
            self.is_stable = True
        self._notify()

    def tare(self):
        """Set current gross weight as tare offset."""
        with self._lock:
            self.tare_offset = self.gross_weight
        self._notify()

    def zero(self):
        """Reset scale to absolute zero."""
        with self._lock:
            self.gross_weight = 0.0
            self.tare_offset = 0.0
        self._notify()

    @property
    def net_weight(self):
        with self._lock:
            return max(0.0, round(self.gross_weight - self.tare_offset, 3))

    def _notify(self):
        if self.callback:
            with self._lock:
                net = max(0.0, round(self.gross_weight - self.tare_offset, 3))
                stable = self.is_stable
                status = self.status
            self.callback(net, stable, status)

    def _loop(self):
        while self.is_running:
            self._notify()
            time.sleep(0.25)
