from typing import Any, Dict, List, Set

from fastapi import APIRouter, HTTPException

from app import data_store
from app.helpers.actor_pipeline import linked_actors_detail
from app.services.entity_resolution import find_trust_links

router = APIRouter(prefix="/graph", tags=["graph"])


@router.get("/{actor_id}")
def get_actor_graph(actor_id: str) -> Dict[str, Any]:
    actor = data_store.get_actor_by_id(actor_id)
    if not actor:
        raise HTTPException(status_code=404, detail=f"Actor '{actor_id}' not found")

    nodes: List[Dict[str, Any]] = []
    edges: List[Dict[str, Any]] = []
    seen_nodes: Set[str] = set()

    def add_node(node_id: str, label: str, node_type: str) -> None:
        if node_id not in seen_nodes:
            seen_nodes.add(node_id)
            nodes.append({"data": {"id": node_id, "label": label, "type": node_type}})

    def add_edge(source: str, target: str, label: str, score: float) -> None:
        edge_id = f"{source}->{target}:{label}"
        edges.append({
            "data": {
                "id": edge_id,
                "source": source,
                "target": target,
                "label": label,
                "score": score,
            }
        })

    add_node(actor.id, actor.primary_handle, "actor")

    # Graph facts come exclusively from structured, provenance-tracked actor
    # identifiers. Raw-text extraction observations are deliberately omitted.
    for ident in actor.identifiers:
        ident_id = f"{ident.type}:{ident.value}"
        add_node(ident_id, ident.value, ident.type)
        add_edge(actor.id, ident_id, ident.type, 1.0)

    linked = linked_actors_detail(actor_id)
    for link in linked:
        other_id = link["actor_id"]
        other = data_store.get_actor_by_id(other_id)
        if not other:
            continue

        add_node(other.id, other.primary_handle, "actor")
        add_edge(
            actor.id,
            other.id,
            "SAME_AS",
            link["identifier_match_score"],
        )

        for ident in other.identifiers:
            ident_id = f"{ident.type}:{ident.value}"
            add_node(ident_id, ident.value, ident.type)
            add_edge(other.id, ident_id, ident.type, 1.0)

    # TRUSTS edges: weak trust associations (shared infra / shared
    # platform+category). Partner node + edge only — no identifier expansion,
    # keeping the ego graph readable. A pair may carry both SAME_AS (confirmed
    # rebrand) and TRUSTS (corroborating weak signal); distinct edge ids/styles.
    # Capped at MAX_TRUST_EDGES (infra first) so the finding stays legible;
    # the hidden count is returned, never silently dropped.
    MAX_TRUST_EDGES = 3
    trust_links = find_trust_links(
        data_store.get_all_actors(),
        data_store.get_all_posts(),
        data_store.get_all_infra_signals(),
    )
    mine = [
        link for link in trust_links
        if link["actor_a"] == actor_id or link["actor_b"] == actor_id
    ]
    mine.sort(key=lambda l: (0 if l["trust_type"] == "shared_infra" else 1,
                             l["actor_a"], l["actor_b"]))
    trust_total = len(mine)
    shown = mine[:MAX_TRUST_EDGES]
    trust_hidden = trust_total - len(shown)
    for link in shown:
        other_id = link["actor_b"] if link["actor_a"] == actor_id else link["actor_a"]
        other = data_store.get_actor_by_id(other_id)
        if not other:
            continue
        add_node(other.id, other.primary_handle, "actor")
        edges.append({
            "data": {
                "id": f"{actor.id}->{other.id}:TRUSTS:{link['trust_type']}",
                "source": actor.id,
                "target": other.id,
                "label": "TRUSTS",
                "score": 0.3,
                "trust_type": link["trust_type"],
                "evidence": link["evidence"],
            }
        })

    return {
        "nodes": nodes,
        "edges": edges,
        "trust_total": trust_total,
        "trust_shown": len(shown),
        "trust_hidden": trust_hidden,
    }
