let idx = 1;

/**
 * Poll
 *
 * Poll type is a string - the following types are supported:
 *  'numeric'
 *  'multiple choice'
 *  'select point'
 */
class Poll {
    constructor(type='multiple choice', prompt, choices) {
        this.id = idx++;
        this.type = type;
        this.prompt = prompt;
        this.choices = choices;
    }
}

const setIdCounter = (i) => {
    idx = i + 1;
};

export {
    Poll,
    setIdCounter
}
