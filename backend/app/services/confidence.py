from typing import Any, Dict, Optional

DEFAULT_WEIGHTS: Dict[str, float] = {
    "identifier": 0.4,
    "infra": 0.25,
    "stylometric": 0.25,
    "behavioural": 0.1,
}


def compute_confidence(
    identifier_match: float,
    infra_match: float,
    stylometric_sim: float,
    behavioural: float = 0.0,
    weights: Optional[Dict[str, float]] = None,
) -> Dict[str, Any]:
    """
    Computes composite deanonymization confidence score from multi-source signals.
    Behavioural defaults to 0.0 as an intentional stub for pending behavioural features.
    """
    active_weights = dict(DEFAULT_WEIGHTS)
    if weights is not None:
        active_weights.update(weights)

    w_ident = active_weights.get("identifier", active_weights.get("identifier_match", 0.4))
    w_infra = active_weights.get("infra", active_weights.get("infra_match", 0.25))
    w_stylo = active_weights.get("stylometric", active_weights.get("stylometric_sim", 0.25))
    w_behav = active_weights.get("behavioural", 0.1)

    raw_values = {
        "identifier_match": max(0.0, min(1.0, identifier_match)),
        "infra_match": max(0.0, min(1.0, infra_match)),
        "stylometric_sim": max(0.0, min(1.0, stylometric_sim)),
        "behavioural": max(0.0, min(1.0, behavioural)),
    }

    weighted_values = {
        "identifier_match": round(w_ident * raw_values["identifier_match"], 4),
        "infra_match": round(w_infra * raw_values["infra_match"], 4),
        "stylometric_sim": round(w_stylo * raw_values["stylometric_sim"], 4),
        "behavioural": round(w_behav * raw_values["behavioural"], 4),
    }

    score = round(
        max(0.0, min(1.0, sum(weighted_values.values()))),
        4,
    )

    breakdown = {
        "identifier_match": {
            "raw": round(raw_values["identifier_match"], 4),
            "weight": round(w_ident, 4),
            "contribution": weighted_values["identifier_match"],
        },
        "infra_match": {
            "raw": round(raw_values["infra_match"], 4),
            "weight": round(w_infra, 4),
            "contribution": weighted_values["infra_match"],
        },
        "stylometric_sim": {
            "raw": round(raw_values["stylometric_sim"], 4),
            "weight": round(w_stylo, 4),
            "contribution": weighted_values["stylometric_sim"],
            "display_note": "Percentile vs. background similarity, not a literal text-match score",
        },
        "behavioural": {
            "raw": round(raw_values["behavioural"], 4),
            "weight": round(w_behav, 4),
            "contribution": weighted_values["behavioural"],
        },
    }

    return {
        "score": score,
        "breakdown": breakdown,
    }


if __name__ == "__main__":
    import json
    import sys
    from collections import defaultdict
    from pathlib import Path

    current_file = Path(__file__).resolve()
    backend_dir = current_file.parents[2]
    if str(backend_dir) not in sys.path:
        sys.path.insert(0, str(backend_dir))

    from app.models.mongo_schemas import ActorDoc, InfraSignal, PostDoc
    from app.services.entity_resolution import find_shared_identifier_links
    from app.services.stylometry import calibrate_stylometric_confidence

    actors_path = backend_dir / "seed_data" / "actors.json"
    posts_path = backend_dir / "seed_data" / "posts.json"
    infra_path = backend_dir / "seed_data" / "infra_examples.json"

    with open(actors_path, "r", encoding="utf-8-sig") as f:
        actors = [ActorDoc(**a) for a in json.load(f)]

    with open(posts_path, "r", encoding="utf-8-sig") as f:
        posts = [PostDoc(**p) for p in json.load(f)]

    with open(infra_path, "r", encoding="utf-8-sig") as f:
        infra_signals = [InfraSignal(**i) for i in json.load(f)]

    all_posts_by_actor = defaultdict(list)
    for p in posts:
        all_posts_by_actor[p.actor_id].append(p.raw_text)

    infra_score_map = {}
    for sig in infra_signals:
        if sig.confidence_contribution > 0.0:
            infra_score_map[sig.hidden_service_onion] = sig.confidence_contribution

    actor_by_id = {a.id: a for a in actors}
    rebrand_links = find_shared_identifier_links(actors)

    print("=" * 80)
    print("END-TO-END CHAINED PIPELINE SELF-TEST")
    print("Entity Resolution -> Stylometric Calibration -> Confidence Scoring")
    print("=" * 80)

    for link in rebrand_links:
        actor_a = link["actor_a"]
        actor_b = link["actor_b"]
        doc_a = actor_by_id.get(actor_a)
        doc_b = actor_by_id.get(actor_b)

        category = doc_a.category if doc_a else "unknown"
        id_score = link["identifier_match_score"]

        infra_score = 0.0
        if doc_a and doc_b:
            shared_onions = set(doc_a.hidden_services) & set(doc_b.hidden_services)
            for onion in shared_onions:
                if onion in infra_score_map:
                    infra_score = max(infra_score, infra_score_map[onion])

        calib = calibrate_stylometric_confidence(actor_a, actor_b, all_posts_by_actor)
        raw_sim = calib["raw_score"]
        calib_pctl = calib["percentile"]

        uncalibrated_result = compute_confidence(
            identifier_match=id_score,
            infra_match=infra_score,
            stylometric_sim=raw_sim,
            behavioural=0.0,
        )

        calibrated_result = compute_confidence(
            identifier_match=id_score,
            infra_match=infra_score,
            stylometric_sim=calib_pctl,
            behavioural=0.0,
        )

        print(f"\nRebrand Pair: {actor_a} <-> {actor_b} ({category.upper()})")
        print(f"  Shared Identifier : {link['shared_type'].upper()} ({link['shared_value']})")
        print(f"  Identifier Score  : {id_score:.2f}")
        print(f"  Infra Match Score : {infra_score:.2f}")
        print(f"  Stylometry Null   : mean={calib['background_mean']:.4f}, std={calib['background_std']:.4f}, n={calib['n_background']}")
        print(f"  Raw Stylo Score   : {raw_sim:.4f}")
        print(f"  Calibrated Pctl   : {calib_pctl:.4f} ({calib_pctl * 100:.1f}th percentile)")
        print(f"  Old Composite     : {uncalibrated_result['score']:.4f} (using raw stylo score)")
        print(f"  New Composite     : {calibrated_result['score']:.4f} (using calibrated percentile)")
        print(f"  Score Gain        : +{calibrated_result['score'] - uncalibrated_result['score']:.4f}")
        print(f"  Calibrated Breakdown: {calibrated_result['breakdown']}")

    print("\n" + "=" * 80)
