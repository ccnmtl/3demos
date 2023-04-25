<script>
    import * as d3 from 'd3';
    import BarChart from '../d3/BarChart';
    import Histogram from '../d3/Histogram';
    import { makeObject } from '../sceneUtils';

    export let pollResponses;
    export let currentPollType;
    export let objectResponses;
    export let render;
    export let objects;
    let el;
    let chart;
    let activeResponse;
    let hidden = true;

    /**
     * Process an array of responses into something that d3 can
     * display.
     *
     * Takes an object and returns an array.
     */
    const processResponses = function(data) {
        let processedData = [];
        const responsesArray = Object.entries(data);

        responsesArray.forEach((response) => {
            const choice = response[1];
            const frequency = responsesArray.filter(
                r => r[1] === choice).length;
            processedData.push([choice, frequency]);
        });

        return processedData;
    };

    const makeGraph = function(data, pollType) {
        data = processResponses(data);

        if (pollType === 'numeric') {
            return Histogram(data, {
                x: d => d[0],
                y: d => d[1],
                label: 'Response',
                color: 'steelblue'
            });
        } else if (pollType === 'multiple choice') {
            return BarChart(data, {
                x: d => d[0],
                y: d => d[1],
                xDomain: d3.groupSort(
                    data, () => -1, d => d[0]
                ),
                // sort by descending frequency
                yLabel: 'Responses',
                color: 'steelblue'
            });
        }

        return null;
    };

    const loadResponse = (item) => {
        objects = [];
        objects = makeObject(
            null,
            item.kind,
            item.params,
            objects
        );
    };

    /**
     * refreshResult()
     *
     * Given an array of responses and the poll type,
     * render a new d3 chart element and put it on the page.
     */
    // TODO:
    // A more declarative approach would be better, like putting
    // the SVG markup directly in the svelte template here. I just
    // couldn't get that working with svelte.
    const refreshResult = function(responses, pollType) {
        chart = makeGraph(responses, pollType);
        if (chart) {
            hidden = false;
            const oldChart = el.querySelector('svg');
            if (oldChart) {
                el.replaceChild(chart, oldChart);
            } else {
                el.appendChild(chart);
            }
        } else {
            hidden = true;
        }
    };

    $: refreshResult(pollResponses, currentPollType);

    const clearPoints = function () {
        objectResponses.clear();
        render();
    }
    </script>

<div class="row justify-content-between m-2 align-items-center">
    <strong class="col-auto">
        {Object.keys(pollResponses).length} {#if Object.keys(pollResponses).length == 1}response{:else}responses{/if}
    </strong>
    {#if objectResponses && objectResponses.children.length > 0}
        <button on:click={clearPoints} class="btn btn-danger col-auto" title="Clear points">
            <i class="fa fa-trash" />
        </button>
    {/if}
</div>
{#if currentPollType == 'select object'}
    <ul class="list-group">
        {#each Object.entries(pollResponses) as [user, response] (response)}
            <li class={'list-group-item' + (user == activeResponse ? ' active' : '')}>
                <button
                    class={'btn response-item p-0' + (user == activeResponse ? ' text-white' : '')}
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
<div bind:this={el} {hidden}></div>

<style>
    .response-item:focus {
        border-color: black;
    }
</style>
