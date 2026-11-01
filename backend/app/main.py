from fastapi import FastAPI

from app.api.routes.catalog import router as catalog_router
from app.api.routes.health import router as health_router
from app.api.routes.auth import router as auth_router
from app.api.routes.admin_categories import router as admin_categories_router
from app.api.routes.admin_services import router as admin_services_router
from app.api.routes.admin_deals import router as admin_deals_router
from app.api.routes.gallery import router as gallery_router
from app.api.routes.admin_gallery import router as admin_gallery_router

app = FastAPI(
    title="Perfect Hair and Beard Studio API",
    version="0.1.0",
)

app.include_router(health_router, prefix="/api")
app.include_router(catalog_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(admin_categories_router, prefix="/api")
app.include_router(admin_services_router, prefix="/api")
app.include_router(admin_deals_router, prefix="/api")
app.include_router(gallery_router, prefix="/api")
app.include_router(admin_gallery_router, prefix="/api")
