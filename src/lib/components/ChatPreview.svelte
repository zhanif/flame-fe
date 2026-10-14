<script lang="ts">
  // How a message from a member looks in Discord with the role colors being previewed: avatar, the display
  // name in the colors (fading from one to the next when there are several, as Discord shows them), a
  // timestamp and the message. The one place a gradient is fine: it is the content being previewed.
  let {
    name,
    avatarUrl = null,
    colors,
    message = 'This is how your name looks with this role.',
  }: { name: string; avatarUrl?: string | null; colors: string[]; message?: string } = $props();

  const nameStyle = $derived(
    colors.length > 1
      ? `background:linear-gradient(90deg, ${colors.join(', ')}); -webkit-background-clip:text; background-clip:text; color:transparent`
      : `color:${colors[0] ?? '#F2F3F5'}`,
  );
</script>

<div class="flex items-start gap-3 rounded-xl bg-[#313338] px-3.5 py-3 ring-1 ring-zinc-800" aria-label="Preview of a chat message">
  {#if avatarUrl}
    <img src={avatarUrl} alt="" class="h-9 w-9 shrink-0 rounded-full" />
  {:else}
    <span class="h-9 w-9 shrink-0 rounded-full bg-[#5865F2]" aria-hidden="true"></span>
  {/if}
  <div class="min-w-0">
    <p class="flex items-baseline gap-2">
      <span class="truncate text-sm font-semibold" style={nameStyle}>{name}</span>
      <span class="shrink-0 text-xs text-[#949BA4]">Today at 9:41 PM</span>
    </p>
    <p class="mt-0.5 text-xs text-[#DBDEE1]">{message}</p>
  </div>
</div>
