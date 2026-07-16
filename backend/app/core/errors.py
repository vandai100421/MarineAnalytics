from fastapi import FastAPI, Request
from fastapi.exceptions import HTTPException, RequestValidationError
from fastapi.responses import JSONResponse


class ProblemDetail(HTTPException):
    def __init__(
        self,
        status_code: int,
        title: str,
        detail: str,
        type_: str = "about:blank",
    ) -> None:
        super().__init__(status_code=status_code, detail=detail)
        self.title = title
        self.type_ = type_


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(ProblemDetail)
    async def problem_detail_handler(request: Request, exc: ProblemDetail) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "type": exc.type_,
                "title": exc.title,
                "status": exc.status_code,
                "detail": exc.detail,
            },
        )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "type": "about:blank",
                "title": _http_title(exc.status_code),
                "status": exc.status_code,
                "detail": str(exc.detail),
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={
                "type": "about:blank",
                "title": "Validation Error",
                "status": 422,
                "detail": "Request validation failed",
                "errors": exc.errors(),
            },
        )


def _http_title(status_code: int) -> str:
    titles = {
        400: "Bad Request",
        401: "Unauthorized",
        403: "Forbidden",
        404: "Not Found",
        409: "Conflict",
        500: "Internal Server Error",
    }
    return titles.get(status_code, "Error")
