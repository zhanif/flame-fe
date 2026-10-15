import { router } from '$lib/stores/router.svelte';

/** A piece of a page's state that lives in the address (`?key=value`): reading it is reactive, writing it is a new
 *  history step, and the fallback is left out of the address. `bind:value={tab.value}` works on it. */
export function urlParam(key: string, fallback = '') {
  return {
    get value(): string {
      return router.query.get(key) ?? fallback;
    },
    set value(next: string) {
      router.setQuery({ [key]: next === fallback ? null : next });
    },
  };
}

/** The same for a whole number (a page number, say). */
export function urlNumber(key: string, fallback = 1) {
  return {
    get value(): number {
      return Number(router.query.get(key)) || fallback;
    },
    set value(next: number) {
      router.setQuery({ [key]: next === fallback ? null : String(next) });
    },
  };
}
