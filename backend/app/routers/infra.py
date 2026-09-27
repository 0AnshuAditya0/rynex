from typing import Any, Dict

from fastapi import APIRouter

from app import data_store
from app.services.artifact_parser import SAMPLE_CERT_PATH, parse_certificate
from app.services.infra_correlation import compute_infra_match_score

router = APIRouter(prefix="/infra", tags=["infra"])


@router.get("/sample-artifact")
def get_sample_artifact() -> Dict[str, Any]:
    """Demonstration: real X.509 parse of a locally-generated sample cert.

    Separate from any actor's (synthetic) infra data — proves the parsing
    capability exists. NOTE: declared before /{onion_address} so the
    path-param route does not swallow it.
    """
    return {
        "label": "sample_artifact",
        "note": "Demonstration: real artifact parsing on a sample file — "
                "not actor-specific evidence. Cert is locally generated, "
                "self-signed, never fetched from a live service.",
        "source_file": str(SAMPLE_CERT_PATH.name),
        "parsed": parse_certificate(str(SAMPLE_CERT_PATH)),
    }


@router.get("/{onion_address:path}")
def get_infra_correlation(onion_address: str) -> Dict[str, Any]:
    signals = data_store.get_all_infra_signals()
    descriptors = data_store.get_all_descriptors()
    return compute_infra_match_score(onion_address, signals, descriptors)
