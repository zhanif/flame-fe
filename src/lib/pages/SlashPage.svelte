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
  import { api, type SlashCommand, type SlashOption } from '$lib/api/endpoints';
  import { router } from '$lib/stores/router.svelte';
  import { toast } from '$lib/stores/toast.svelte';
  import { urlNumber, urlParam } from '$lib/url-param';
  import { pageTone } from '$lib/nav';
  import { moduleCatalog } from '$lib/stores/modules.svelte';
  import { td, th, toneText } from '$lib/ui';
  import { ChevronDown, ChevronRight, MessageSquare, RefreshCw, Trash2 } from '@lucide/svelte';
  import { onMount } from 'svelte';
  import { slide } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';

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
  let limit = $state(10);
  // Which module's commands to show, and the page, live in the address, so a link from the Modules cards opens it.
  const moduleParam = urlParam('module');
  const moduleFilter = $derived(moduleParam.value);
  const pageParam = urlNumber('page');
  // The command whose details are open lives in the address too (`?open=<name>`).
  const openParam = urlParam('open');
  const openName = $derived(openParam.value);
  const toggleOpen = (name: string) => (openParam.value = openName === name ? '' : name);
  interface Usage {
    group: string | null;
    /** The subcommand, or null when the command takes its options directly. */
    name: string | null;
    description: string;
    params: SlashOption[];
  }
  // Every way of calling a command: each subcommand (under its group, if any), or the command itself when it takes options directly.
  function usagesOf(c: SlashCommand): Usage[] {
    const walk = (options: SlashOption[], group: string | null): Usage[] =>
      options.flatMap(option =>
        option.kind === 'option' ? [] : option.kind === 'subcommand' ? [{ group, name: option.name, description: option.description, params: option.options }] : walk(option.options, option.name),
      );
    return c.options.some(option => option.kind !== 'option') ? walk(c.options, null) : c.options.length ? [{ group: null, name: null, description: '', params: c.options }] : [];
  }
  const page = $derived(pageParam.value);

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
      pageParam.value = Math.min(page, Math.max(Math.ceil(filtered.length / limit), 1));
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
        pageParam.value = Math.min(page, Math.max(Math.ceil(filtered.length / limit), 1));
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
      bind:value={moduleParam.value}
      onchange={() => (pageParam.value = 1)}
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

<!-- What a command does and how to type it: one block per way of calling it (a subcommand, or the command itself), with its parameters. -->
{#snippet details(c: SlashCommand)}
  <div class="border-t border-zinc-800/40 bg-zinc-800/10 px-5 py-4" transition:slide={{ duration: 220, easing: cubicOut }}>
    {#if c.description}<p class="text-xs text-zinc-300">{c.description}</p>{/if}
    {#if c.kind === 'message'}
      <p class="{c.description ? 'mt-1.5' : ''} text-xs text-zinc-500">Right-click a message, then Apps, then {c.name}. It takes no options: it works on the message you pick.</p>
    {:else}
      {@const usages = usagesOf(c)}
      <div class="{c.description ? 'mt-3' : ''} grid gap-3">
        {#each usages as usage, i (i)}
          <div class="rounded-xl bg-zinc-800/40 p-3.5 ring-1 ring-zinc-800/60">
            <div class="flex flex-wrap items-center gap-x-2 gap-y-1.5">
              {#if usage.group}
                <Badge tone="accent">Group</Badge>
                <span class="font-mono text-xs text-zinc-100">{usage.group}</span>
                <ChevronRight class="h-3 w-3 text-zinc-600" />
              {/if}
              {#if usage.name}
                <Badge tone="info">Subcommand</Badge>
                <span class="font-mono text-xs font-semibold text-zinc-100">{usage.name}</span>
              {:else}
                <Badge tone="neutral">Options</Badge>
              {/if}
            </div>
            {#if usage.description}<p class="mt-1.5 text-xs text-zinc-400">{usage.description}</p>{/if}

            {#if usage.params.length}
              <div class="mt-3 grid grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 border-t border-zinc-800/60 pt-3 text-xs">
                {#each usage.params as param (param.name)}
                  <span class="font-mono font-medium {toneText[tone()]}">{param.name}</span>
                  <span class="flex items-center gap-1.5">
                    <span class="rounded-md bg-zinc-800 px-1.5 py-0.5 text-[11px] text-zinc-300">{param.type}</span>
                    <span class="text-[11px] {param.required ? 'text-orange-400' : 'text-zinc-500'}">{param.required ? 'required' : 'optional'}</span>
                  </span>
                  <span class="text-zinc-400">
                    {param.description}
                    {#each param.choices as choice (choice)}<span class="ml-1 rounded-md bg-zinc-800/70 px-1.5 py-0.5 text-[11px] text-zinc-400">{choice}</span>{/each}
                  </span>
                {/each}
              </div>
            {:else if usage.name}
              <p class="mt-2 text-xs text-zinc-600">No options.</p>
            {/if}
          </div>
        {/each}
      </div>
      {#if !usages.length}<p class="{c.description ? 'mt-1.5' : ''} text-xs text-zinc-500">It takes no subcommands or options.</p>{/if}
    {/if}
  </div>
{/snippet}

{#if loaded && commands.length === 0}
  <EmptyState kind="commands" title="No commands yet" description="Install a module from the Dashboard to get slash commands." />
{:else}
<Card flush>
  {#if !loaded}
    <TableSkeleton
            columns={['w-16', 'flex-1', 'w-40', 'w-36', '>w-28', 'w-12']}
            headings={['#', 'Command', 'Module', 'State', 'Live', '']}
            kinds={['bar', 'bar', 'bar', 'pill', 'bar', 'bar']}
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
          <th class="{th} w-12" aria-label="Details"></th>
        </tr>
      </thead>
      <tbody class="divide-y divide-zinc-800/30">
        {#each visible as c, i (c.name)}
          {@const hasDetails = c.kind !== 'user' && c.state !== 'stale'}
          <tr
            class="transition-colors hover:bg-zinc-800/30 {hasDetails ? 'cursor-pointer' : ''}"
            onclick={e => hasDetails && !(e.target as HTMLElement).closest('button') && toggleOpen(c.name)}
          >
            <td class="{td} text-zinc-600">{(page - 1) * limit + i + 1}</td>
            <td class="{td} font-mono text-zinc-100">
              {#if c.kind === 'slash'}<span class={toneText[tone()]}>/</span>{c.name}{:else}<span class="flex items-center gap-2"><MessageSquare class="w-3.5 h-3.5 {toneText[tone()]}" aria-label="Message menu command" />{c.name}</span>{/if}
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
            <td class="{td} w-12 text-right">
              {#if hasDetails}
                <button
                  type="button"
                  onclick={() => toggleOpen(c.name)}
                  aria-expanded={openName === c.name}
                  aria-label="Details of /{c.name}"
                  class="cursor-pointer rounded-md p-1 text-zinc-500 outline-none transition hover:text-zinc-200 focus-visible:ring-2 focus-visible:ring-orange-500/50"
                >
                  <ChevronDown class="h-4 w-4 transition {openName === c.name ? 'rotate-180' : ''}" />
                </button>
              {/if}
            </td>
          </tr>
          {#if openName === c.name && hasDetails}
            <tr>
              <td colspan="6" class="p-0">{@render details(c)}</td>
            </tr>
          {/if}
        {/each}
      </tbody>
    </table>
    {#if filtered.length === 0}
      <p class="px-5 py-8 text-center text-xs text-zinc-500">No command belongs to this module.</p>
    {/if}
    <Pagination {page} {limit} total={filtered.length} onPage={p => (pageParam.value = p)} onLimit={l => ((limit = l), (pageParam.value = 1))} />
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
