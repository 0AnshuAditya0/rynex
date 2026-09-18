from typing import Any, Dict

from fastapi import APIRouter

from app import data_store
from app.services.infra_correlation import compute_infra_match_score

router = APIRouter(prefix="/infra", tags=["infra"])


@router.get("/{onion_address:path}")
def get_infra_correlation(onion_address: str) -> Dict[str, Any]:
    signals = data_store.get_all_infra_signals()
    descriptors = data_store.get_all_descriptors()
    return compute_infra_match_score(onion_address, signals, descriptors)
