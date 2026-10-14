<script lang="ts">
  export interface StackItem {
    /** A user is an avatar; a role is a circle in its color with its initial. */
    kind: 'user' | 'role';
    avatarUrl?: string | null;
    color?: string;
    name: string;
  }

  // A few people and roles as overlapping circles, the last one on top, with `+n` when there are more than
  // `max`. The ring takes the color of the surface behind it, so the overlap reads as cut-out.
  let { items, max = 4, size = 'h-7 w-7' }: { items: StackItem[]; max?: number; size?: string } = $props();

  const shown = $derived(items.slice(0, max));
  const rest = $derived(items.length - shown.length);
  const initial = (name: string) => name.trim().charAt(0).toUpperCase() || '?';

  // The background of a role circle is its color; the initial is dark on a light color and light on a dark one.
  const NEUTRAL = '#52525b';
  const fillOf = (color?: string) => (color && /^#[0-9a-f]{6}$/i.test(color) && color !== '#000000' ? color : NEUTRAL);
  const inkOf = (fill: string) => {
    const [r, g, b] = [1, 3, 5].map(i => Number.parseInt(fill.slice(i, i + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? '#1e1f22' : '#ffffff';
  };
</script>

<span class="inline-flex items-center -space-x-2">
  {#each shown as item, i (i)}
    {#if item.kind === 'user' && item.avatarUrl}
      <img src={item.avatarUrl} alt="" title={item.name} class="{size} shrink-0 rounded-full object-cover ring-2 ring-zinc-900" />
    {:else}
      {@const fill = fillOf(item.color)}
      <span
        title={item.name}
        class="{size} inline-flex shrink-0 items-center justify-center rounded-full text-[11px] font-bold ring-2 ring-zinc-900"
        style="background:{fill}; color:{inkOf(fill)}"
      >
        {initial(item.name)}
      </span>
    {/if}
  {/each}
  {#if rest > 0}
    <span class="{size} inline-flex shrink-0 items-center justify-center rounded-full bg-zinc-700 text-[11px] font-semibold text-zinc-200 ring-2 ring-zinc-900">+{rest}</span>
  {/if}
</span>
