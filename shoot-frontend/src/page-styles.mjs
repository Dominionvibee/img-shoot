// Keep parsed stylesheets attached across routes. Disabling a <link> can discard
// its sheet and trigger another request when it is enabled again.
const themeStyles = [
  ['media-player-style', '/assets/mediaelement/mediaelementplayer-legacy.min.css'],
  ['wp-media-style', '/assets/mediaelement/wp-mediaelement.min.css'],
  ['reference-style', '/src/reference.css'],
  ['consent-style', '/src/cookie.css'],
  ['integration-style', '/src/styles.css'],
];
const localStyle = ['local-style', '/src/local-pages.css'];

export function createPageStyleManager(document) {
  const pending = new Map();
  const managed = new Map();
  const absolute = href => new URL(href, document.baseURI).href;
  for (const [id, href] of [...themeStyles, localStyle]) {
    const link = document.getElementById(id);
    if (link) managed.set(absolute(href), link);
  }
  const isolated = page => Boolean(page.kind && page.kind !== 'img');
  const required = page => [
    ...(isolated(page) ? [] : themeStyles.map(([, href]) => href)),
    ...(page.styles || []),
    localStyle[1],
  ].map(absolute);

  function parsed(link) {
    if (!link?.sheet || link.disabled) return false;
    try {
      // A blocked request can leave a sheet object with inaccessible rules.
      // All captured styles are local, so their rules should be readable.
      return Boolean(link.sheet.cssRules);
    } catch {
      return false;
    }
  }

  function load(href) {
    const url = absolute(href);
    if (pending.has(url)) return pending.get(url);
    const existing = [...document.querySelectorAll('link[rel="stylesheet"]')]
      .find(link => link.href === url);
    if (parsed(existing)) {
      managed.set(url, existing);
      return Promise.resolve();
    }

    const promise = new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      // Download and parse without applying another page's theme.
      link.media = 'not all';
      const descriptor = [...themeStyles, localStyle].find(([, path]) => absolute(path) === url);
      if (descriptor) link.id = descriptor[0];
      link.onload = () => {
        link.onload = link.onerror = null;
        managed.set(url, link);
        resolve();
      };
      link.onerror = () => {
        link.remove();
        reject(new Error(`Unable to load page styles: ${new URL(url).pathname}. Please reload to retry.`));
      };
      if (existing) existing.replaceWith(link);
      else {
        // Footer integration rules must follow every page's theme.
        const footer = document.querySelector('#local-style');
        document.head.insertBefore(link, footer);
      }
    });
    pending.set(url, promise);
    promise.catch(() => pending.delete(url));
    return promise;
  }

  return {
    async prepare(page) {
      await Promise.all([...new Set(required(page))].map(load));
    },
    activate(page) {
      const active = new Set(required(page));
      for (const [href, link] of managed) {
        link.media = active.has(href) ? 'all' : 'not all';
      }
    },
  };
}
