import uuid

import cloudinary
import cloudinary.uploader
import magic

from backend.config import settings

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "application/pdf"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

# Configure Cloudinary once at module load
cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
)


def validate_file(file_bytes: bytes, content_type: str) -> str | None:
    """Validate MIME type server-side using python-magic.

    Returns None if valid, or an error message string if invalid.
    """
    if len(file_bytes) > MAX_FILE_SIZE:
        return f"File too large. Maximum size is {MAX_FILE_SIZE // (1024 * 1024)}MB."

    detected_mime = magic.from_buffer(file_bytes, mime=True)
    if detected_mime not in ALLOWED_MIME_TYPES:
        return f"Invalid file type: {detected_mime}. Allowed: JPEG, PNG, PDF."

    return None


def upload_receipt(
    file_bytes: bytes,
    user_id: uuid.UUID,
    payment_id: uuid.UUID,
) -> str:
    """Upload receipt to Cloudinary and return the secure URL."""
    folder = f"unitrackpay/receipts/{user_id}/{payment_id}"

    result = cloudinary.uploader.upload(
        file_bytes,
        folder=folder,
        resource_type="auto",
    )

    return result["secure_url"]
