"""Behavioural profiling: posting-time + identifier-hygiene similarity.

Pure functions, same pattern as the other services — no DB, no FastAPI
imports. Both features return 0.0-1.0; equal weight in
compute_behavioural_score().
"""

import json
import math
import sys
from collections import defaultdict
from datetime import timezone
from pathlib import Path
from typing import Dict, List

CURRENT_FILE = Path(__file__).resolve()
BACKEND_DIR = CURRENT_FILE.parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.models.mongo_schemas import ActorDoc, PostDoc

BUCKET_HOURS = 4
N_BUCKETS = 24 // BUCKET_HOURS  # 6 buckets; adjacent-bucket adjacency approximates circularity


def extract_posting_hours(posts: List[PostDoc]) -> List[int]:
    """Hour-of-day (0-23) of each post timestamp, normalized to UTC."""
    hours: List[int] = []
    for p in posts:
        ts = p.timestamp
        if ts.tzinfo is not None:
            ts = ts.astimezone(timezone.utc).replace(tzinfo=None)
        hours.append(ts.hour % 24)
    return hours


def _bucket_vector(hours: List[int]) -> List[int]:
    vec = [0] * N_BUCKETS
    for h in hours:
        vec[(h % 24) // BUCKET_HOURS] += 1
    return vec


def compare_posting_patterns(hours_a: List[int], hours_b: List[int]) -> float:
    """Cosine similarity between 4-hour-bucket count vectors.

    Bucketing keeps 23:00 and 01:00 in adjacent buckets (b5 vs b0) rather
    than opposite ends of a linear scale — a coarse circular comparison.
    """
    if not hours_a or not hours_b:
        return 0.0
    vec_a = _bucket_vector(hours_a)
    vec_b = _bucket_vector(hours_b)
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return round(max(0.0, min(1.0, dot / (norm_a * norm_b))), 4)


def _identifier_platforms(actor: ActorDoc) -> set:
    return {i.platform for i in actor.identifiers if i.platform}


def compare_identifier_hygiene(actor_a: ActorDoc, actor_b: ActorDoc) -> float:
    """Platform-usage pattern similarity from the identifiers list.

    0.5 * Jaccard overlap of identifier platforms + 0.5 * breadth
    similarity (both single-platform vs both spread out). Returns 0-1.
    """
    set_a = _identifier_platforms(actor_a)
    set_b = _identifier_platforms(actor_b)
    if not set_a or not set_b:
        return 0.0
    union = set_a | set_b
    jaccard = len(set_a & set_b) / len(union) if union else 0.0
    breadth = 1.0 - abs(len(set_a) - len(set_b)) / max(len(set_a), len(set_b), 1)
    return round(0.5 * jaccard + 0.5 * breadth, 4)


def compute_behavioural_score(
    actor_a: ActorDoc,
    posts_a: List[PostDoc],
    actor_b: ActorDoc,
    posts_b: List[PostDoc],
) -> Dict[str, float]:
    """Equal-weight (0.5/0.5) combination of the two behavioural features."""
    posting_sim = compare_posting_patterns(
        extract_posting_hours(posts_a), extract_posting_hours(posts_b)
    )
    hygiene_sim = compare_identifier_hygiene(actor_a, actor_b)
    return {
        "score": round(0.5 * posting_sim + 0.5 * hygiene_sim, 4),
        "posting_pattern_sim": posting_sim,
        "identifier_hygiene_sim": hygiene_sim,
    }


if __name__ == "__main__":
    actors_path = BACKEND_DIR / "seed_data" / "actors.json"
    posts_path = BACKEND_DIR / "seed_data" / "posts.json"
    with open(actors_path, "r", encoding="utf-8-sig") as f:
        actors = [ActorDoc(**a) for a in json.load(f)]
    with open(posts_path, "r", encoding="utf-8-sig") as f:
        posts = [PostDoc(**p) for p in json.load(f)]

    by_actor: Dict[str, ActorDoc] = {a.id: a for a in actors}
    posts_by: Dict[str, List[PostDoc]] = defaultdict(list)
    for p in posts:
        posts_by[p.actor_id].append(p)

    pairs = [
        ("actor-rebrand-01-old", "actor-rebrand-01-new", "Rebrand 1"),
        ("actor-rebrand-02-old", "actor-rebrand-02-new", "Rebrand 2"),
        ("actor-rebrand-03-old", "actor-rebrand-03-new", "Rebrand 3"),
        ("actor-rebrand-01-old", "actor-arms-001", "Random (drugs vs arms)"),
    ]
    print("=" * 70)
    print("BEHAVIOURAL SELF-TEST (posting-time + identifier hygiene)")
    print("=" * 70)
    for a_id, b_id, label in pairs:
        res = compute_behavioural_score(
            by_actor[a_id], posts_by.get(a_id, []),
            by_actor[b_id], posts_by.get(b_id, []),
        )
        print(f"[{label}] {a_id} <-> {b_id}")
        print(f"  posting_pattern_sim    : {res['posting_pattern_sim']:.4f}")
        print(f"  identifier_hygiene_sim : {res['identifier_hygiene_sim']:.4f}")
        print(f"  combined score         : {res['score']:.4f}")
    print("=" * 70)
