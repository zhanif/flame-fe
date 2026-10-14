<script lang="ts">
  // Flat gray illustrations for empty states. All share one ground shadow and the
  // same two grays, so they read as a set.
  export type ArtKind = 'server' | 'commands' | 'log' | 'search' | 'modules' | 'quote';

  let { kind }: { kind: ArtKind } = $props();
</script>

<svg viewBox="0 0 120 120" class="w-28 h-28" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <ellipse cx="60" cy="106" rx="36" ry="5" class="fill-zinc-800" />

  {#if kind === 'server'}
    <rect x="22" y="20" width="76" height="34" rx="9" class="fill-zinc-800 stroke-zinc-600" />
    <rect x="22" y="60" width="76" height="34" rx="9" class="fill-zinc-800 stroke-zinc-600" />
    <circle cx="38" cy="37" r="3.5" class="fill-zinc-600 stroke-none" />
    <circle cx="38" cy="77" r="3.5" class="fill-zinc-600 stroke-none" />
    <path d="M52 37h30M52 77h18" class="stroke-zinc-600" stroke-width="4" />
    <circle cx="92" cy="88" r="17" class="fill-zinc-900 stroke-zinc-500" />
    <path d="M85 81l14 14M99 81L85 95" class="stroke-zinc-400" />
  {:else if kind === 'commands'}
    <rect x="16" y="22" width="88" height="68" rx="10" class="fill-zinc-800 stroke-zinc-600" />
    <path d="M16 38h88" class="stroke-zinc-600" />
    <circle cx="27" cy="30" r="2.5" class="fill-zinc-600 stroke-none" />
    <circle cx="36" cy="30" r="2.5" class="fill-zinc-600 stroke-none" />
    <circle cx="45" cy="30" r="2.5" class="fill-zinc-600 stroke-none" />
    <path d="M30 52l9 7-9 7" class="stroke-zinc-400" />
    <path d="M46 68h20" class="stroke-zinc-600" stroke-width="4" />
    <circle cx="90" cy="82" r="16" class="fill-zinc-900 stroke-zinc-500" />
    <path d="M95 74L85 90" class="stroke-zinc-400" />
  {:else if kind === 'log'}
    <rect x="28" y="14" width="64" height="82" rx="9" class="fill-zinc-800 stroke-zinc-600" />
    <path d="M42 34h36M42 48h36M42 62h20" class="stroke-zinc-600" stroke-width="4" />
    <circle cx="86" cy="86" r="16" class="fill-zinc-900 stroke-zinc-500" />
    <path d="M86 77v9l6 4" class="stroke-zinc-400" />
  {:else if kind === 'search'}
    <rect x="22" y="18" width="62" height="74" rx="9" class="fill-zinc-800 stroke-zinc-600" />
    <path d="M36 36h34M36 50h22" class="stroke-zinc-600" stroke-width="4" />
    <circle cx="76" cy="70" r="16" class="fill-zinc-900 stroke-zinc-500" />
    <path d="M88 82l10 10" class="stroke-zinc-400" />
    <path d="M70 70h12" class="stroke-zinc-400" />
  {:else if kind === 'quote'}
    <path d="M26 22h68a10 10 0 0 1 10 10v38a10 10 0 0 1-10 10H64L46 96V80H26a10 10 0 0 1-10-10V32a10 10 0 0 1 10-10Z" class="fill-zinc-800 stroke-zinc-600" />
    <path d="M40 60c0-9 2-15 9-19M66 60c0-9 2-15 9-19" class="stroke-zinc-400" stroke-width="4" />
  {:else}
    <rect x="18" y="52" width="40" height="40" rx="9" class="fill-zinc-800 stroke-zinc-600" />
    <rect x="62" y="52" width="40" height="40" rx="9" class="fill-zinc-800 stroke-zinc-600" />
    <rect x="40" y="10" width="40" height="36" rx="9" class="stroke-zinc-600" stroke-dasharray="5 5" />
    <path d="M60 22v12M54 28h12" class="stroke-zinc-500" />
    <path d="M30 72h16M74 72h16" class="stroke-zinc-600" stroke-width="4" />
  {/if}
</svg>
