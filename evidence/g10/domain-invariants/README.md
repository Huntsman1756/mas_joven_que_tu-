# domain-invariants

`metrics.frozen.test.ts` — 4/4 PASS sobre los JSON reales en el build G10:

| Caso | total | known | after | pct |
|---|---|---|---|---|
| Bilbao / 1952 | 13.750 | 13.738 | 9.289 | 67,6 |
| Mungia / 1979 | 4.483 | 4.472 | 2.679 | 59,9 |
| Arakaldo / 1987 | 109 | 109 | 28 | 25,7 |
| Bilbao / 2015 | 13.750 | 13.738 | 262 | 1,9 |

`git diff 5df397d -- app/static data pipeline tests` → vacío.
