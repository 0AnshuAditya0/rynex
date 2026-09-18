import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

CURRENT_FILE = Path(__file__).resolve()
BACKEND_DIR = CURRENT_FILE.parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.models.mongo_schemas import (
    InfraSignal,
    MockDescriptor,
    check_descriptor_inconsistency,
)


def find_infra_matches(
    hidden_service_onion: str,
    signals: List[InfraSignal],
) -> List[Dict[str, Any]]:
    matches = []
    for sig in signals:
        if (
            sig.hidden_service_onion == hidden_service_onion
            and sig.matched_clearnet_indicator is not None
        ):
            matches.append(
                {
                    "onion_address": sig.hidden_service_onion,
                    "signal_type": sig.signal_type,
                    "matched_indicator": sig.matched_clearnet_indicator,
                    "confidence_contribution": sig.confidence_contribution,
                }
            )
    matches.sort(key=lambda x: x["confidence_contribution"], reverse=True)
    return matches


def run_descriptor_check(
    onion_address: str,
    descriptors: List[MockDescriptor],
) -> Optional[Dict[str, Any]]:
    for desc in descriptors:
        if desc.onion_address == onion_address:
            published = desc.published
            if published.tzinfo is not None:
                from datetime import timezone
                published = published.astimezone(timezone.utc).replace(tzinfo=None)
            normalized = desc.model_copy(update={"published": published})
            return check_descriptor_inconsistency(normalized)
    return None


def compute_infra_match_score(
    onion_address: str,
    signals: List[InfraSignal],
    descriptors: List[MockDescriptor],
) -> Dict[str, Any]:
    cert_banner_matches = find_infra_matches(onion_address, signals)
    descriptor_flag = run_descriptor_check(onion_address, descriptors)

    max_cert_banner_score = (
        cert_banner_matches[0]["confidence_contribution"]
        if cert_banner_matches
        else 0.0
    )

    descriptor_bonus = 0.0
    if descriptor_flag is not None and descriptor_flag.get("flagged", False):
        descriptor_bonus = descriptor_flag.get("confidence_contribution", 0.0)

    combined_infra_score = round(min(1.0, max_cert_banner_score + descriptor_bonus), 4)

    return {
        "onion_address": onion_address,
        "cert_banner_matches": cert_banner_matches,
        "descriptor_flag": descriptor_flag,
        "combined_infra_score": combined_infra_score,
    }


if __name__ == "__main__":
    infra_path = BACKEND_DIR / "seed_data" / "infra_examples.json"
    with open(infra_path, "r", encoding="utf-8-sig") as f:
        raw_infra = json.load(f)

    signals = []
    descriptors = []
    for entry in raw_infra:
        signals.append(InfraSignal(**{
            k: v for k, v in entry.items() if k != "mock_descriptor" and k != "_comment"
        }))
        if "mock_descriptor" in entry and entry["mock_descriptor"] is not None:
            descriptors.append(MockDescriptor(**entry["mock_descriptor"]))

    all_onions = list({sig.hidden_service_onion for sig in signals})
    results = [
        compute_infra_match_score(onion, signals, descriptors)
        for onion in all_onions
    ]
    results.sort(key=lambda x: x["combined_infra_score"], reverse=True)

    print("=" * 72)
    print("INFRA CORRELATION SELF-TEST")
    print("=" * 72)

    for idx, result in enumerate(results):
        onion = result["onion_address"]
        matches = result["cert_banner_matches"]
        flag = result["descriptor_flag"]
        score = result["combined_infra_score"]

        rank_label = "HIGHEST" if idx == 0 else ("2nd" if idx == 1 else f"#{idx + 1}")
        print(f"\n[{rank_label}] Onion: {onion}")
        print(f"  Combined Infra Score : {score:.4f}")

        if matches:
            print(f"  Cert/Banner Matches  : {len(matches)} found")
            for m in matches:
                print(f"    - Type: {m['signal_type']:<22}  Matched: {m['matched_indicator']:<40}  Contribution: {m['confidence_contribution']:.2f}")
        else:
            print("  Cert/Banner Matches  : none")

        if flag is not None:
            flagged_str = "YES" if flag["flagged"] else "no"
            print(f"  Descriptor Flagged   : {flagged_str}")
            if flag["flagged"]:
                print(f"  Descriptor Bonus     : {flag['confidence_contribution']:.2f}")
                for reason in flag["reasons"]:
                    print(f"    Reason: {reason}")
        else:
            print("  Descriptor Flagged   : no descriptor found")

    print("\n" + "=" * 72)
    print("SUMMARY — Ranked by combined_infra_score (UI sort order):")
    print("-" * 72)
    for idx, result in enumerate(results):
        signal_summary = (
            f"{len(result['cert_banner_matches'])} cert/banner match(es)"
            if result["cert_banner_matches"]
            else "no cert/banner match"
        )
        descriptor_summary = (
            "descriptor flagged"
            if result["descriptor_flag"] and result["descriptor_flag"].get("flagged")
            else "no descriptor flag"
        )
        print(
            f"  #{idx + 1}  score={result['combined_infra_score']:.4f}"
            f"  [{signal_summary}, {descriptor_summary}]"
            f"  {result['onion_address']}"
        )
    print("=" * 72)
