<script lang="ts" module>
  /** Someone or something the message pings: a role (in its own color) or @everyone. */
  export interface Mention {
    name: string;
    color?: string | null;
  }
</script>

<script lang="ts">
  import type { AnnouncementField } from '$lib/api/endpoints';
  import { renderMarkdown } from '$lib/discord-markdown';
  import { bot } from '$lib/stores/bot.svelte';

  // How an announcement looks in Discord, as the bot sends it: the mentions line, the message text, then the embed
  // with its colored bar, title, text, fields, thumbnail, image and footer. Flat, on Discord's own dark colors.
  let {
    content = '',
    title = '',
    body = '',
    color = '',
    imageUrl = '',
    thumbnailUrl = '',
    footer = '',
    fields = [],
    mentions = [],
    mentionNewline = true,
  }: {
    content?: string;
    title?: string;
    body?: string;
    color?: string;
    imageUrl?: string;
    thumbnailUrl?: string;
    footer?: string;
    fields?: AnnouncementField[];
    mentions?: Mention[];
    mentionNewline?: boolean;
  } = $props();

  // A role's mention takes the color of the role, like Discord does: its name on a faint tint of it.
  const tint = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map(i => Number.parseInt(hex.slice(i, i + 2), 16));
    return `rgba(${r}, ${g}, ${b}, 0.15)`;
  };

  let imageBroken = $state(false);
  let thumbBroken = $state(false);
  $effect(() => {
    imageUrl;
    imageBroken = false;
  });
  $effect(() => {
    thumbnailUrl;
    thumbBroken = false;
  });
  const shownFields = $derived(fields.filter(field => field.name.trim() || field.value.trim()));
  const hasEmbed = $derived(!!(title.trim() || body.trim() || imageUrl.trim() || thumbnailUrl.trim() || footer.trim() || shownFields.length));
  const empty = $derived(!content.trim() && !hasEmbed);
  // Like Discord: inline fields sit side by side (up to three), anything else takes a whole line.
  const fieldRows = $derived.by(() => {
    const rows: AnnouncementField[][] = [];
    for (const field of shownFields) {
      const last = rows[rows.length - 1];
      if (field.inline && last && last[0].inline && last.length < 3) last.push(field);
      else rows.push([field]);
    }
    return rows;
  });
</script>

{#snippet chip(mention: Mention)}
  {@const own = mention.color && mention.color !== '#000000' ? mention.color : null}
  <span
    class="mr-1 rounded px-1 {own ? '' : 'bg-[#5865F2]/30 text-[#C9CDFB]'}"
    style={own ? `background:${tint(own)}; color:${own}` : undefined}>{mention.name}</span
  >
{/snippet}

<div class="flex items-start gap-3 rounded-xl bg-[#313338] px-4 py-4 ring-1 ring-zinc-800" aria-label="Preview of the announcement">
  {#if bot.avatar}
    <img src={bot.avatar} alt="" class="h-10 w-10 shrink-0 rounded-full" />
  {:else}
    <span class="h-10 w-10 shrink-0 rounded-full bg-[#5865F2]" aria-hidden="true"></span>
  {/if}
  <div class="min-w-0 flex-1">
    <p class="flex items-baseline gap-2">
      <span class="truncate text-sm font-semibold text-[#F2F3F5]">{bot.name}</span>
      <span class="shrink-0 rounded bg-[#5865F2] px-1 text-[10px] font-semibold uppercase text-white">Bot</span>
      <span class="shrink-0 text-xs text-[#949BA4]">Today at 9:41 PM</span>
    </p>
    {#if mentions.length && content.trim() && !mentionNewline}
      <!-- On the same line: the mentions and the first line of the message share one block. -->
      <div class="mt-1 break-words text-sm text-[#DBDEE1]">
        {#each mentions as mention (mention.name)}{@render chip(mention)}{/each}{@html renderMarkdown(content, { inlineFirst: true })}
      </div>
    {:else}
      {#if mentions.length}
        <p class="mt-1 text-sm text-[#DBDEE1]">
          {#each mentions as mention (mention.name)}{@render chip(mention)}{/each}
        </p>
      {/if}
      {#if content.trim()}<div class="mt-1 break-words text-sm text-[#DBDEE1]">{@html renderMarkdown(content)}</div>{/if}
    {/if}

    {#if empty}
      <p class="mt-2 rounded-md border-l-4 border-[#4E5058] bg-[#2B2D31] px-3 py-3 text-xs text-[#949BA4]">The announcement shows here as you write it.</p>
    {:else}
      {#if hasEmbed}
      <div class="mt-2 max-w-[28rem] overflow-hidden rounded-md border-l-4 bg-[#2B2D31] px-3 py-3" style="border-color:{color || '#4E5058'}">
        <div class="flex gap-3">
          <div class="min-w-0 flex-1">
            {#if title.trim()}<p class="break-words text-sm font-semibold text-[#F2F3F5]">{title}</p>{/if}
            {#if body.trim()}<div class="{title.trim() ? 'mt-1.5' : ''} break-words text-xs leading-relaxed text-[#DBDEE1]">{@html renderMarkdown(body, { maskedLinks: true })}</div>{/if}
            {#if fieldRows.length}
              <div class="mt-2 space-y-2">
                {#each fieldRows as row, i (i)}
                  <div class="grid gap-3" style="grid-template-columns: repeat({row[0].inline ? 3 : 1}, minmax(0, 1fr))">
                    {#each row as field, j (j)}
                      <div class="min-w-0">
                        <p class="break-words text-xs font-semibold text-[#F2F3F5]">{field.name}</p>
                        <div class="mt-0.5 break-words text-xs text-[#DBDEE1]">{@html renderMarkdown(field.value, { maskedLinks: true })}</div>
                      </div>
                    {/each}
                  </div>
                {/each}
              </div>
            {/if}
          </div>
          {#if thumbnailUrl.trim() && !thumbBroken}
            <img src={thumbnailUrl} alt="" class="h-16 w-16 shrink-0 rounded-md object-cover" onerror={() => (thumbBroken = true)} />
          {/if}
        </div>
        {#if imageUrl.trim() && !imageBroken}
          <img src={imageUrl} alt="" class="mt-3 max-h-56 w-full rounded-md object-cover" onerror={() => (imageBroken = true)} />
        {/if}
        {#if footer.trim()}<p class="mt-2 text-[11px] text-[#949BA4]">{footer}</p>{/if}
      </div>
      {/if}
    {/if}
  </div>
</div>
