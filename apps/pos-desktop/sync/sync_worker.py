import time
from PyQt6.QtCore import QThread, pyqtSignal
from sync.supabase_sync import supabase_sync
from config import config

class SyncWorker(QThread):
    """
    Background worker periodically syncing offline bills with Supabase cloud.
    """
    sync_status = pyqtSignal(bool, str)  # is_online, message
    sync_completed = pyqtSignal(int, int)  # pushed_count, pulled_count

    def __init__(self, parent=None):
        super().__init__(parent)
        self.is_running = True
        self.interval = config.get("sync", "auto_sync_interval_seconds", 60)

    def run(self):
        while self.is_running:
            is_online = supabase_sync.check_online()
            if is_online:
                self.sync_status.emit(True, "Online")
                try:
                    pushed = supabase_sync.push_pending_bills()
                    pulled = supabase_sync.pull_products()
                    if pushed > 0 or pulled > 0:
                        self.sync_completed.emit(pushed, pulled)
                except Exception as e:
                    self.sync_status.emit(True, f"Sync error: {str(e)[:30]}")
            else:
                self.sync_status.emit(False, "Offline (Local SQLite Active)")

            # Sleep in small slices so thread can terminate quickly on quit
            for _ in range(self.interval):
                if not self.is_running:
                    break
                time.sleep(1)

    def trigger_immediate_sync(self):
        """Force a sync cycle immediately."""
        is_online = supabase_sync.check_online()
        if not is_online:
            self.sync_status.emit(False, "Offline (Local SQLite Active)")
            return 0, 0
        pushed = supabase_sync.push_pending_bills()
        pulled = supabase_sync.pull_products()
        self.sync_completed.emit(pushed, pulled)
        return pushed, pulled

    def stop(self):
        self.is_running = False
        self.wait(2000)
