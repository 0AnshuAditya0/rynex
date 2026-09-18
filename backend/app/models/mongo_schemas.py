"""
RYNEX — Mongo document schemas (Pydantic v2)
Use these as the request/response models in FastAPI routers,
and as the shape seed.py writes into MongoDB Atlas.

Collections:
  - actors        : full profile, denormalized for fast read
  - posts         : raw text content, source of stylometry input
  - infra_signals : clearnet/onion infra artifacts (certs, banners, descriptors)
"""

from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, Field
import uuid


def new_id() -> str:
    return str(uuid.uuid4())


# ---------------- actors ----------------

class Identifier(BaseModel):
    type: Literal["handle", "pgp", "wallet"]
    value: str
    platform: Optional[str] = None       # for handles
    currency: Optional[str] = None       # for wallets
    first_seen: datetime


class ActorDoc(BaseModel):
    id: str = Field(default_factory=new_id)
    primary_handle: str
    category: str                        # "drugs" | "hacking-services" | "financial" | "arms" | ...
    status: Literal["active", "rebranded", "inactive"] = "active"
    confidence: float = 0.0              # composite score, computed by confidence.py
    confidence_breakdown: dict = {}       # {"identifier_match": .., "infra_match": .., "stylometric_sim": .., "behavioural": ..}
    identifiers: list[Identifier] = []
    hidden_services: list[str] = []       # onion_address values, mirrors graph edges
    linked_actor_ids: list[str] = []      # denormalized for fast profile-page reads
    source: str                          # provenance: dataset name / synthetic batch id
    first_seen: datetime
    last_seen: datetime
    notes: Optional[str] = None


# ---------------- posts ----------------

class PostDoc(BaseModel):
    id: str = Field(default_factory=new_id)
    actor_id: str
    platform: str                        # marketplace/forum name
    raw_text: str
    # Legacy/demo metadata only. The graph never reads this field; callers
    # request live observations through GET /posts/{post_id}/extract instead.
    extracted_identifiers: list[Identifier] = []
    timestamp: datetime
    source: str


# ---------------- infra_signals ----------------

class InfraSignal(BaseModel):
    id: str = Field(default_factory=new_id)
    hidden_service_onion: str
    signal_type: Literal[
        "cert_fingerprint", "banner_hash", "favicon_hash",
        "status_page_leak", "descriptor_inconsistency"
    ]
    value: str
    matched_clearnet_indicator: Optional[str] = None   # ip_or_domain if correlated
    confidence_contribution: float = 0.0
    first_seen: datetime
    source: str


class MockDescriptor(BaseModel):
    """Input shape for check_descriptor_inconsistency(). Hardcoded/mock —
    not parsed from a real Tor consensus."""
    onion_address: str
    version: str
    intro_point_count: int
    published: datetime
    uptime_pattern: Literal["24/7", "sporadic", "burst"]
    fingerprint: str


def check_descriptor_inconsistency(desc: MockDescriptor) -> dict:
    """
    Flags obvious mock inconsistency patterns. Not real Tor protocol
    analysis — a defined, demo-able heuristic per Rynex's PoC scope.
    """
    flags = []

    # Pattern 1: version/intro-point mismatch
    if desc.version.startswith("v2") and desc.intro_point_count > 3:
        flags.append("v2 descriptors rarely carry >3 intro points — possible spoofed/rotated descriptor")

    # Pattern 2: uptime pattern vs publish recency mismatch
    age_days = (datetime.utcnow() - desc.published).days
    if desc.uptime_pattern == "24/7" and age_days < 1:
        flags.append("Claimed 24/7 uptime but descriptor published <1 day ago — inconsistent history")

    return {
        "onion_address": desc.onion_address,
        "flagged": len(flags) > 0,
        "reasons": flags,
        "confidence_contribution": 0.15 * len(flags),
    }
