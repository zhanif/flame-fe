<script lang="ts">
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import Card from '$lib/components/Card.svelte';
  import Input from '$lib/components/Input.svelte';
  import SaveButton from '$lib/components/SaveButton.svelte';
  import SectionTitle from '$lib/components/SectionTitle.svelte';
  import { api, type BotProfile } from '$lib/api/endpoints';
  import { bot } from '$lib/stores/bot.svelte';
  import { toast } from '$lib/stores/toast.svelte';
  import { label } from '$lib/ui';
  import { Bot, Lock, RotateCcw, Upload } from '@lucide/svelte';
  import { onMount } from 'svelte';

  // The bot's nickname, avatar and profile background in this server only (Discord keeps them per server), with a
  // preview of how its profile and a message look. Moderators see it, admins change it.
  let { guildId, isAdmin }: { guildId: string; isAdmin: boolean } = $props();

  const AVATAR_SIZE = 256;
  const BACKGROUND_WIDTH = 600;
  const BACKGROUND_HEIGHT = 240;

  let profile: BotProfile | null = $state(null);
  let nickname = $state('');
  // undefined: the image stays as it is; null: back to the default one; text: a new image (a data URI).
  let avatar: string | null | undefined = $state(undefined);
  let background: string | null | undefined = $state(undefined);
  let saving = $state(false);
  let reading = $state(false);
  let avatarPicker: HTMLInputElement | undefined = $state();
  let backgroundPicker: HTMLInputElement | undefined = $state();

  // Read through a typed copy: `profile` is only ever set in async code, so the compiler would narrow it to null here.
  const saved = $derived.by((): BotProfile | null => profile);
  // All are per server, never the bot's own. The nickname is free; the avatar and the background are premium.
  const canEditName = $derived(isAdmin);
  const canEditLook = $derived(isAdmin && !!saved?.premium);
  const nicknameChanged = $derived(!!saved && nickname.trim() !== (saved.nickname ?? ''));
  const dirty = $derived(nicknameChanged || avatar !== undefined || background !== undefined);
  const shownName = $derived(nickname.trim() || saved?.global_name || bot.name);
  const shownAvatar = $derived(
    avatar === undefined ? (saved?.avatar_url ?? null) : avatar === null ? (saved?.global_avatar_url ?? null) : avatar,
  );
  const shownBackground = $derived(background === undefined ? (saved?.background_url ?? null) : background === null ? null : background);
  const canRemoveAvatar = $derived(avatar === undefined ? !!saved?.has_guild_avatar : avatar !== null);
  const canRemoveBackground = $derived(background === undefined ? !!saved?.has_guild_background : background !== null);

  function sync(next: BotProfile) {
    profile = next;
    nickname = next.nickname ?? '';
    avatar = undefined;
    background = undefined;
    bot.useGuild(guildId, { name: next.name, avatar_url: next.avatar_url });
  }

  onMount(async () => {
    try {
      sync(await api.botProfile(guildId));
    } catch (e: any) {
      toast('error', e.message);
    }
  });

  // The picked image is cropped to the shape Discord keeps and shrunk, so what is sent is small whatever the original was.
  async function read(file: File, width: number, height: number): Promise<string> {
    const bitmap = await createImageBitmap(file);
    const aspect = width / height;
    const source = bitmap.width / bitmap.height;
    const cropWidth = source > aspect ? Math.round(bitmap.height * aspect) : bitmap.width;
    const cropHeight = source > aspect ? bitmap.height : Math.round(bitmap.width / aspect);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas
      .getContext('2d')!
      .drawImage(bitmap, (bitmap.width - cropWidth) / 2, (bitmap.height - cropHeight) / 2, cropWidth, cropHeight, 0, 0, width, height);
    return canvas.toDataURL('image/png');
  }

  async function pick(event: Event, kind: 'avatar' | 'background') {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return void toast('error', 'That file is not an image');

    reading = true;
    try {
      const image = kind === 'avatar' ? await read(file, AVATAR_SIZE, AVATAR_SIZE) : await read(file, BACKGROUND_WIDTH, BACKGROUND_HEIGHT);
      if (kind === 'avatar') avatar = image;
      else background = image;
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
      sync(
        await api.updateBotProfile(guildId, {
          ...(nicknameChanged ? { nickname: nickname.trim() || null } : {}),
          ...(avatar !== undefined ? { avatar } : {}),
          ...(background !== undefined ? { background } : {}),
        }),
      );
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
    {#if saved?.premium}<Badge tone="amber">Premium</Badge>{/if}
  </div>
  {#if saved && !saved.premium}
    <p class="mb-5 flex items-center gap-2 rounded-xl bg-amber-500/10 px-4 py-3 text-xs text-amber-400 ring-1 ring-amber-500/25">
      <Lock class="h-3.5 w-3.5 shrink-0" />
      Setting the bot's avatar and background for this server is a premium feature. Its nickname is per server too, and free.
    </p>
  {/if}
  {#if !profile}
    <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]" aria-hidden="true">
      <div class="space-y-5">
        <div class="space-y-2">
          <div class="h-2.5 w-20 rounded bg-zinc-700/40 animate-pulse"></div>
          <div class="h-3 w-3/4 rounded bg-zinc-800/40 animate-pulse"></div>
          <div class="h-9 rounded-lg bg-zinc-800/40 animate-pulse"></div>
        </div>
        {#each [0, 1] as n (n)}
          <div class="space-y-2">
            <div class="h-2.5 w-20 rounded bg-zinc-700/40 animate-pulse"></div>
            <div class="h-3 w-2/3 rounded bg-zinc-800/40 animate-pulse"></div>
            <div class="flex flex-wrap items-center gap-3">
              <div class="animate-pulse bg-zinc-800/40 {n === 0 ? 'h-14 w-14 rounded-full' : 'h-12 w-[7.5rem] rounded-lg'}"></div>
              <div class="h-8 w-32 rounded-lg bg-zinc-800/40 animate-pulse"></div>
              <div class="h-8 w-40 rounded-lg bg-zinc-800/30 animate-pulse"></div>
            </div>
          </div>
        {/each}
      </div>

      <div class="min-w-0 space-y-2">
        <div class="h-2.5 w-16 rounded bg-zinc-700/40 animate-pulse"></div>
        <div class="h-[7.75rem] rounded-xl bg-zinc-800/40 animate-pulse"></div>
        <div class="h-16 rounded-xl bg-zinc-800/30 animate-pulse"></div>
      </div>
    </div>
  {:else}
    <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
      <div class="space-y-5">
        <div>
          <label for="bot-nickname" class={label}>Nickname</label>
          <Input id="bot-nickname" bind:value={nickname} maxlength={32} placeholder={profile.global_name} disabled={!canEditName} />
          <p class="mt-1.5 text-xs text-zinc-500">
            Only in this server. Empty uses the bot's own name, <span class="text-zinc-300">{profile.global_name}</span>. Needs the Change
            Nickname permission.
          </p>
        </div>

        <div>
          <span class={label}>Avatar</span>
          <div class="flex flex-wrap items-center gap-3">
            {#if shownAvatar}
              <img src={shownAvatar} alt="" class="h-14 w-14 rounded-full ring-1 ring-zinc-700" />
            {:else}
              <span class="h-14 w-14 rounded-full bg-[#5865F2]" aria-hidden="true"></span>
            {/if}
            <input
              bind:this={avatarPicker}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              class="hidden"
              onchange={event => pick(event, 'avatar')}
            />
            <Button variant="secondary" disabled={!canEditLook || reading} onclick={() => avatarPicker?.click()}
              ><Upload class="h-3.5 w-3.5" />Upload avatar</Button
            >
            {#if canRemoveAvatar}
              <Button variant="ghost" disabled={!canEditLook} onclick={() => (avatar = avatar === undefined ? null : undefined)}
                ><RotateCcw class="h-3.5 w-3.5" />{avatar === undefined ? 'Use the default avatar' : 'Undo'}</Button
              >
            {/if}
          </div>
          <p class="mt-1.5 text-xs text-zinc-500">
            Only in this server. The image is cropped to a square. Discord limits how often an avatar can change.
          </p>
        </div>

        <div>
          <span class={label}>Background</span>
          <div class="flex flex-wrap items-center gap-3">
            <span
              class="h-12 w-[7.5rem] shrink-0 overflow-hidden rounded-lg bg-zinc-800 bg-cover bg-center ring-1 ring-zinc-700"
              style:background-image={shownBackground ? `url("${shownBackground}")` : undefined}
              aria-hidden="true"
            ></span>
            <input
              bind:this={backgroundPicker}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              class="hidden"
              onchange={event => pick(event, 'background')}
            />
            <Button variant="secondary" disabled={!canEditLook || reading} onclick={() => backgroundPicker?.click()}
              ><Upload class="h-3.5 w-3.5" />Upload background</Button
            >
            {#if canRemoveBackground}
              <Button variant="ghost" disabled={!canEditLook} onclick={() => (background = background === undefined ? null : undefined)}
                ><RotateCcw class="h-3.5 w-3.5" />{background === undefined ? 'Remove background' : 'Undo'}</Button
              >
            {/if}
          </div>
          <p class="mt-1.5 text-xs text-zinc-500">
            Only in this server. The image is cropped to 5:2 and shown behind the bot on its profile. The server must be boosted for Discord
            to show it.
          </p>
        </div>
      </div>

      <div class="min-w-0 space-y-2">
        <span class={label}>Preview</span>
        <div class="overflow-hidden rounded-xl bg-[#232428] ring-1 ring-zinc-800" aria-label="Preview of the bot's profile card">
          <div
            class="h-20 w-full bg-zinc-800 bg-cover bg-center"
            style:background-image={shownBackground ? `url("${shownBackground}")` : undefined}
          ></div>
          <div class="px-3 pb-3">
            {#if shownAvatar}
              <img src={shownAvatar} alt="" class="-mt-6 h-12 w-12 rounded-full ring-4 ring-[#232428]" />
            {:else}
              <span class="-mt-6 block h-12 w-12 rounded-full bg-[#5865F2] ring-4 ring-[#232428]" aria-hidden="true"></span>
            {/if}
            <p class="mt-1 truncate text-sm font-semibold text-[#F2F3F5]">{shownName}</p>
            <p class="text-[11px] text-[#949BA4]">Bot · this server</p>
          </div>
        </div>

        <div
          class="flex items-start gap-2.5 rounded-xl bg-[#313338] px-3 py-3 ring-1 ring-zinc-800"
          aria-label="Preview of a message from the bot"
        >
          {#if shownAvatar}
            <img src={shownAvatar} alt="" class="h-8 w-8 shrink-0 rounded-full" />
          {:else}
            <span class="h-8 w-8 shrink-0 rounded-full bg-[#5865F2]" aria-hidden="true"></span>
          {/if}
          <div class="min-w-0">
            <p class="flex items-baseline gap-2">
              <span class="truncate text-xs font-semibold text-[#F2F3F5]">{shownName}</span>
              <span class="shrink-0 rounded bg-[#5865F2] px-1 text-[9px] font-semibold uppercase text-white">Bot</span>
              <span class="shrink-0 text-[11px] text-[#949BA4]">Today at 9:41 PM</span>
            </p>
            <p class="mt-0.5 text-xs text-[#DBDEE1]">This is how I look in this server.</p>
          </div>
        </div>
      </div>
    </div>

    {#if canEditName}
      <div class="mt-5 flex justify-end border-t border-zinc-800/60 pt-4">
        <SaveButton onclick={save} disabled={!dirty} {saving} />
      </div>
    {/if}
  {/if}
</Card>
