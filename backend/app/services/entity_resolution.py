import json
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, List

CURRENT_FILE = Path(__file__).resolve()
BACKEND_DIR = CURRENT_FILE.parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.models.mongo_schemas import ActorDoc, InfraSignal, PostDoc


def find_shared_identifier_links(actors: List[ActorDoc]) -> List[Dict[str, Any]]:
    identifier_to_actors = defaultdict(set)
    identifier_types = {}

    for actor in actors:
        for ident in actor.identifiers:
            if ident.type in ("pgp", "wallet"):
                clean_value = ident.value.strip()
                if ident.type == "pgp":
                    clean_value = clean_value.upper()
                identifier_to_actors[clean_value].add(actor.id)
                identifier_types[clean_value] = ident.type

    links = []
    seen_pairs = set()

    for value, actor_ids in identifier_to_actors.items():
        if len(actor_ids) > 1:
            sorted_actors = sorted(actor_ids)
            shared_type = identifier_types[value]
            for i in range(len(sorted_actors)):
                for j in range(i + 1, len(sorted_actors)):
                    pair_key = (sorted_actors[i], sorted_actors[j], value)
                    if pair_key not in seen_pairs:
                        seen_pairs.add(pair_key)
                        links.append(
                            {
                                "actor_a": sorted_actors[i],
                                "actor_b": sorted_actors[j],
                                "shared_type": shared_type,
                                "shared_value": value,
                                "identifier_match_score": 1.0,
                            }
                        )

    return links


def find_trust_links(
    actors: List[ActorDoc],
    posts: List[PostDoc],
    infra_signals: List[InfraSignal],
) -> List[Dict[str, Any]]:
    """Weak trust associations from existing data only (no new fields).

    Two rules, both deliberately weaker than a shared-PGP/wallet link:
    - shared_infra: actors operating hidden services tied to the SAME
      matched_clearnet_indicator (SSL/banner/favicon correlation).
    - shared_platform: actors posting on the SAME platform AND in the SAME
      category. Platform alone is far too loose (6 platforms / 200 actors),
      so category is required to keep this a meaningful signal.
    """
    links: List[Dict[str, Any]] = []
    seen = set()

    def add_link(a: str, b: str, trust_type: str, evidence: str) -> None:
        x, y = sorted((a, b))
        if x == y:
            return
        key = (x, y, trust_type)
        if key not in seen:
            seen.add(key)
            links.append({
                "actor_a": x,
                "actor_b": y,
                "trust_type": trust_type,
                "evidence": evidence,
            })

    # Rule 1: shared clearnet indicator via hidden-service correlation.
    onion_to_actors = defaultdict(set)
    for actor in actors:
        for onion in actor.hidden_services:
            onion_to_actors[onion].add(actor.id)
    indicator_to_actors = defaultdict(set)
    indicator_source: Dict[str, str] = {}
    for sig in infra_signals:
        if sig.matched_clearnet_indicator:
            for actor_id in onion_to_actors.get(sig.hidden_service_onion, set()):
                indicator_to_actors[sig.matched_clearnet_indicator].add(actor_id)
            indicator_source.setdefault(
                sig.matched_clearnet_indicator,
                f"{sig.signal_type} -> {sig.matched_clearnet_indicator}",
            )
    for indicator in sorted(indicator_to_actors):
        group = sorted(indicator_to_actors[indicator])
        for i in range(len(group)):
            for j in range(i + 1, len(group)):
                add_link(group[i], group[j], "shared_infra", indicator_source[indicator])

    # Rule 2: same post platform AND same category.
    platforms_by_actor = defaultdict(set)
    for p in posts:
        if p.platform:
            platforms_by_actor[p.actor_id].add(p.platform)
    category_by_actor = {actor.id: actor.category for actor in actors}
    cell_to_actors = defaultdict(set)
    for actor in actors:
        for platform in platforms_by_actor.get(actor.id, set()):
            cell_to_actors[(platform, actor.category)].add(actor.id)
    for cell in sorted(cell_to_actors):
        platform, category = cell
        group = sorted(cell_to_actors[cell])
        for i in range(len(group)):
            for j in range(i + 1, len(group)):
                add_link(
                    group[i], group[j], "shared_platform",
                    f"both post on {platform} in category {category}",
                )

    links.sort(key=lambda l: (l["actor_a"], l["actor_b"], l["trust_type"]))
    return links


if __name__ == "__main__":
    actors_path = BACKEND_DIR / "seed_data" / "actors.json"
    posts_path = BACKEND_DIR / "seed_data" / "posts.json"
    infra_path = BACKEND_DIR / "seed_data" / "infra_examples.json"
    with open(actors_path, "r", encoding="utf-8-sig") as f:
        raw_actors = json.load(f)
    with open(posts_path, "r", encoding="utf-8-sig") as f:
        raw_posts = json.load(f)
    with open(infra_path, "r", encoding="utf-8-sig") as f:
        raw_infra = json.load(f)

    actor_docs = [ActorDoc(**a) for a in raw_actors]
    post_docs = [PostDoc(**{k: v for k, v in p.items() if k != "_comment"}) for p in raw_posts]
    infra_docs = [
        InfraSignal(**{k: v for k, v in e.items() if k not in ("_comment", "mock_descriptor")})
        for e in raw_infra
    ]
    discovered_links = find_shared_identifier_links(actor_docs)

    print("=" * 60)
    print("ENTITY RESOLUTION SELF-TEST")
    print("=" * 60)
    print(f"Total ActorDoc profiles loaded: {len(actor_docs)}")
    print(f"Total shared identifier links surfaced: {len(discovered_links)}")
    print("-" * 60)
    for link in discovered_links:
        print(f"Actor A      : {link['actor_a']}")
        print(f"Actor B      : {link['actor_b']}")
        print(f"Shared Type  : {link['shared_type']}")
        print(f"Shared Value : {link['shared_value']}")
        print(f"Match Score  : {link['identifier_match_score']}")
        print("-" * 60)

    trust_links = find_trust_links(actor_docs, post_docs, infra_docs)
    by_type = defaultdict(int)
    for link in trust_links:
        by_type[link["trust_type"]] += 1
    fanout = defaultdict(int)
    for link in trust_links:
        fanout[link["actor_a"]] += 1
        fanout[link["actor_b"]] += 1

    print("TRUST LINKS SELF-TEST")
    print(f"Total trust links: {len(trust_links)} "
          f"(shared_infra={by_type['shared_infra']}, shared_platform={by_type['shared_platform']})")
    print(f"Actors with >=1 trust link: {len(fanout)}/{len(actor_docs)}, "
          f"max fanout: {max(fanout.values()) if fanout else 0}")
    print("-" * 60)
    for link in trust_links:
        if link["trust_type"] == "shared_infra":
            print(f"[{link['trust_type']}] {link['actor_a']} <-> {link['actor_b']} :: {link['evidence']}")
    print("-" * 60)
    shown = 0
    for link in trust_links:
        if link["trust_type"] == "shared_platform" and shown < 5:
            print(f"[{link['trust_type']}] {link['actor_a']} <-> {link['actor_b']} :: {link['evidence']}")
            shown += 1
    print("=" * 60)
