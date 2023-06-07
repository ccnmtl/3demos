import { writable } from 'svelte/store';

// Make a store for "universal coordinated time"
export const tickTock = writable(0.);
export const vMin = writable(-1.);
export const vMax = writable(1.);
export const colorMap = writable('plasma')
export const densityColormap = writable('PuBuGn')