"""Calibration metrics: stylometry-only retrieval vs ground-truth rebrand pairs.

Method note (shown in API + UI): this is an in-sample pipeline self-check on
synthetic demo data. The 3 positive pairs are evaluated by stylometry alone
(TF-IDF cosine via rank_stylometric_candidates / compare_personas), never by
the deterministic entity-resolution links, so the score is not circular.
"""

from collections import Counter
from typing import Any, Dict, List

from fastapi import APIRouter

from app import data_store
from app.services.infra_correlation import compute_infra_match_score
from app.services.stylometry import compare_personas, rank_stylometric_candidates

router = APIRouter(prefix="/metrics", tags=["metrics"])

GROUND_TRUTH_PAIRS = [
    ("actor-rebrand-01-old", "actor-rebrand-01-new"),
    ("actor-rebrand-02-old", "actor-rebrand-02-new"),
    ("actor-rebrand-03-old", "actor-rebrand-03-new"),
]


def _auc_mann_whitney(pos: List[float], neg: List[float]) -> float:
    if not pos or not neg:
        return 0.5
    wins = 0.0
    total = 0
    for p in pos:
        for n in neg:
            total += 1
            if p > n:
                wins += 1.0
            elif p == n:
                wins += 0.5
    return round(wins / total, 4) if total else 0.5


@router.get("/calibration")
def calibration() -> Dict[str, Any]:
    posts_map = data_store.get_all_posts_map()

    pair_results: List[Dict[str, Any]] = []
    all_pos_scores: List[float] = []
    all_neg_scores: List[float] = []
    reciprocal_ranks: List[float] = []
    top1 = 0
    top5 = 0

    for old_id, new_id in GROUND_TRUTH_PAIRS:
        ranking = rank_stylometric_candidates(old_id, posts_map)
        rank = next((i + 1 for i, c in enumerate(ranking) if c["actor_id"] == new_id), None)
        raw = compare_personas(posts_map.get(old_id, []), posts_map.get(new_id, []))
        neg_scores = [c["similarity"] for c in ranking if c["actor_id"] != new_id]
        all_pos_scores.append(raw)
        all_neg_scores.extend(neg_scores)
        if rank is not None:
            reciprocal_ranks.append(1.0 / rank)
            if rank == 1:
                top1 += 1
            if rank <= 5:
                top5 += 1
        pair_results.append({
            "old_id": old_id,
            "new_id": new_id,
            "raw_stylometric_score": raw,
            "rank_of_true_match": rank,
            "n_candidates": len(ranking),
        })

    n = len(GROUND_TRUTH_PAIRS)
    auc = _auc_mann_whitney(all_pos_scores, all_neg_scores)

    # Precision/recall sweep over raw stylometric threshold.
    # Population: 3 positives + all negatives pooled from the 3 queries.
    thresholds = [round(t / 20, 2) for t in range(0, 21)]
    pr_curve = []
    for thr in thresholds:
        tp = sum(1 for s in all_pos_scores if s >= thr)
        fp = sum(1 for s in all_neg_scores if s >= thr)
        fn = len(all_pos_scores) - tp
        precision = tp / (tp + fp) if (tp + fp) else 1.0
        recall = tp / (tp + fn) if (tp + fn) else 0.0
        pr_curve.append({"threshold": thr, "precision": round(precision, 4), "recall": round(recall, 4)})

    # ROC points from same sweep (FPR vs TPR).
    roc_curve = []
    for thr in thresholds:
        tp = sum(1 for s in all_pos_scores if s >= thr)
        fp = sum(1 for s in all_neg_scores if s >= thr)
        tpr = tp / len(all_pos_scores) if all_pos_scores else 0.0
        fpr = fp / len(all_neg_scores) if all_neg_scores else 0.0
        roc_curve.append({"threshold": thr, "fpr": round(fpr, 4), "tpr": round(tpr, 4)})

    return {
        "method": "stylometry-only retrieval (TF-IDF cosine), in-sample check on synthetic data; ER links excluded to avoid circularity",
        "n_actors_scored": len(posts_map),
        "n_ground_truth_pairs": n,
        "pairs": pair_results,
        "summary": {
            "top1_accuracy": round(top1 / n, 4) if n else 0.0,
            "top5_accuracy": round(top5 / n, 4) if n else 0.0,
            "mrr": round(sum(reciprocal_ranks) / n, 4) if reciprocal_ranks else 0.0,
            "roc_auc_stylometry_only": auc,
            "n_positive_scores": len(all_pos_scores),
            "n_negative_scores": len(all_neg_scores),
        },
        "pr_curve": pr_curve,
        "roc_curve": roc_curve,
    }


@router.get("/infra-summary")
def infra_summary() -> Dict[str, Any]:
    """Real infra-signal aggregation across the dataset.

    Powers the landing stat panel and the metrics Infra Signal Breakdown.
    actors_with_matches = actors with >=1 cert/banner match OR a flagged
    descriptor — i.e. non-empty infra_correlation output.
    """
    signals = data_store.get_all_infra_signals()
    descriptors = data_store.get_all_descriptors()
    actors = data_store.get_all_actors()

    signal_counts = dict(Counter(s.signal_type for s in signals))
    actors_with_hidden_services = sum(1 for a in actors if a.hidden_services)

    cert_matches = 0
    favicon_matches = 0
    banner_matches = 0
    descriptor_flagged = 0
    actors_with_matches = 0
    for actor in actors:
        matched = False
        for onion in actor.hidden_services:
            res = compute_infra_match_score(onion, signals, descriptors)
            for m in res["cert_banner_matches"]:
                matched = True
                if m["signal_type"] == "cert_fingerprint":
                    cert_matches += 1
                elif m["signal_type"] == "favicon_hash":
                    favicon_matches += 1
                elif m["signal_type"] == "banner_hash":
                    banner_matches += 1
            flag = res["descriptor_flag"]
            if flag is not None and flag.get("flagged", False):
                matched = True
                descriptor_flagged += 1
        if matched:
            actors_with_matches += 1

    return {
        "total_actors": len(actors),
        "actors_with_hidden_services": actors_with_hidden_services,
        "actors_with_matches": actors_with_matches,
        "signal_counts": signal_counts,
        "cert_fingerprint_matches": cert_matches,
        "favicon_hash_matches": favicon_matches,
        "banner_hash_matches": banner_matches,
        "descriptor_flagged_count": descriptor_flagged,
    }
