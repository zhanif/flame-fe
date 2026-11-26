<script lang="ts">
  import Card from '$lib/components/Card.svelte';
  import ControlSkeleton from '$lib/components/ControlSkeleton.svelte';
  import ItemConfigSkeleton from '$lib/modules/invasion/items/ItemConfigSkeleton.svelte';
  import { ITEM_CONFIG_SECTIONS, type ItemConfigSection } from '$lib/modules/invasion/items/item-config';
  import { pageTone } from '$lib/nav';
  import { toneText } from '$lib/ui';

  // The item configuration view: the Back row over the section sidebar and the open section's panel.
  let { section, isAdmin }: { section: ItemConfigSection; isAdmin: boolean } = $props();

  const tone = pageTone();
</script>

<div class="space-y-5" aria-hidden="true">
  <div class="flex items-center justify-between gap-3">
    <ControlSkeleton class="w-32" h="h-8" />
    <div class="h-3 w-72 max-w-[60%] rounded bg-zinc-800/30 animate-pulse"></div>
  </div>
  <div class="grid items-start gap-3 lg:grid-cols-[17rem_1fr]">
    <Card>
      <div class="space-y-1.5">
        {#each ITEM_CONFIG_SECTIONS as item (item.id)}
          <div
            class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium {item.id === section
              ? 'bg-zinc-800 text-zinc-100'
              : 'text-zinc-400'}"
          >
            <item.icon class="h-4 w-4 shrink-0 {item.id === section ? toneText[tone()] : ''}" />
            {item.label}
          </div>
        {/each}
      </div>
    </Card>
    <ItemConfigSkeleton {section} {isAdmin} />
  </div>
</div>
