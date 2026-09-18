"""Shared confidence / entity-resolution pipeline for routers."""

from typing import Any, Dict, List, Optional, Tuple

from app import data_store
from app.services.confidence import compute_confidence
from app.services.entity_resolution import find_shared_identifier_links
from app.services.infra_correlation import compute_infra_match_score
from app.services.stylometry import calibrate_stylometric_confidence


def _links_for_actor(actor_id: str) -> List[Dict[str, Any]]:
    actors = data_store.get_all_actors()
    links = find_shared_identifier_links(actors)
    return [
        link for link in links
        if link["actor_a"] == actor_id or link["actor_b"] == actor_id
    ]


def best_entity_match(actor_id: str) -> Optional[Tuple[str, Dict[str, Any]]]:
    """Return (matched_actor_id, link_dict) for the actor's best ER link, if any."""
    links = _links_for_actor(actor_id)
    if not links:
        return None
    link = links[0]
    other_id = link["actor_b"] if link["actor_a"] == actor_id else link["actor_a"]
    return other_id, link


def _infra_score_for_actor(actor_id: str, match_id: Optional[str] = None) -> float:
    actor = data_store.get_actor_by_id(actor_id)
    if not actor or not actor.hidden_services:
        return 0.0

    signals = data_store.get_all_infra_signals()
    descriptors = data_store.get_all_descriptors()

    best = 0.0
    for onion in actor.hidden_services:
        result = compute_infra_match_score(onion, signals, descriptors)
        best = max(best, result["combined_infra_score"])

    if match_id:
        match = data_store.get_actor_by_id(match_id)
        if match:
            shared = set(actor.hidden_services) & set(match.hidden_services)
            for onion in shared:
                result = compute_infra_match_score(onion, signals, descriptors)
                best = max(best, result["combined_infra_score"])

    return best


def compute_actor_confidence(actor_id: str) -> Dict[str, Any]:
    """Live confidence for one actor via ER + stylometry + infra pipeline."""
    match = best_entity_match(actor_id)
    posts_map = data_store.get_all_posts_map()

    if match:
        match_id, link = match
        id_score = link["identifier_match_score"]
        calib = calibrate_stylometric_confidence(actor_id, match_id, posts_map)
        stylo_score = calib["percentile"]
        stylo_detail = calib
        matched_actor_id = match_id
    else:
        id_score = 0.0
        stylo_score = 0.0
        stylo_detail = None
        matched_actor_id = None

    infra_score = _infra_score_for_actor(actor_id, matched_actor_id)

    result = compute_confidence(
        identifier_match=id_score,
        infra_match=infra_score,
        stylometric_sim=stylo_score,
        behavioural=0.0,
    )

    return {
        "score": result["score"],
        "breakdown": result["breakdown"],
        "matched_actor_id": matched_actor_id,
        "entity_link": match[1] if match else None,
        "stylometry": stylo_detail,
        "infra_match_raw": infra_score,
    }


def linked_actors_detail(actor_id: str) -> List[Dict[str, Any]]:
    """Linked actors from entity resolution with link metadata."""
    links = _links_for_actor(actor_id)
    seen: set[str] = set()
    out: List[Dict[str, Any]] = []

    for link in links:
        other_id = link["actor_b"] if link["actor_a"] == actor_id else link["actor_a"]
        if other_id in seen:
            continue
        seen.add(other_id)
        other = data_store.get_actor_by_id(other_id)
        if other:
            out.append({
                "actor_id": other_id,
                "primary_handle": other.primary_handle,
                "category": other.category,
                "status": other.status,
                "shared_type": link["shared_type"],
                "shared_value": link["shared_value"],
                "identifier_match_score": link["identifier_match_score"],
            })

    return out
