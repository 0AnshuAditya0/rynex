import csv
import html
import io
import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import HTMLResponse, Response

from app import data_store
from app.helpers.actor_pipeline import compute_actor_confidence, linked_actors_detail
from app.services.infra_correlation import compute_infra_match_score

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
            "identifier_match": conf["breakdown"]["identifier_match"]["contribution"],
            "infra_match": conf["breakdown"]["infra_match"]["contribution"],
            "stylometric_sim": conf["breakdown"]["stylometric_sim"]["contribution"],
            "behavioural": conf["breakdown"]["behavioural"]["contribution"],
            "matched_actor_id": conf["matched_actor_id"],
        })
    return rows


def _report_html(title: str, rows: List[Dict[str, Any]], category: Optional[str]) -> str:
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    cat = html.escape(category) if category else "all"
    body_rows = "\n".join(
        "<tr>"
        f"<td>{html.escape(str(r['primary_handle']))}</td>"
        f"<td>{html.escape(str(r['category']))}</td>"
        f"<td>{html.escape(str(r['status']))}</td>"
        f"<td>{r['confidence']:.4f}</td>"
        f"<td>{html.escape(str(r['matched_actor_id'] or '-'))}</td>"
        "</tr>"
        for r in rows
    ) or '<tr><td colspan="5">No actors found for these criteria.</td></tr>'
    return f"""<html><head><meta charset="utf-8"/>
<style>
body {{ font-family: Helvetica, Arial, sans-serif; font-size: 11px; color: #111; }}
h1 {{ font-size: 20px; margin-bottom: 2px; }}
.meta {{ color: #444; margin-bottom: 12px; }}
table {{ width: 100%; border-collapse: collapse; }}
th, td {{ border: 1px solid #999; padding: 5px 7px; text-align: left; }}
th {{ background: #eee; }}
.footer {{ margin-top: 14px; color: #555; font-size: 10px; }}
</style></head><body>
<h1>{html.escape(title)}</h1>
<div class="meta">Generated: {ts} | Category: {cat} | Records: {len(rows)} | Source: Rynex PoC (synthetic demo data)</div>
<table><thead><tr><th>Handle</th><th>Category</th><th>Status</th><th>Confidence</th><th>Matched actor</th></tr></thead>
<tbody>{body_rows}</tbody></table>
<div class="footer">Method: entity-resolution (shared PGP/wallet) + TF-IDF stylometry percentile + infra correlation. Behavioural signal is a stub (0.0). Confidence values are pipeline self-scores on synthetic data, not real-world attribution claims.</div>
</body></html>"""


def _actor_case_html(actor_id: str) -> str:
    actor = data_store.get_actor_by_id(actor_id)
    if not actor:
        raise HTTPException(status_code=404, detail=f"Actor '{actor_id}' not found")
    conf = compute_actor_confidence(actor_id)
    linked = linked_actors_detail(actor_id)
    posts = data_store.get_posts_by_actor(actor_id)
    infra_results = []
    if actor.hidden_services:
        signals = data_store.get_all_infra_signals()
        descriptors = data_store.get_all_descriptors()
        for onion in actor.hidden_services:
            infra_results.append(compute_infra_match_score(onion, signals, descriptors))
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    e = html.escape
    linked_rows = "".join(
        f"<tr><td>{e(l['primary_handle'])}</td><td>{e(l['shared_type'])}</td><td>{e(l['shared_value'][:60])}</td><td>{l['identifier_match_score']:.2f}</td></tr>"
        for l in linked
    ) or '<tr><td colspan="4">No linked actors.</td></tr>'
    infra_rows = "".join(
        f"<tr><td>{e(r['onion_address'][:40])}</td><td>{r['combined_infra_score']:.4f}</td><td>{len(r['cert_banner_matches'])} match(es)</td></tr>"
        for r in infra_results
    ) or '<tr><td colspan="3">No hidden services.</td></tr>'
    post_rows = "".join(
        f"<tr><td>{e(p.platform)}</td><td>{e(p.timestamp.isoformat())}</td><td>{e(p.raw_text[:220])}</td></tr>"
        for p in posts[:20]
    ) or '<tr><td colspan="3">No posts.</td></tr>'
    b = conf["breakdown"]
    return f"""<html><head><meta charset="utf-8"/>
<style>
body {{ font-family: Helvetica, Arial, sans-serif; font-size: 11px; color: #111; }}
h1 {{ font-size: 20px; }} h2 {{ font-size: 14px; margin-top: 16px; }}
table {{ width: 100%; border-collapse: collapse; }}
th, td {{ border: 1px solid #999; padding: 5px 7px; text-align: left; }}
th {{ background: #eee; }} .meta {{ color: #444; }}
</style></head><body>
<h1>Rynex Case Report: {e(actor.primary_handle)}</h1>
<div class="meta">Actor ID: {e(actor.id)} | Category: {e(actor.category)} | Status: {e(actor.status)} | Generated: {ts}</div>
<h2>Attribution confidence: {conf['score']:.4f} (matched: {e(str(conf['matched_actor_id'] or '-'))})</h2>
<table><tr><th>Signal</th><th>Raw</th><th>Weight</th><th>Contribution</th></tr>
<tr><td>identifier_match</td><td>{b['identifier_match']['raw']:.4f}</td><td>{b['identifier_match']['weight']:.2f}</td><td>{b['identifier_match']['contribution']:.4f}</td></tr>
<tr><td>infra_match</td><td>{b['infra_match']['raw']:.4f}</td><td>{b['infra_match']['weight']:.2f}</td><td>{b['infra_match']['contribution']:.4f}</td></tr>
<tr><td>stylometric_sim (percentile vs background)</td><td>{b['stylometric_sim']['raw']:.4f}</td><td>{b['stylometric_sim']['weight']:.2f}</td><td>{b['stylometric_sim']['contribution']:.4f}</td></tr>
<tr><td>behavioural (stub)</td><td>{b['behavioural']['raw']:.4f}</td><td>{b['behavioural']['weight']:.2f}</td><td>{b['behavioural']['contribution']:.4f}</td></tr>
</table>
<h2>Linked actors ({len(linked)})</h2>
<table><tr><th>Handle</th><th>Shared type</th><th>Shared value</th><th>Score</th></tr>{linked_rows}</table>
<h2>Infrastructure correlation</h2>
<table><tr><th>Onion</th><th>Combined score</th><th>Cert/banner</th></tr>{infra_rows}</table>
<h2>Posts (first {min(20, len(posts))} of {len(posts)})</h2>
<table><tr><th>Platform</th><th>Timestamp</th><th>Text</th></tr>{post_rows}</table>
<p class="meta">Synthetic demo data. Scores are pipeline self-scores, not real-world attribution claims.</p>
</body></html>"""


def _html_to_pdf_bytes(page_html: str) -> bytes:
    try:
        from xhtml2pdf.document import pisaDocument
    except ImportError as exc:
        raise HTTPException(status_code=500, detail=f"PDF engine missing (xhtml2pdf): {exc}")
    out = io.BytesIO()
    result = pisaDocument(io.BytesIO(page_html.encode("utf-8")), out)
    if result.err:
        raise HTTPException(status_code=500, detail="PDF rendering failed")
    return out.getvalue()


@router.get("")
def export_actors(
    format: str = Query("json", pattern="^(csv|json|pdf|html)$"),
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

    if format == "html":
        page = _report_html("Rynex Actor Export Report", rows, category)
        return HTMLResponse(content=page)

    if format == "pdf":
        page = _report_html("Rynex Actor Export Report", rows, category)
        pdf = _html_to_pdf_bytes(page)
        return Response(
            content=pdf,
            media_type="application/pdf",
            headers={"Content-Disposition": 'attachment; filename="actors_export.pdf"'},
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


@router.get("/actor/{actor_id}")
def export_actor_case(
    actor_id: str,
    format: str = Query("pdf", pattern="^(pdf|html)$"),
) -> Response:
    page = _actor_case_html(actor_id)
    if format == "html":
        return HTMLResponse(content=page)
    pdf = _html_to_pdf_bytes(page)
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="rynex-case-{actor_id}.pdf"'},
    )
