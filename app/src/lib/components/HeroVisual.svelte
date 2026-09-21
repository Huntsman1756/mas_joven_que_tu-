<script lang="ts">
  import { t } from '$lib/i18n/t';

  /**
   * G11 — la portada muestra UN lugar concreto y reconocible: la curva de
   * la ría de Bilbao / Abandoibarra, recorte del mismo bbox en dos
   * campañas oficiales (static/data/hero/, manifest con recurso y sha256).
   * 1956 a la izquierda, 2025 a la derecha, con la misma metáfora de
   * cortina que el comparador. Sin sombra grande: la imagen manda.
   */
</script>

<figure class="visual">
  <div class="diptych">
    <img
      class="past"
      src="data/hero/bilbao-1956.jpg"
      alt={t('hero.visual.alt')}
      loading="lazy"
      decoding="async"
    />
    <img
      class="now"
      src="data/hero/bilbao-2025.jpg"
      alt=""
      loading="lazy"
      decoding="async"
      aria-hidden="true"
    />
    <span class="cut" aria-hidden="true"></span>
    <span class="chip a" aria-hidden="true">1956</span>
    <span class="chip b" aria-hidden="true">{t('hero.visual.now')}</span>
  </div>
  <figcaption>{t('hero.visual.caption')}</figcaption>
</figure>

<style>
  .visual {
    margin: 0;
    align-self: center;
    width: 100%;
    max-width: 46rem;
  }
  .diptych {
    position: relative;
    border-radius: var(--radius);
    overflow: hidden;
    border: 1px solid var(--line-strong);
    aspect-ratio: 1600 / 1163;
    background: var(--paper-2);
  }
  .diptych img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  /* G10-04: cada mitad se recorta explícitamente — la composición no
     depende del orden DOM ni del apilado. */
  .diptych .past {
    clip-path: inset(0 50% 0 0);
  }
  .diptych .now {
    clip-path: inset(0 0 0 50%);
  }
  .cut {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 50%;
    width: 2px;
    margin-left: -1px;
    background: var(--paper);
    box-shadow: 0 0 0 1px rgba(24, 38, 49, 0.4);
  }
  .chip {
    position: absolute;
    top: 0.6rem;
    background: rgba(24, 38, 49, 0.78);
    color: var(--paper);
    font-size: 0.78rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    padding: 0.25rem 0.6rem;
    border-radius: 4px;
  }
  .chip.a {
    left: 0.6rem;
  }
  .chip.b {
    right: 0.6rem;
  }
  figcaption {
    margin-top: 0.55rem;
    font-size: var(--fs-meta);
    color: var(--ink-3);
    max-width: 64ch;
    line-height: 1.4;
  }
  @media (max-width: 1023px) {
    .visual {
      max-width: 100%;
    }
  }
</style>
