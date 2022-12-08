import {localStore} from './localStore.js';

export const initialPolls = [
    {
        id: 1,
        type: 1,
        prompt: 'Question test',
        choices: ['a', 'b', 'c'],
    },
    {
        id: 2,
        type: 1,
        prompt: 'Question test 2',
        choices: ['a', 'b', 'c', 'd']
    },
    {
        id: 3,
        type: 0,
        prompt: 'What is the square root of 2?',
    }
];

const polls = localStore('polls', initialPolls);

export {
    polls
};
