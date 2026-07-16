from fastapi import APIRouter, Response

from app.ingestion.metrics import metrics
from app.realtime.broadcaster import subscriber_manager

router = APIRouter(tags=["monitoring"])


@router.get("/metrics")
async def prometheus_metrics() -> Response:
    lines = [
        "# HELP marineanalytics_messages_total Total AIS messages received",
        "# TYPE marineanalytics_messages_total counter",
        f"marineanalytics_messages_total {metrics.messages_received}",
        "",
        "# HELP marineanalytics_positions_written_total Total positions written to DB",
        "# TYPE marineanalytics_positions_written_total counter",
        f"marineanalytics_positions_written_total {metrics.positions_written}",
        "",
        "# HELP marineanalytics_vessels_upserted_total Total vessel upserts",
        "# TYPE marineanalytics_vessels_upserted_total counter",
        f"marineanalytics_vessels_upserted_total {metrics.vessels_upserted}",
        "",
        "# HELP marineanalytics_decode_errors_total Total decode errors",
        "# TYPE marineanalytics_decode_errors_total counter",
        f"marineanalytics_decode_errors_total {metrics.decode_errors}",
        "",
        "# HELP marineanalytics_active_vessels Active vessels in Redis",
        "# TYPE marineanalytics_active_vessels gauge",
        f"marineanalytics_active_vessels {subscriber_manager.client_count}",
        "",
        "# HELP marineanalytics_sse_subscribers Connected SSE clients",
        "# TYPE marineanalytics_sse_subscribers gauge",
        f"marineanalytics_sse_subscribers {subscriber_manager.client_count}",
        "",
    ]

    for msg_type, count in metrics.messages_by_type.items():
        safe = msg_type.replace("-", "_").replace(" ", "_").lower()
        lines.append(f'marineanalytics_messages_by_type{{type="{safe}"}} {count}')
    lines.append("")

    return Response(content="\n".join(lines), media_type="text/plain")
