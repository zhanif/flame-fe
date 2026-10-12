import { api, type BotInfo } from '$lib/api/endpoints';

const STORAGE_KEY = 'flame:bot';

function readCache(): BotInfo | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as BotInfo) : null;
  } catch {
    return null;
  }
}

// The cached copy paints at once; `load()` refreshes it from the live bot.
let _bot: BotInfo | null = $state(readCache());

export const bot = {
  get name() {
    return _bot?.name ?? 'the bot';
  },
  get avatar() {
    return _bot?.avatar_url ?? null;
  },
  get inviteUrl() {
    return _bot?.invite_url ?? null;
  },

  async load(): Promise<void> {
    try {
      _bot = await api.botInfo();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(_bot));
      if (_bot.name) document.title = `${_bot.name} Dashboard`;
    } catch {
      /* keep whatever is cached */
    }
  },
};
