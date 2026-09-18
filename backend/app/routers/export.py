import csv
import io
import json
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Query
from fastapi.responses import Response

from app import data_store
from app.helpers.actor_pipeline import compute_actor_confidence

router = APIRouter(prefix="/export", tags=["export"])


def _filtered_actors(category: Optional[str]) -> List[Dict[str, Any]]:
    actors = data_store.get_all_actors()
    if category:
        actors = [a for a in actors if a.category == category]

    rows: List[Dict[str, Any]] = []
    for actor in actors:
        conf = compute_actor_confidence(actor.id)
        rows.append({
            "id": actor.id,
            "primary_handle": actor.primary_handle,
            "category": actor.category,
            "status": actor.status,
            "confidence": conf["score"],
            "identifier_match": conf["breakdown"]["identifier_match"],
            "infra_match": conf["breakdown"]["infra_match"],
            "stylometric_sim": conf["breakdown"]["stylometric_sim"],
            "behavioural": conf["breakdown"]["behavioural"],
            "matched_actor_id": conf["matched_actor_id"],
        })
    return rows


@router.get("")
def export_actors(
    format: str = Query("json", pattern="^(csv|json)$"),
    category: Optional[str] = Query(None),
) -> Response:
    rows = _filtered_actors(category)

    if format == "json":
        body = json.dumps(rows, indent=2)
        return Response(
            content=body,
            media_type="application/json",
            headers={"Content-Disposition": 'attachment; filename="actors_export.json"'},
        )

    output = io.StringIO()
    if rows:
        writer = csv.DictWriter(output, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    else:
        output.write("")

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="actors_export.csv"'},
    )
