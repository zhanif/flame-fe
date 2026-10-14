import { api, type ModuleEntry } from '$lib/api/endpoints';

/** The module catalog of the server being viewed: what exists and what is installed
 *  in it. The sidebar and the Dashboard both read it, so installing or removing a
 *  module updates both at once. */
class ModuleCatalog {
  private _entries: ModuleEntry[] = $state([]);
  private _loading = $state(true);
  private guildId: string | null = null;

  get entries(): ModuleEntry[] {
    return this._entries;
  }

  /** True until the first answer for the current server arrives. */
  get loading(): boolean {
    return this._loading;
  }

  async load(guildId: string): Promise<void> {
    if (this.guildId !== guildId) {
      this.guildId = guildId;
      this._entries = [];
      this._loading = true;
    }
    await this.reload();
  }

  async reload(): Promise<void> {
    if (!this.guildId) return;
    const guildId = this.guildId;
    try {
      const entries = await api.modules(guildId);
      if (guildId === this.guildId) this._entries = entries;
    } finally {
      if (guildId === this.guildId) this._loading = false;
    }
  }
}

export const moduleCatalog = new ModuleCatalog();
