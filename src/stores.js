import {writable} from 'svelte/store';
import {localStore} from './localStore.js';

const pollTypes = [
    'multiple-choice',
    'point',
    'text',
    'equation'
];

export const initialPolls = [
    {
        id: 1,
        poll_type: 0,
        prompt: 'Question test',
        choices: ['a', 'b', 'c'],
    },
    {
        id: 2,
        poll_type: 0,
        prompt: 'Question test 2',
        choices: ['a', 'b', 'c']
    }
];

const polls = localStore('polls', initialPolls);

export {
    polls
};
