# Ensayo B.2 — publicación byte a byte, huella y -Root seguro

Fecha: **2026-09-27**. Herramientas: Windows PowerShell 5.1.26100.9444,
`git version 2.55.0.windows.3`, Node 24.19.0. Segunda corrida del ensayo:
la de FASE B.1 está en `REHEARSAL.md` (34 checks) y no se sobrescribe —
esta usa `rehearsal-20260927T175238Z.json` + reports `publish-B-*`,
`publish-C-crlf-*`, `rollback-C-*` con el sello de la ejecución.

| Elemento | Valor |
|----------|-------|
| Origen | Git **local** en `F:\Temp\runtime\mjt-release-rehearsal-20260927T175238-34420fa7\origin.git` (bare, desechable, creado nuevo por esta ejecución) |
| Secuencia | A publicado → controles negativos N1–N3 → publicación de B (huella + bytes, push) → **N4** alteración post-huella → **CRLF** publicación con `core.autocrlf=true` → **N5** `.gitattributes «text»` → rollback C (árbol de A) → remoto divergente D |
| Resultado | **REHEARSAL PASS — 50 checks, 0 fallos** (`exit=0`) |

> Nota de procedencia: `rehearsal-20260927T175054Z.json` es una segunda
> corrida PASS idéntica (anterior al sellado de nombres de los reports);
> los ficheros sin sello (`publish-B.json`, `publish-C-crlf.json`,
> `rollback-C.json`) corresponden a esa corrida B.2. `rehearsal.json`,
> `REHEARSAL.md` y `rehearsal-run.log` son de la corrida B.1 (34 checks) y
> se conservan.

## Qué demostró de nuevo (FASE B.2)

- **Huella obligatoria** (`huella_corresponde_al_build`): la huella se
  genera con `scripts/fingerprint_candidate.mjs` (Node) y se verifica con
  una implementación independiente en PowerShell — coinciden
  (`4560d796…`/`c3de63e6…` en sus builds); un fichero alterado **tras**
  fijar la huella → exit 1 con motivo `/huella/`, sin commit ni push y con
  el worktree intacto (`n4_sin_push_ni_commit`).
- **Byte a byte** (`bytes_indice_igual_build`, `arbol_publicado_igual_build`):
  cada blob indexado se compara con SHA-1 de `blob <len>\0<bytes>` del
  fichero — y el árbol del commit publicado se vuelve a cotejar blob a blob.
- **Binario** (`pub_binario_byte_a_byte`, `pub_binario_longitud`):
  `og-card.png` de 17 B con `NUL`, `0xFF`, CR y LF sueltos → blob publicado
  == `hash-object --no-filters` del fichero. La verificación no depende de
  decodificación de texto.
- **CRLF** (`crlf_*`): con `core.autocrlf=true` en el repo temporal (el
  contraejemplo de la revisión), `index.html` con CRLF reales publica
  **PUBLISH OK** y el blob conserva los bytes (161 B == 161 B; el id de blob
  coincide con el hash de los bytes crudos): el staging lleva
  `-c core.autocrlf=false` solo en esa llamada.
- **Detección de transformación** (`pub-neg-transformacion`): con
  `.gitattributes «*.txt text»` en el artefacto, Git normaliza CRLF→LF al
  indexar → el id de blob difiere → **exit 1** con motivo `/transform/`,
  sin commit ni push (`n5_sin_push`); estado local diagnosticable.
- **Rollback**: A → B → B2(CRLF) → C con `árbol(C) == árbol(A)`, B en el
  historial y push fast-forward; además `index.html` se verifica por **id
  de blob** (ya no por texto normalizado).
- **Guarda de `-Root`**: `release_rehearsal.ps1` ya no borra nada
  preexistente — dir único por ejecución; rechazos comprobados con
  fixtures: directorio preexistente con centinela (centinela intacto),
  raíz de unidad, repo del producto, subdir del repo, padre inexistente y
  junction (`mklink /j` → `C:\`).

## Límites (sin cambios respecto a B.1)

Ensayo contra un origen Git **local**: no verifica GitHub Pages, ni el
push remoto real, ni la URL pública. `VERIFICADO_EN_PRODUCCIÓN`: nada.
