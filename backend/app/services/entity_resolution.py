import json
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, List

CURRENT_FILE = Path(__file__).resolve()
BACKEND_DIR = CURRENT_FILE.parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.models.mongo_schemas import ActorDoc


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


if __name__ == "__main__":
    actors_path = BACKEND_DIR / "seed_data" / "actors.json"
    with open(actors_path, "r", encoding="utf-8-sig") as f:
        raw_actors = json.load(f)

    actor_docs = [ActorDoc(**a) for a in raw_actors]
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
