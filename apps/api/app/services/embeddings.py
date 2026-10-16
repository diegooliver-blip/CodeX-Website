"""Local multilingual embeddings via fastembed (ONNX, CPU). No external API key needed."""

import asyncio
from functools import lru_cache

from fastembed import TextEmbedding

from app.config import get_settings


@lru_cache
def _model() -> TextEmbedding:
    return TextEmbedding(model_name=get_settings().embedding_model)


def _embed(texts: list[str]) -> list[list[float]]:
    return [vec.tolist() for vec in _model().embed(texts)]


async def embed(texts: list[str]) -> list[list[float]]:
    return await asyncio.to_thread(_embed, texts)


async def embed_one(text: str) -> list[float]:
    return (await embed([text]))[0]
