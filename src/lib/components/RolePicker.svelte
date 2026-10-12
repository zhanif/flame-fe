<script lang="ts">
  import type { DiscordRole } from '$lib/api/endpoints';
  import { X } from '@lucide/svelte';

  interface Props {
    roles: DiscordRole[];
    selected: string[];
    onchange: (next: string[]) => void;
    placeholder?: string;
    disabled?: boolean;
  }

  let { roles, selected, onchange, placeholder = 'Type to search roles...', disabled = false }: Props = $props();

  let query = $state('');
  let open = $state(false);
  let container: HTMLDivElement | undefined = $state();
  let input: HTMLInputElement | undefined = $state();

  const selectedRoles = $derived(selected.map(id => roles.find(r => r.id === id)).filter((r): r is DiscordRole => !!r));
  const matches = $derived(
    roles
      .filter(r => !selected.includes(r.id) && r.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 50),
  );

  const tint = (role: DiscordRole) =>
    role.color === '#000000' ? { bg: '#1e293b', text: '#94a3b8' } : { bg: role.color + '20', text: role.color };

  function add(id: string) {
    if (disabled) return;
    onchange([...selected, id]);
    query = '';
    input?.focus();
  }

  function remove(id: string) {
    if (!disabled) onchange(selected.filter(s => s !== id));
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (matches[0]) add(matches[0].id);
    } else if (e.key === 'Backspace' && query === '' && selectedRoles.length) {
      remove(selectedRoles[selectedRoles.length - 1].id);
    } else if (e.key === 'Escape') {
      open = false;
    }
  }
</script>

<svelte:window onclick={(e) => container && !container.contains(e.target as Node) && (open = false)} />

<div bind:this={container} class="relative">
  <div
    class="min-h-[42px] flex flex-wrap items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/50 {disabled ? 'opacity-50' : 'cursor-text'}"
    role="presentation"
    onclick={() => { if (!disabled) { open = true; input?.focus(); } }}
  >
    {#each selectedRoles as role (role.id)}
      {@const c = tint(role)}
      <span class="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-md text-xs font-medium" style="background:{c.bg};color:{c.text}">
        {role.name}
        <button type="button" class="p-0.5 rounded hover:bg-black/20 cursor-pointer" onclick={() => remove(role.id)} aria-label="Remove {role.name}">
          <X class="w-3 h-3" />
        </button>
      </span>
    {/each}
    <input
      bind:this={input}
      bind:value={query}
      onfocus={() => (open = true)}
      onkeydown={onKey}
      {placeholder}
      {disabled}
      class="flex-1 min-w-[8rem] bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none"
    />
  </div>

  {#if open && !disabled}
    <div class="absolute top-full left-0 right-0 mt-1 z-40 max-h-56 overflow-y-auto rounded-xl bg-slate-800 border border-slate-700/60 shadow-xl">
      {#each matches as role (role.id)}
        {@const c = tint(role)}
        <button type="button" class="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-700/50 cursor-pointer" onclick={() => add(role.id)}>
          <span class="w-2.5 h-2.5 rounded-full" style="background:{c.text}"></span>{role.name}
        </button>
      {:else}
        <p class="px-3 py-2.5 text-xs text-slate-500">No matching role</p>
      {/each}
    </div>
  {/if}
</div>
