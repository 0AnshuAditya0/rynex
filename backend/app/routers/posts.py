from typing import Any, Dict

from fastapi import APIRouter, HTTPException

from app import data_store
from app.services.identifier_extractor import extract_identifiers

router = APIRouter(prefix="/posts", tags=["posts"])


@router.get("/{post_id}/extract")
def extract_post_identifiers(post_id: str) -> Dict[str, Any]:
    """Return live, unconfirmed observations from one post's raw text."""
    post = data_store.get_post_by_id(post_id)
    if not post:
        raise HTTPException(status_code=404, detail=f"Post '{post_id}' not found")

    identifiers = extract_identifiers(post.raw_text)
    return {
        "post_id": post.id,
        "extracted_identifiers": [
            {
                **identifier,
                "status": "unconfirmed_extraction",
                "source_post_id": post.id,
            }
            for identifier in identifiers
        ],
    }
