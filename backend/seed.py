"""SYNTHETIC / DEMO DATA — Rynex PoC"""

import asyncio
import json
import os
import sys
from pathlib import Path
from typing import Any, Dict, List

from motor.motor_asyncio import AsyncIOMotorClient
from neo4j import AsyncGraphDatabase

CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

from app.models.mongo_schemas import (
    ActorDoc,
    InfraSignal,
    MockDescriptor,
    PostDoc,
    check_descriptor_inconsistency,
)


def load_json_file(file_path: Path) -> Any:
    with open(file_path, "r", encoding="utf-8-sig") as f:
        return json.load(f)


async def seed_mongodb(
    mongo_uri: str,
    db_name: str,
    actors_raw: List[Dict[str, Any]],
    posts_raw: List[Dict[str, Any]],
    infra_raw: List[Dict[str, Any]],
) -> Dict[str, int]:
    client = AsyncIOMotorClient(mongo_uri)
    db = client[db_name]

    await db.actors.delete_many({})
    await db.posts.delete_many({})
    await db.infra_signals.delete_many({})

    actors_docs = [ActorDoc(**a).model_dump(mode="python") for a in actors_raw]
    posts_docs = [PostDoc(**p).model_dump(mode="python") for p in posts_raw]
    infra_docs = [InfraSignal(**i).model_dump(mode="python") for i in infra_raw]

    if actors_docs:
        await db.actors.insert_many(actors_docs)
    if posts_docs:
        await db.posts.insert_many(posts_docs)
    if infra_docs:
        await db.infra_signals.insert_many(infra_docs)

    actors_count = await db.actors.count_documents({})
    posts_count = await db.posts.count_documents({})
    infra_count = await db.infra_signals.count_documents({})

    client.close()

    return {
        "actors": actors_count,
        "posts": posts_count,
        "infra_signals": infra_count,
    }


async def seed_neo4j(
    neo4j_uri: str,
    neo4j_user: str,
    neo4j_pass: str,
    actors_raw: List[Dict[str, Any]],
    infra_raw: List[Dict[str, Any]],
) -> Dict[str, Any]:
    driver = AsyncGraphDatabase.driver(neo4j_uri, auth=(neo4j_user, neo4j_pass))

    inconsistency_data = {}
    correlations_data = []

    for item in infra_raw:
        if item.get("signal_type") == "descriptor_inconsistency":
            mock_desc_dict = item.get("mock_descriptor")
            if mock_desc_dict:
                desc_obj = MockDescriptor(**mock_desc_dict)
                check_result = check_descriptor_inconsistency(desc_obj)
                inconsistency_data[item["hidden_service_onion"]] = {
                    "descriptor_version": desc_obj.version,
                    "intro_point_count": desc_obj.intro_point_count,
                    "published": desc_obj.published.isoformat(),
                    "uptime_pattern": desc_obj.uptime_pattern,
                    "descriptor_flagged": check_result["flagged"],
                    "flag_reason": "; ".join(check_result["reasons"]),
                }
        elif item.get("matched_clearnet_indicator"):
            correlations_data.append(
                {
                    "clearnet_id": f"clearnet-{item['id']}",
                    "signal_type": item["signal_type"],
                    "value": item["value"],
                    "matched_clearnet_indicator": item["matched_clearnet_indicator"],
                    "first_seen": item["first_seen"],
                    "hidden_service_onion": item["hidden_service_onion"],
                    "confidence_contribution": item["confidence_contribution"],
                    "reason": "Synthetic infrastructure correlation demo match",
                }
            )

    actors_payload = []
    handles_payload = []
    pgps_payload = []
    wallets_payload = []
    hidden_services_payload = []

    for act in actors_raw:
        act_id = act["id"]
        actors_payload.append(
            {
                "id": act_id,
                "primary_handle": act["primary_handle"],
                "category": act["category"],
                "confidence": act.get("confidence", 0.0),
                "first_seen": act["first_seen"],
                "last_seen": act["last_seen"],
                "source": act.get("source", "synthetic_batch_v1"),
                "status": act.get("status", "active"),
            }
        )

        for ident in act.get("identifiers", []):
            i_type = ident["type"]
            i_val = ident["value"]
            i_first = ident["first_seen"]
            if i_type == "handle":
                handles_payload.append(
                    {
                        "actor_id": act_id,
                        "value": i_val,
                        "platform": ident.get("platform") or "DarkWeb",
                        "first_seen": i_first,
                    }
                )
            elif i_type == "pgp":
                pgps_payload.append(
                    {
                        "actor_id": act_id,
                        "value": i_val,
                        "first_seen": i_first,
                    }
                )
            elif i_type == "wallet":
                wallets_payload.append(
                    {
                        "actor_id": act_id,
                        "value": i_val,
                        "currency": ident.get("currency") or "BTC",
                        "first_seen": i_first,
                    }
                )

        for onion in act.get("hidden_services", []):
            desc_info = inconsistency_data.get(onion, {})
            hidden_services_payload.append(
                {
                    "actor_id": act_id,
                    "onion_address": onion,
                    "descriptor_version": desc_info.get("descriptor_version", "v3"),
                    "intro_point_count": desc_info.get("intro_point_count", 3),
                    "published": desc_info.get("published", act["first_seen"]),
                    "uptime_pattern": desc_info.get("uptime_pattern", "sporadic"),
                    "descriptor_flagged": desc_info.get("descriptor_flagged", False),
                    "flag_reason": desc_info.get("flag_reason", ""),
                }
            )

    rebrand_pairs_payload = [
        {
            "old_id": "actor-rebrand-01-old",
            "new_id": "actor-rebrand-01-new",
            "score": 0.92,
            "evidence": [
                "shared_pgp_fingerprint",
                "stylometric_similarity_0.91",
                "shared_hidden_service",
            ],
        },
        {
            "old_id": "actor-rebrand-02-old",
            "new_id": "actor-rebrand-02-new",
            "score": 0.89,
            "evidence": [
                "shared_xmr_wallet",
                "stylometric_similarity_0.87",
                "shared_hidden_service",
            ],
        },
        {
            "old_id": "actor-rebrand-03-old",
            "new_id": "actor-rebrand-03-new",
            "score": 0.94,
            "evidence": [
                "shared_btc_wallet",
                "stylometric_similarity_0.93",
                "shared_hidden_service",
            ],
        },
    ]

    async with driver.session() as session:
        await session.run("MATCH (n) DETACH DELETE n")

        create_actors_query = """
        UNWIND $actors AS a
        CREATE (act:Actor {
            id: a.id,
            primary_handle: a.primary_handle,
            category: a.category,
            confidence: toFloat(a.confidence),
            first_seen: datetime(a.first_seen),
            last_seen: datetime(a.last_seen),
            source: a.source,
            status: a.status
        })
        """
        await session.run(create_actors_query, actors=actors_payload)

        create_handles_query = """
        UNWIND $handles AS h
        MATCH (act:Actor {id: h.actor_id})
        MERGE (hnd:Handle {value: h.value})
        ON CREATE SET
            hnd.platform = h.platform,
            hnd.first_seen = datetime(h.first_seen)
        MERGE (act)-[:HAS_HANDLE]->(hnd)
        """
        await session.run(create_handles_query, handles=handles_payload)

        create_pgps_query = """
        UNWIND $pgps AS p
        MATCH (act:Actor {id: p.actor_id})
        MERGE (pgp:PGPKey {fingerprint: p.value})
        ON CREATE SET
            pgp.first_seen = datetime(p.first_seen)
        MERGE (act)-[:HAS_PGP]->(pgp)
        """
        await session.run(create_pgps_query, pgps=pgps_payload)

        create_wallets_query = """
        UNWIND $wallets AS w
        MATCH (act:Actor {id: w.actor_id})
        MERGE (wal:Wallet {address: w.value})
        ON CREATE SET
            wal.currency = w.currency,
            wal.first_seen = datetime(w.first_seen)
        MERGE (act)-[:HAS_WALLET]->(wal)
        """
        await session.run(create_wallets_query, wallets=wallets_payload)

        create_hs_query = """
        UNWIND $hidden_services AS hs
        MATCH (act:Actor {id: hs.actor_id})
        MERGE (svc:HiddenService {onion_address: hs.onion_address})
        ON CREATE SET
            svc.descriptor_version = hs.descriptor_version,
            svc.intro_point_count = hs.intro_point_count,
            svc.published = CASE WHEN hs.published IS NOT NULL THEN datetime(hs.published) ELSE null END,
            svc.uptime_pattern = hs.uptime_pattern,
            svc.descriptor_flagged = hs.descriptor_flagged,
            svc.flag_reason = hs.flag_reason
        MERGE (act)-[:OPERATES]->(svc)
        """
        await session.run(create_hs_query, hidden_services=hidden_services_payload)

        create_correlations_query = """
        UNWIND $correlations AS c
        MERGE (ci:ClearnetIndicator {id: c.clearnet_id})
        ON CREATE SET
            ci.type = c.signal_type,
            ci.value = c.value,
            ci.ip_or_domain = c.matched_clearnet_indicator,
            ci.first_seen = datetime(c.first_seen)
        MERGE (hs:HiddenService {onion_address: c.hidden_service_onion})
        MERGE (hs)-[:CORRELATES_WITH {
            score: toFloat(c.confidence_contribution),
            method: c.signal_type,
            reason: c.reason
        }]->(ci)
        """
        await session.run(create_correlations_query, correlations=correlations_data)

        create_rebrands_query = """
        UNWIND $rebrands AS rp
        MATCH (old:Actor {id: rp.old_id}), (new:Actor {id: rp.new_id})
        MERGE (old)-[:SAME_AS {
            score: toFloat(rp.score),
            evidence: rp.evidence
        }]->(new)
        """
        await session.run(create_rebrands_query, rebrands=rebrand_pairs_payload)

        actor_res = await session.run("MATCH (a:Actor) RETURN count(a) AS c")
        neo4j_actors_count = (await actor_res.single())["c"]

        handle_res = await session.run("MATCH (h:Handle) RETURN count(h) AS c")
        neo4j_handles_count = (await handle_res.single())["c"]

        pgp_res = await session.run("MATCH (p:PGPKey) RETURN count(p) AS c")
        neo4j_pgps_count = (await pgp_res.single())["c"]

        wallet_res = await session.run("MATCH (w:Wallet) RETURN count(w) AS c")
        neo4j_wallets_count = (await wallet_res.single())["c"]

        hs_res = await session.run("MATCH (hs:HiddenService) RETURN count(hs) AS c")
        neo4j_hs_count = (await hs_res.single())["c"]

        ci_res = await session.run("MATCH (ci:ClearnetIndicator) RETURN count(ci) AS c")
        neo4j_ci_count = (await ci_res.single())["c"]

        rel_res = await session.run(
            "MATCH ()-[r]->() RETURN type(r) AS rel_type, count(r) AS rel_count"
        )
        relationships = {}
        total_rels = 0
        async for record in rel_res:
            rtype = record["rel_type"]
            rcount = record["rel_count"]
            relationships[rtype] = rcount
            total_rels += rcount

    await driver.close()

    return {
        "nodes": {
            "Actor": neo4j_actors_count,
            "Handle": neo4j_handles_count,
            "PGPKey": neo4j_pgps_count,
            "Wallet": neo4j_wallets_count,
            "HiddenService": neo4j_hs_count,
            "ClearnetIndicator": neo4j_ci_count,
        },
        "relationships": relationships,
        "total_relationships": total_rels,
    }


async def main():
    seed_data_dir = CURRENT_DIR / "seed_data"

    actors_path = seed_data_dir / "actors.json"
    posts_path = seed_data_dir / "posts.json"
    infra_path = seed_data_dir / "infra_examples.json"

    if not actors_path.exists():
        raise FileNotFoundError(f"Missing file: {actors_path}")
    if not posts_path.exists():
        raise FileNotFoundError(f"Missing file: {posts_path}")
    if not infra_path.exists():
        raise FileNotFoundError(f"Missing file: {infra_path}")

    actors_raw = load_json_file(actors_path)
    posts_raw = load_json_file(posts_path)
    infra_raw = load_json_file(infra_path)

    mongo_uri = os.getenv(
        "MONGO_URI", os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    )
    mongo_db_name = os.getenv("MONGO_DB_NAME", "rynex")

    neo4j_uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    neo4j_user = os.getenv("NEO4J_USER", os.getenv("NEO4J_USERNAME", "neo4j"))
    neo4j_password = os.getenv("NEO4J_PASSWORD", "password")

    print(f"Connecting to MongoDB at {mongo_uri} (db: {mongo_db_name})...")
    mongo_summary = await seed_mongodb(
        mongo_uri=mongo_uri,
        db_name=mongo_db_name,
        actors_raw=actors_raw,
        posts_raw=posts_raw,
        infra_raw=infra_raw,
    )

    print(f"Connecting to Neo4j at {neo4j_uri}...")
    neo4j_summary = await seed_neo4j(
        neo4j_uri=neo4j_uri,
        neo4j_user=neo4j_user,
        neo4j_pass=neo4j_password,
        actors_raw=actors_raw,
        infra_raw=infra_raw,
    )

    print("\n" + "=" * 50)
    print("RYNEX SEEDING SUMMARY")
    print("=" * 50)
    print("MongoDB Collections:")
    print(f"  - actors:        {mongo_summary['actors']} documents")
    print(f"  - posts:         {mongo_summary['posts']} documents")
    print(f"  - infra_signals: {mongo_summary['infra_signals']} documents")
    print("\nNeo4j Nodes:")
    for node_type, count in neo4j_summary["nodes"].items():
        print(f"  - {node_type:<18}: {count}")
    print("\nNeo4j Relationships:")
    for rel_type, count in neo4j_summary["relationships"].items():
        print(f"  - {rel_type:<18}: {count}")
    print(f"  Total relationships : {neo4j_summary['total_relationships']}")
    print("=" * 50)
    print("Seeding completed successfully.\n")


if __name__ == "__main__":
    asyncio.run(main())
