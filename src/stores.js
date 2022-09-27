import {writable} from 'svelte/store';
import {localStore} from './localStore.js';

const initialPolls = [
    {
        id: 1,
        question: 'Question test',
        choices: ['a', 'b', 'c']
    },
    {
        id: 2,
        question: 'Question test 2',
        choices: ['a', 'b', 'c']
    }
];

export const polls = localStore('polls', initialPolls);
