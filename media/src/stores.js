import { writable } from 'svelte/store';

// Make a store for "universal coordinated time"
export const tickTock = writable(0.);