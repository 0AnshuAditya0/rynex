from typing import Any, Dict, List

from fastapi import APIRouter, Query

from app import data_store
from app.helpers.actor_pipeline import compute_actor_confidence

router = APIRouter(prefix="/search", tags=["search"])


@router.get("")
def search_actors(q: str = Query(..., min_length=1)) -> Dict[str, Any]:
    query = q.strip().lower()
    if not query:
        return {"query": q, "total": 0, "results": []}

    results: List[Dict[str, Any]] = []

    for actor in data_store.get_all_actors():
        matched_fields: List[str] = []

        if query in actor.primary_handle.lower():
            matched_fields.append("handle")

        for ident in actor.identifiers:
            if ident.type == "handle" and query in ident.value.lower():
                if "handle" not in matched_fields:
                    matched_fields.append("handle")
            elif ident.type == "pgp" and query in ident.value.lower():
                matched_fields.append("pgp")
            elif ident.type == "wallet" and query in ident.value.lower():
                matched_fields.append("wallet")

        if matched_fields:
            conf = compute_actor_confidence(actor.id)
            results.append({
                "id": actor.id,
                "primary_handle": actor.primary_handle,
                "category": actor.category,
                "status": actor.status,
                "matched_fields": matched_fields,
                "confidence": conf["score"],
                "confidence_breakdown": conf["breakdown"],
            })

    return {
        "query": q,
        "total": len(results),
        "results": results,
    }
