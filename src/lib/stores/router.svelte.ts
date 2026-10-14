export type GuildPage = 'dashboard' | 'settings' | 'audit' | 'slash';

const GUILD_PAGES: GuildPage[] = ['dashboard', 'settings', 'audit', 'slash'];

export type LegalPage = 'privacy' | 'terms';

interface Route {
  /** A public legal page: `#/privacy`, `#/terms`. Shown with or without a session. */
  legal: LegalPage | null;
  guildId: string | null;
  page: GuildPage;
  /** Set on a module's own page: `#/guild/<id>/m/<moduleId>`. */
  moduleId: string | null;
}

// Hash routing: `#/` is the server list, `#/guild/<id>/<page>` a server page,
// `#/guild/<id>/m/<moduleId>` the page of an installed module.
function parse(): Route {
  const [, root, guildId, page, moduleId] = window.location.hash.replace(/^#/, '').split('/');
  if (root === 'privacy' || root === 'terms') return { legal: root, guildId: null, page: 'dashboard', moduleId: null };
  if (root === 'guild' && guildId) {
    if (page === 'm' && moduleId) return { legal: null, guildId, page: 'dashboard', moduleId };
    return { legal: null, guildId, page: GUILD_PAGES.includes(page as GuildPage) ? (page as GuildPage) : 'dashboard', moduleId: null };
  }
  return { legal: null, guildId: null, page: 'dashboard', moduleId: null };
}

let _route: Route = $state(parse());
window.addEventListener('hashchange', () => (_route = parse()));

export const router = {
  get legal() {
    return _route.legal;
  },
  get guildId() {
    return _route.guildId;
  },
  get page() {
    return _route.page;
  },
  get moduleId() {
    return _route.moduleId;
  },
  home() {
    window.location.hash = '#/';
  },
  legalPage(page: LegalPage) {
    window.location.hash = `#/${page}`;
    window.scrollTo(0, 0);
  },
  guild(guildId: string, page: GuildPage = 'dashboard') {
    window.location.hash = `#/guild/${guildId}/${page}`;
  },
  module(guildId: string, moduleId: string) {
    window.location.hash = `#/guild/${guildId}/m/${moduleId}`;
  },
};
