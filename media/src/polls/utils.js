const stringifyPoll = function(pollObj) {
    pollObj = Object.assign({}, pollObj);
    delete pollObj.id;

    return JSON.stringify(pollObj, null, 4);
};

export {
    stringifyPoll
};
