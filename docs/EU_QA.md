# Control de calidad del euskera (EU)

Estado: **EU asistido, sin revisión nativa.** Las herramientas de abajo comprueban
ortografía y terminología; ninguna certifica gramática, registro ni naturalidad.

## Herramientas comprobadas (06-11-2026)

| Herramienta | Titular | Uso aquí | Licencia (fuente) |
|---|---|---|---|
| Xuxen 5.4.10 (diccionario Hunspell) | Elhuyar + IXA (UPV/EHU) | Ortografía de todo `eu.ts` con `scripts/eu_spellcheck.py` | `LICENSE.txt` del ZIP: LGPL-3.0; otras fichas dicen GPL. No se redistribuye: se descarga de <https://www.xuxen.eus/deskargatu> y se verifica su SHA-256 |
| spylls 0.1.7 | zverok | Motor Hunspell en Python (herramienta de desarrollo) | MPL-2.0 (<https://github.com/zverok/spylls>) |
| Euskalterm (TBX abierto) | Gobierno Vasco / UZEI | Contraste de términos | CC BY 4.0 (<https://opendata.euskadi.eus/catalogo/-/diccionarios-terminologicos-de-euskalterm/>) |
| Euskaltzaindia (Hiztegia, EBE) | Euskaltzaindia | Consulta manual de la norma | Sin licencia de reutilización general |

Descartadas: LanguageTool (no soporta euskera); Itzuli, Elia y Latxa (traducción o
generación automática: no sirven para juzgar un texto, y AGENTS.md prohíbe la
traducción automática como copy final).

## Resultado

- Ortografía: 568 claves, 3.916 palabras; 0 desconocidas fuera de la lista blanca
  `scripts/eu_spellcheck_allow.txt` (cada entrada con motivo).
- Corregido: `context.noise.mapped_multi` «gainjartu» → «gainjarritako hainbat banda».
- Terminología que coincide con Euskalterm: Katastro, udalerri, errolda, estaldura,
  hirigintza. Sin ficha abierta: ortoargazki (forma del propio Gobierno Vasco en su
  servicio `WMS_ORTOARGAZKIAK`), eraikuntza-urte, oinplano-azalera, kale-izendegi.
- Pendiente de confirmar: «georeferentziatutako» (Xuxen no tiene ninguna variante).
- «NORAk»: sigla declinada sin guion, según la norma de Euskaltzaindia para siglas
  que se leen como palabra.

## Cómo repetirlo

```bash
pip install spylls==0.1.7
python -I scripts/eu_spellcheck.py     # sale 1 si aparece una palabra nueva sin reconocer
```

Antes de dar el EU por bueno: revisión de una persona nativa (por ejemplo, el servicio
de euskera de la UPV/EHU o de Elhuyar) sobre `app/src/lib/i18n/eu.ts`.
