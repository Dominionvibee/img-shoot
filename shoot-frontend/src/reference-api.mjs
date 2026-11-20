import { readFile, readdir } from 'node:fs/promises';

// These are public responses captured on 20 November 2026. No live IMG API,
// authentication, submissions, or personal data is proxied by this adapter.
const dataRoot = new URL('../data/', import.meta.url);
const readJson = async path => JSON.parse((await readFile(new URL(path, dataRoot), 'utf8')).replace(/^\uFEFF/, ''));
const [catalog, archive, legacyWorks, categories, initialTalent, searchWorks, regularWork] = await Promise.all([
  readJson('talent.json'), readJson('archive.json'), readJson('work.json'),
  readJson('reference-api/directory-categories.json'), readJson('reference-api/talent-all.json'),
  readJson('reference-api/sample-search-work.json'), readJson('reference-api/work-131321.json'),
]);
const categoryById = new Map(categories.flatMap(item => [[String(item.term_id), item.slug], [item.slug, item.slug]]));
const talentMetadata = new Map(catalog.entries.map(item => [String(item.id), item]));
const rosterSnapshots = new Map();
const featuredSnapshots = new Map();
for (const filename of await readdir(new URL('reference-api/', dataRoot))) {
  if (/^talent-(?!all\.)/.test(filename)) rosterSnapshots.set(filename.replace(/^talent-|\.json$/g, ''), await readJson(`reference-api/${filename}`));
  if (/^featured-work-\d+\.json$/.test(filename)) featuredSnapshots.set(filename.match(/\d+/)[0], await readJson(`reference-api/${filename}`));
}
const unique = (items, key) => [...new Map(items.map(item => [key(item), item])).values()];
const allTalent = unique([...rosterSnapshots.values()].flat(), item => String(item.talent_id));
const archiveCards = unique(archive.pages.flatMap(page => page.cards), item => String(item.featuredId));
const footer = regularWork[0].footer;
const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const normalize = value => String(value ?? '').normalize('NFKD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase();
const compareNames = (a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });
const activeValues = (params, key) => [...params.getAll(`${key}[]`), ...params.getAll(key)].filter(value => value && value !== 'any');
const metadataFor = item => talentMetadata.get(String(item.talent_id ?? item.id));
const talentByName = new Map(allTalent.map(item => [normalize(item.name), item]));
const nameToTalent = name => talentByName.get(normalize(name));

function filterDirectory(params, search = false) {
  const territories = activeValues(params, 'territory');
  const categoryValues = activeValues(params, search ? 'categories' : 'talent-category');
  const selectedCategories = categoryValues.map(value => categoryById.get(value)).filter(Boolean);
  const gender = params.get('gender');
  const query = normalize(params.get('search-term')).trim();
  let rows;
  if (!search && !territories.length && !selectedCategories.length) rows = initialTalent;
  else if (!search && territories.length === 1 && selectedCategories.length === 1) rows = rosterSnapshots.get(`${territories[0]}-${selectedCategories[0]}`) || [];
  else rows = allTalent;
  rows = rows.filter(item => {
    const metadata = metadataFor(item);
    return (!territories.length || territories.some(value => (item.territories || []).includes(value)))
      && (!selectedCategories.length || selectedCategories.some(value => (metadata?.categories || []).includes(value)))
      && (!gender || gender === 'any' || (metadata?.genders || []).includes(gender))
      && (!query || normalize(`${item.name} ${item.slug}`).includes(query));
  });
  if (params.get('sort-by') === 'latest') rows.sort((a, b) => Number(b.id) - Number(a.id));
  else rows.sort(compareNames);
  return rows.map(item => {
    const selectedTerritory = territories.find(value => item.territory_urls?.[value]);
    const result = { ...item, permalink: selectedTerritory ? item.territory_urls[selectedTerritory] : item.permalink };
    if (search) result.territorySelectorOptions = item.territories || [];
    return result;
  });
}

const regularSearchWorks = unique([
  ...legacyWorks.map(item => ({ ...item, talent_name: item.talentName, thumbnail_type: item.thumbnailType })),
  ...searchWorks,
], item => String(item.id));
const workIndex = new Map(regularSearchWorks.map(item => [String(item.id), item]));
const archiveSearchWorks = archiveCards.map(item => ({
  id: `featured-${item.featuredId}`, title: item.title, talent_name: item.talent,
  thumbnail: item.video || item.image, thumbnail_type: item.video ? 'video' : 'picture',
  thumbnail_url: item.video ? item.image || null : undefined,
}));

function filterWork(params) {
  const query = normalize(params.get('search-term')).trim();
  const territories = activeValues(params, 'territory');
  const selectedCategories = activeValues(params, 'categories').map(value => categoryById.get(value)).filter(Boolean);
  const gender = params.get('gender');
  // A captured regular-work response is the complete observed result for its
  // talent. Archive cards provide fallback coverage for uncaptured searches.
  const regularMatches = regularSearchWorks.filter(item => !query || normalize(`${item.title} ${item.talent_name}`).includes(query));
  const source = regularMatches.length ? regularMatches : archiveSearchWorks;
  const result = source.filter(item => {
    const talent = nameToTalent(item.talent_name);
    const metadata = talent && metadataFor(talent);
    return Boolean(item.thumbnail)
      && (!query || normalize(`${item.title} ${item.talent_name}`).includes(query))
      && (!territories.length || territories.some(value => talent?.territories?.includes(value)))
      && (!selectedCategories.length || selectedCategories.some(value => metadata?.categories?.includes(value)))
      && (!gender || gender === 'any' || metadata?.genders?.includes(gender));
  });
  if (params.get('sort-by') === 'az') result.sort((a, b) => a.title.localeCompare(b.title, 'en', { sensitivity: 'base' }));
  return result;
}

function uncapturedWork(id, isFeatured) {
  const card = archiveCards.find(item => String(item.featuredId) === String(id));
  const title = card?.title || 'Gallery unavailable';
  const officialUrl = `https://imgmodels.com/?${isFeatured ? 'featured-work-id' : 'work-id'}=${encodeURIComponent(id)}`;
  const notice = `<div class="freeText flexiLayout"><div class="freeText__inner"><p>This gallery is outside the captured local snapshot. The live gallery is available on <a href="${esc(officialUrl)}" target="_blank" rel="noreferrer">IMG Models</a>.</p></div></div>`;
  const talent = card && nameToTalent(card.talent);
  const detail = { id: talent?.id || '', name: card?.talent || '', permalink: talent?.permalink || '' };
  return [{ id, title: `${title} — local snapshot`, featuredWorkType: 'slider', mediaItems: [],
    talentDetails: isFeatured ? [detail] : detail, flexiLayouts: notice, footer, localSnapshotUnavailable: true }];
}

function singleWork(params) {
  const featuredId = params.get('featured-work-id');
  const workId = params.get('work-id');
  if (featuredId) return featuredSnapshots.get(featuredId) || uncapturedWork(featuredId, true);
  if (!workId) return [];
  if (workId.startsWith('featured-')) {
    const featured = featuredSnapshots.get(workId.slice(9));
    if (!featured) return uncapturedWork(workId.slice(9), false);
    return featured.map(item => ({ ...item, id: workId, talentDetails: {
      ...item.talentDetails[0], name: item.talentDetails.map(talent => talent.name).join(', '),
    } }));
  }
  if (String(regularWork[0].id) === workId) return regularWork;
  const work = workIndex.get(workId);
  if (!work) return uncapturedWork(workId, false);
  const talent = nameToTalent(work.talent_name);
  return [{ ...work, mediaItems: work.mediaItems || [], footer,
    talentDetails: { id: talent?.id || work.talent_id || '', name: work.talent_name || '', permalink: talent?.permalink || '' },
  }];
}

// Rewrite available media to the checked-in assets. Keep uncaptured media URLs
// intact, so missing captures remain visible and can be reported honestly.
async function localize(value) {
  const assets = await readJson('asset-map.json').catch(() => ({}));
  const replacements = Object.entries(assets).sort(([a], [b]) => b.length - a.length);
  const localHref = href => {
    if (!href.startsWith('https://imgmodels.com/')) return href;
    const url = new URL(href); return `${url.pathname}${url.search}${url.hash}`;
  };
  function visit(item) {
    if (typeof item === 'string') {
      if (assets[item]) return assets[item];
      if (item.startsWith('https://imgmodels.com/')) return localHref(item);
      if (item.includes('<')) {
        for (const [remote, local] of replacements) item = item.split(remote).join(local);
        item = item.replace(/href="(https:\/\/imgmodels\.com\/[^"]*)"/g, (_match, href) => `href="${localHref(href)}"`);
      }
      return item;
    }
    if (Array.isArray(item)) return item.map(visit);
    if (item && typeof item === 'object') return Object.fromEntries(Object.entries(item).map(([key, child]) => [key, visit(child)]));
    return item;
  }
  return visit(value);
}

/** Resolves only captured, read-only public API contracts. */
export async function referenceApi(input) {
  const url = input instanceof URL ? input : new URL(input, 'http://localhost');
  const endpoint = url.pathname.replace(/^\/wp-json\/wme\/v1\//, '').replace(/\/$/, '');
  let body;
  switch (endpoint) {
    case 'get_directory_categories': body = categories; break;
    case 'get_talent': body = filterDirectory(url.searchParams); break;
    case 'get_search_directory_items': body = filterDirectory(url.searchParams, true); break;
    case 'get_work': body = filterWork(url.searchParams); break;
    case 'get_single_work': {
      const featured=url.searchParams.get('featured-work-id'), work=url.searchParams.get('work-id');
      const id=featured||work;
      const captured=/^\d+$/.test(id||'') ? await readJson(`reference-api/${featured?'featured-work':'work'}-${id}.json`).catch(()=>null) : null;
      body=captured||singleWork(url.searchParams);break;
    }
    case 'get_search_dropdown_items': {
      body = { talent: filterDirectory(url.searchParams, true).slice(0, 10), work: filterWork(url.searchParams).sort((a, b) => a.title.localeCompare(b.title)).slice(0, 10).map(({ id, title }) => ({ id, title })) };
      break;
    }
    default: return { status: 404, body: { code: 'local_snapshot_endpoint_unavailable', message: 'This endpoint is not part of the captured local snapshot.' } };
  }
  return { status: 200, body: await localize(body) };
}

export async function handleReferenceApi(req, res) {
  const url = new URL(req.url, 'http://localhost');
  if (!url.pathname.startsWith('/wp-json/wme/v1/')) return false;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8', Allow: 'GET, HEAD' });
    res.end(JSON.stringify({ message: 'The local snapshot supports read-only requests.' }));
    return true;
  }
  try {
    const { status, body } = await referenceApi(url);
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Data-Source': 'local-public-snapshot-2026-11-20' });
    res.end(req.method === 'HEAD' ? undefined : JSON.stringify(body));
  } catch {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ message: 'The local snapshot could not be read.' }));
  }
  return true;
}
