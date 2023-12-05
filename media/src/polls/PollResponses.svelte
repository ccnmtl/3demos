<script>
    import { onMount } from 'svelte';

    import * as d3 from 'd3';
    import BarChart from '../d3/BarChart';
    import Histogram from '../d3/Histogram';
    import { makeObject } from '../sceneUtils';
    import { showPollResults, hidePollResults } from './utils';
    import { demoObjects } from '../stores';

    export let socket;
    export let pollResponses;
    export let currentPoll;
    export let currentPollType;
    export let objectResponses;
    export let lockPoll;

    export let render = function () {};
    export let role = 'student';

    let d3container;
    let chart;
    let activeResponse;
    let hidden = true;

    /**
     * Process an array of responses into something that d3 can
     * display.
     *
     * Takes an object and returns an array.
     */
    const processResponses = function (data, poll) {
        let processedData = [];
        if (poll && poll.choices) {
            // Initialize choices as empty buckets
            processedData = poll.choices.map((x) => [x, 0]);
        }

        const responsesArray = Object.entries(data);

        responsesArray.forEach((response) => {
            const choice = response[1];
            const frequency = responsesArray.filter(
                (r) => r[1] === choice
            ).length;
            processedData.push([choice, frequency]);
        });

        return processedData;
    };

    const makeGraph = function (data, pollType) {
        data = processResponses(data, currentPoll);

        if (pollType === 'numeric') {
            return Histogram(data, {
                x: (d) => d[0],
                y: (d) => d[1],
                color: 'steelblue',
            });
        } else if (pollType === 'multiple choice') {
            return BarChart(data, {
                x: (d) => d[0],
                y: (d) => d[1],
                xDomain: d3.groupSort(
                    data,
                    () => -1,
                    (d) => d[0]
                ),
                // sort by descending frequency
                color: 'steelblue',
            });
        }

        return null;
    };

    const loadResponse = (item) => {
        $demoObjects = [];
        $demoObjects = makeObject(null, item.kind, item.params, $demoObjects);
    };

    /**
     * refreshResults()
     *
     * Given an array of responses and the poll type,
     * render a new d3 chart element and put it on the page.
     */
    // TODO:
    // A more declarative approach would be better, like putting
    // the SVG markup directly in the svelte template here. I just
    // couldn't get that working with svelte.
    const refreshResults = function (responses, pollType) {
        chart = makeGraph(responses, pollType);
        if (chart) {
            hidden = false;
            if (!d3container) {
                return;
            }

            const oldChart = d3container.querySelector('svg');
            if (oldChart) {
                d3container.replaceChild(chart, oldChart);
            } else {
                d3container.appendChild(chart);
            }
        } else {
            hidden = true;
        }
    };

    const clearPoints = function () {
        objectResponses.clear();
        showPollResults(
            pollResponses,
            currentPollType,
            socket,
            objectResponses
        );
        render();
    };

    const onTogglePollResults = function (e) {
        if (e.target.checked) {
            showPollResults(
                pollResponses,
                currentPollType,
                socket,
                objectResponses
            );
        } else {
            hidePollResults(socket);
        }
    };

    onMount(() => {
        refreshResults(pollResponses, currentPollType);
    });

    $: refreshResults(pollResponses, currentPollType);
</script>

<div class="row justify-content-between m-2 align-items-center">
    <div class="col-auto">
        <strong>
            {Object.keys(pollResponses).length}
            {#if Object.keys(pollResponses).length == 1}response{:else}responses{/if}
        </strong>
    </div>

    {#if role === 'host'}
        <div class="col-auto">
            <div class="form-check form-switch">
                <input
                    class="form-check-input"
                    type="checkbox"
                    role="switch"
                    on:change={onTogglePollResults}
                    id="flexSwitchCheckDefault"
                />
                <label class="form-check-label" for="flexSwitchCheckDefault">
                    <i class="bi bi-broadcast-pin" /> Show results
                </label>
            </div>
            <button
                type="button"
                class="btn btn-warning btn-sm"
                title={lockPoll ? 'Unrestrict Updates' : 'Restrict Updates'}
                on:click={() => (lockPoll = !lockPoll)}
            >
                {#if lockPoll}
                    <i class="bi bi-unlock" /> Unrestrict Updates
                {:else}
                    <i class="bi bi-lock" />Restrict Updates
                {/if}
            </button>
        </div>
    {/if}

    {#if objectResponses && objectResponses.children.length > 0}
        <button
            on:click={clearPoints}
            class="btn btn-danger col-auto"
            title="Clear points"
        >
            <i class="fa fa-trash" />
        </button>
    {/if}
</div>
{#if currentPollType == 'select object'}
    <ul class="list-group">
        {#each Object.entries(pollResponses) as [user, response] (response)}
            <li
                class={'list-group-item' +
                    (user == activeResponse ? ' active' : '')}
            >
                <button
                    class={'btn response-item p-0' +
                        (user == activeResponse ? ' text-white' : '')}
                    on:click={() => {
                        activeResponse = user;
                        loadResponse(response);
                    }}
                >
                    <strong>{response.kind}</strong>
                    {#each Object.entries(response.params) as [param, data]}
                        , {param} = {data}
                    {/each}
                </button>
            </li>
        {/each}
    </ul>
{/if}
<div bind:this={d3container} {hidden} />

{#if currentPoll && currentPoll.prompt}
    <p class="ms-1">
        {currentPoll.prompt}
    </p>
{/if}

<style>
    .response-item:focus {
        border-color: black;
    }
</style>
