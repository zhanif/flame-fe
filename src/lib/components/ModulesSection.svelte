<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import Card from '$lib/components/Card.svelte';
  import ConfirmModal from '$lib/components/ConfirmModal.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import Input from '$lib/components/Input.svelte';
  import Modal from '$lib/components/Modal.svelte';
  import RowMenu, { type RowMenuItem } from '$lib/components/RowMenu.svelte';
  import SectionTitle from '$lib/components/SectionTitle.svelte';
  import Toggle from '$lib/components/Toggle.svelte';
  import { api, type ModuleEntry } from '$lib/api/endpoints';
  import { router } from '$lib/stores/router.svelte';
  import { toast } from '$lib/stores/toast.svelte';
  import { urlParam } from '$lib/url-param';
  import { MODULE_PAGES } from '$lib/nav';
  import { toneFor, toneText } from '$lib/ui';
  import { ArrowUpRight, Blocks, ChevronDown, MessageSquare, Package, ScrollText, Search, Terminal, Trash2 } from '@lucide/svelte';
  import { slide } from 'svelte/transition';

  let {
    guildId,
    isAdmin,
    modules,
    loading,
    onchange,
  }: { guildId: string; isAdmin: boolean; modules: ModuleEntry[]; loading: boolean; onchange: () => Promise<void> } = $props();

  let busyId = $state<string | null>(null);
  let uninstallTarget = $state<ModuleEntry | null>(null);
  let disableTarget = $state<ModuleEntry | null>(null);
  // The commands of a module are behind a disclosure: only the ones a person opens are shown.
  let showCommands = $state<Record<string, boolean>>({});
  // The search lives in the address (`?q=`), like the rest of where a page is inside itself.
  const queryParam = urlParam('q');
  const query = $derived(queryParam.value);
  let queryText = $state(queryParam.value);
  $effect(() => {
    queryText = queryParam.value;
  });
  let typing: ReturnType<typeof setTimeout>;
  const onSearch = () => {
    clearTimeout(typing);
    typing = setTimeout(() => (queryParam.value = queryText.trim()), 250);
  };

  // The module's own color (its page color when it has one), the same everywhere it shows.
  const toneOf = (id: string) => MODULE_PAGES[id]?.tone ?? toneFor(id);

  // What is not installed yet comes first (that is what a visitor is here to find), each group by name.
  const filtered = $derived.by(() => {
    const q = query.trim().toLowerCase();
    const matching = q
      ? modules.filter(m => m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q) || m.commands.some(c => c.name.toLowerCase().includes(q)))
      : modules;
    return [...matching].sort((a, b) => Number(a.installed) - Number(b.installed) || a.name.localeCompare(b.name));
  });

  // Everyone with access can open a module; the Slash page, the audit log and uninstalling are for admins.
  const menuOf = (m: ModuleEntry): RowMenuItem[] => [
    { label: 'Open', icon: ArrowUpRight, onclick: () => router.module(guildId, m.id) },
    ...(isAdmin
      ? [
          { label: 'Slash commands', icon: Terminal, onclick: () => router.guild(guildId, 'slash', { module: m.id }) },
          { label: 'Audit logs', icon: ScrollText, onclick: () => router.guild(guildId, 'audit', { module: m.id }) },
          { label: 'Uninstall', icon: Trash2, danger: true, onclick: () => (uninstallTarget = m) },
        ]
      : []),
  ];

  async function install(m: ModuleEntry) {
    busyId = m.id;
    try {
      await api.installModule(guildId, m.id);
      toast('success', `${m.name} installed`, 'Push its commands from the Slash page to use them on Discord.');
      await onchange();
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      busyId = null;
    }
  }

  async function setEnabled(m: ModuleEntry) {
    busyId = m.id;
    disableTarget = null;
    try {
      await api.setModuleEnabled(guildId, m.id, !m.enabled);
      toast('success', m.enabled ? `${m.name} turned off` : `${m.name} turned on`, m.enabled ? 'It keeps its data and settings, but nothing of it runs.' : 'It runs again.');
      await onchange();
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      busyId = null;
    }
  }

  async function uninstall() {
    const m = uninstallTarget;
    if (!m) return;
    busyId = m.id;
    try {
      await api.uninstallModule(guildId, m.id);
      toast('success', `${m.name} uninstalled`, 'Its commands stay on Discord until you prune them.');
      uninstallTarget = null;
      await onchange();
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      busyId = null;
    }
  }
</script>

<section>
  <div class="flex flex-wrap items-center justify-between gap-3 mb-5">
    <SectionTitle icon={Package} tone="orange" title="Modules" />
    <Input bind:value={queryText} icon={Search} type="search" placeholder="Search modules…" oninput={onSearch} disabled={loading} class="w-full sm:w-64" />
  </div>

  {#if loading}
    <div class="grid gap-5" style="grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))" aria-hidden="true">
      {#each Array(4) as _}
        <Card class="flex flex-col">
          <div class="flex items-center gap-3">
            <div class="flex min-w-0 flex-1 items-center gap-2.5">
              <div class="h-[18px] w-[18px] shrink-0 rounded bg-zinc-700/40 animate-pulse"></div>
              <div class="h-4 w-1/3 rounded bg-zinc-700/40 animate-pulse"></div>
            </div>
            <div class="h-5 w-9 rounded-full bg-zinc-700/30 animate-pulse"></div>
            <div class="h-7 w-7 rounded-lg bg-zinc-700/30 animate-pulse"></div>
          </div>
          <div class="mt-3 space-y-2">
            <div class="h-3 w-full rounded bg-zinc-700/30 animate-pulse"></div>
            <div class="h-3 w-5/6 rounded bg-zinc-700/30 animate-pulse"></div>
            <div class="h-3 w-2/3 rounded bg-zinc-700/30 animate-pulse"></div>
          </div>
          <div class="mt-3 h-3 w-20 rounded bg-zinc-700/30 animate-pulse"></div>
        </Card>
      {/each}
    </div>
  {:else if modules.length === 0}
    <EmptyState kind="modules" title="No modules available yet" description="Modules added to Flame will show up here, ready to install." />
  {:else if filtered.length === 0}
    <EmptyState kind="search" title="No modules match “{query}”" description="Try another name or command." />
  {:else}
    <div class="grid gap-5" style="grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))">
      {#each filtered as m (m.id)}
        {@const Icon = MODULE_PAGES[m.id]?.icon ?? Blocks}
        {@const dimmed = m.installed && !m.enabled}
        <Card class="flex flex-col">
          <div class="flex items-center gap-3">
            <div class="flex min-w-0 flex-1 items-center gap-2.5 transition-opacity {dimmed ? 'opacity-50' : ''}">
              <Icon class="h-[18px] w-[18px] shrink-0 {toneText[toneOf(m.id)]}" />
              <h4 class="min-w-0 truncate font-display text-sm font-bold text-zinc-100">{m.name}</h4>
            </div>
            {#if m.installed}
              <Toggle on={m.enabled} disabled={!isAdmin || busyId === m.id} label="{m.enabled ? 'Turn off' : 'Turn on'} {m.name}" onclick={() => (m.enabled ? (disableTarget = m) : setEnabled(m))} />
              <RowMenu label="Actions for {m.name}" items={menuOf(m)} />
            {:else}
              <Button variant="soft" size="sm" onclick={() => install(m)} disabled={!isAdmin || busyId === m.id} title={isAdmin ? undefined : 'Admins only'}>
                {busyId === m.id ? 'Installing…' : 'Install'}
              </Button>
            {/if}
          </div>

          <p class="mt-3 flex-1 text-xs leading-relaxed text-zinc-400 transition-opacity {dimmed ? 'opacity-50' : ''}">{m.description}</p>

          {#if m.commands.length}
            <button
              type="button"
              class="mt-3 flex w-fit cursor-pointer items-center gap-1 text-xs text-zinc-500 outline-none transition hover:text-zinc-300 focus-visible:text-zinc-300"
              aria-expanded={!!showCommands[m.id]}
              onclick={() => (showCommands[m.id] = !showCommands[m.id])}
            >
              {m.commands.length} {m.commands.length === 1 ? 'command' : 'commands'}
              <ChevronDown class="h-3.5 w-3.5 transition-transform {showCommands[m.id] ? 'rotate-180' : ''}" />
            </button>
            {#if showCommands[m.id]}
              <div class="mt-2 flex flex-wrap gap-1" transition:slide={{ duration: 160 }}>
                {#each m.commands as command (command.name)}
                  <span class="inline-flex items-center gap-1 rounded-md bg-zinc-800/60 px-1.5 py-0.5 font-mono text-xs text-zinc-300">
                    <!-- A slash command is typed as /name; a message command lives in the right-click menu, so it gets an arrow instead. -->
                    {#if command.kind === 'slash'}<span class={toneText[toneOf(m.id)]}>/</span>{:else}<MessageSquare class="h-3 w-3 {toneText[toneOf(m.id)]}" aria-label="Message menu command" />{/if}{command.name}
                  </span>
                {/each}
              </div>
            {/if}
          {/if}
        </Card>
      {/each}
    </div>
  {/if}
</section>

<Modal show={!!uninstallTarget} onClose={() => (uninstallTarget = null)}>
  {#if uninstallTarget}
    <h3 class="flex items-center gap-2 font-display text-base font-bold text-zinc-100">
      <Trash2 class="w-4 h-4 shrink-0 text-red-400" />Uninstall {uninstallTarget.name}?
    </h3>
    <p class="text-xs text-zinc-400 mt-3 leading-relaxed">
      Everything this module stored for this server (its settings and records) is deleted. The audit log keeps what was recorded about it. Its slash commands stay registered on Discord until you prune them from the Slash page.
    </p>
    <div class="flex justify-end gap-2 mt-5">
      <Button variant="ghost" onclick={() => (uninstallTarget = null)}>Cancel</Button>
      <Button variant="danger" onclick={uninstall} disabled={busyId === uninstallTarget.id}>
        {busyId === uninstallTarget.id ? 'Uninstalling…' : 'Uninstall'}
      </Button>
    </div>
  {/if}
</Modal>

<ConfirmModal
  show={!!disableTarget}
  title="Turn off {disableTarget?.name}?"
  confirmLabel="Turn off"
  busyLabel="Turning off…"
  busy={!!disableTarget && busyId === disableTarget.id}
  onConfirm={async () => { if (disableTarget) await setEnabled(disableTarget); }}
  onClose={() => (disableTarget = null)}
>
  Its commands stop answering, its events are ignored and its background work waits. Its data and settings are kept, and turning it on again brings everything back.
</ConfirmModal>
