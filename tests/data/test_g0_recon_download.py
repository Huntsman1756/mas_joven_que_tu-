"""RT-22 — trazabilidad TLS de la preingesta del Catastro.

`pipeline/g0_recon.py::download` debe distinguir tres casos sin fingir una
verificación que no ocurrió:

  * ZIP ya en caché local  → ok=True, tls_verified=None (UNKNOWN);
  * respuesta HTTP         → tls_verified = lo que declaró `net.http_get`;
  * fallo previo a negociar → ok=False, tls_verified=None.

Ejecutar:  python -m pytest tests/data -q
"""
from __future__ import annotations

import hashlib
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "pipeline"))

import g0_recon  # noqa: E402
from g0_recon import download  # noqa: E402


class _Resp:
    """Respuesta mínima con el contrato de `requests` que usa download()."""

    def __init__(self, status: int = 200, tls: bool = True, body: bytes = b"PK\x03\x04zip"):
        self.status_code = status
        self.mjt_tls_verified = tls
        self._body = body

    def __enter__(self) -> "_Resp":
        return self

    def __exit__(self, *exc) -> bool:
        return False

    def iter_content(self, n: int):
        for i in range(0, len(self._body), n):
            yield self._body[i : i + n]


def test_cache_local_no_afirma_tls(tmp_path: Path, monkeypatch):
    dest = tmp_path / "48001_SHP.zip"
    payload = b"PK\x03\x04contenido" * 100
    dest.write_bytes(payload)

    def _sin_red(*a, **k):  # noqa: ANN002, ANN003
        raise AssertionError("la caché no debe consultar la red")

    monkeypatch.setattr(g0_recon, "http_get", _sin_red)
    ok, info, size, tls = download("https://example.invalid/nunca.zip", dest)
    assert ok is True
    assert size == len(payload)
    assert info == hashlib.sha256(payload).hexdigest()
    assert tls is None  # UNKNOWN: en esta ejecución no se negoció TLS


def test_error_http_devuelve_cuatro_tupla_con_tls_de_la_respuesta(
    tmp_path: Path, monkeypatch
):
    dest = tmp_path / "nope.zip"
    monkeypatch.setattr(g0_recon, "http_get", lambda *a, **k: _Resp(status=500, tls=True))
    ok, info, size, tls = download("https://example.invalid/500", dest)
    assert (ok, info, size, tls) == (False, "HTTP 500", 0, True)
    assert not dest.exists()


def test_descarga_fresca_registra_tls_verificado(tmp_path: Path, monkeypatch):
    dest = tmp_path / "nuevo.zip"
    body = b"PK\x03\x04bytes" * 32
    monkeypatch.setattr(g0_recon, "http_get", lambda *a, **k: _Resp(tls=True, body=body))
    ok, info, size, tls = download("https://example.invalid/ok", dest)
    assert ok is True
    assert dest.read_bytes() == body
    assert size == len(body)
    assert info == hashlib.sha256(body).hexdigest()
    assert tls is True


def test_fallo_de_red_antes_de_negociar_tls_es_unknown(tmp_path: Path, monkeypatch):
    def _caido(*a, **k):  # noqa: ANN002, ANN003
        raise ConnectionError("red caída")

    monkeypatch.setattr(g0_recon, "http_get", _caido)
    ok, info, size, tls = download("https://example.invalid/caida", tmp_path / "x.zip")
    assert ok is False
    assert size == 0
    assert tls is None
    assert "ConnectionError" in info
