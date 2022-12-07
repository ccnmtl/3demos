import {localStore} from './localStore.js';

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
        choices: ['a', 'b', 'c', 'd']
    }
];

const polls = localStore('polls', initialPolls);

export {
    polls
};
