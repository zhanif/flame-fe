<script lang="ts">
  import ThemeToggle from '$lib/components/ThemeToggle.svelte';
  import { bot } from '$lib/stores/bot.svelte';
  import { type LegalPage, router } from '$lib/stores/router.svelte';
  import { session } from '$lib/stores/session.svelte';
  import { ArrowLeft, ArrowRight, Flame } from '@lucide/svelte';
  import type { Snippet } from 'svelte';

  // The frame of a legal page: a slim bar (back, theme), the title with its date, the
  // sections, and a link to the sibling document. Public: it works without a login.
  let {
    title,
    updated,
    other,
    children,
  }: { title: string; updated: string; other: { page: LegalPage; label: string }; children: Snippet } = $props();

  // A signed in person came from the dashboard; a visitor came from the landing page.
  const back = () => router.home();
</script>

<div class="min-h-screen">
  <div class="sticky top-0 z-30 border-b border-zinc-800/50 bg-zinc-950/70 backdrop-blur-md">
    <div class="max-w-3xl mx-auto flex items-center justify-between gap-3 px-5 h-14">
      <button type="button" onclick={back} class="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-zinc-100 cursor-pointer transition-colors">
        <ArrowLeft class="w-4 h-4" />{session.me ? 'Back to dashboard' : 'Back'}
      </button>
      <div class="flex items-center gap-2 min-w-0">
        {#if bot.avatar}
          <img src={bot.avatar} alt="" class="w-6 h-6 rounded-full" />
        {:else}
          <Flame class="w-4 h-4 text-orange-400" />
        {/if}
        <span class="font-display text-sm font-bold text-zinc-100 truncate">{bot.name}</span>
        <ThemeToggle />
      </div>
    </div>
  </div>

  <main class="max-w-3xl mx-auto px-5 py-10">
    <header class="mb-8 pb-6 border-b border-zinc-800/50">
      <h1 class="font-display text-3xl font-extrabold tracking-tight text-zinc-100">{title}</h1>
      <p class="mt-2 text-xs text-zinc-500">Last updated {updated}</p>
    </header>

    <div class="space-y-8">{@render children()}</div>

    <footer class="mt-12 pt-6 border-t border-zinc-800/50 flex items-center justify-between gap-3">
      <p class="text-xs text-zinc-500">{bot.name} is a Discord bot and is not affiliated with or endorsed by Discord.</p>
      <button type="button" onclick={() => router.legalPage(other.page)} class="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-400 hover:text-orange-300 cursor-pointer whitespace-nowrap">
        {other.label}<ArrowRight class="w-3.5 h-3.5" />
      </button>
    </footer>
  </main>
</div>
