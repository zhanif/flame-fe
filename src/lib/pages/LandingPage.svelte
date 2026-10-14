<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import LegalLinks from '$lib/components/LegalLinks.svelte';
  import ThemeToggle from '$lib/components/ThemeToggle.svelte';
  import Tile from '$lib/components/Tile.svelte';
  import { bot } from '$lib/stores/bot.svelte';
  import type { Tone } from '$lib/ui';
  import { Blocks, Flame, MousePointerClick, Plus, ScrollText, SlidersHorizontal } from '@lucide/svelte';
  import type { Component } from 'svelte';

  const features: { icon: Component<any>; tone: Tone; title: string; text: string }[] = [
    { icon: Blocks, tone: 'orange', title: 'Modular', text: 'A server starts with nothing. Install only the modules you want, and remove them with their data whenever you like.' },
    { icon: SlidersHorizontal, tone: 'sky', title: 'Per server', text: 'Every setting belongs to one server and lives in the dashboard, not in files or shared config.' },
    { icon: MousePointerClick, tone: 'emerald', title: 'Your click', text: 'Slash commands and bulk role changes happen only when an admin clicks, one command at a time.' },
    { icon: ScrollText, tone: 'violet', title: 'Audit trail', text: 'Every configuration change is recorded with who made it, what changed and why.' },
  ];
</script>

<div class="min-h-screen flex flex-col">
  <header class="flex items-center justify-between gap-3 px-5 h-16">
    <div class="flex items-center gap-2.5 min-w-0">
      {#if bot.avatar}
        <img src={bot.avatar} alt="" class="w-7 h-7 rounded-full" />
      {:else}
        <Tile icon={Flame} tone="orange" size="sm" />
      {/if}
      <span class="font-display text-sm font-bold text-zinc-100 truncate">{bot.name}</span>
    </div>
    <ThemeToggle />
  </header>

  <main class="flex-1 flex flex-col items-center justify-center px-5 py-10">
    <section class="max-w-md w-full text-center">
      {#if bot.avatar}
        <img src={bot.avatar} alt={bot.name} class="w-24 h-24 rounded-full mx-auto mb-6 ring-4 ring-orange-500/30 shadow-lg shadow-orange-500/20" />
      {:else}
        <div class="mx-auto mb-6"><Tile icon={Flame} tone="orange" size="lg" /></div>
      {/if}
      <h1 class="font-display text-5xl font-extrabold tracking-tight mb-3 text-orange-400">{bot.name}</h1>
      <p class="text-sm text-zinc-400 mb-7 leading-relaxed">One Discord bot for every server. Install the modules you need and run them from one dashboard.</p>
      <div class="flex flex-col sm:flex-row gap-3 justify-center">
        <Button variant="primary" href="/api/auth/login" class="!h-10 !text-sm sm:min-w-48">Log in with Discord</Button>
        {#if bot.inviteUrl}
          <Button variant="secondary" href={bot.inviteUrl} target="_blank" rel="noreferrer" class="!h-10 !text-sm sm:min-w-48"><Plus class="w-4 h-4" />Add to your server</Button>
        {/if}
      </div>
    </section>

    <section class="mt-14 w-full max-w-4xl grid gap-4" style="grid-template-columns: repeat(auto-fit, minmax(210px, 1fr))">
      {#each features as feature (feature.title)}
        <div class="rounded-2xl border border-zinc-700/60 bg-zinc-900 p-5 shadow-sm shadow-black/10">
          <Tile icon={feature.icon} tone={feature.tone} />
          <h2 class="mt-4 font-display text-sm font-bold text-zinc-100">{feature.title}</h2>
          <p class="mt-1.5 text-xs leading-relaxed text-zinc-400">{feature.text}</p>
        </div>
      {/each}
    </section>
  </main>

  <footer class="px-5 py-6 border-t border-zinc-800/50">
    <div class="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500">
      <p>&copy; {new Date().getFullYear()} {bot.name}. Not affiliated with Discord.</p>
      <LegalLinks />
    </div>
  </footer>
</div>
