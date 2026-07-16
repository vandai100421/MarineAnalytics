import asyncio
from collections import defaultdict

from app.core.logging import get_logger

logger = get_logger("metrics")


class IngestionMetrics:
    def __init__(self) -> None:
        self.messages_received: int = 0
        self.decode_errors: int = 0
        self.positions_written: int = 0
        self.vessels_upserted: int = 0
        self.messages_by_type: dict[str, int] = defaultdict(int)
        self._last_snapshot_count: int = 0
        self._snapshot_task: asyncio.Task[None] | None = None

    def record_message(self, message_type: str) -> None:
        self.messages_received += 1
        self.messages_by_type[message_type] += 1

    def record_decode_error(self) -> None:
        self.decode_errors += 1

    def record_position_written(self) -> None:
        self.positions_written += 1

    def record_vessel_upserted(self) -> None:
        self.vessels_upserted += 1

    def snapshot(self) -> dict[str, object]:
        delta = self.messages_received - self._last_snapshot_count
        self._last_snapshot_count = self.messages_received
        return {
            "messages_total": self.messages_received,
            "msg_per_interval": delta,
            "decode_errors": self.decode_errors,
            "positions_written": self.positions_written,
            "vessels_upserted": self.vessels_upserted,
            "by_type": dict(self.messages_by_type),
        }

    async def start_periodic_log(self, interval: float = 60.0) -> None:
        self._snapshot_task = asyncio.create_task(self._log_loop(interval))

    async def stop_periodic_log(self) -> None:
        if self._snapshot_task is not None:
            self._snapshot_task.cancel()
            try:
                await self._snapshot_task
            except asyncio.CancelledError:
                pass
            self._snapshot_task = None

    async def _log_loop(self, interval: float) -> None:
        while True:
            await asyncio.sleep(interval)
            stats = self.snapshot()
            logger.info("ingestion_metrics", **stats)


metrics = IngestionMetrics()
