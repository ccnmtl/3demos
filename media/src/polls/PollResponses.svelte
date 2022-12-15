<script>
    import {onMount, afterUpdate} from 'svelte';
    import * as d3 from 'd3';
    import BarChart from './BarChart';

    export let pollResponses;
    let el;

    const makeGraph = function(data) {
        return BarChart(data, {
            x: d => d.response,
            y: d => d.frequency,
            xDomain: d3.groupSort(
                data, ([d]) => -d.frequency, d => d.response),
            // sort by descending frequency
            yLabel: 'Responses',
            width: 400,
            height: 300,
            color: 'steelblue'
        });
    };

    onMount(() => {
        const data = pollResponses.map((d) => {
            return {
                response: d,
                frequency: 1
            };
        });
        const chart = makeGraph(data);
        el.appendChild(chart);
    });

    // TODO:
    // A more declarative approach would be better, like putting
    // the SVG markup directly in the svelte template here. I just
    // couldn't get that working with svelte.
    afterUpdate(() => {
        const data = pollResponses.map((d) => {
            return {
                response: d,
                frequency: 1
            };
        });
        const chart = makeGraph(data);
        const oldChart = el.querySelector('svg');
        el.replaceChild(chart, oldChart);
    });
</script>
{pollResponses.length} responses

<div bind:this={el}></div>
