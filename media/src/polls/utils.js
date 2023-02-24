const stringifyPoll = function(pollObj) {
    pollObj = Object.assign({}, pollObj);
    delete pollObj.id;

    return JSON.stringify(pollObj, null, 4);
};

/**
 * Load polls from localStorage.
 */
const loadPolls = function() {
    let polls = window.localStorage.getItem('polls');

    try {
        polls = JSON.parse(polls);
    } catch (e) {
        console.error('Error loading polls from localStorage:', e);
        polls = [];
    }

    return polls;
};

export {
    stringifyPoll,
    loadPolls
};
