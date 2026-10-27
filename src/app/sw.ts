/// <reference lib="webworker" />
import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  // The app's own page parameters (/recipes?saved=…, /recipes?install=1,
  // /recipes/new?draft=…) don't change the page: offline it must still come
  // from the precache, not fall back to "/". Only these, plus Serwist's
  // defaults: Next's ?_rsc= requests must not get a page's HTML.
  precacheOptions: { ignoreURLParametersMatching: [/^utm_/, /^fbclid$/, /^saved$/, /^install$/, /^draft$/] },
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: "/",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

// Registered before Serwist's listener, so these win.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Supabase, PowerSync and Sentry (and Sentry's /monitoring tunnel) always go
  // straight to the network: cached auth or sync responses would be stale.
  // Leaving them alone lets the browser send them as if there were no service
  // worker.
  if (url.origin !== self.location.origin || url.pathname.startsWith("/monitoring")) {
    event.stopImmediatePropagation();
    return;
  }

  // PowerSync's database and sync workers are started by Turbopack with their
  // settings in the script's address (after "#params=" or in "?params="). A
  // response from the cache carries its own, shorter address, and WebKit
  // (iPhone Safari) gives the worker that one: the settings are lost and
  // PowerSync can't open when the app is reopened. So worker scripts come from
  // the precache but are rebuilt without an address, which keeps the one the
  // worker was started with.
  if (request.destination === "worker" || request.destination === "sharedworker") {
    event.stopImmediatePropagation();
    event.respondWith(
      (async () => {
        url.search = "";
        url.hash = "";
        const response = (await serwist.matchPrecache(url.href)) ?? (await fetch(url.href));
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      })(),
    );
  }
});

serwist.addEventListeners();
