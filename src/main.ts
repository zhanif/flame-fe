import { defineConfig, install } from '@twind/core';
import presetAutoprefix from '@twind/preset-autoprefix';
import presetTailwind from '@twind/preset-tailwind';
import { mount } from 'svelte';
import App from './App.svelte';

// Twind generates the utility CSS at runtime from the classes in the DOM.
install(
  defineConfig({
    presets: [presetAutoprefix(), presetTailwind()],
    hash: false,
    preflight: {
      body: { backgroundColor: '#020617', color: '#e2e8f0', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' },
    },
  }),
);

mount(App, { target: document.getElementById('app')! });
