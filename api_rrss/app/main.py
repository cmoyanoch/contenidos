from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import instagram, linkedin, facebook, whatsapp, multi_platform

app = FastAPI(
    title="Social Media API",
    description="API for multi-platform social media publishing",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(instagram.router, prefix="/api/instagram", tags=["Instagram"])
app.include_router(linkedin.router, prefix="/api/linkedin", tags=["LinkedIn"])
app.include_router(facebook.router, prefix="/api/facebook", tags=["Facebook"])
app.include_router(whatsapp.router, prefix="/api/whatsapp", tags=["WhatsApp"])
app.include_router(multi_platform.router, prefix="/api/multi", tags=["Multi-Platform"])

@app.get("/")
async def root():
    return {"message": "ContentFlow Social Media API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
