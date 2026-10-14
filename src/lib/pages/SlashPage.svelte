<script lang="ts">
  import Badge from '$lib/components/Badge.svelte';
  import BoltSwitch from '$lib/components/BoltSwitch.svelte';
  import Button from '$lib/components/Button.svelte';
  import Card from '$lib/components/Card.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import TableSkeleton from '$lib/components/TableSkeleton.svelte';
  import { api, type SlashCommand } from '$lib/api/endpoints';
  import { toast } from '$lib/stores/toast.svelte';
  import { pageTone } from '$lib/nav';
  import { td, th, toneText } from '$lib/ui';
  import { CornerDownRight, RefreshCw } from '@lucide/svelte';
  import { onMount } from 'svelte';

  let { guildId }: { guildId: string } = $props();

  const tone = pageTone();

  let commands: SlashCommand[] = $state([]);
  let loading = $state(true);
  let loaded = $state(false);
  let pending = $state<string | null>(null);
  let page = $state(1);
  let limit = $state(10);

  const visible = $derived(commands.slice((page - 1) * limit, page * limit));

  const label = (c: SlashCommand) => (c.kind === 'slash' ? `/${c.name}` : `"${c.name}"`);
  const TONE = { live: 'success', missing: 'warning', stale: 'danger' } as const;
  const LABEL = { live: 'Live', missing: 'Not registered', stale: 'Stale' } as const;

  async function load() {
    loading = true;
    try {
      commands = (await api.slash(guildId)).commands;
      page = Math.min(page, Math.max(Math.ceil(commands.length / limit), 1));
      loaded = true;
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      loading = false;
    }
  }
  onMount(load);

  // Refresh brings the table in line with Discord: commands that are on stay on, nothing
  // new is registered, and registered commands no installed module owns are removed.
  async function refresh() {
    loading = true;
    try {
      const { removed } = await api.slashPrune(guildId);
      if (removed.length) toast('success', `Removed ${removed.length} unlisted ${removed.length === 1 ? 'command' : 'commands'}`, removed.join(', '));
    } catch (e: any) {
      toast('error', e.message);
    }
    await load();
  }

  // One command at a time, on an explicit click. The row is updated in place so the
  // table does not flash back to its skeleton.
  async function toggle(c: SlashCommand) {
    if (pending) return;
    pending = c.name;
    try {
      if (c.state === 'missing') {
        await api.slashRegister(guildId, c.name);
        commands = commands.map(x => (x.name === c.name ? { ...x, state: 'live' } : x));
        toast('success', `${label(c)} registered`, 'It is now live on Discord.');
      } else {
        await api.slashUnregister(guildId, c.name);
        commands = c.module_id
          ? commands.map(x => (x.name === c.name ? { ...x, state: 'missing' } : x))
          : commands.filter(x => x.name !== c.name);
        page = Math.min(page, Math.max(Math.ceil(commands.length / limit), 1));
        toast('success', `${label(c)} removed`, c.module_id ? 'Register it again any time.' : 'It is gone from Discord.');
      }
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      pending = null;
    }
  }
</script>

<PageHeader page="slash" description="Slash commands of the installed modules on Discord" />

<div class="flex justify-end mb-5">
  <Button onclick={refresh} disabled={loading || !!pending} title="Reload from Discord and remove commands that no installed module owns">
    <RefreshCw class="w-3.5 h-3.5 {loading ? 'animate-spin' : ''}" /> Refresh
  </Button>
</div>

{#if loaded && commands.length === 0}
  <EmptyState kind="commands" title="No commands yet" description="Install a module from the Dashboard to get slash commands." />
{:else}
<Card flush>
  {#if !loaded}
    <TableSkeleton columns={['w-16', 'flex-1', 'w-40', 'w-36', '>w-28']} rows={3} />
  {:else}
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-zinc-800/40 bg-zinc-800/20">
          <th class="{th} w-16">#</th>
          <th class={th}>Command</th>
          <th class="{th} w-40">Module</th>
          <th class="{th} w-36">State</th>
          <th class="{th} w-28 text-right">Live</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-zinc-800/30">
        {#each visible as c, i (c.name)}
          <tr class="hover:bg-zinc-800/30 transition-colors">
            <td class="{td} text-zinc-600">{(page - 1) * limit + i + 1}</td>
            <td class="{td} font-mono text-zinc-100">
              {#if c.kind === 'slash'}<span class={toneText[tone()]}>/</span>{c.name}{:else}<span class="flex items-center gap-2"><CornerDownRight class="w-3.5 h-3.5 {toneText[tone()]}" />{c.name}<Badge tone="neutral">Message menu</Badge></span>{/if}
            </td>
            <td class="{td} text-zinc-400">{c.module_id ?? '-'}</td>
            <td class={td}><Badge tone={TONE[c.state]}>{LABEL[c.state]}</Badge></td>
            <td class="{td} text-right">
              <div class="flex justify-end">
                <BoltSwitch
                  on={c.state !== 'missing'}
                  danger={c.state === 'stale'}
                  busy={pending === c.name}
                  disabled={!!pending && pending !== c.name}
                  label={c.state === 'missing' ? `Register ${label(c)}` : `Remove ${label(c)} from Discord`}
                  onclick={() => toggle(c)}
                />
              </div>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
    <Pagination {page} {limit} total={commands.length} onPage={p => (page = p)} onLimit={l => ((limit = l), (page = 1))} />
  {/if}
</Card>
{/if}
