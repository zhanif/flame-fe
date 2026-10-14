<script lang="ts">
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import Card from '$lib/components/Card.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import Input from '$lib/components/Input.svelte';
  import Modal from '$lib/components/Modal.svelte';
  import SectionTitle from '$lib/components/SectionTitle.svelte';
  import { api, type ModuleEntry } from '$lib/api/endpoints';
  import { toast } from '$lib/stores/toast.svelte';
  import { MODULE_PAGES } from '$lib/nav';
  import { toneFor, toneText } from '$lib/ui';
  import { Blocks, Check, CornerDownRight, Download, Package, Search, Trash2 } from '@lucide/svelte';

  let {
    guildId,
    isAdmin,
    modules,
    loading,
    onchange,
  }: { guildId: string; isAdmin: boolean; modules: ModuleEntry[]; loading: boolean; onchange: () => Promise<void> } = $props();

  let busyId = $state<string | null>(null);
  let uninstallTarget = $state<ModuleEntry | null>(null);
  let query = $state('');

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
    <Input bind:value={query} icon={Search} type="search" placeholder="Search modules…" disabled={loading} class="w-full sm:w-64" />
  </div>

  {#if loading}
    <div class="grid gap-5" style="grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))">
      {#each Array(3) as _}
        <Card class="space-y-3">
          <div class="flex items-center gap-3">
            <div class="w-4 h-4 rounded bg-zinc-700/40 animate-pulse"></div>
            <div class="h-4 w-1/3 rounded bg-zinc-700/40 animate-pulse"></div>
          </div>
          <div class="h-3 w-full rounded bg-zinc-700/30 animate-pulse"></div>
          <div class="h-3 w-2/3 rounded bg-zinc-700/30 animate-pulse"></div>
          <div class="h-7 w-24 rounded-lg bg-zinc-700/30 animate-pulse"></div>
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
        <Card interactive class="flex flex-col {m.installed ? 'border-emerald-500/30' : ''}">
          <div class="flex items-center gap-2.5">
            <Icon class="w-4 h-4 shrink-0 {toneText[toneOf(m.id)]}" />
            <h4 class="font-display text-sm font-bold text-zinc-100 min-w-0 flex-1 truncate">{m.name}</h4>
            {#if m.installed}
              <Badge tone="success"><Check class="w-3 h-3" /> Installed</Badge>
            {/if}
          </div>
          <p class="text-xs text-zinc-400 mt-3 leading-relaxed flex-1">{m.description}</p>

          {#if m.commands.length}
            <div class="flex flex-wrap gap-1 mt-3">
              {#each m.commands as command (command.name)}
                <span class="inline-flex items-center gap-1 text-xs font-mono px-1.5 py-0.5 rounded-md bg-zinc-900/60 ring-1 ring-zinc-700/40 text-zinc-300">
                  <!-- A slash command is typed as /name; a message command lives in the right-click menu, so it gets an arrow instead. -->
                  {#if command.kind === 'slash'}<span class={toneText[toneOf(m.id)]}>/</span>{:else}<CornerDownRight class="w-3 h-3 {toneText[toneOf(m.id)]}" />{/if}{command.name}
                </span>
              {/each}
            </div>
          {/if}

          <div class="mt-4">
            {#if m.installed}
              <Button variant="danger" size="sm" onclick={() => (uninstallTarget = m)} disabled={!isAdmin || busyId === m.id} title={isAdmin ? 'Uninstall' : 'Admins only'}>
                <Trash2 class="w-3.5 h-3.5" /> Uninstall
              </Button>
            {:else}
              <Button variant="soft" size="sm" onclick={() => install(m)} disabled={!isAdmin || busyId === m.id} title={isAdmin ? 'Install' : 'Admins only'}>
                <Download class="w-3.5 h-3.5" /> {busyId === m.id ? 'Installing…' : 'Install'}
              </Button>
            {/if}
          </div>
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
      Everything this module stored for this server is deleted. Its slash commands stay registered on Discord until you prune them from the Slash page.
    </p>
    <div class="flex justify-end gap-2 mt-5">
      <Button variant="ghost" onclick={() => (uninstallTarget = null)}>Cancel</Button>
      <Button variant="danger" onclick={uninstall} disabled={busyId === uninstallTarget.id}>
        {busyId === uninstallTarget.id ? 'Uninstalling…' : 'Uninstall'}
      </Button>
    </div>
  {/if}
</Modal>
