import time
from collections.abc import Awaitable, Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger("rate_limiter")


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        settings = get_settings()
        if not settings.rate_limit_enabled:
            return await call_next(request)

        if request.url.path.startswith(("/docs", "/openapi.json", "/health", "/metrics")):
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        key = f"rl:{client_ip}"

        from app.core.redis import get_redis

        redis = await get_redis()
        current = int(time.time())
        window = current // 60

        bucket = f"{key}:{window}"
        count = await redis.incr(bucket)
        if count == 1:
            await redis.expire(bucket, 60)

        if count > settings.rate_limit_per_minute:
            logger.warning("rate_limit_exceeded", ip=client_ip, count=count)
            return JSONResponse(
                status_code=429,
                content={
                    "type": "about:blank",
                    "title": "Too Many Requests",
                    "status": 429,
                    "detail": f"Rate limit {settings.rate_limit_per_minute}/min exceeded",
                },
                headers={"Retry-After": "60"},
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(settings.rate_limit_per_minute)
        response.headers["X-RateLimit-Remaining"] = str(
            max(0, settings.rate_limit_per_minute - count)
        )
        return response
