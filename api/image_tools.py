from __future__ import annotations

import base64
from typing import Optional
from urllib.parse import urlparse

import requests
from fastapi import APIRouter, File, Form, Header, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel

from api.remove_background import call_pixelcut, _save_png_to_disk
from api.support import require_auth_key
from services.config import config


class RemoveBgPublicResponse(BaseModel):
    b64_json: str
    url: str


def _get_pixelcut_tokens() -> tuple[str, str, str]:
    """Lấy Pixelcut tokens từ config. Raise 503 nếu chưa cấu hình."""
    pc = config.pixelcut
    id_token = pc.get("id_token", "")
    org_id = pc.get("org_id", "")
    refresh_token = pc.get("refresh_token", "")
    if not id_token or not org_id:
        raise HTTPException(
            status_code=503,
            detail="Tính năng xóa nền chưa được cấu hình trên server. Vui lòng liên hệ quản trị viên.",
        )
    return id_token, org_id, refresh_token


def _fetch_image_from_url(url: str) -> tuple[bytes, str]:
    """Tải ảnh từ URL, trả về (bytes, mime)."""
    url_path = urlparse(url).path
    if url_path.startswith("/images/"):
        rel = url_path.removeprefix("/images/").lstrip("/")
        file_path = config.images_dir / rel
        if not file_path.exists() or not file_path.is_file():
            raise HTTPException(status_code=404, detail="Không tìm thấy file ảnh trên server")
        suffix = file_path.suffix.lower().lstrip(".")
        mime = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "webp": "image/webp"}.get(suffix, "image/png")
        return file_path.read_bytes(), mime
    try:
        r = requests.get(url, timeout=30)
        r.raise_for_status()
        mime = r.headers.get("content-type", "image/png").split(";")[0].strip()
        return r.content, mime
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Không thể tải ảnh từ URL: {e}")


def create_router() -> APIRouter:
    router = APIRouter()

    @router.post(
        "/v1/images/remove-background",
        response_model=RemoveBgPublicResponse,
        summary="Xóa nền ảnh",
        description=(
            "Xóa nền ảnh bằng AI. Hỗ trợ upload file trực tiếp hoặc truyền URL/base64.\n\n"
            "**Xác thực**: `Authorization: Bearer <api-key>`\n\n"
            "**Input** (chọn một):\n"
            "- `image` — file ảnh (multipart/form-data)\n"
            "- `image_url` — URL ảnh (form field)\n"
            "- `image_b64` — base64 của ảnh (form field)\n\n"
            "**Output**: JSON với `b64_json` (PNG base64) và `url` (đường dẫn lưu trên server)."
        ),
        tags=["Image Tools"],
    )
    async def remove_background_public(
        authorization: Optional[str] = Header(None),
        image: Optional[UploadFile] = File(None),
        image_url: Optional[str] = Form(None),
        image_b64: Optional[str] = Form(None),
    ):
        require_auth_key(authorization)

        # Lấy bytes ảnh
        if image is not None:
            image_bytes = await image.read()
            mime = image.content_type or "image/png"
        elif image_b64:
            try:
                image_bytes = base64.b64decode(image_b64)
            except Exception:
                raise HTTPException(status_code=400, detail="Dữ liệu base64 không hợp lệ")
            mime = "image/png"
        elif image_url:
            image_bytes, mime = await run_in_threadpool(_fetch_image_from_url, image_url)
        else:
            raise HTTPException(status_code=400, detail="Cần cung cấp image, image_url hoặc image_b64")

        if not image_bytes:
            raise HTTPException(status_code=400, detail="Dữ liệu ảnh rỗng")

        id_token, org_id, refresh_token = _get_pixelcut_tokens()

        result = await run_in_threadpool(
            call_pixelcut, image_bytes, mime, id_token, org_id, refresh_token or None
        )

        # Tự động cập nhật token mới nếu đã refresh
        if result.new_id_token:
            config.update_pixelcut(
                result.new_id_token,
                org_id,
                result.new_refresh_token or refresh_token,
            )

        image_url_saved = await run_in_threadpool(_save_png_to_disk, result.png_bytes)
        return RemoveBgPublicResponse(
            b64_json=base64.b64encode(result.png_bytes).decode(),
            url=image_url_saved,
        )

    return router
