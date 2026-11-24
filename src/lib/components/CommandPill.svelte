<script lang="ts">
  import { pageTone } from '$lib/nav';
  import { toneText } from '$lib/ui';

  // A slash command shown inline in a sentence, as a small monospace pill. Its "/" takes the page's
  // color, the way the slash of a command does everywhere else. Used in settings hints and help text.
  let { command }: { command: string } = $props();

  const pageColor = pageTone();
  const slash = $derived(command.startsWith('/') ? '/' : '');
  const name = $derived(slash ? command.slice(1) : command);
</script>

<span class="inline-block whitespace-nowrap rounded-md bg-zinc-800 px-0.5 py-0 font-mono text-[11px] text-zinc-200 ring-1 ring-zinc-700/60"
  >{#if slash}<span class={toneText[pageColor()]}>{slash}</span>{/if}{name}</span
>
