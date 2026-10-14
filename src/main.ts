import { defineConfig, install } from '@twind/core';
import presetAutoprefix from '@twind/preset-autoprefix';
import presetTailwind from '@twind/preset-tailwind';
import { mount } from 'svelte';
import App from './App.svelte';
import './theme.css';

const channel = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;
const scale = (name: string, shades: number[]) =>
  Object.fromEntries(shades.map(s => [s, channel(`${name}-${s}`)]));
const accent = (name: string) => scale(name, [300, 400]);

// Twind generates the utility CSS at runtime from the classes in the DOM.
// The zinc scale and the accent text shades read CSS variables (theme.css),
// which is what makes light/dark work.
install(
  defineConfig({
    presets: [presetAutoprefix(), presetTailwind()],
    hash: false,
    theme: {
      extend: {
        colors: {
          zinc: scale('zinc', [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]),
          orange: accent('orange'),
          sky: accent('sky'),
          cyan: accent('cyan'),
          violet: accent('violet'),
          emerald: accent('emerald'),
          amber: accent('amber'),
          fuchsia: accent('fuchsia'),
          red: accent('red'),
        },
        fontFamily: { display: ['"Plus Jakarta Sans"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      },
    },
    preflight: {
      body: {
        backgroundColor: 'rgb(var(--zinc-950))',
        color: 'rgb(var(--zinc-200))',
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      },
    },
  }),
);

mount(App, { target: document.getElementById('app')! });
