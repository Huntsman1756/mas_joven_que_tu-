# G4-R · JUDGE-JOURNEY — recorridos del jurado y demo en vivo

Objetivo: maximizar dinamismo/comprensión/rigor/innovación/usabilidad
**sin rescate verbal**.

## Demo A — 30 segundos

```
1. Abrir URL preparada: ?year=1979&place=portugalete (deep link directo
   a resultado — el jurado ve el producto funcionando, no el formulario)
2. Leer el titular: «Eres mayor que una parte de los edificios que hoy
   forman Portugalete» + «X de cada 100 después de 1979»   [5 s]
3. El mapa ya está coloreado — señalar con el cursor una zona roja  [5 s]
4. Pulsar TIEMPO → Play                                                   [10 s]
   → el municipio se construye delante — momento dinamismo
5. Pulsar «Ver la foto de 1977» (o FOTO) → ortofoto real               [10 s]
   → «el mismo lugar, comprobado desde el aire»
```

Cubre: dinamismo (play), comprensión (titular), rigor (cobertura bajo el
titular), innovación (personalización), usabilidad (dos clics).

## Demo B — 90 segundos

```
Demo A completa                                                  [30 s]
6. «Buscar una dirección» → Gran Vía 1 (Bilbao) → edificio exacto      [20 s]
   → ficha con año + proveniencia NORA↔Catastro
   → módulos de entorno (paradas reales)
7. «Añade otro año» → 1960 → partición del mapa en tres tiempos        [15 s]
8. Scroll a «¿Y qué está previsto?» → 3 cifras de planning             [10 s]
9. Abrir «¿Cómo lo sabemos?» (o mostrar cobertura) — rigor visible     [10 s]
10. Compartir → la URL reproduce exactamente esta vista                [5 s]
```

Cubre: todo lo anterior + profundidad personal + planning + share.

## Demo C — 3 minutos

```
Demo B                                                             [90 s]
11. «Descúbreme un cambio» → capítulo Muskiz (f4233)                   [30 s]
    → «51 edificios, todos de los 70» → el usuario lanza Play dentro
      del caso — la historia se manipula
12. Cambiar de lugar (Getxo) → la misma pregunta se reejecuta          [20 s]
    → «esto no es una visualización: es una máquina de preguntas»
13. Mapa histórico 1923–25 → «el mismo mapa, antes de todo esto»       [20 s]
14. Mostrar un BOTH_DIFFER (Durango Kurutziaga 4): dos fuentes         [20 s]
    oficiales en desacuerdo, mostrado sin resolver — rigor máximo
```

## Presentación en vivo — 5 minutos (ceremonia)

```
00:00 «Pregunta: ¿qué parte de la Bizkaia actual es posterior a ti?»
00:20 Demo A en el escenario (año del jurado más votado/la presentadora)
01:20 «Cada cifra lleva su denominador» — mostrar cobertura + caveat
01:50 MI EDIFICIO con una dirección local conocida
02:30 Play — dejar que el mapa hable solo 10 segundos
03:00 DOS AÑOS — «¿y respecto a tu padre?»
03:30 Descúbreme → una historia (Muskiz o Portugalete según público)
04:10 «Todo es dato oficial: Catastro, ortofotos, planeamiento,
      Bizkaibus, mapa 1923-25 — Open Data Bizkaia como fuente
      principal, geoEuskadi como complemento»
04:40 Cierre: «no es un visor — es una máquina de preguntas sobre tu
      lugar» + compartir la URL en pantalla
```

Regla de la demo: cada paso es ≤2 clics y tiene un resultado visible
inmediato; nada depende de explicar la interfaz.

## Riesgos de la demo y mitigaciones

- NORA puede no resolver en directo → dirección de corpus verificada
  (c01 Bilbao, EXACT, 356 ms en corpus).
- Ortofoto externa puede latenciar → FOTO es opt-in; si tarda, el plan
  B es el mapa histórico (también externo pero ya probado en gates).
- Headless/proyector WebGL → demo con Chrome estable y viewport 1440.
- Estado predecible: URLs deep-link preparadas (no improvisar en vivo).
