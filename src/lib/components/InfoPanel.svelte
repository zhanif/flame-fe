<script lang="ts">
  import Card from '$lib/components/Card.svelte';
  import SectionTitle from '$lib/components/SectionTitle.svelte';
  import { toneText, type Tone } from '$lib/ui';
  import { Info } from '@lucide/svelte';
  import { cubicOut } from 'svelte/easing';
  import { slide } from 'svelte/transition';

  export interface InfoStep {
    /** What to do, in a sentence. */
    text: string;
    /** The command or text to type, shown in monospace under the sentence. */
    command?: string;
  }

  // How to use a module, for the things a dashboard cannot do for you (a command to run, a message to
  // right-click). It opens like the Add panel, from an Info button at the far right of the toolbar.
  let { show, title = 'How it works', tone = 'orange', steps }: { show: boolean; title?: string; tone?: Tone; steps: InfoStep[] } = $props();
</script>

{#if show}
  <div transition:slide={{ duration: 220, easing: cubicOut }}>
    <Card>
      <SectionTitle icon={Info} {title} class="mb-4" />
      <ol class="space-y-3">
        {#each steps as step, i (i)}
          <li class="flex gap-3">
            <span class="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-[11px] font-semibold {toneText[tone]}">{i + 1}</span>
            <div class="min-w-0 text-xs leading-relaxed text-zinc-300">
              <p>{step.text}</p>
              {#if step.command}
                <code class="mt-1.5 block w-fit max-w-full overflow-x-auto rounded-md bg-zinc-800/70 px-2 py-1 font-mono text-xs text-zinc-200">{step.command}</code>
              {/if}
            </div>
          </li>
        {/each}
      </ol>
    </Card>
  </div>
{/if}
