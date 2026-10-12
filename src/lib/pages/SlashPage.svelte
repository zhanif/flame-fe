<script lang="ts">
  import Card from '$lib/components/Card.svelte';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import TableSkeleton from '$lib/components/TableSkeleton.svelte';
  import { api, type SlashCommand } from '$lib/api/endpoints';
  import { toast } from '$lib/stores/toast.svelte';
  import { Eraser, RefreshCw, Terminal, Upload } from '@lucide/svelte';
  import { onMount } from 'svelte';

  let { guildId }: { guildId: string } = $props();

  let commands: SlashCommand[] = $state([]);
  let loading = $state(true);
  let busy = $state<'push' | 'prune' | null>(null);

  const missing = $derived(commands.filter(c => c.state === 'missing').length);
  const stale = $derived(commands.filter(c => c.state === 'stale').length);

  const BADGE = {
    live: 'text-emerald-400 bg-emerald-500/10',
    missing: 'text-amber-400 bg-amber-500/10',
    stale: 'text-red-400 bg-red-500/10',
  } as const;
  const LABEL = { live: 'Live', missing: 'Not registered', stale: 'Stale' } as const;

  async function load() {
    loading = true;
    try {
      commands = (await api.slash(guildId)).commands;
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      loading = false;
    }
  }
  onMount(load);

  async function push() {
    busy = 'push';
    try {
      const { registered } = await api.slashPush(guildId);
      toast('success', `Registered ${registered.length} command(s)`);
      await load();
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      busy = null;
    }
  }

  async function prune() {
    busy = 'prune';
    try {
      const { removed } = await api.slashPrune(guildId);
      toast('success', removed.length ? `Removed ${removed.join(', ')}` : 'Nothing to remove');
      await load();
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      busy = null;
    }
  }
</script>

<PageHeader title="Slash" description="Slash commands of the installed modules on Discord — nothing changes until you push or prune" icon={Terminal}>
  {#snippet actions()}
    <button onclick={load} disabled={loading || !!busy} class="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/40 hover:bg-slate-700/50 text-sm font-semibold text-slate-300 ring-1 ring-slate-700/40 cursor-pointer disabled:opacity-40">
      <RefreshCw class="w-3.5 h-3.5 {loading ? 'animate-spin' : ''}" /> Refresh
    </button>
    <button onclick={prune} disabled={loading || !!busy || stale === 0} class="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/40 hover:bg-slate-700/50 text-sm font-semibold text-slate-300 ring-1 ring-slate-700/40 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
      <Eraser class="w-3.5 h-3.5" /> {busy === 'prune' ? 'Pruning…' : `Prune${stale ? ` (${stale})` : ''}`}
    </button>
    <button onclick={push} disabled={loading || !!busy || missing === 0} class="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-sm font-semibold text-orange-400 ring-1 ring-orange-500/20 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
      <Upload class="w-3.5 h-3.5" /> {busy === 'push' ? 'Pushing…' : `Push${missing ? ` (${missing})` : ''}`}
    </button>
  {/snippet}
</PageHeader>

<Card>
  {#if loading}
    <TableSkeleton columns={['flex-1', 'w-40', 'w-36']} rows={3} />
  {:else if commands.length === 0}
    <p class="text-sm text-slate-500 text-center py-8">No commands yet — install a module first.</p>
  {:else}
    <table class="w-full text-sm">
      <thead>
        <tr class="text-[10px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-800/40">
          <th class="text-left py-3 px-3 font-medium">Command</th>
          <th class="text-left py-3 px-3 font-medium w-40">Module</th>
          <th class="text-left py-3 px-3 font-medium w-36">State</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-800/30">
        {#each commands as c (c.name)}
          <tr>
            <td class="py-3 px-3 font-mono text-[12px] text-slate-200"><span class="text-slate-600">/</span>{c.name}</td>
            <td class="py-3 px-3 text-[12px] text-slate-400">{c.module_id ?? '—'}</td>
            <td class="py-3 px-3">
              <span class="inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold {BADGE[c.state]}">{LABEL[c.state]}</span>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</Card>
