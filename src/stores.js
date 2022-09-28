import {writable} from 'svelte/store';
import {localStore} from './localStore.js';

const pollTypes = [
    'multiple-choice',
    'point',
    'text',
    'equation'
];

const initialPolls = [
    {
        id: 1,
        type: 0,
        prompt: 'Question test',
        choices: ['a', 'b', 'c'],
    },
    {
        id: 2,
        type: 0,
        prompt: 'Question test 2',
        choices: ['a', 'b', 'c']
    }
];

let polls = localStore('polls', initialPolls);

export {
    polls
};
