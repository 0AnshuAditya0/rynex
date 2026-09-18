// ============================================================
// RYNEX — Neo4j Graph Schema
// Run this once against your AuraDB Free instance to set up
// constraints (uniqueness) and indexes (lookup speed).
// ============================================================

// ---------- NODE CONSTRAINTS (uniqueness) ----------
CREATE CONSTRAINT actor_id IF NOT EXISTS
FOR (a:Actor) REQUIRE a.id IS UNIQUE;

CREATE CONSTRAINT handle_value IF NOT EXISTS
FOR (h:Handle) REQUIRE h.value IS UNIQUE;

CREATE CONSTRAINT pgp_fingerprint IF NOT EXISTS
FOR (p:PGPKey) REQUIRE p.fingerprint IS UNIQUE;

CREATE CONSTRAINT wallet_address IF NOT EXISTS
FOR (w:Wallet) REQUIRE w.address IS UNIQUE;

CREATE CONSTRAINT hidden_service_onion IF NOT EXISTS
FOR (hs:HiddenService) REQUIRE hs.onion_address IS UNIQUE;

CREATE CONSTRAINT clearnet_indicator_id IF NOT EXISTS
FOR (c:ClearnetIndicator) REQUIRE c.id IS UNIQUE;

// ---------- INDEXES (non-unique lookups) ----------
CREATE INDEX actor_category IF NOT EXISTS FOR (a:Actor) ON (a.category);
CREATE INDEX actor_confidence IF NOT EXISTS FOR (a:Actor) ON (a.confidence);
CREATE INDEX actor_last_seen IF NOT EXISTS FOR (a:Actor) ON (a.last_seen);

// ============================================================
// NODE PROPERTY REFERENCE (for documentation — not enforced
// by Neo4j directly, enforce shape at the API/Pydantic layer)
// ============================================================

// (:Actor {
//   id: string (uuid),
//   primary_handle: string,
//   category: string,           // e.g. "drugs", "hacking-services", "financial"
//   confidence: float,          // 0.0–1.0 composite score
//   first_seen: datetime,
//   last_seen: datetime,
//   source: string,             // provenance
//   status: string              // "active" | "rebranded" | "inactive"
// })

// (:Handle { value: string, platform: string, first_seen: datetime })

// (:PGPKey { fingerprint: string, first_seen: datetime })

// (:Wallet { address: string, currency: string, first_seen: datetime })

// (:HiddenService {
//   onion_address: string,
//   descriptor_version: string,
//   intro_point_count: int,
//   published: datetime,
//   uptime_pattern: string,      // e.g. "24/7" | "sporadic" | "burst"
//   descriptor_flagged: boolean, // set by check_descriptor_inconsistency()
//   flag_reason: string
// })

// (:ClearnetIndicator {
//   id: string (uuid),
//   type: string,                // "cert_fingerprint" | "banner_hash" | "favicon_hash" | "status_page_leak"
//   value: string,
//   ip_or_domain: string,
//   first_seen: datetime
// })

// ============================================================
// RELATIONSHIP TYPES
// ============================================================

// (:Actor)-[:HAS_HANDLE]->(:Handle)
// (:Actor)-[:HAS_PGP]->(:PGPKey)
// (:Actor)-[:HAS_WALLET]->(:Wallet)
// (:Actor)-[:OPERATES]->(:HiddenService)
// (:HiddenService)-[:CORRELATES_WITH {score: float, method: string, reason: string}]->(:ClearnetIndicator)
// (:Actor)-[:LINKED_TO {score: float, reason: string, method: string}]->(:Actor)   // generic weighted link
// (:Actor)-[:SAME_AS {score: float, evidence: [string]}]->(:Actor)                  // high-confidence rebrand/migration
// (:Actor)-[:POSTED {timestamp: datetime, source: string}]->(:Post)                 // Post lives conceptually in Mongo;
//                                                                                    // mirror a lightweight (:Post {id}) node
//                                                                                    // here only if you need it in graph traversals

// Example seed pattern for ONE ground-truth rebrand:
// MATCH (a1:Actor {id: $old_id}), (a2:Actor {id: $new_id})
// MERGE (a1)-[:SAME_AS {score: 0.91, evidence: ["shared_pgp","stylometric_0.87"]}]->(a2);
