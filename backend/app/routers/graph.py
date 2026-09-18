from typing import Any, Dict, List, Set

from fastapi import APIRouter, HTTPException

from app import data_store
from app.helpers.actor_pipeline import linked_actors_detail

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

    return {"nodes": nodes, "edges": edges}
