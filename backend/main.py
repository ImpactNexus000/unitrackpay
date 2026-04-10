from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import settings

app = FastAPI(
    title="UniTrackPay",
    description="Tuition & fee payment tracker for University of Hertfordshire students",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "ok", "app": "UniTrackPay"}


from backend.routers import auth

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])

# Routers to be included as they are built:
# app.include_router(payments.router, prefix="/api/me/payments", tags=["Payments"])
# app.include_router(fees.router, prefix="/api/me/fees", tags=["Fees"])
# app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
# app.include_router(notifications.router, prefix="/api/me/notifications", tags=["Notifications"])
