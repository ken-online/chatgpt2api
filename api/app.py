from __future__ import annotations

from contextlib import asynccontextmanager
from threading import Event
from urllib.parse import urlparse

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel as PydanticBaseModel

from api import accounts, ai, image_tasks, register, remove_background, system
from api.support import resolve_web_asset, start_limited_account_watcher
from services.backup_service import backup_service
from services.config import config
from services.image_service import delete_images as delete_stored_images


class DeleteImagesRequest(PydanticBaseModel):
    paths: list[str]


def create_app() -> FastAPI:
    app_version = config.app_version

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        stop_event = Event()
        thread = start_limited_account_watcher(stop_event)
        backup_service.start()
        config.cleanup_old_images()
        try:
            yield
        finally:
            stop_event.set()
            thread.join(timeout=1)
            backup_service.stop()

    app = FastAPI(title="chatgpt2api", version=app_version, lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(ai.create_router())
    app.include_router(accounts.create_router())
    app.include_router(image_tasks.create_router())
    app.include_router(register.create_router())
    app.include_router(remove_background.create_router())
    app.include_router(system.create_router(app_version))
    if config.images_dir.exists():
        app.mount("/images", StaticFiles(directory=str(config.images_dir)), name="images")

    @app.get("/api/download-image", include_in_schema=False)
    async def download_image(path: str = Query(..., description="Đường dẫn file, bắt đầu bằng /images/")):
        # Chỉ cho phép path bắt đầu bằng /images/
        clean = path.lstrip("/")
        if not clean.startswith("images/"):
            raise HTTPException(status_code=400, detail="Chỉ hỗ trợ tải xuống file trong /images/")
        rel = clean.removeprefix("images/").lstrip("/")
        file_path = config.images_dir / rel
        if not file_path.exists() or not file_path.is_file():
            raise HTTPException(status_code=404, detail="Không tìm thấy file")
        return FileResponse(
            str(file_path),
            media_type="image/png",
            headers={"Content-Disposition": f'attachment; filename="{file_path.name}"'},
        )

    @app.post("/api/delete-images", include_in_schema=False)
    async def delete_images_endpoint(request: DeleteImagesRequest):
        paths = []
        for path in request.paths:
            clean = urlparse(path).path.lstrip("/")
            if not clean.startswith("images/"):
                continue
            rel = clean.removeprefix("images/").lstrip("/")
            if rel:
                paths.append(rel)
        result = delete_stored_images(list(dict.fromkeys(paths)))
        return {"deleted": result["removed"]}

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_web(full_path: str):
        asset = resolve_web_asset(full_path)
        if asset is not None:
            return FileResponse(asset)
        if full_path.strip("/").startswith("_next/"):
            raise HTTPException(status_code=404, detail="Not Found")
        fallback = resolve_web_asset("")
        if fallback is None:
            raise HTTPException(status_code=404, detail="Not Found")
        return FileResponse(fallback)

    return app
