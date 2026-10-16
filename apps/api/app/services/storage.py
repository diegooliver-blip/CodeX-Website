"""S3-compatible object storage (RustFS in docker, S3/R2 in production)."""

import logging
import re
import uuid
from functools import lru_cache

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError

from app.config import get_settings

log = logging.getLogger(__name__)


def _client(endpoint: str):
    s = get_settings()
    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=s.s3_access_key,
        aws_secret_access_key=s.s3_secret_key,
        region_name=s.s3_region,
        config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
    )


@lru_cache
def internal():
    return _client(get_settings().s3_endpoint)


@lru_cache
def public():
    # Presigned URLs embed the host, so sign against the endpoint the browser can reach.
    return _client(get_settings().s3_public_endpoint)


def ensure_bucket() -> None:
    bucket = get_settings().s3_bucket
    try:
        internal().head_bucket(Bucket=bucket)
    except ClientError:
        internal().create_bucket(Bucket=bucket)
        log.info("Created bucket %s", bucket)


def new_key(folder: str, filename: str) -> str:
    stem = re.sub(r"[^a-zA-Z0-9._-]+", "-", filename).strip("-")[-80:] or "file"
    return f"{folder}/{uuid.uuid4().hex[:12]}-{stem}"


def presign_put(key: str, content_type: str, expires: int = 3600) -> str:
    return public().generate_presigned_url(
        "put_object",
        Params={"Bucket": get_settings().s3_bucket, "Key": key, "ContentType": content_type},
        ExpiresIn=expires,
    )


def presign_get(key: str, expires: int = 3600) -> str:
    return public().generate_presigned_url(
        "get_object", Params={"Bucket": get_settings().s3_bucket, "Key": key}, ExpiresIn=expires
    )


def read(key: str) -> bytes:
    return internal().get_object(Bucket=get_settings().s3_bucket, Key=key)["Body"].read()


def delete(key: str) -> None:
    internal().delete_object(Bucket=get_settings().s3_bucket, Key=key)
