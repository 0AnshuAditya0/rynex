"""Static threshold watchlist — filtering only, no alerting infrastructure."""

from typing import Any, Dict, List

from fastapi import APIRouter, Query

from app import data_store
from app.helpers.actor_pipeline import compute_actor_confidence

router = APIRouter(prefix="/watchlist", tags=["watchlist"])


@router.get("")
def get_watchlist(
    min_confidence: float = Query(0.7, ge=0.0, le=1.0),
) -> Dict[str, Any]:
    items: List[Dict[str, Any]] = []
    for actor in data_store.get_all_actors():
        conf = compute_actor_confidence(actor.id)
        if conf["score"] >= min_confidence:
            items.append({
                "id": actor.id,
                "primary_handle": actor.primary_handle,
                "category": actor.category,
                "status": actor.status,
                "confidence": conf["score"],
                "matched_actor_id": conf["matched_actor_id"],
            })
    items.sort(key=lambda r: r["confidence"], reverse=True)
    return {
        "min_confidence": min_confidence,
        "total": len(items),
        "items": items,
    }
