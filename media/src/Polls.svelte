<script>
    import {
        Button,
        Modal,
        ModalBody,
        ModalFooter,
        ModalHeader,
        TabContent,
        TabPane
    } from 'sveltestrap';
    import katex from 'katex';
    import {makePoll} from './rooms';
    import {initialPolls} from './stores';

    export let isPollsOpen, togglePolls;
    export let polls = initialPolls;

    const blankPreview = 'Question preview area (rendered LaTeX)';

    const pollTextChange = function(e) {
        const newVal = e.target.value;
        let rendered;

        if (newVal === '') {
            rendered = blankPreview;
        } else {
            rendered = katex.renderToString(newVal);
        }

        const area = document.getElementById('pollPreviewArea');
        area.innerHTML = rendered;
    }

    const clickMakePoll = function(e) {
        e.preventDefault();

        const poll = makePoll(polls, 0, 'hi', null);
        polls = [...polls, poll];

        closePolls();
    }

    const closePolls = function() {
        isPollsOpen = false;
    }
</script>

<Modal isOpen={isPollsOpen} toggle={togglePolls} size="lg">
    <ModalHeader toggle={togglePolls}>Polls</ModalHeader>
    <ModalBody>
        <TabContent>
            <TabPane tabId="make-poll" tab="Make poll" active>
                <form>
                    <div class="mt-1 mb-3">
                        Poll type:
                        <br />
                        <div class="form-check form-check-inline">
                            <label class="form-check-label">
                                <input class="form-check-input"
                                       type="radio" name="pollType"
                                       value="multiple-choice" checked>
                                Multiple Choice
                            </label>
                        </div>
                        <div class="form-check form-check-inline">
                            <label class="form-check-label">
                                <input class="form-check-input"
                                       type="radio" name="pollType"
                                       value="point">
                                Point
                            </label>
                        </div>
                        <br />
                        <div class="form-check form-check-inline">
                            <label class="form-check-label">
                                <input class="form-check-input"
                                       type="radio" name="pollType"
                                       value="free-text">
                                Free text
                            </label>
                        </div>
                        <div class="form-check form-check-inline">
                            <label class="form-check-label">
                                <input class="form-check-input"
                                       type="radio" name="pollType"
                                       value="equation">
                                Equation
                            </label>
                        </div>
                    </div>
                    <div class="mb-3">
                        <label for="pollQuestionTextarea" class="form-label">
                            Ask a question
                        </label>
                        <textarea class="form-control"
                                  on:input={pollTextChange}
                                  id="pollQuestionTextarea"
                                  aria-describedby="question"></textarea>

                    </div>
                    <p id="pollPreviewArea">
                        {blankPreview}
                    </p>
                    <div class="mb-3">
                        <input type="text" class="form-control"
                               placeholder="Choice 1" aria-label="Choice 1">
                        <input type="text" class="form-control"
                               placeholder="Choice 2" aria-label="Choice 2">

                        <Button color="secondary">
                            + Add choice
                        </Button>
                    </div>
                    <Button color="primary" on:click={clickMakePoll}>
                        Make poll
                    </Button>
                </form>
            </TabPane>
            <TabPane tabId="view-polls" tab="View polls">
                <ul>
                    {#each polls as poll}
                        <li>
                            <a href={`/polls/${poll.id}/`}>Poll {poll.id}</a> -
                            <strong>Prompts:</strong> {poll.prompt},
                            {poll.choices.length} choices
                        </li>
                    {:else}
                        No polls created!
                    {/each}
                </ul>
            </TabPane>
        </TabContent>

    </ModalBody>

    <ModalFooter>
        <Button color="secondary" on:click={closePolls}>
            Cancel
        </Button>
    </ModalFooter>
</Modal>
