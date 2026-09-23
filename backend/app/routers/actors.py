from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query

from app import data_store
from app.helpers.actor_pipeline import (
    compute_actor_confidence,
    linked_actors_detail,
)
from app.services.infra_correlation import compute_infra_match_score

router = APIRouter(prefix="/actors", tags=["actors"])


def _serialize_datetime(dt: datetime) -> str:
    return dt.isoformat() + "Z" if dt.tzinfo is None else dt.isoformat()


def _actor_base(actor) -> Dict[str, Any]:
    return {
        "id": actor.id,
        "primary_handle": actor.primary_handle,
        "category": actor.category,
        "status": actor.status,
        "identifiers": [
            {
                "type": i.type,
                "value": i.value,
                "platform": i.platform,
                "currency": i.currency,
                "first_seen": _serialize_datetime(i.first_seen),
            }
            for i in actor.identifiers
        ],
        "hidden_services": actor.hidden_services,
        "linked_actor_ids": actor.linked_actor_ids,
        "source": actor.source,
        "first_seen": _serialize_datetime(actor.first_seen),
        "last_seen": _serialize_datetime(actor.last_seen),
        "notes": actor.notes,
    }


@router.get("")
def list_actors(
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    first_seen_after: Optional[str] = Query(None),
    first_seen_before: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> Dict[str, Any]:
    actors = data_store.get_all_actors()

    if category:
        actors = [a for a in actors if a.category == category]
    if status:
        actors = [a for a in actors if a.status == status]
    if first_seen_after:
        try:
            dt_after = datetime.fromisoformat(first_seen_after.replace("Z", "+00:00"))
            actors = [a for a in actors if a.first_seen.replace(tzinfo=None) >= dt_after.replace(tzinfo=None)]
        except ValueError:
            pass
    if first_seen_before:
        try:
            dt_before = datetime.fromisoformat(first_seen_before.replace("Z", "+00:00"))
            actors = [a for a in actors if a.first_seen.replace(tzinfo=None) <= dt_before.replace(tzinfo=None)]
        except ValueError:
            pass

    total = len(actors)
    page = actors[offset: offset + limit]

    items: List[Dict[str, Any]] = []
    for actor in page:
        conf = compute_actor_confidence(actor.id)
        entry = _actor_base(actor)
        entry["confidence"] = conf["score"]
        entry["confidence_breakdown"] = conf["breakdown"]
        entry["matched_actor_id"] = conf["matched_actor_id"]
        items.append(entry)

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "items": items,
    }


@router.get("/{actor_id}")
def get_actor(actor_id: str) -> Dict[str, Any]:
    actor = data_store.get_actor_by_id(actor_id)
    if not actor:
        raise HTTPException(status_code=404, detail=f"Actor '{actor_id}' not found")

    conf = compute_actor_confidence(actor_id)
    posts = data_store.get_posts_by_actor(actor_id)
    linked = linked_actors_detail(actor_id)

    infra_results: List[Dict[str, Any]] = []
    if actor.hidden_services:
        signals = data_store.get_all_infra_signals()
        descriptors = data_store.get_all_descriptors()
        for onion in actor.hidden_services:
            infra_results.append(
                compute_infra_match_score(onion, signals, descriptors)
            )

    profile = _actor_base(actor)
    profile["confidence"] = conf["score"]
    profile["confidence_breakdown"] = conf["breakdown"]
    profile["matched_actor_id"] = conf["matched_actor_id"]
    profile["entity_link"] = conf["entity_link"]
    profile["stylometry"] = conf["stylometry"]
    profile["linked_actors"] = linked
    profile["posts"] = [
        {
            "id": p.id,
            "actor_id": p.actor_id,
            "platform": p.platform,
            "raw_text": p.raw_text,
            "timestamp": _serialize_datetime(p.timestamp),
            "source": p.source,
        }
        for p in posts
    ]
    profile["infra_correlation"] = infra_results

    return profile
