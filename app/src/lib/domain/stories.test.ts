import { describe, it, expect } from 'vitest';
import { STORIES, STORY_ORDER, nextStory, moveTarget, lastModality, storyDef } from './stories';

describe('stories', () => {
  it('orden editorial congelado y rotación cíclica determinista', () => {
    expect(STORY_ORDER).toEqual(['c2803', 'f4036', 'f4233', 'f4738', 'f149']);
    expect(nextStory(null)).toBe('c2803');
    expect(nextStory('c2803')).toBe('f4036');
    expect(nextStory('f149')).toBe('c2803'); // ciclo cerrado
    expect(storyDef('inexistente')).toBeNull();
  });

  it('contraste C-05/C-08 solo en f4036/f4738 con los valores congelados del brief', () => {
    for (const id of STORY_ORDER) {
      const c = STORIES[id].contrast;
      if (id === 'f4036') expect(c).toEqual({ ref: 1979, count: 85.7, footprint: 1.9 });
      else if (id === 'f4738') expect(c).toEqual({ ref: 1999, count: 11.1, footprint: 94.7 });
      else expect(c).toBeNull();
    }
  });

  it('acción primaria: con pulso temporal → tiempo; sin pulso → mapa', () => {
    expect(moveTarget(STORIES.c2803)).toBe('time');
    expect(moveTarget(STORIES.f4233)).toBe('time');
    expect(moveTarget(STORIES.f4036)).toBe('map');
    expect(moveTarget(STORIES.f4738)).toBe('map');
    expect(moveTarget(STORIES.f149)).toBe('map');
  });

  it('modalidad de interacción: "none" sin ventana (SSR/headless)', () => {
    expect(lastModality()).toBe('none');
  });
});
