"""Best-effort identifier extraction for raw post text.

Matches from this module are intentionally unconfirmed observations.  They
must not be added to actor identifiers or graph nodes without review.
"""

import re
from typing import Dict, List


_PATTERNS = (
    ("pgp", re.compile(r"\b[A-Fa-f0-9]{40}\b")),
    # Supports synthetic/demo and real-shaped legacy and bech32 BTC strings.
    # The broad bech32-shaped branch deliberately accepts labeled synthetic
    # demo values such as ``...fakebtc03``; this is extraction, not checksum
    # validation.
    ("wallet", re.compile(r"\b(?:[13][1-9A-HJ-NP-Za-km-z]{25,34}|bc1[a-z0-9]{11,71})\b", re.IGNORECASE)),
    ("wallet", re.compile(r"\b[48][1-9A-HJ-NP-Za-km-z]{94}\b")),
)


def extract_identifiers(raw_text: str) -> List[Dict[str, str]]:
    """Extract distinct identifier-shaped strings in their text order."""
    matches = []
    for identifier_type, pattern in _PATTERNS:
        matches.extend(
            (match.start(), identifier_type, match.group(0))
            for match in pattern.finditer(raw_text)
        )

    seen = set()
    extracted: List[Dict[str, str]] = []
    for _, identifier_type, value in sorted(matches):
        key = (identifier_type, value)
        if key not in seen:
            seen.add(key)
            extracted.append({"type": identifier_type, "value": value})
    return extracted
