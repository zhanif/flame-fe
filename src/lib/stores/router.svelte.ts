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
  /** `?key=value` after the path: where a page is inside itself (the open item, the page number, a filter). */
  query: URLSearchParams;
}

// Hash routing: `#/` is the server list, `#/guild/<id>/<page>` a server page,
// `#/guild/<id>/m/<moduleId>` the page of an installed module. A page keeps its own state in `?key=value`
// after the path, so a link opens exactly where it was copied and Back goes one step, not to the start.
function parse(): Route {
  const [path, search = ''] = window.location.hash.replace(/^#/, '').split('?');
  const query = new URLSearchParams(search);
  const [, root, guildId, page, moduleId] = path.split('/');
  if (root === 'privacy' || root === 'terms') return { legal: root, guildId: null, page: 'dashboard', moduleId: null, query };
  if (root === 'guild' && guildId) {
    if (page === 'm' && moduleId) return { legal: null, guildId, page: 'dashboard', moduleId, query };
    return { legal: null, guildId, page: GUILD_PAGES.includes(page as GuildPage) ? (page as GuildPage) : 'dashboard', moduleId: null, query };
  }
  return { legal: null, guildId: null, page: 'dashboard', moduleId: null, query };
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
  get query() {
    return _route.query;
  },
  /** Changes some `?key=value` of the current page (`null` removes one) as a new history step. */
  setQuery(patch: Record<string, string | null>) {
    const next = new URLSearchParams(_route.query);
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === '') next.delete(key);
      else next.set(key, value);
    }
    const path = window.location.hash.replace(/^#/, '').split('?')[0];
    const search = next.toString();
    window.location.hash = `#${path}${search ? `?${search}` : ''}`;
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
