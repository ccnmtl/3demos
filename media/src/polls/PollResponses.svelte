<script>
    import * as d3 from 'd3';
    import BarChart from '../d3/BarChart';
    import Histogram from '../d3/Histogram';

    export let pollResponses;
    export let currentPollType;
    let el;
    let chart;

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

    /**
     * refreshChart()
     *
     * Given an array of responses and the poll type,
     * render a new d3 chart element and put it on the page.
     */
    // TODO:
    // A more declarative approach would be better, like putting
    // the SVG markup directly in the svelte template here. I just
    // couldn't get that working with svelte.
    const refreshChart = function(responses, pollType) {
        chart = makeGraph(responses, pollType);
        if (chart) {
            const oldChart = el.querySelector('svg');
            if (oldChart) {
                el.replaceChild(chart, oldChart);
            } else {
                el.appendChild(chart);
            }
        }
    };

    $: refreshChart(pollResponses, currentPollType);
</script>

{Object.entries(pollResponses).length} responses

<div bind:this={el}></div>
