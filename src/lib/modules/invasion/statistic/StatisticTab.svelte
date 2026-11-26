<script lang="ts">
  import Card from '$lib/components/Card.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import type { InvasionOverview } from '$lib/api/endpoints';
  import { caps, tile, type Tone } from '$lib/ui';
  import { Coins, Package, ScrollText, Users } from '@lucide/svelte';

  // The overview at a glance: rounds, items, players and transactions as four tinted cards.
  let { overview }: { overview: InvasionOverview | null } = $props();

  const stat = (label: string, value: number, tone: Tone, icon: any) => ({ label, value, tone, icon });

  const stats = $derived.by(() =>
    overview
      ? [
          stat('Rounds', overview.total_rounds, 'amber', ScrollText),
          stat('Items', overview.total_items, 'green', Package),
          stat('Players', overview.total_players, 'blue', Users),
          stat('Transactions', overview.total_transactions, 'violet', Coins),
        ]
      : [],
  );
</script>

{#if overview}
  <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
    {#each stats as s (s.label)}
      <Card class="relative overflow-hidden">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="{caps} text-zinc-500">{s.label}</p>
            <p class="font-display text-3xl font-extrabold text-zinc-100 leading-9 mt-1">{s.value}</p>
          </div>
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl {tile[s.tone]}">
            <s.icon class="h-5 w-5" />
          </div>
        </div>
      </Card>
    {/each}
  </div>
{:else}
  <EmptyState
    kind="modules"
    title="No invasion data"
    description="Install the Invasion module and turn it on to see your server's stats."
  />
{/if}
