<script lang="ts">
  import Badge from '$lib/components/Badge.svelte';
  import BoltSwitch from '$lib/components/BoltSwitch.svelte';
  import Button from '$lib/components/Button.svelte';
  import Card from '$lib/components/Card.svelte';
  import ConfirmModal from '$lib/components/ConfirmModal.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import Select from '$lib/components/Select.svelte';
  import ControlSkeleton from '$lib/components/ControlSkeleton.svelte';
  import TableSkeleton from '$lib/components/TableSkeleton.svelte';
  import { api, type SlashCommand } from '$lib/api/endpoints';
  import { toast } from '$lib/stores/toast.svelte';
  import { pageTone } from '$lib/nav';
  import { moduleCatalog } from '$lib/stores/modules.svelte';
  import { td, th, toneText } from '$lib/ui';
  import { CornerDownRight, RefreshCw, Trash2 } from '@lucide/svelte';
  import { onMount } from 'svelte';

  let { guildId }: { guildId: string } = $props();

  const tone = pageTone();

  let commands: SlashCommand[] = $state([]);
  let loading = $state(true);
  let loaded = $state(false);
  let pending = $state<string | null>(null);
  // A removal that cannot be undone from here asks first: a command no module owns, or the leftovers a Refresh would prune.
  let removeAsk = $state<SlashCommand | null>(null);
  let pruneAsk = $state<SlashCommand[]>([]);
  let pruning = $state(false);
  let page = $state(1);
  let limit = $state(10);
  let moduleFilter = $state('');

  // A command no installed module owns has no module to filter by.
  const NO_MODULE = '__none__';
  // `core` is Flame's own built-in commands (/settings): not a module, so it is not in the catalog.
  const moduleName = (id: string) => (id === 'core' ? 'Core' : (moduleCatalog.entries.find(m => m.id === id)?.name ?? id));

  // The modules that have a command here, plus "no module" when some command has none.
  const moduleOptions = $derived([
    ...[...new Set(commands.flatMap(c => (c.module_id ? [c.module_id] : [])))].sort().map(id => ({ value: id, label: moduleName(id) })),
    ...(commands.some(c => c.module_id === null) ? [{ value: NO_MODULE, label: 'No module (leftovers)' }] : []),
  ]);
  const filtered = $derived(commands.filter(c => !moduleFilter || (moduleFilter === NO_MODULE ? c.module_id === null : c.module_id === moduleFilter)));
  const visible = $derived(filtered.slice((page - 1) * limit, page * limit));

  const label = (c: SlashCommand) => (c.kind === 'slash' ? `/${c.name}` : `"${c.name}"`);
  const TONE = { live: 'success', missing: 'warning', stale: 'danger' } as const;
  const LABEL = { live: 'Live', missing: 'Not registered', stale: 'Stale' } as const;

  async function load() {
    loading = true;
    try {
      commands = (await api.slash(guildId)).commands;
      page = Math.min(page, Math.max(Math.ceil(filtered.length / limit), 1));
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
    await load();
    pruneAsk = commands.filter(c => c.module_id === null);
  }

  async function prune() {
    pruning = true;
    try {
      const { removed } = await api.slashPrune(guildId);
      if (removed.length) toast('success', `Removed ${removed.length} unlisted ${removed.length === 1 ? 'command' : 'commands'}`, removed.join(', '));
      pruneAsk = [];
      await load();
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      pruning = false;
    }
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
        page = Math.min(page, Math.max(Math.ceil(filtered.length / limit), 1));
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

<div class="flex flex-wrap items-center justify-between gap-3 mb-5">
  {#if loaded}
    <Select
      bind:value={moduleFilter}
      onchange={() => (page = 1)}
      options={moduleOptions}
      placeholder="All modules"
      label="Module"
      class="w-56"
    />
  {:else}
    <ControlSkeleton class="w-56" />
  {/if}
  <Button onclick={refresh} disabled={loading || !!pending} title="Reload from Discord and remove commands that no installed module owns">
    <RefreshCw class="w-3.5 h-3.5 {loading ? 'animate-spin' : ''}" /> Refresh
  </Button>
</div>

{#if loaded && commands.length === 0}
  <EmptyState kind="commands" title="No commands yet" description="Install a module from the Dashboard to get slash commands." />
{:else}
<Card flush>
  {#if !loaded}
    <TableSkeleton
            columns={['w-16', 'flex-1', 'w-40', 'w-36', '>w-28']}
            headings={['#', 'Command', 'Module', 'State', 'Live']}
            kinds={['bar', 'bar', 'bar', 'pill', 'bar']}
            rows={3}
            rowHeight="h-11"
    />
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
            <td class="{td} text-zinc-400">{c.module_id ? moduleName(c.module_id) : '-'}</td>
            <td class={td}><Badge tone={TONE[c.state]}>{LABEL[c.state]}</Badge></td>
            <td class="{td} text-right">
              <div class="flex justify-end">
                <BoltSwitch
                  on={c.state !== 'missing'}
                  danger={c.state === 'stale'}
                  busy={pending === c.name}
                  disabled={!!pending && pending !== c.name}
                  label={c.state === 'missing' ? `Register ${label(c)}` : `Remove ${label(c)} from Discord`}
                  onclick={() => (c.state !== 'missing' && c.module_id === null ? (removeAsk = c) : toggle(c))}
                />
              </div>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
    {#if filtered.length === 0}
      <p class="px-5 py-8 text-center text-xs text-zinc-500">No command belongs to this module.</p>
    {/if}
    <Pagination {page} {limit} total={filtered.length} onPage={p => (page = p)} onLimit={l => ((limit = l), (page = 1))} />
  {/if}
</Card>
{/if}

<ConfirmModal
  show={!!removeAsk}
  title="Remove {removeAsk ? label(removeAsk) : ''} from Discord?"
  confirmLabel="Remove"
  busyLabel="Removing…"
  busy={!!pending}
  icon={Trash2}
  onConfirm={async () => { if (removeAsk) await toggle(removeAsk); removeAsk = null; }}
  onClose={() => (removeAsk = null)}
>
  No installed module owns this command, so it cannot be registered again from here.
</ConfirmModal>

<ConfirmModal
  show={pruneAsk.length > 0}
  title="Remove {pruneAsk.length} unlisted {pruneAsk.length === 1 ? 'command' : 'commands'}?"
  confirmLabel="Remove"
  busyLabel="Removing…"
  busy={pruning}
  icon={Trash2}
  onConfirm={prune}
  onClose={() => (pruneAsk = [])}
>
  <p>These are registered on Discord but no installed module owns them, so they are removed for good:</p>
  <p class="mt-2 flex flex-wrap gap-1.5">
    {#each pruneAsk as c (c.name)}<span class="rounded-md bg-zinc-800 px-1.5 py-0.5 font-mono text-zinc-200">{label(c)}</span>{/each}
  </p>
</ConfirmModal>
