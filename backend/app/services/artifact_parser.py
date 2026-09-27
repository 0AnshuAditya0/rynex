"""Real artifact parsing (NOT mock dicts).

parse_certificate() loads an actual PEM file with the `cryptography`
library and computes every field it returns. Sample input:
seed_data/sample_cert.pem — a real self-signed cert generated locally
(CN=test-rynex-sample.local), never fetched from a live service.
"""

import sys
from pathlib import Path
from typing import Any, Dict, List

CURRENT_FILE = Path(__file__).resolve()
BACKEND_DIR = CURRENT_FILE.parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

SAMPLE_CERT_PATH = BACKEND_DIR / "seed_data" / "sample_cert.pem"


def _load_pem_bytes(pem_path: str) -> bytes:
    raw = Path(pem_path).read_text(encoding="utf-8-sig")
    # Extract only the PEM block so #-comments / blank lines can never
    # corrupt parsing; the block itself is parsed for real by cryptography.
    lines = raw.splitlines()
    try:
        start = next(i for i, l in enumerate(lines) if "BEGIN CERTIFICATE" in l)
        end = next(i for i, l in enumerate(lines) if "END CERTIFICATE" in l)
    except StopIteration:
        raise ValueError(f"No PEM certificate block found in {pem_path}")
    pem_text = "\n".join(l for l in lines[start:end + 1] if l.strip()) + "\n"
    return pem_text.encode("ascii")


def parse_certificate(pem_path: str) -> Dict[str, Any]:
    """Parse a real PEM X.509 cert; all fields computed, none hardcoded."""
    from cryptography import x509
    from cryptography.hazmat.primitives import hashes
    from cryptography.x509.oid import NameOID

    cert = x509.load_pem_x509_certificate(_load_pem_bytes(pem_path))

    def _cn(name: x509.Name) -> str | None:
        attrs = name.get_attributes_for_oid(NameOID.COMMON_NAME)
        return attrs[0].value if attrs else None

    try:
        sans: List[str] = cert.extensions.get_extension_for_class(
            x509.SubjectAlternativeName
        ).value.get_values_for_type(x509.DNSName)
    except x509.ExtensionNotFound:
        sans = []

    public_key = cert.public_key()
    key_algo = type(public_key).__name__  # e.g. RSAPublicKey
    key_size = getattr(public_key, "key_size", None)

    return {
        "sha256_fingerprint": cert.fingerprint(hashes.SHA256()).hex(),
        "subject_cn": _cn(cert.subject),
        "issuer_cn": _cn(cert.issuer),
        "self_signed": cert.subject == cert.issuer,
        "sans": sans,
        "not_before": cert.not_valid_before_utc.isoformat(),
        "not_after": cert.not_valid_after_utc.isoformat(),
        "signature_hash_algorithm": cert.signature_hash_algorithm.name
        if cert.signature_hash_algorithm
        else None,
        "public_key_algorithm": key_algo,
        "public_key_size": key_size,
        "serial_number": str(cert.serial_number),
    }


if __name__ == "__main__":
    import json

    print("=" * 70)
    print("ARTIFACT PARSER SELF-TEST (real X.509 parse, no mocks)")
    print(f"Input: {SAMPLE_CERT_PATH}")
    print("=" * 70)
    print(json.dumps(parse_certificate(str(SAMPLE_CERT_PATH)), indent=2))
    print("=" * 70)
