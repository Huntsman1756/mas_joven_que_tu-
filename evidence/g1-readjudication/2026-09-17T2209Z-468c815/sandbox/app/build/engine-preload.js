// Generado por scripts/gen-engine-preload.mjs — no editar.
try {
  if (new URLSearchParams(location.search).has('place')) {
    for (const f of ["DEoFgcQ-.js","B_mMoUu6.js","YRuID_rZ.js"]) {
      const l = document.createElement('link');
      l.rel = 'modulepreload';
      l.fetchPriority = 'high';
      l.href = new URL('./_app/immutable/chunks/' + f, location.href);
      document.head.appendChild(l);
    }
  }
} catch (e) { /* la precarga es oportunista; nunca debe romper el boot */ }
