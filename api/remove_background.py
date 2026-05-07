from __future__ import annotations

import base64
import hashlib
import io
import time
from datetime import datetime
from typing import Optional
from urllib.parse import urlparse

import requests
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.config import config


class RemoveBgRequest(BaseModel):
    # Một trong hai phải có: base64 hoặc URL
    image_b64: Optional[str] = None   # base64-encoded image
    image_url: Optional[str] = None   # URL để backend tự fetch (tránh CORS ở frontend)
    image_mime: str = "image/png"
    id_token: str
    org_id: str


class RemoveBgResponse(BaseModel):
    b64_json: str
    image_url: str  # URL file PNG đã lưu trên disk


def _save_png_to_disk(png_bytes: bytes) -> str:
    """Lưu PNG vào thư mục ảnh, trả về URL tương đối /images/..."""
    now = datetime.now()
    date_path = now.strftime("%Y/%m/%d")
    dest_dir = config.images_dir / date_path
    dest_dir.mkdir(parents=True, exist_ok=True)

    hash_part = hashlib.md5(png_bytes).hexdigest()[:16]
    filename = f"nobg_{int(time.time())}_{hash_part}.png"
    (dest_dir / filename).write_bytes(png_bytes)
    return f"/images/{date_path}/{filename}"


def create_router() -> APIRouter:
    router = APIRouter()

    @router.post("/api/remove-background", response_model=RemoveBgResponse)
    async def remove_background(req: RemoveBgRequest):
        # Lấy bytes ảnh
        if req.image_b64:
            try:
                image_bytes = base64.b64decode(req.image_b64)
            except Exception:
                raise HTTPException(status_code=400, detail="Dữ liệu ảnh base64 không hợp lệ")
            mime = req.image_mime
        elif req.image_url:
            url = req.image_url
            # Parse path để nhận diện ảnh nội bộ dù URL là relative hay absolute
            url_path = urlparse(url).path
            if url_path.startswith("/images/"):
                # File nội bộ — đọc trực tiếp từ disk, tránh self-HTTP
                rel = url_path.removeprefix("/images/").lstrip("/")
                file_path = config.images_dir / rel
                if not file_path.exists() or not file_path.is_file():
                    raise HTTPException(status_code=404, detail="Không tìm thấy file ảnh trên server")
                image_bytes = file_path.read_bytes()
                suffix = file_path.suffix.lower().lstrip(".")
                mime = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "webp": "image/webp"}.get(suffix, "image/png")
            else:
                try:
                    dl = requests.get(url, timeout=30)
                    dl.raise_for_status()
                    image_bytes = dl.content
                    mime = dl.headers.get("content-type", "image/png").split(";")[0].strip()
                except requests.RequestException as e:
                    raise HTTPException(status_code=502, detail=f"Không thể tải ảnh từ URL: {e}")
        else:
            raise HTTPException(status_code=400, detail="Cần cung cấp image_b64 hoặc image_url")

        headers = {
            "Authorization": f"Bearer {req.id_token}",
            "x-org-id": req.org_id,
            "x-client-version": "web:pixelcut.ai:9ff356ae",
            "x-locale": "en",
            "Accept": "image/png",
            "Origin": "https://www.pixelcut.ai",
            "Referer": "https://www.pixelcut.ai/ai-image-editor?tool=removeBackground",
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36"
            ),
        }

        ext = mime.split("/")[-1] if "/" in mime else "png"
        files = {"image": (f"image.{ext}", io.BytesIO(image_bytes), mime)}
        data = {"format": "png", "model": "v1"}

        try:
            r = requests.post(
                "https://api2.pixelcut.app/image/matte/v1",
                files=files,
                data=data,
                headers=headers,
                timeout=120,
            )
        except requests.RequestException as e:
            raise HTTPException(status_code=502, detail=f"Không thể kết nối Pixelcut: {e}")

        if r.status_code == 401:
            raise HTTPException(status_code=403, detail="PIXELCUT_AUTH_EXPIRED")

        if r.status_code != 200:
            ct = r.headers.get("content-type", "")
            body = r.text if ("json" in ct or "text" in ct) else f"<{len(r.content)} bytes>"
            raise HTTPException(status_code=502, detail=f"Pixelcut lỗi {r.status_code}: {body[:300]}")

        ct = r.headers.get("content-type", "")
        if not ct.startswith("image/"):
            raise HTTPException(status_code=502, detail=f"Pixelcut trả về định dạng không hợp lệ: {ct}")

        image_url = _save_png_to_disk(r.content)
        return RemoveBgResponse(b64_json=base64.b64encode(r.content).decode(), image_url=image_url)

    return router
