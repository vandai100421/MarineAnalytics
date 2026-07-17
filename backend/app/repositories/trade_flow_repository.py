from __future__ import annotations

from typing import cast

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class TradeFlowRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_live_flows(self, limit: int = 100) -> list[dict[str, object]]:
        stmt = text(
            """
            SELECT
                po.id   AS origin_port_id,
                po.name AS origin_name,
                po.lat  AS origin_lat,
                po.lon  AS origin_lon,
                pd.id   AS dest_port_id,
                pd.name AS dest_name,
                pd.lat  AS dest_lat,
                pd.lon  AS dest_lon,
                COUNT(DISTINCT pa.mmsi) AS vessel_count
            FROM port_arrivals pa
            JOIN ports po   ON po.id = pa.port_id
            JOIN vessels v  ON v.mmsi = pa.mmsi
            CROSS JOIN ports pd
            WHERE pa.departed_at IS NULL
              AND v.destination IS NOT NULL
              AND v.destination != ''
              AND pd.id != pa.port_id
              AND (
                  v.destination ILIKE '%' || pd.name || '%'
                  OR left(v.destination, 5) = pd.unlocode
              )
            GROUP BY po.id, po.name, po.lat, po.lon, pd.id, pd.name, pd.lat, pd.lon
            ORDER BY vessel_count DESC
            LIMIT :limit
            """
        ).params(limit=limit)

        result = await self._session.execute(stmt)
        rows = result.all()
        return [dict(r._mapping) for r in rows]

    async def get_historical_flows(self, limit: int = 100) -> list[dict[str, object]]:
        stmt = text(
            """
            WITH seq AS (
                SELECT
                    mmsi,
                    port_id,
                    LAG(port_id) OVER w AS origin_port_id
                FROM port_arrivals
                WHERE departed_at IS NOT NULL
                WINDOW w AS (PARTITION BY mmsi ORDER BY arrived_at)
            )
            SELECT
                po.id   AS origin_port_id,
                po.name AS origin_name,
                po.lat  AS origin_lat,
                po.lon  AS origin_lon,
                pd.id   AS dest_port_id,
                pd.name AS dest_name,
                pd.lat  AS dest_lat,
                pd.lon  AS dest_lon,
                COUNT(*) AS vessel_count
            FROM seq s
            JOIN ports po ON po.id = s.origin_port_id
            JOIN ports pd ON pd.id = s.port_id
            WHERE s.origin_port_id IS NOT NULL
              AND s.origin_port_id != s.port_id
            GROUP BY po.id, po.name, po.lat, po.lon, pd.id, pd.name, pd.lat, pd.lon
            ORDER BY vessel_count DESC
            LIMIT :limit
            """
        ).params(limit=limit)

        result = await self._session.execute(stmt)
        rows = result.all()
        return [dict(r._mapping) for r in rows]

    async def get_all_flows(self, limit: int = 100) -> list[dict[str, object]]:
        live = await self.get_live_flows(limit)
        historical = await self.get_historical_flows(limit)

        merged: dict[tuple[int, int], dict[str, object]] = {}
        for flow in live + historical:
            key = (int(cast(int, flow["origin_port_id"])), int(cast(int, flow["dest_port_id"])))
            if key in merged:
                cur = int(cast(int, merged[key]["vessel_count"]))
                add = int(cast(int, flow["vessel_count"]))
                merged[key]["vessel_count"] = cur + add
            else:
                merged[key] = dict(flow)

        sorted_flows = sorted(
            merged.values(), key=lambda f: int(cast(int, f["vessel_count"])), reverse=True
        )
        return sorted_flows[:limit]
