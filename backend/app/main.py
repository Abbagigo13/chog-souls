# backend/app/main.py
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api.routes import router
from .api.verify_routes import router as verify_router

app = FastAPI(title="CHOG SOULS API")

# Sites allowed to call this API. Your deployed frontend goes in the
# ALLOWED_ORIGINS variable (comma separated, no trailing slash).
origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
origins += [
    o.strip().rstrip("/")
    for o in os.getenv("ALLOWED_ORIGINS", "").split(",")
    if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"status": "ok", "service": "CHOG SOULS API"}


app.include_router(router, prefix="/api")
app.include_router(verify_router, prefix="/api")