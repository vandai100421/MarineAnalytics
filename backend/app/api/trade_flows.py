from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.repositories.trade_flow_repository import TradeFlowRepository
from app.schemas.port import TradeFlowListResponse, TradeFlowResponse

router = APIRouter(prefix="/api/v1/trade-flows", tags=["trade-flows"])


@router.get("", response_model=TradeFlowListResponse)
async def get_trade_flows(
    limit: int = Query(50, ge=1, le=200, description="Max number of flow arcs"),
    session: AsyncSession = Depends(get_session),
) -> TradeFlowListResponse:
    repo = TradeFlowRepository(session)
    flows = await repo.get_all_flows(limit)
    return TradeFlowListResponse(
        flows=[TradeFlowResponse(**f) for f in flows],
        total=len(flows),
    )
