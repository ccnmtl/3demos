const POLL_TYPES = [
    'Numeric',
    'Multiple Choice'
];

let idx = 1;

class Poll {
    constructor(type=1, prompt, choices) {
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
    POLL_TYPES,
    Poll,
    setIdCounter
}
