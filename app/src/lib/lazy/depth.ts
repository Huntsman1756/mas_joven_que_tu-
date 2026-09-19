/**
 * Barrel de profundidad (PERF4-R): un único chunk para todo lo que solo
 * existe tras una selección real (edificio o celda). Se pide con el primer
 * acceso a cualquiera de sus miembros; el navegador deduplica el import.
 */
export { default as CellDetail } from '$lib/components/CellDetail.svelte';
export { default as BuildingCard } from '$lib/components/BuildingCard.svelte';
export { default as PlanningLocal } from '$lib/components/PlanningLocal.svelte';
export { default as ContextModules } from '$lib/components/ContextModules.svelte';
