import "@testing-library/jest-dom/vitest";

// jsdom no implementa scrollIntoView (ver
// https://github.com/jsdom/jsdom/issues/1695) — varios componentes con
// listas navegables por teclado (p.ej. ClienteSearchInput) lo llaman al
// mover el highlight. Stub global para que esos tests no revienten por una
// limitación del entorno de test, no del componente.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView() {};
}
