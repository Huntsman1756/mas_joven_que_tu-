<script lang="ts">
  import { t } from '$lib/i18n/t';

  /**
   * G7 — composición visual del hero: díptico REAL de ortofotos oficiales
   * sobre el mismo bbox (los previews first-party ya verificados,
   * `static/data/ortho-previews/`). 1956 a la izquierda, 2025 («hoy») a la
   * derecha, separados por la misma metáfora de cortina que el modo swipe.
   * Las imágenes son contenido decorativo-equivalente del propio producto:
   * `alt` describe la evidencia; el caption lleva la fuente.
   */
</script>

<figure class="visual">
  <div class="diptych">
    <img
      class="past"
      src="data/ortho-previews/1956.jpg"
      alt={t('hero.visual.alt')}
      loading="lazy"
      decoding="async"
    />
    <img
      class="now"
      src="data/ortho-previews/2025.jpg"
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
    max-width: 34rem;
  }
  .diptych {
    position: relative;
    border-radius: var(--radius);
    overflow: hidden;
    border: 1px solid var(--line-strong);
    box-shadow: 0 12px 32px rgba(25, 24, 23, 0.18);
    aspect-ratio: 1024 / 645;
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
    filter: grayscale(0.25) contrast(1.02);
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
    box-shadow: 0 0 0 1px rgba(25, 24, 23, 0.4);
  }
  .chip {
    position: absolute;
    top: 0.6rem;
    background: rgba(25, 24, 23, 0.78);
    color: var(--paper);
    font-size: 0.75rem;
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
    max-width: 44ch;
  }
  @media (max-width: 1023px) {
    .visual {
      order: -1;
      max-width: 100%;
    }
  }
</style>
