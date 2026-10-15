<script lang="ts">
  import type { DiscordRole } from '$lib/api/endpoints';

  // A role as a small chip in its own color: a dot, the name, a faint tint and outline. A role with no color
  // (black) is neutral; a role that was deleted shows `missing`.
  let { role, missing = 'Deleted role' }: { role?: DiscordRole; missing?: string } = $props();

  const color = $derived(role?.color && role.color !== '#000000' ? role.color : '#a1a1aa');
  const tint = (alpha: number) => {
    const hex = color.slice(1);
    const [r, g, b] = [0, 2, 4].map(i => Number.parseInt(hex.slice(i, i + 2), 16));
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };
</script>

<span
  class="inline-flex max-w-full items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium"
  style="background:{tint(0.12)}; box-shadow: inset 0 0 0 1px {tint(0.35)}; color:{color}"
>
  <span class="h-2 w-2 shrink-0 rounded-full" style="background:{color}"></span>
  <span class="truncate">{role?.name ?? missing}</span>
</span>
