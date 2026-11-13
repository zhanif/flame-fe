<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import Card from '$lib/components/Card.svelte';
  import ConfirmModal from '$lib/components/ConfirmModal.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import Input from '$lib/components/Input.svelte';
  import Modal from '$lib/components/Modal.svelte';
  import RowMenu, { type RowMenuItem } from '$lib/components/RowMenu.svelte';
  import SectionTitle from '$lib/components/SectionTitle.svelte';
  import { api, type ModuleEntry } from '$lib/api/endpoints';
  import { router } from '$lib/stores/router.svelte';
  import { toast } from '$lib/stores/toast.svelte';
  import { urlParam } from '$lib/url-param';
  import { MODULE_PAGES } from '$lib/nav';
  import { MODULE_VIEWS } from '$lib/modules/views';
  import { caps, toneFor, toneText } from '$lib/ui';
  import { ArrowUpRight, Blocks, Package, Power, PowerOff, ScrollText, Search, Terminal, Trash2 } from '@lucide/svelte';

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

  const installed = $derived(modules.filter(m => m.installed));
  const available = $derived(modules.filter(m => !m.installed));

  const matches = (m: ModuleEntry) => {
    const q = query.trim().toLowerCase();
    return (
      !q ||
      m.name.toLowerCase().includes(q) ||
      m.description.toLowerCase().includes(q) ||
      m.commands.some(c => c.name.toLowerCase().includes(q))
    );
  };

  const shownInstalled = $derived(installed.filter(matches).sort((a, b) => a.name.localeCompare(b.name)));
  const shownAvailable = $derived(available.filter(matches).sort((a, b) => a.name.localeCompare(b.name)));
  const noMatch = $derived(query.trim() !== '' && shownInstalled.length === 0 && (!isAdmin || shownAvailable.length === 0));

  // Everyone with access can open a module; changing its state, the Slash page, the audit log and uninstalling are for admins.
  const menuOf = (m: ModuleEntry): RowMenuItem[] => [
    ...(MODULE_VIEWS[m.id] ? [{ label: 'Open', icon: ArrowUpRight, onclick: () => router.module(guildId, m.id) }] : []),
    ...(isAdmin
      ? [
          m.enabled
            ? { label: 'Turn off', icon: PowerOff, onclick: () => (disableTarget = m) }
            : { label: 'Turn on', icon: Power, onclick: () => setEnabled(m) },
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
      toast(
        'success',
        m.enabled ? `${m.name} turned off` : `${m.name} turned on`,
        m.enabled ? 'It keeps its data and settings, but nothing of it runs.' : 'It runs again.',
      );
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
    <Input
      bind:value={queryText}
      icon={Search}
      type="search"
      placeholder="Search modules…"
      oninput={onSearch}
      disabled={loading}
      class="w-full sm:w-64"
    />
  </div>

  {#if loading}
    <!-- One group while the catalog loads: the installed grid, its cards shaped like the real ones. -->
    <div aria-hidden="true">
      <div class="mb-3 h-3 w-20 rounded bg-zinc-800/40 animate-pulse"></div>
      <div class="grid gap-5" style="grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))">
        {#each Array(4) as _}
          <Card class="flex flex-col">
            <div class="flex items-center gap-2.5">
              <div class="h-[18px] w-[18px] shrink-0 rounded bg-zinc-700/40 animate-pulse"></div>
              <div class="h-3.5 w-24 rounded bg-zinc-700/40 animate-pulse"></div>
              <div class="min-w-0 flex-1"></div>
              <div class="h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-700/40 animate-pulse"></div>
              <div class="h-7 w-7 shrink-0 rounded-lg bg-zinc-700/30 animate-pulse"></div>
            </div>
            <div class="mt-2 space-y-2">
              <div class="h-3 w-full rounded bg-zinc-700/30 animate-pulse"></div>
              <div class="h-3 w-2/3 rounded bg-zinc-700/30 animate-pulse"></div>
            </div>
          </Card>
        {/each}
      </div>
    </div>
  {:else if modules.length === 0}
    <EmptyState kind="modules" title="No modules available yet" description="Modules added to Flame will show up here, ready to install." />
  {:else if !isAdmin && installed.length === 0}
    <EmptyState kind="modules" title="No modules installed yet" description="An admin of this server can install the modules it needs." />
  {:else if noMatch}
    <EmptyState kind="search" title="No modules match “{query}”" description="Try another name or command." />
  {:else}
    <div class="space-y-8">
      {#if shownInstalled.length > 0}
        <div>
          <div class="mb-3 flex items-baseline justify-between gap-3">
            <p class="{caps} text-zinc-500">Installed</p>
            <p class="text-xs text-zinc-500">{installed.length} of {modules.length}</p>
          </div>
          <div class="grid gap-5" style="grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))">
            {#each shownInstalled as m (m.id)}
              {@const Icon = MODULE_PAGES[m.id]?.icon ?? Blocks}
              {@const openable = !!MODULE_VIEWS[m.id]}
              <!-- The whole card is the link (a stretched anchor), so a click anywhere opens the module; only the menu sits above it. -->
              <Card class="relative flex flex-col {openable ? 'transition-colors duration-150 hover:border-orange-500/30' : ''}">
                {#if openable}
                  <a
                    class="absolute inset-0 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-500/50"
                    href="#/guild/{guildId}/m/{m.id}"
                    aria-label="Open {m.name}"
                    title={m.description}
                  ></a>
                {/if}
                <div class="flex items-center gap-2.5">
                  <Icon
                    class="h-[18px] w-[18px] shrink-0 transition-opacity duration-200 {toneText[toneOf(m.id)]} {m.enabled
                      ? ''
                      : 'opacity-50'}"
                  />
                  <span
                    class="min-w-0 flex-1 truncate font-display text-sm font-bold transition-colors duration-200 {m.enabled
                      ? 'text-zinc-100'
                      : 'text-zinc-400'}">{m.name}</span
                  >
                  <div class="relative z-10 flex items-center gap-2.5">
                    <span
                      class="h-1.5 w-1.5 shrink-0 rounded-full transition-colors duration-200 {m.enabled
                        ? 'bg-emerald-400'
                        : 'bg-zinc-600'}"
                      role="img"
                      aria-label={m.enabled ? 'On' : 'Off'}
                      title={m.enabled ? 'On' : 'Off'}
                    ></span>
                    <RowMenu label="Actions for {m.name}" items={menuOf(m)} />
                  </div>
                </div>

                <p
                  class="mt-2 line-clamp-2 flex-1 text-xs leading-relaxed transition-colors duration-200 {m.enabled
                    ? 'text-zinc-400'
                    : 'text-zinc-500'}"
                  title={m.description}
                >
                  {m.description}
                </p>
              </Card>
            {/each}
          </div>
        </div>
      {/if}

      {#if isAdmin && shownAvailable.length > 0}
        <div>
          <div class="mb-3 flex items-baseline justify-between gap-3">
            <p class="{caps} text-zinc-500">Available</p>
            <p class="text-xs text-zinc-500">{available.length} to install</p>
          </div>
          <div class="grid gap-5" style="grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))">
            {#each shownAvailable as m (m.id)}
              {@const Icon = MODULE_PAGES[m.id]?.icon ?? Blocks}
              <Card class="flex flex-col">
                <div class="flex items-center gap-2.5">
                  <Icon class="h-[18px] w-[18px] shrink-0 {toneText[toneOf(m.id)]}" />
                  <h4 class="min-w-0 flex-1 truncate font-display text-sm font-bold text-zinc-100">{m.name}</h4>
                  <Button variant="soft" size="sm" onclick={() => install(m)} disabled={!isAdmin || busyId === m.id}>
                    {busyId === m.id ? 'Installing…' : 'Install'}
                  </Button>
                </div>

                <p class="mt-2 line-clamp-2 flex-1 text-xs leading-relaxed text-zinc-400" title={m.description}>{m.description}</p>
              </Card>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}
</section>

<Modal show={!!uninstallTarget} onClose={() => (uninstallTarget = null)}>
  {#if uninstallTarget}
    <h3 class="flex items-center gap-2 font-display text-base font-bold text-zinc-100">
      <Trash2 class="w-4 h-4 shrink-0 text-red-400" />Uninstall {uninstallTarget.name}?
    </h3>
    <p class="text-xs text-zinc-400 mt-3 leading-relaxed">
      Everything this module stored for this server (its settings and records) is deleted. The audit log keeps what was recorded about it.
      Its slash commands stay registered on Discord until you prune them from the Slash page.
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
  onConfirm={async () => {
    if (disableTarget) await setEnabled(disableTarget);
  }}
  onClose={() => (disableTarget = null)}
>
  Its commands stop answering, its events are ignored and its background work waits. Its data and settings are kept, and turning it on again
  brings everything back.
</ConfirmModal>
