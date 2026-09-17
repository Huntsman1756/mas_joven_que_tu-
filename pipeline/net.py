"""HTTP del pipeline: verificación TLS obligatoria por defecto.

Política:
  - TLS verificado SIEMPRE. Un SSLError hace fallar la llamada.
  - El único downgrade permitido es opt-in explícito del operador:
        MJT_ALLOW_INSECURE_TLS=1
    y solo para endpoints oficiales en ALLOWLIST_INSECURE. Cada respuesta lleva
    `r.mjt_tls_verified` (bool) para que la evidencia registre tls_verified.

Motivo: los datos catastrales alimentan snapshots que se publican; una descarga
sin autenticación TLS puede producir un snapshot aparentemente válido pero
interceptado. Si un endpoint falla TLS de forma permanente, lo correcto es
arreglar la cadena de certificados (o exigir el opt-in), no bajar el cifrado
en silencio.
"""
from __future__ import annotations

import os
import warnings
from urllib.parse import urlparse

import requests
import urllib3

UA = {"User-Agent": "Mozilla/5.0 (compatible; mas-joven-que-tu)"}

# Hosts oficiales con cadenas de certificado problemáticas en algunos entornos
# Windows. El opt-in NO se extiende a otros hosts: fuera de esta lista no hay
# downgrade posible.
ALLOWLIST_INSECURE = frozenset({
    "www.geo.euskadi.eus",
    "geo.euskadi.eus",
    "www.opendatabizkaia.eus",
    "opengis.bizkaia.eus",
    "geo.bizkaia.eus",
})

_ENV_FLAG = "MJT_ALLOW_INSECURE_TLS"


def _insecure_opted_in(url: str) -> bool:
    host = urlparse(url).hostname or ""
    return os.environ.get(_ENV_FLAG) == "1" and host in ALLOWLIST_INSECURE


def http_get(url: str, *, timeout: int = 60, stream: bool = False,
             headers: dict | None = None, params: dict | None = None) -> requests.Response:
    """GET con verificación TLS obligatoria.

    Raises:
        requests.exceptions.SSLError: si el certificado no verifica y el
            operador no habilitó MJT_ALLOW_INSECURE_TLS=1 para ese endpoint.
    """
    h = headers or UA
    try:
        r = requests.get(url, headers=h, params=params, timeout=timeout,
                         stream=stream, verify=True)
        r.mjt_tls_verified = True  # type: ignore[attr-defined]
        return r
    except requests.exceptions.SSLError:
        if not _insecure_opted_in(url):
            raise
        print(f"  !! TLS SIN VERIFICAR para {url} ({_ENV_FLAG}=1, host en allowlist)")
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", urllib3.exceptions.InsecureRequestWarning)
            r = requests.get(url, headers=h, params=params, timeout=timeout,
                             stream=stream, verify=False)
        r.mjt_tls_verified = False  # type: ignore[attr-defined]
        return r
