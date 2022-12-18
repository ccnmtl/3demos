<script>
    import * as d3 from 'd3';
    import BarChart from '../d3/BarChart';
    import Histogram from '../d3/Histogram';

    export let pollResponses;
    export let currentPollType;
    let el;
    let chart;

    const makeGraph = function(data, pollType) {
        if (pollType === 0) {
            // Numerical poll
            return Histogram(data, {
                label: 'Response',
                color: 'steelblue'
            });
        } else if (pollType === 1) {
            // Multiple choice
            return BarChart(data, {
                x: d => d,
                y: () => 1,
                xDomain: d3.groupSort(
                    data, () => -1, d => d
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

{pollResponses.length} responses

<div bind:this={el}></div>
