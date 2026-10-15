<script lang="ts">
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import Card from '$lib/components/Card.svelte';
  import FormSkeleton from '$lib/components/FormSkeleton.svelte';
  import Input from '$lib/components/Input.svelte';
  import SaveButton from '$lib/components/SaveButton.svelte';
  import SectionTitle from '$lib/components/SectionTitle.svelte';
  import { api, type BotProfile } from '$lib/api/endpoints';
  import { bot } from '$lib/stores/bot.svelte';
  import { toast } from '$lib/stores/toast.svelte';
  import { label } from '$lib/ui';
  import { Bot, Lock, RotateCcw, Upload } from '@lucide/svelte';
  import { onMount } from 'svelte';

  // The bot's nickname and avatar in this server only (Discord keeps them per server), with a preview of
  // how a message from it looks. Moderators see it, admins change it.
  let { guildId, isAdmin }: { guildId: string; isAdmin: boolean } = $props();

  const SIZE = 256;


  let profile: BotProfile | null = $state(null);
  let nickname = $state('');
  // undefined: the avatar stays as it is; null: back to the default one; text: a new image (a data URI).
  let avatar: string | null | undefined = $state(undefined);
  let saving = $state(false);
  let reading = $state(false);
  let picker: HTMLInputElement | undefined = $state();

  // Read through a typed copy: `profile` is only ever set in async code, so the compiler would narrow it to null here.
  const saved = $derived.by((): BotProfile | null => profile);
  // Changing the bot's look here is a premium feature: without it the card shows what is there, read-only.
  const canEdit = $derived(isAdmin && !!saved?.premium);
  const nicknameChanged = $derived(!!saved && nickname.trim() !== (saved.nickname ?? ''));
  const dirty = $derived(nicknameChanged || avatar !== undefined);
  const shownName = $derived(nickname.trim() || saved?.global_name || bot.name);
  const shownAvatar = $derived(avatar === undefined ? (saved?.avatar_url ?? null) : avatar === null ? (saved?.global_avatar_url ?? null) : avatar);
  const canRemoveAvatar = $derived(avatar === undefined ? !!saved?.has_guild_avatar : avatar !== null);

  function sync(next: BotProfile) {
    profile = next;
    nickname = next.nickname ?? '';
    avatar = undefined;
    bot.useGuild(guildId, { name: next.name, avatar_url: next.avatar_url });
  }

  onMount(async () => {
    try {
      sync(await api.botProfile(guildId));
    } catch (e: any) {
      toast('error', e.message);
    }
  });

  // The picked image is cropped to a square and shrunk, so what is sent is small whatever the original was.
  async function pick(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return void toast('error', 'That file is not an image');

    reading = true;
    try {
      const bitmap = await createImageBitmap(file);
      const side = Math.min(bitmap.width, bitmap.height);
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = SIZE;
      canvas.getContext('2d')!.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
      avatar = canvas.toDataURL('image/png');
    } catch {
      toast('error', 'I could not read that image');
    } finally {
      reading = false;
    }
  }

  async function save() {
    if (!profile || saving) return;
    saving = true;
    try {
      sync(await api.updateBotProfile(guildId, { ...(nicknameChanged ? { nickname: nickname.trim() || null } : {}), ...(avatar !== undefined ? { avatar } : {}) }));
      toast('success', 'Bot profile saved', 'This is how the bot looks in this server now.');
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      saving = false;
    }
  }
</script>

<Card>
  <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
    <SectionTitle icon={Bot} title="Bot in this server" />
    {#if saved && !saved.premium}<Badge tone="brand">Premium</Badge>{/if}
  </div>
  {#if saved && !saved.premium}
    <p class="mb-5 flex items-start gap-2 rounded-xl bg-orange-500/10 px-4 py-3 text-xs text-orange-400 ring-1 ring-orange-500/25">
      <Lock class="mt-0.5 h-3.5 w-3.5 shrink-0" />
      Giving the bot its own nickname and avatar in a server is a premium feature.
    </p>
  {/if}
  {#if !profile}
    <FormSkeleton fields={2} grid hint />
  {:else}
    <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
      <div class="space-y-5">
        <div>
          <label for="bot-nickname" class={label}>Nickname</label>
          <Input id="bot-nickname" bind:value={nickname} maxlength={32} placeholder={profile.global_name} disabled={!canEdit} />
          <p class="mt-1.5 text-xs text-zinc-500">Only in this server. Empty uses the bot's own name, <span class="text-zinc-300">{profile.global_name}</span>. Needs the Change Nickname permission.</p>
        </div>

        <div>
          <span class={label}>Avatar</span>
          <div class="flex flex-wrap items-center gap-3">
            {#if shownAvatar}
              <img src={shownAvatar} alt="" class="h-14 w-14 rounded-full ring-1 ring-zinc-700" />
            {:else}
              <span class="h-14 w-14 rounded-full bg-[#5865F2]" aria-hidden="true"></span>
            {/if}
            <input bind:this={picker} type="file" accept="image/png,image/jpeg,image/gif,image/webp" class="hidden" onchange={pick} />
            <Button variant="secondary" disabled={!canEdit || reading} onclick={() => picker?.click()}><Upload class="h-3.5 w-3.5" />Upload avatar</Button>
            {#if canRemoveAvatar}
              <Button variant="ghost" disabled={!canEdit} onclick={() => (avatar = avatar === undefined ? null : undefined)}><RotateCcw class="h-3.5 w-3.5" />{avatar === undefined ? 'Use the default avatar' : 'Undo'}</Button>
            {/if}
          </div>
          <p class="mt-1.5 text-xs text-zinc-500">Only in this server. The image is cropped to a square. Discord limits how often an avatar can change.</p>
        </div>
      </div>

      <div class="min-w-0 space-y-2">
        <span class={label}>Preview</span>
        <div class="flex items-start gap-3 rounded-xl bg-[#313338] px-4 py-4 ring-1 ring-zinc-800" aria-label="Preview of a message from the bot">
          {#if shownAvatar}
            <img src={shownAvatar} alt="" class="h-10 w-10 shrink-0 rounded-full" />
          {:else}
            <span class="h-10 w-10 shrink-0 rounded-full bg-[#5865F2]" aria-hidden="true"></span>
          {/if}
          <div class="min-w-0">
            <p class="flex items-baseline gap-2">
              <span class="truncate text-sm font-semibold text-[#F2F3F5]">{shownName}</span>
              <span class="shrink-0 rounded bg-[#5865F2] px-1 text-[10px] font-semibold uppercase text-white">Bot</span>
              <span class="shrink-0 text-xs text-[#949BA4]">Today at 9:41 PM</span>
            </p>
            <p class="mt-0.5 text-sm text-[#DBDEE1]">This is how I look in this server.</p>
          </div>
        </div>
      </div>
    </div>

    {#if canEdit}
      <div class="mt-5 flex justify-end border-t border-zinc-800/60 pt-4">
        <SaveButton onclick={save} disabled={!dirty} {saving} />
      </div>
    {/if}
  {/if}
</Card>
