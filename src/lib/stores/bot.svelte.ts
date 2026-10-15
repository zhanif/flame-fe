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

// Inside a server the bot may have a nickname and an avatar of its own there: they take the place of the global ones
// everywhere the dashboard shows the bot, until the server is left. The last look of each server is kept, so entering
// one paints its nickname at once instead of the global name for a moment.
interface GuildLook {
  name: string;
  avatar_url: string;
}

const guildKey = (guildId: string) => `flame:bot-guild:${guildId}`;

function readGuild(guildId: string): GuildLook | null {
  try {
    const raw = localStorage.getItem(guildKey(guildId));
    return raw ? (JSON.parse(raw) as GuildLook) : null;
  } catch {
    return null;
  }
}

let _guildId: string | null = null;
let _guild: GuildLook | null = $state(null);

export const bot = {
  get name() {
    return _guild?.name ?? _bot?.name ?? 'the bot';
  },
  get avatar() {
    return _guild?.avatar_url ?? _bot?.avatar_url ?? null;
  },
  get inviteUrl() {
    return _bot?.invite_url ?? null;
  },

  /** A server was opened: its last known look is used at once. */
  enterGuild(guildId: string): void {
    _guildId = guildId;
    _guild = readGuild(guildId);
  },

  /** The server was left: the global look is back. */
  leaveGuild(): void {
    _guildId = null;
    _guild = null;
  },

  /** The live look of a server, from the API (ignored when another server is open by now). */
  useGuild(guildId: string, look: GuildLook): void {
    if (_guildId !== guildId) return;
    _guild = look;
    try {
      localStorage.setItem(guildKey(guildId), JSON.stringify(look));
    } catch {
      /* the look is only a convenience */
    }
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
