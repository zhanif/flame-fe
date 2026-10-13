import { api, type Me, type UserGuild } from '$lib/api/endpoints';

let _me: Me | null = $state(null);
let _loading = $state(true);
let _guilds: UserGuild[] = $state([]);
let _guildsLoading = $state(false);

export const session = {
  get me() {
    return _me;
  },
  get loading() {
    return _loading;
  },
  get guilds() {
    return _guilds;
  },
  get guildsLoading() {
    return _guildsLoading;
  },

  async check(): Promise<void> {
    _loading = true;
    try {
      _me = await api.me();
    } catch {
      _me = null;
    } finally {
      _loading = false;
    }
  },

  /** Always fetched fresh, `bot_present` and `access` reflect the live bot. */
  async loadGuilds(): Promise<void> {
    _guildsLoading = true;
    try {
      _guilds = await api.guilds();
    } finally {
      _guildsLoading = false;
    }
  },

  guild(id: string | null): UserGuild | null {
    return id ? (_guilds.find(g => g.id === id) ?? null) : null;
  },

  async logout(): Promise<void> {
    await api.logout().catch(() => {});
    _me = null;
    _guilds = [];
  },
};
