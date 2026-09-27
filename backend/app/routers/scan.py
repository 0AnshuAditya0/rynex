"""SIMULATED autonomous-collection feed.

Honestly labeled: this endpoint does NOT crawl Tor. It simulates what a
scheduler + crawler would produce (fresh timestamp + one new post per tick)
so judges can see the UX and data flow. Production would replace the tick
with Tor connectors, dedup, and source-reliability scoring.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List

from fastapi import APIRouter

from app import data_store
from app.models.mongo_schemas import PostDoc

router = APIRouter(prefix="/scan", tags=["scan"])

_SCAN_STATE: Dict[str, Any] = {
    "simulated": True,
    "tick": 0,
    "last_scan": None,
    "events": [],
}

_SIM_TEMPLATES = [
    "SIMULATED refresh: vendor restocked listings, escrow terms unchanged. (demo post, not a real crawl)",
    "SIMULATED refresh: mirror onion rotated, PGP key unchanged. (demo post, not a real crawl)",
    "SIMULATED refresh: new feedback batch observed on forum mirror. (demo post, not a real crawl)",
]


@router.get("/status")
def scan_status() -> Dict[str, Any]:
    return {
        "simulated": True,
        "label": "SIMULATED FEED — stands in for Tor crawler + scheduler",
        "tick": _SCAN_STATE["tick"],
        "last_scan": _SCAN_STATE["last_scan"],
        "recent_events": _SCAN_STATE["events"][-10:],
        "note": "No live Tor crawling. Ticks append one clearly-marked demo post in-memory.",
    }


@router.post("/trigger")
def trigger_scan() -> Dict[str, Any]:
    actors = data_store.get_all_actors()
    if not actors:
        return {"simulated": True, "error": "no actors loaded"}
    idx = _SCAN_STATE["tick"] % len(actors)
    actor = actors[idx]
    now = datetime.now(timezone.utc).replace(tzinfo=None, microsecond=0)
    tick = _SCAN_STATE["tick"] + 1
    text = _SIM_TEMPLATES[(tick - 1) % len(_SIM_TEMPLATES)]
    post = PostDoc(
        id=f"sim-post-{tick:04d}",
        actor_id=actor.id,
        platform="simulated-feed",
        raw_text=text,
        timestamp=now,
        source="simulated-feed",
    )
    data_store.append_simulated_post(post)
    event = {
        "tick": tick,
        "actor_id": actor.id,
        "primary_handle": actor.primary_handle,
        "post_id": post.id,
        "timestamp": now.isoformat() + "Z",
    }
    _SCAN_STATE["tick"] = tick
    _SCAN_STATE["last_scan"] = now.isoformat() + "Z"
    _SCAN_STATE["events"].append(event)
    return {"simulated": True, **event, "label": "SIMULATED tick — demo post appended in-memory"}
