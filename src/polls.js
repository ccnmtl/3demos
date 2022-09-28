const newPollId = function(polls) {
    return polls.length ? Math.max(...polls.map(p => p.id)) + 1 : 1;
}

/**
 * makePoll
 *
 * Make a poll and add it to the store of polls, given the
 * parameters. Do validation as necessary.
 *
 * Returns the new Poll object, or throws an error if validation fails.
 */
const makePoll = function(polls, type=0, prompt='', choices=null) {
    const id = newPollId(polls);

    const poll = {
        id: id,
        type: type,
        prompt: prompt,
        choices: choices
    };

    console.log('polls', polls);

    return poll;
};

export {
    makePoll
};
