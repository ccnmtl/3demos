<script>
    import { kbdShortcuts } from '../stores';

    $: kbdShortcutItems = Object.entries($kbdShortcuts).sort();
</script>

<div>
    <table>
        <tr>
            <th>Key</th>
            <th>Use</th>
        </tr>
        {#each kbdShortcutItems as [k, v]}
            <tr>
                <td class="keyEntry"><kbd>{k}</kbd></td>
                <td class="keyUse">{v}</td>
            </tr>
        {/each}
    </table>
</div>

<style>
    div {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 100%;
        height: 100%;
    }
    .keyEntry {
        text-align: right;
    }
</style>
