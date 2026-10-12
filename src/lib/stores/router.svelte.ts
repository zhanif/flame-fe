export type GuildPage = 'modules' | 'slash' | 'settings' | 'audit';

const GUILD_PAGES: GuildPage[] = ['modules', 'slash', 'settings', 'audit'];

interface Route {
  guildId: string | null;
  page: GuildPage;
}

// Hash routing: `#/` is the server list, `#/guild/<id>/<page>` a server.
function parse(): Route {
  const [, root, guildId, page] = window.location.hash.replace(/^#/, '').split('/');
  if (root === 'guild' && guildId) {
    return { guildId, page: GUILD_PAGES.includes(page as GuildPage) ? (page as GuildPage) : 'modules' };
  }
  return { guildId: null, page: 'modules' };
}

let _route: Route = $state(parse());
window.addEventListener('hashchange', () => (_route = parse()));

export const router = {
  get guildId() {
    return _route.guildId;
  },
  get page() {
    return _route.page;
  },
  home() {
    window.location.hash = '#/';
  },
  guild(guildId: string, page: GuildPage = 'modules') {
    window.location.hash = `#/guild/${guildId}/${page}`;
  },
};
