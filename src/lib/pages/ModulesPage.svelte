<script lang="ts">
  import Card from '$lib/components/Card.svelte';
  import Modal from '$lib/components/Modal.svelte';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import TableSkeleton from '$lib/components/TableSkeleton.svelte';
  import { api, type ModuleEntry } from '$lib/api/endpoints';
  import { toast } from '$lib/stores/toast.svelte';
  import { Blocks, Download, Trash2 } from '@lucide/svelte';
  import { onMount } from 'svelte';

  let { guildId, isAdmin }: { guildId: string; isAdmin: boolean } = $props();

  let modules: ModuleEntry[] = $state([]);
  let loading = $state(true);
  let busyId = $state<string | null>(null);
  let uninstallTarget = $state<ModuleEntry | null>(null);

  async function load() {
    try {
      modules = await api.modules(guildId);
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      loading = false;
    }
  }
  onMount(load);

  async function install(m: ModuleEntry) {
    busyId = m.id;
    try {
      await api.installModule(guildId, m.id);
      toast('success', `${m.name} installed — push its commands from the Slash page`);
      await load();
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
      toast('success', `${m.name} uninstalled`);
      uninstallTarget = null;
      await load();
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      busyId = null;
    }
  }
</script>

<PageHeader title="Modules" description="Features you can install in this server — it starts with none" icon={Blocks} />

<Card>
  {#if loading}
    <TableSkeleton columns={['flex-1', 'flex-1', 'w-32', '>w-28']} rows={3} />
  {:else if modules.length === 0}
    <p class="text-sm text-slate-500 text-center py-8">No modules are available yet.</p>
  {:else}
    <table class="w-full text-sm">
      <thead>
        <tr class="text-[10px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-800/40">
          <th class="text-left py-3 px-3 font-medium">Module</th>
          <th class="text-left py-3 px-3 font-medium">Commands</th>
          <th class="text-left py-3 px-3 font-medium w-32">Status</th>
          <th class="text-right py-3 px-3 font-medium w-28">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-800/30">
        {#each modules as m (m.id)}
          <tr>
            <td class="py-3 px-3">
              <p class="text-[13px] font-semibold text-slate-200">{m.name}</p>
              <p class="text-[11px] text-slate-500">{m.description}</p>
            </td>
            <td class="py-3 px-3">
              <div class="flex flex-wrap gap-1">
                {#each m.commands as command}
                  <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800/60 text-slate-400"><span class="text-slate-600">/</span>{command}</span>
                {:else}
                  <span class="text-[11px] text-slate-600">—</span>
                {/each}
              </div>
            </td>
            <td class="py-3 px-3">
              <span class="inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold {m.installed ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-500 bg-slate-700/30'}">
                {m.installed ? 'Installed' : 'Not installed'}
              </span>
            </td>
            <td class="py-3 px-3 text-right">
              {#if m.installed}
                <button
                  onclick={() => (uninstallTarget = m)}
                  disabled={!isAdmin || busyId === m.id}
                  title={isAdmin ? 'Uninstall' : 'Admins only'}
                  class="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-red-400 hover:bg-red-500/10 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Trash2 class="w-3 h-3" /> Uninstall
                </button>
              {:else}
                <button
                  onclick={() => install(m)}
                  disabled={!isAdmin || busyId === m.id}
                  title={isAdmin ? 'Install' : 'Admins only'}
                  class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-[11px] font-semibold text-orange-400 ring-1 ring-orange-500/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Download class="w-3 h-3" /> {busyId === m.id ? 'Installing…' : 'Install'}
                </button>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</Card>

<Modal show={!!uninstallTarget} onClose={() => (uninstallTarget = null)}>
  {#if uninstallTarget}
    <h3 class="text-base font-bold text-slate-100">Uninstall {uninstallTarget.name}?</h3>
    <p class="text-xs text-slate-400 mt-1.5 leading-relaxed">
      Everything this module stored for this server is deleted. Its slash commands stay registered on Discord until you prune them from the Slash page.
    </p>
    <div class="flex justify-end gap-2 mt-5">
      <button onclick={() => (uninstallTarget = null)} class="px-4 py-2 rounded-xl text-sm font-semibold text-slate-400 hover:bg-slate-800/50 cursor-pointer">Cancel</button>
      <button
        onclick={uninstall}
        disabled={busyId === uninstallTarget.id}
        class="px-5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-sm font-semibold text-red-400 ring-1 ring-red-500/20 cursor-pointer disabled:opacity-40"
      >
        {busyId === uninstallTarget.id ? 'Uninstalling…' : 'Uninstall'}
      </button>
    </div>
  {/if}
</Modal>
