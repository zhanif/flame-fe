<script lang="ts">
  import ActorCell from '$lib/components/ActorCell.svelte';
  import Button from '$lib/components/Button.svelte';
  import Card from '$lib/components/Card.svelte';
  import SaveButton from '$lib/components/SaveButton.svelte';
  import ConfirmModal from '$lib/components/ConfirmModal.svelte';
  import ChatPreview from '$lib/components/ChatPreview.svelte';
  import ColorChips from '$lib/components/ColorChips.svelte';
  import ColorField from '$lib/components/ColorField.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import Input from '$lib/components/Input.svelte';
  import Modal from '$lib/components/Modal.svelte';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import RoleChip from '$lib/components/RoleChip.svelte';
  import RowMenu, { type RowMenuItem } from '$lib/components/RowMenu.svelte';
  import RoleSelect from '$lib/components/RoleSelect.svelte';
  import SectionTitle from '$lib/components/SectionTitle.svelte';
  import Select from '$lib/components/Select.svelte';
  import TableSkeleton from '$lib/components/TableSkeleton.svelte';
  import WarningBanner from '$lib/components/WarningBanner.svelte';
  import { api, type DiscordRole, type RoleColorChange, type RoleColorEntry, type RoleColors } from '$lib/api/endpoints';
  import { onlyCommandName, restrictTo } from '$lib/number-input';
  import { session } from '$lib/stores/session.svelte';
  import { toast } from '$lib/stores/toast.svelte';
  import { urlParam } from '$lib/url-param';
  import { caps, label, td, th, toneText } from '$lib/ui';
  import { Check, Eraser, Paintbrush, Pencil, Plus, ScrollText, Trash2, TriangleAlert, Undo2 } from '@lucide/svelte';
  import { onMount, untrack } from 'svelte';
  import { cubicOut } from 'svelte/easing';
  import { slide } from 'svelte/transition';

  let { guildId, isAdmin }: { guildId: string; isAdmin: boolean } = $props();

  let data: RoleColors | null = $state(null);
  let roles: DiscordRole[] = $state([]);

  // The form, for a new color or for the one being edited.
  let panel = $state(false);
  // Which color is open and what for (`?open=<color>&mode=apply`) lives in the address, so a link opens it.
  const openParam = urlParam('open');
  const modeParam = urlParam('mode', 'edit');
  const closePanel = () => {
    panel = false;
    openParam.value = '';
  };
  // What the open accordion is for: the data of the color, or setting the colors of its role.
  let mode: 'edit' | 'apply' | 'history' = $state('edit');
  let hex: string[] = $state([]);
  let applying = $state(false);
  let clearAsk = $state(false);
  let editing: RoleColorEntry | null = $state(null);
  let name = $state('');
  let commandName = $state('');
  let commandTouched = $state(false);
  let roleId = $state('');
  let extraColors = $state(''); // the Select's empty choice is "1 color"
  let description = $state('');
  let saving = $state(false);
  let removeTarget: RoleColorEntry | null = $state(null);
  let removing = $state(false);


  const cell = td.replace('h-11', 'h-14');
  const when = (ts: string) => new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  const roleOf = (id: string) => roles.find(r => r.id === id);
  const maxColors = $derived(extraColors ? Number(extraColors) : 1);

  // A role that already has a color is not offered again (the one being edited keeps its own).
  const takenRoles = $derived.by(() => {
    const current: RoleColors | null = data;
    return (current?.colors ?? []).filter(c => c.id !== editing?.id).map(c => c.role_id);
  });

  // Until the command name is edited by hand it follows the name: "Gold Member" gives "gold-member-color".
  $effect(() => {
    if (commandTouched || editing) return;
    commandName = onlyCommandName(`${name.trim().toLowerCase().replace(/\s+/g, '-')}-color`).replace(/^-color$/, '');
  });

  function openPanel(color: RoleColorEntry | null) {
    mode = 'edit';
    editing = color;
    name = color?.name ?? '';
    commandName = color?.command_name ?? '';
    commandTouched = !!color;
    roleId = color?.role_id ?? '';
    extraColors = color && color.max_colors > 1 ? String(color.max_colors) : '';
    description = color?.description ?? '';
    panel = true;
    openParam.value = color?.id ?? '';
    modeParam.value = 'edit';
  }

  async function save() {
    if (saving) return;
    saving = true;
    const input = { name, command_name: commandName, role_id: roleId, max_colors: maxColors, description: description.trim() || null };
    try {
      data = editing ? await api.roleColors.update(guildId, editing.id, input) : await api.roleColors.create(guildId, input);
      toast('success', editing ? 'Color saved' : 'Color added', `Switch on /${commandName} from the Slash page so its holders can use it.`);
      closePanel();
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      saving = false;
    }
  }

  // The history of the open color, behind its three-dot menu.
  let colorChanges: RoleColorChange[] = $state([]);
  let colorPage = $state(1);
  let colorTotal = $state(0);
  let colorLoaded = $state(false);
  const COLOR_LIMIT = 5;

  async function loadColorChanges() {
    if (!editing) return;
    try {
      const res = await api.roleColors.changes(guildId, { page: colorPage, limit: COLOR_LIMIT, colorId: editing.id });
      colorChanges = res.changes;
      colorTotal = res.pagination.total;
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      colorLoaded = true;
    }
  }

  function openHistory(color: RoleColorEntry) {
    mode = 'history';
    editing = color;
    colorPage = 1;
    colorLoaded = false;
    panel = true;
    openParam.value = color.id;
    modeParam.value = 'history';
    void loadColorChanges();
  }

  function openApply(color: RoleColorEntry) {
    mode = 'apply';
    editing = color;
    hex = Array.from({ length: color.max_colors }, (_, i) => color.current[i] ?? '');
    panel = true;
    openParam.value = color.id;
    modeParam.value = 'apply';
  }

  // The address decides what is open: a link, a reload or the browser's Back opens or closes it.
  $effect(() => {
    const id = openParam.value;
    const wanted = modeParam.value;
    const current: RoleColors | null = data;
    untrack(() => {
      if (!id) {
        if (panel && editing) panel = false;
        return;
      }
      const color = current?.colors.find(c => c.id === id);
      if (!color || (panel && editing?.id === id && mode === wanted)) return;
      if (wanted === 'history') openHistory(color);
      else if (wanted === 'apply') openApply(color);
      else openPanel(color);
    });
  });

  const FULL_HEX = /^#[0-9A-F]{6}$/;
  // What the Apply form would set: the filled boxes, in order. `valid` is false while one is half typed.
  const applyPlan = $derived.by(() => {
    const filled = hex.filter(h => h !== '');
    return { colors: filled, valid: filled.every(h => FULL_HEX.test(h)) };
  });
  const sameAsNow = $derived.by(() => !!editing && applyPlan.colors.join('|') === editing.current.join('|'));
  // More than one color needs Enhanced Role Colors; one color or clearing never does.
  const needsEnhanced = $derived.by(() => {
    const current: RoleColors | null = data;
    return applyPlan.colors.length > 1 && !!current && !current.enhanced;
  });

  // Clear only empties the preview; the role keeps its colors until Apply is pressed.
  const clearPreview = () => (hex = hex.map(() => ''));

  async function apply(colors: string[]) {
    if (!editing || applying) return;
    applying = true;
    try {
      data = await api.roleColors.apply(guildId, editing.id, colors);
      toast('success', colors.length ? 'Colors applied' : 'Colors cleared', `The role now ${colors.length ? 'has the new colors' : 'has no color'}.`);
      closePanel();
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      applying = false;
    }
  }

  let reverting: string | null = $state(null);
  let revertTarget: RoleColorChange | null = $state(null);

  // What the role has now and what Revert would give it. More than one color needs Enhanced Role Colors, and a
  // server without it declines the revert (the API does too).
  const revertNow = $derived.by(() => {
    const current: RoleColors | null = data;
    return current?.colors.find(c => c.id === revertTarget?.color_id)?.current ?? [];
  });
  const revertDeclined = $derived.by(() => {
    const current: RoleColors | null = data;
    return !!revertTarget && revertTarget.before.length > 1 && !!current && !current.enhanced;
  });

  // What the three-dot menu of a color offers: the history for everyone, the rest for admins.
  const colorActions = (color: RoleColorEntry): RowMenuItem[] => [
    { label: 'History', icon: ScrollText, onclick: () => (panel && editing?.id === color.id && mode === 'history' ? (closePanel()) : openHistory(color)) },
    ...(isAdmin
      ? [
          { label: 'Edit', icon: Pencil, onclick: () => (panel && editing?.id === color.id && mode === 'edit' ? (closePanel()) : openPanel(color)) },
          {
            label: 'Apply colors',
            icon: Paintbrush,
            disabled: !!color.problem,
            hint: color.problem ?? undefined,
            onclick: () => (panel && editing?.id === color.id && mode === 'apply' ? (closePanel()) : openApply(color)),
          },
          { label: 'Remove', icon: Trash2, danger: true, onclick: () => (removeTarget = color) },
        ]
      : []),
  ];

  // The colors a change started from (what Revert puts back), and whether the role already has them.
  const canRevert = (change: RoleColorChange) => {
    const current: RoleColors | null = data;
    const now = current?.colors.find(c => c.id === change.color_id)?.current ?? [];
    return now.join('|') !== change.before.join('|');
  };

  async function revert(change: RoleColorChange) {
    if (reverting) return;
    reverting = change.id;
    try {
      data = await api.roleColors.revert(guildId, change.id);
      toast('success', 'Change reverted', `${change.color_name} has its previous colors again.`);
      revertTarget = null;
      if (panel && mode === 'history') await loadColorChanges();
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      reverting = null;
    }
  }

  async function remove() {
    if (!removeTarget) return;
    removing = true;
    try {
      data = await api.roleColors.remove(guildId, removeTarget.id);
      toast('success', 'Color removed', 'Its history is removed too. Remove /' + removeTarget.command_name + ' from the Slash page.');
      removeTarget = null;
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      removing = false;
    }
  }

  onMount(async () => {
    const [colors, roleList] = await Promise.allSettled([api.roleColors.list(guildId), api.roles(guildId)]);
    if (roleList.status === 'fulfilled') roles = roleList.value;
    if (colors.status === 'fulfilled') data = colors.value;
    else toast('error', colors.reason?.message ?? 'Could not load the colors');
  });
</script>

{#snippet hint()}
          <p class="mb-5 text-xs text-zinc-500">Holders of the role open an editor with the command below and pick the colors of their role.</p>
{/snippet}

{#snippet form()}
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <span class={label}>Name</span>
              <Input bind:value={name} maxlength={50} placeholder="Gold Member" aria-label="Name" />
            </div>
            <div>
              <span class={label}>Command</span>
              <Input
                bind:value={commandName}
                maxlength={32}
                placeholder="gold-color"
                oninput={restrictTo(onlyCommandName, v => ((commandName = v), (commandTouched = true)))}
                aria-label="Command name"
              />
              <p class="mt-1.5 text-xs text-zinc-500">Typed as <span class="font-mono {toneText.lime}">/{commandName || 'command'}</span>. Lowercase, no spaces.</p>
            </div>
            <div>
              <span class={label}>Role</span>
              <RoleSelect {roles} manageable exclude={takenRoles} bind:value={roleId} class="w-full" />
            </div>
            <div>
              <span class={label}>Colors</span>
              <Select
                bind:value={extraColors}
                options={[
                  { value: '2', label: '2 colors' },
                  { value: '3', label: '3 colors' },
                ]}
                placeholder="1 color"
                label="How many colors"
                class="w-full"
              />
              <p class="mt-1.5 text-xs text-zinc-500">More than one needs the Enhanced Role Colors feature of the server.</p>
            </div>
            <div class="sm:col-span-2">
              <span class={label}>Description</span>
              <Input bind:value={description} maxlength={100} placeholder="Shown in Discord next to the command (optional)" aria-label="Description" />
            </div>
          </div>
          <div class="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onclick={() => (closePanel())}>Cancel</Button>
            <SaveButton onclick={save} disabled={!name.trim() || !commandName || !roleId} {saving} />
          </div>
{/snippet}

<PageHeader module="role-colors" description="Let role holders pick the color of their role" />

<div class="space-y-5">
  {#if isAdmin}
    <div class="flex justify-end">
      <Button variant="primary" onclick={() => (panel && !editing ? (closePanel()) : openPanel(null))}><Plus class="w-3.5 h-3.5" />Add color</Button>
    </div>
  {/if}

  {#if data}<WarningBanner warnings={data.warnings} />{/if}

  {#if isAdmin && panel && !editing}
    <div transition:slide={{ duration: 220, easing: cubicOut }}>
      <Card>
        <SectionTitle icon={Plus} title="Add a color" class="mb-1" />
        {@render hint()}
        {@render form()}
      </Card>
    </div>
  {/if}

  {#if data && data.colors.length === 0}
    <EmptyState kind="modules" title="No colors yet" description="Add a color to let the holders of a role change its color with their own command." />
  {:else}
    <Card flush>
      {#if !data}
        <TableSkeleton
          columns={['w-16', 'w-56', 'w-56', 'flex-1', 'w-32', 'w-16']}
          headings={['#', 'Name', 'Command', 'Role', 'Colors', '']}
          kinds={['bar', 'bar', 'bar', 'bar', 'pill', 'action']}
          rows={4}
          rowHeight="h-14"
        />
      {:else}
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-zinc-800/40 bg-zinc-800/20">
              <th class="{th} w-16">#</th>
              <th class="{th} w-56">Name</th>
              <th class="{th} w-56">Command</th>
              <th class={th}>Role</th>
              <th class="{th} w-80">Colors</th>
              <th class="{th} w-16"><span class="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-800/30">
            {#each data.colors as color, i (color.id)}
              {@const role = roleOf(color.role_id)}
              <tr class="hover:bg-zinc-800/30 transition-colors">
                <td class="{cell} text-zinc-500">{i + 1}</td>
                <td class="{cell} text-zinc-200">
                  <p class="truncate">{color.name}</p>
                  {#if color.description}<p class="text-xs text-zinc-500 truncate">{color.description}</p>{/if}
                </td>
                <td class="{cell} font-mono text-zinc-100"><span class={toneText.lime}>/</span>{color.command_name}</td>
                <td class={cell}>
                  <RoleChip {role} />
                  {#if color.problem}<p class="mt-0.5 text-xs text-amber-400">{color.problem}</p>{/if}
                </td>
                <td class={cell}><ColorChips colors={color.current} /></td>
                <td class="{cell} text-right"><RowMenu label="Actions for {color.name}" items={colorActions(color)} /></td>
              </tr>
              {#if panel && editing?.id === color.id && (isAdmin || mode === 'history')}
                <tr>
                  <td colspan="6" class="p-0">
                    <div class="p-5 border-t border-zinc-800/40 bg-zinc-800/10" transition:slide={{ duration: 220, easing: cubicOut }}>
                      {#if mode === 'history'}
                        <SectionTitle icon={ScrollText} title="History of {color.name}" class="mb-4" />
                        {#if !colorLoaded}
                          <div class="h-24 animate-pulse rounded-lg bg-zinc-800/30" aria-hidden="true"></div>
                        {:else if colorTotal === 0}
                          <p class="text-xs text-zinc-500">Nobody has changed this color yet.</p>
                        {:else}
                          <ul class="space-y-2">
                            {#each colorChanges as change (change.id)}
                              <li class="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl bg-zinc-800/30 px-4 py-3 ring-1 ring-zinc-800/60">
                                <div class="w-60 shrink-0">{#if change.user}<ActorCell actor={change.user} />{/if}</div>
                                <div class="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                                  <ColorChips colors={change.before} />
                                  <span class="text-zinc-600">→</span>
                                  <ColorChips colors={change.after} />
                                </div>
                                <span class="shrink-0 text-xs text-zinc-500">{when(change.created_at)}</span>
                                {#if isAdmin}
                                  <Button variant="secondary" size="sm" disabled={!!reverting || !canRevert(change)} title={canRevert(change) ? 'Put the previous colors back' : 'The role already has these colors'} onclick={() => (revertTarget = change)}>
                                    <Undo2 class="h-3.5 w-3.5" />Revert
                                  </Button>
                                {/if}
                              </li>
                            {/each}
                          </ul>
                          {#if colorTotal > COLOR_LIMIT}
                            <div class="mt-3 flex items-center justify-between text-xs text-zinc-500">
                              <span>Page {colorPage} of {Math.ceil(colorTotal / COLOR_LIMIT)}</span>
                              <div class="flex gap-2">
                                <Button variant="ghost" disabled={colorPage <= 1} onclick={() => ((colorPage -= 1), loadColorChanges())}>Newer</Button>
                                <Button variant="ghost" disabled={colorPage * COLOR_LIMIT >= colorTotal} onclick={() => ((colorPage += 1), loadColorChanges())}>Older</Button>
                              </div>
                            </div>
                          {/if}
                        {/if}
                      {:else if mode === 'apply'}
                        <SectionTitle icon={Paintbrush} title="Apply colors to {color.name}" class="mb-1" />
                        <p class="mb-4 text-xs text-zinc-500">Sets the role colors right now, as if a holder had picked them. Listed in the history and the audit log.</p>
                        <div class="grid gap-6 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
                          <div class="space-y-4">
                            {#each hex as _, i (i)}
                              <ColorField bind:value={hex[i]} label="Color {i + 1}" optional={i > 0} disabled={applying} />
                            {/each}
                          </div>
                          <div class="min-w-0 space-y-2">
                            <span class="{caps} text-zinc-500">Preview</span>
                            <ChatPreview name={session.me?.username ?? 'Member'} avatarUrl={session.me?.avatar_url ?? null} colors={applyPlan.colors} />
                            <ColorChips colors={applyPlan.colors} />
                            {#if needsEnhanced}
                              <p class="pt-1 text-xs text-amber-400">This server does not have Enhanced Role Colors, so a role can only have one color. Clear the extra colors to apply.</p>
                            {/if}
                          </div>
                        </div>
                        <div class="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800/60 pt-4">
                          <div class="inline-flex items-center gap-1 rounded-xl bg-zinc-800/60 p-1 ring-1 ring-zinc-700/50">
                            <Button variant="ghost" disabled={applying || hex.every(h => h === '')} onclick={clearPreview} title="Empty the preview. Nothing changes until you press Apply">
                              <Eraser class="h-3.5 w-3.5" />Clear
                            </Button>
                            {#if !sameAsNow}
                              <span transition:slide={{ axis: 'x', duration: 160 }}>
                                <Button variant="ghost" disabled={applying} onclick={() => openApply(color)} title="Put back the colors the role has now">
                                  <Undo2 class="h-3.5 w-3.5" />Revert changes
                                </Button>
                              </span>
                            {/if}
                          </div>
                          <div class="flex items-center gap-2">
                            <Button variant="ghost" onclick={() => (closePanel())}>Cancel</Button>
                            <Button
                              variant="primary"
                              onclick={() => (applyPlan.colors.length ? apply(applyPlan.colors) : (clearAsk = true))}
                              disabled={applying || !applyPlan.valid || needsEnhanced || sameAsNow}
                            >
                              <Check class="h-3.5 w-3.5" />{applying ? 'Applying…' : applyPlan.colors.length ? 'Apply' : 'Apply no color'}
                            </Button>
                          </div>
                        </div>
                      {:else}
                        <SectionTitle icon={Pencil} title="Edit {color.name}" class="mb-1" />
                        {@render hint()}
                        {@render form()}
                      {/if}
                    </div>
                  </td>
                </tr>
              {/if}
            {/each}
          </tbody>
        </table>
      {/if}
    </Card>
  {/if}
</div>

<Modal show={!!revertTarget} onClose={() => !reverting && (revertTarget = null)}>
  {#if revertTarget}
    <h3 class="flex items-center gap-2 font-display text-base font-bold text-zinc-100">
      <Undo2 class="w-4 h-4 shrink-0 {toneText.lime}" />Revert this change?
    </h3>
    {#if revertDeclined}
      <div class="mt-4 flex items-center gap-3 rounded-xl bg-amber-500/10 px-4 py-3 ring-1 ring-amber-500/25">
        <TriangleAlert class="h-4 w-4 shrink-0 text-amber-400" />
        <div class="min-w-0">
          <p class="text-sm font-medium text-amber-400">Cannot revert</p>
          <p class="mt-0.5 text-xs text-zinc-400">This server doesn't have the Enhanced Role Colors feature.</p>
        </div>
      </div>
    {/if}
    <p class="mt-4 text-xs leading-relaxed text-zinc-400">
      The role of <span class="text-zinc-200">{revertTarget.color_name}</span> goes back to the colors it had before this change. It is listed in the history and the audit log.
    </p>
    <div class="mt-4 space-y-3">
      <ChatPreview name={revertTarget.user?.name ?? 'Member'} avatarUrl={revertTarget.user?.avatar_url ?? null} colors={revertTarget.before} />
      <div class="space-y-2 text-xs">
        <div class="flex items-center gap-3"><span class="{caps} w-24 shrink-0 text-zinc-500">Now</span><ColorChips colors={revertNow} /></div>
        <div class="flex items-center gap-3"><span class="{caps} w-24 shrink-0 text-zinc-500">After revert</span><ColorChips colors={revertTarget.before} /></div>
      </div>
    </div>
    <div class="mt-5 flex justify-end gap-2">
      <Button variant="ghost" onclick={() => (revertTarget = null)} disabled={!!reverting}>Cancel</Button>
      <Button variant="primary" onclick={() => revert(revertTarget!)} disabled={!!reverting || revertDeclined}>{reverting ? 'Reverting…' : 'Revert'}</Button>
    </div>
  {/if}
</Modal>

<Modal show={!!removeTarget} onClose={() => !removing && (removeTarget = null)}>
  {#if removeTarget}
    <h3 class="flex items-center gap-2 font-display text-base font-bold text-zinc-100">
      <Trash2 class="w-4 h-4 shrink-0 text-red-400" />Remove {removeTarget.name}?
    </h3>
    <p class="text-xs text-zinc-400 mt-3 leading-relaxed">
      Its history is deleted and its holders can no longer change the color with /{removeTarget.command_name}. The role itself and its current color stay as they are.
    </p>
    <div class="flex justify-end gap-2 mt-5">
      <Button variant="ghost" onclick={() => (removeTarget = null)} disabled={removing}>Cancel</Button>
      <Button variant="danger" onclick={remove} disabled={removing}>{removing ? 'Removing…' : 'Remove'}</Button>
    </div>
  {/if}
</Modal>

<ConfirmModal
  show={clearAsk}
  title="Apply no color to this role?"
  confirmLabel="Apply no color"
  busyLabel="Clearing…"
  busy={applying}
  icon={Paintbrush}
  onConfirm={async () => { await apply([]); clearAsk = false; }}
  onClose={() => (clearAsk = false)}
>
  The role loses its colors and goes back to the default color, for everyone who holds it. It is listed in the history, so it can be reverted.
</ConfirmModal>
