import base64
import hashlib
import logging
from typing import Optional
from cryptography.fernet import Fernet, InvalidToken
from app.config import settings

logger = logging.getLogger("nova.crypto")

FERNET_PREFIX = "gAAAAA"

def get_fernet_key() -> bytes:
    """Retrieve or deterministically generate a valid 32-byte Fernet key."""
    if getattr(settings, "FERNET_SECRET_KEY", None):
        try:
            key_bytes = settings.FERNET_SECRET_KEY.strip().encode("utf-8")
            # Validate Fernet key format
            Fernet(key_bytes)
            return key_bytes
        except Exception as e:
            logger.warning(f"Invalid FERNET_SECRET_KEY in config, falling back to derived key: {e}")

    # Deterministic key derived from JWT_SECRET_KEY
    seed = settings.JWT_SECRET_KEY or "nova-default-secret-salt"
    derived = hashlib.sha256(seed.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(derived)

def is_encrypted(val: Optional[str]) -> bool:
    """Check if the provided string appears to be a Fernet token."""
    if not val or not isinstance(val, str):
        return False
    return val.startswith(FERNET_PREFIX) and len(val) >= 40

def encrypt_credential(plain_text: Optional[str]) -> Optional[str]:
    """Encrypt a plaintext credential string with Fernet."""
    if not plain_text:
        return plain_text
    if is_encrypted(plain_text):
        return plain_text
    try:
        fernet = Fernet(get_fernet_key())
        return fernet.encrypt(plain_text.encode("utf-8")).decode("utf-8")
    except Exception as e:
        logger.error(f"Failed to encrypt credential: {e}")
        return plain_text

def decrypt_credential(cipher_text: Optional[str]) -> Optional[str]:
    """Decrypt a Fernet token. Returns original text if already plaintext or invalid."""
    if not cipher_text:
        return cipher_text
    if not is_encrypted(cipher_text):
        return cipher_text
    try:
        fernet = Fernet(get_fernet_key())
        return fernet.decrypt(cipher_text.encode("utf-8")).decode("utf-8")
    except InvalidToken:
        logger.warning("InvalidToken encountered during credential decryption. Returning as-is.")
        return cipher_text
    except Exception as e:
        logger.error(f"Error decrypting credential: {e}")
        return cipher_text
