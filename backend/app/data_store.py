import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Optional

from app.models.mongo_schemas import ActorDoc, InfraSignal, MockDescriptor, PostDoc

_DEMO_DESCRIPTOR_ONION = "rynex9inconsist7mock7onionfake56charactersv3testonion03.onion"
_SEED_DIR = Path(__file__).resolve().parents[1] / "seed_data"


def _demo_descriptor_published() -> datetime:
    """Keep the descriptor inconsistency demo active regardless of calendar date."""
    return (datetime.now(timezone.utc) - timedelta(hours=6)).replace(microsecond=0).replace(tzinfo=None)


def _to_naive_utc(dt: datetime) -> datetime:
    if dt.tzinfo is not None:
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


def _normalize_actor(raw: dict) -> ActorDoc:
    actor = ActorDoc(**{k: v for k, v in raw.items() if k != "_comment"})
    actor = actor.model_copy(update={
        "first_seen": _to_naive_utc(actor.first_seen),
        "last_seen": _to_naive_utc(actor.last_seen),
        "identifiers": [
            ident.model_copy(update={"first_seen": _to_naive_utc(ident.first_seen)})
            for ident in actor.identifiers
        ],
    })
    return actor


def _normalize_post(raw: dict) -> PostDoc:
    post = PostDoc(**{k: v for k, v in raw.items() if k != "_comment"})
    return post.model_copy(update={"timestamp": _to_naive_utc(post.timestamp)})


def _normalize_signal(raw: dict) -> InfraSignal:
    signal = InfraSignal(**{k: v for k, v in raw.items()
                            if k not in ("_comment", "mock_descriptor")})
    return signal.model_copy(update={"first_seen": _to_naive_utc(signal.first_seen)})


def _normalize_descriptor(raw: dict) -> MockDescriptor:
    normalized = dict(raw)
    if normalized.get("onion_address") == _DEMO_DESCRIPTOR_ONION:
        normalized["published"] = _demo_descriptor_published()

    desc = MockDescriptor(**normalized)
    return desc.model_copy(update={"published": _to_naive_utc(desc.published)})


def _load_json(filename: str) -> list:
    path = _SEED_DIR / filename
    with open(path, "r", encoding="utf-8-sig") as fh:
        return json.load(fh)


_actors_raw = _load_json("actors.json")
_posts_raw = _load_json("posts.json")
_infra_raw = _load_json("infra_examples.json")

_ACTORS: List[ActorDoc] = [_normalize_actor(r) for r in _actors_raw]
_POSTS: List[PostDoc] = [_normalize_post(r) for r in _posts_raw]
_SIGNALS: List[InfraSignal] = [_normalize_signal(r) for r in _infra_raw]
_DESCRIPTORS: List[MockDescriptor] = [
    _normalize_descriptor(r["mock_descriptor"])
    for r in _infra_raw
    if r.get("mock_descriptor") is not None
]

_ACTOR_INDEX: Dict[str, ActorDoc] = {a.id: a for a in _ACTORS}
_POSTS_BY_ACTOR: Dict[str, List[PostDoc]] = {}
for _p in _POSTS:
    _POSTS_BY_ACTOR.setdefault(_p.actor_id, []).append(_p)
_POST_INDEX: Dict[str, PostDoc] = {p.id: p for p in _POSTS}


def get_all_actors() -> List[ActorDoc]:
    return _ACTORS


def get_actor_by_id(actor_id: str) -> Optional[ActorDoc]:
    return _ACTOR_INDEX.get(actor_id)


def get_posts_by_actor(actor_id: str) -> List[PostDoc]:
    return _POSTS_BY_ACTOR.get(actor_id, [])


def get_all_posts() -> List[PostDoc]:
    return _POSTS


def get_post_by_id(post_id: str) -> Optional[PostDoc]:
    """Return one raw post without treating its extracted values as facts."""
    return _POST_INDEX.get(post_id)


def get_all_infra_signals() -> List[InfraSignal]:
    return _SIGNALS


def get_all_descriptors() -> List[MockDescriptor]:
    return _DESCRIPTORS


def get_all_posts_map() -> Dict[str, List[str]]:
    return {actor_id: [p.raw_text for p in posts]
            for actor_id, posts in _POSTS_BY_ACTOR.items()}
