<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  type Props = HTMLButtonAttributes & {
    variant?: 'primary' | 'soft' | 'secondary' | 'ghost' | 'danger' | 'success';
    size?: 'sm' | 'md' | 'icon';
    href?: string;
    target?: string;
    rel?: string;
    children: Snippet;
  };

  let { variant = 'secondary', size = 'md', href, class: className = '', children, ...rest }: Props = $props();

  // Primary is the one loud button per view (Save, Push, Log in). `soft` is the tinted
  // action for items in a list or grid (Manage, Install). The rest stay quiet.
  const VARIANTS = {
    primary:
      'bg-orange-500 text-white shadow-sm shadow-orange-500/20 hover:bg-orange-600 hover:shadow-md hover:shadow-orange-500/25',
    soft: 'bg-orange-500/10 text-orange-400 ring-1 ring-orange-500/25 hover:bg-orange-500/20',
    secondary: 'bg-zinc-800/60 text-zinc-300 ring-1 ring-zinc-700/60 hover:bg-zinc-700/60 hover:text-zinc-100',
    ghost: 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60',
    danger: 'bg-red-500/10 text-red-400 ring-1 ring-red-500/25 hover:bg-red-500/20',
    success: 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20 hover:bg-emerald-600',
  } as const;
  const SIZES = { sm: 'h-7 px-2.5 text-xs', md: 'h-8 px-3 text-xs', icon: 'h-7 w-7' } as const;
</script>

<svelte:element
  this={href ? 'a' : 'button'}
  {href}
  class="inline-flex items-center justify-center gap-2 rounded-lg font-semibold whitespace-nowrap select-none transition duration-150 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:active:scale-100 {SIZES[size]} {VARIANTS[variant]} {className}"
  {...rest}
>
  {@render children()}
</svelte:element>
