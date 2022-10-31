/**
 * Local storage store based on:
 *   https://developer.mozilla.org/en-US/docs/Learn/Tools_and_testing/Client-side_JavaScript_frameworks/Svelte_stores
 */

import {writable} from 'svelte/store';

export const localStore = (key, initial) => {
    const toString = (value) => JSON.stringify(value, null, 2);
    const toObj = JSON.parse;

    if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, toString(initial));
    }

    const saved = toObj(localStorage.getItem(key));

    const { subscribe, set, update } = writable(saved);

    return {
        subscribe,
        set: (value) => {
            localStorage.setItem(key, toString(value))
            return set(value)
        },
        update
    };
};
