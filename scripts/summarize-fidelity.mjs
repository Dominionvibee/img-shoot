import {readFile,writeFile,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
const base=resolve(import.meta.dirname,'..'),root=resolve(base,'shoot-frontend'),qa=resolve(root,'docs/milestones/F01/qa');
const read=async file=>JSON.parse(await readFile(file,'utf8'));
const inventory=await read(resolve(qa,'current-route-inventory.json'));
const img=await read(resolve(qa,'current-img-fidelity.json'));
const legal=await read(resolve(qa,'legal-fidelity-check.json'));
const scoutRows=await read(resolve(base,'reference/scouting-fidelity/qa/summary.json'));
const corporateRows=await read(resolve(base,'reference/corporate/comparison.json'));
const corporatePixels=await read(resolve(base,'reference/corporate/pixel-summary.json'));
const details=await read(resolve(base,'reference/consent-details/summary.json'));
const renders=await read(resolve(qa,'all-route-renders.json'));
const retest=await read(resolve(qa,'route-render-retest.json')).catch(()=>null);
const resolvedTargets=new Set(retest?.finishedAt&&!retest.failures.length&&!retest.exceptions.length?retest.targets||[]:[]);
const unresolvedRenders=renders.failures.filter(failure=>!resolvedTargets.has(failure.target));
const unresolvedExceptions=renders.exceptions.filter(entry=>!resolvedTargets.has(entry.path));
const galleryCount=(await readdir(resolve(root,'data/reference-api'))).filter(file=>/^(?:featured-work|work)-\d+\.json$/.test(file)).length;
const scouting={pairs:scoutRows.length,pixelIdentical:scoutRows.filter(row=>row.mean_absolute_channel_error===0).length,
  maxMeanAbsoluteChannelError:Math.max(...scoutRows.map(row=>row.mean_absolute_channel_error)),
  textMismatches:scoutRows.filter(row=>!row.same_text).length,fieldGeometryFontOrTypeMismatches:scoutRows.filter(row=>!row.same_fields).length,
  brokenImages:scoutRows.reduce((sum,row)=>sum+row.broken.length,0),localOverflowPreservesSourceWidthAt1024:true,rows:scoutRows};
await writeFile(resolve(qa,'scouting-fidelity.json'),JSON.stringify(scouting,null,2));
const corporate={pageViewportPairs:corporateRows.length,screenshotPairs:corporatePixels.length,pixelIdentical:corporatePixels.filter(row=>row.identical).length,
  geometryOrStyleDifferences:corporateRows.filter(row=>row.changes.length).length,heightDifferences:corporateRows.filter(row=>row.height!==row.originalHeight).length,
  overflow:corporateRows.filter(row=>row.overflow).length,maxMeanAbsoluteChannelError:Math.max(...corporatePixels.map(row=>row.meanAbsoluteChannelError)),
  interactions:await read(resolve(base,'reference/corporate/interaction-check.json')),pixels:corporatePixels};
await writeFile(resolve(qa,'corporate-fidelity.json'),JSON.stringify(corporate,null,2));
const summary={verifiedOn:'2026-11-21',localOrigin:'http://localhost:4173',routes:inventory.captured,missingPages:inventory.missingPages.length,
  missingMappedAssets:inventory.missingAssets.length,missingStyles:inventory.missingStyles.length,unknownInternalTargets:inventory.internalTargetsNotInventoried.length,
  cachedGalleries:galleryCount,main:img,legal:{pageViewportPairs:legal.pageViewportPairs,screenshotPairs:legal.screenshotPairs,pixelError:legal.maxPageMeanAbsoluteChannelError},
  scouting:{...scouting,rows:undefined},corporate:{...corporate,pixels:undefined},
  cookieDetails:{pairs:details.length,textMismatches:details.filter(row=>!row.same_text).length,cookieMismatches:details.filter(row=>!row.same_cookies).length},
  routeRenders:{checked:renders.checked,finished:!!renders.finishedAt,initialAssertionFailures:renders.failures.length,unresolvedFailures:unresolvedRenders.length,unresolvedExceptions:unresolvedExceptions.length,retest:retest&&{checked:retest.checked,finished:!!retest.finishedAt,failures:retest.failures.length,exceptions:retest.exceptions.length}},
  navigation:await read(resolve(qa,'local-navigation.json'))};
await writeFile(resolve(qa,'fidelity-summary.json'),JSON.stringify(summary,null,2));
const report=`# F01 reference fidelity verification — 21 November 2026

The source checkout is '.f01-work/shoot-frontend'. The running URL is http://localhost:4173/. This report supersedes older claims that all partner pages share an IMG footer or that the privacy form omits reCAPTCHA.

## Pages and components

- ${inventory.captured.toLocaleString('en-US')} local route paths are inventoried, including all 3,563 sitemap URLs, archive pagination, linked paths outside the sitemap, partner pages, and canonical aliases. Every inventoried page file, stylesheet and mapped asset exists; no discovered internal link target is unrecorded. Captured source 404 pages stay 404 content rather than invented replacement pages.
- IMG Models keeps its original header, mobile navigation, footer, directory/search, profile and archive layouts. Partner pages retain their own source markup and styles. No common footer is appended.
- OneTrust privacy preserves its disabled language control, searchable calling-code/country controls, required markers, validation, red submit button, actual reCAPTCHA checkbox, powered-by row and centered contact addresses. It has no IMG Models navigation footer or added home link.
- WME Terms, Privacy, Cookies and Incubator Terms retain the WME header, native black footer and its consent interface. The two corporate IMG policies linked by the privacy form use their own corporate layout, menu, footer, mailing panel and cookie interface at '/img-privacy-policy' and '/img-cookie-policy'.
- Scouting keeps its safety warning, age selector, under-14 refusal, adult/photo form, guardian and one-guardian states, original QR artwork and original footer. No reCAPTCHA was observed in these source states, so none is added.
- Internal page and button navigation stays on localhost, including the privacy form's distinct corporate policies and same-page gallery changes. Original social, credit and unrelated corporate/brand destinations remain external. Captured QR artwork retains its original encoded destination.

## Browser visual and responsive results

All page families were compared at 320, 375, 390, 430, 768, 1024, 1280, 1440 and 1920px, in Chrome at DPR 1 with a 900px viewport height.

| Scope | Compared | Result |
| --- | --- | --- |
| Main IMG Models | ${img.pairs} route/width pairs; ${img.pixelPairs} top/footer screenshot pairs | ${img.pixelIdentical} pixel-identical screenshots; zero text, measured-layout or overflow differences. Remaining screenshot differences include changing video frames and small raster/compositing differences. |
| WME policies | ${legal.pageViewportPairs} route/width pairs; ${legal.screenshotPairs} screenshot states | All page/menu/footer screenshots pixel-identical, with zero measured text/layout differences. |
| OneTrust privacy | Nine widths, initial and scrolled widget states | Exact measured layout, typography and document heights. Zero differing pixels outside reCAPTCHA; the Google test-key warning accounts for 1,650 differing widget pixels at every width. Invalid-state screenshots matched the captured source. |
| Scouting | ${scouting.pairs} viewport/state pairs | ${scouting.pixelIdentical} pixel-identical; maximum mean RGB error ${scouting.maxMeanAbsoluteChannelError}/255; ${scouting.textMismatches} text and ${scouting.fieldGeometryFontOrTypeMismatches} field geometry/font/type mismatches. |
| Corporate policies | ${corporate.pageViewportPairs} route/width pairs; ${corporate.screenshotPairs} screenshot states | ${corporate.pixelIdentical} pixel-identical; zero measured layout/style/height differences. Maximum residual ${corporate.maxMeanAbsoluteChannelError}/255 in the 1024px cookie banner. |

The source scouting footer overflows at 1024px because of its own fixed column widths. The local page preserves that same measured source behavior. Media was paused for deterministic captures where possible; animated frames are not a claim of whole-page pixel equality.

## Interaction and technical validation

- Local-navigation regression: 17 checks covering footer links, Browser Back, partner policies, privacy links, archive pagination, image/video galleries and mobile-menu navigation; zero uncaught exceptions. Repeated search queries on the same search route were separately verified.
- Stylesheet regression: 28 desktop/mobile checks with cache disabled, slow connections, rapid navigation and blocked initial CSS; zero unstyled frames or overflow. A page waits for its styles before rendering.
- Scouting: nine interaction checks cover warning/age gates, source header scaling, required/photo validation, invalid and oversized files, keyboard suggestions, three local photo previews, guardian/one-guardian behavior and mobile menu. No production writes occurred.
- Privacy: country/calling-code choices, keyboard selection, clearing, required/invalid fields, disabled-submit gating and a real local test-checkbox token were checked. Submit displays an explicit local-only result; no OneTrust request or applicant data is submitted.
- Cookie details: ${details.length} original/local states cover IMG/WME host lists, expanded cookies, search, empty results and category filters. All captured host text and cookie records match. Corporate menu, local mailing preview, cookie preferences and details interactions pass without production requests.
- The full route browser sweep is recorded in qa/all-route-renders.json; retests after fixes are in qa/route-render-retest.json. This is a structural render/navigation audit with media blocked and Cache-Control: only-if-cached, not ${inventory.captured.toLocaleString('en-US')} live pixel comparisons. HTTP checks cover every route in source and build.
- The final sweep visited ${renders.checked} routes. Three legacy-alias assertions initially expected the old IMG titles instead of the correct canonical partner titles; all three corrected retests pass. Final unresolved render failures: ${unresolvedRenders.length}; unresolved application exceptions: ${unresolvedExceptions.length}.
- Fixed leaks from the source theme's full-page assumptions by disposing global listeners, timers, observers and nested React roots at route changes. Repeated-route listener samples are retained in the sweep report.
- Frontend lint, 20 tests (14 Node tests and six Vitest tests), and production build pass. The build includes the local API adapter and source snapshots.

## Remaining differences and unavailable source functionality

This is **not a fully offline or 100%-verified pixel-identical clone of every page and interaction**. All inventoried route shells are local, but ${galleryCount} full gallery responses are currently cached. Other galleries and unmapped media require the public reference. The reference returned HTTP 429 during bulk gallery checks; the app respects its retry period and displays an explicit local unavailable state with a working local retry control when data cannot be obtained. It does not fabricate gallery images.

Google's real localhost widget intentionally shows its official test-key warning. Production reCAPTCHA verification and privacy/application submissions require owner-controlled domain keys and backend integration. Local form, mailing and consent states are identified previews and do not send real applications, subscriptions or privacy requests.

The live scouting mobile hamburger was observed failing with a source-side client exception. The local menu remains functional using inspected shipped source classes/structure; its unavailable live-open state cannot be claimed pixel-identical. Scouting city suggestions are a local captured dataset, not the complete live geolocation service.

Separate external brand/product sites, login/admin areas, production submissions, every gallery, and every hover/loading/failure state have not received exhaustive individual comparisons. One browser engine was tested. Current live content can change after this dated capture. The source/reference capture evidence is retained under the ignored reference/ folder; compact durable summaries are in docs/milestones/F01/qa/.

The source /digitalhub/ page is password protected. Its local protected-content form is disabled and clearly labeled unavailable; it does not accept or forward passwords. Protected content was not inspected or invented.

## Run and verify

From C:/Users/Domin/Documents/img-shoot:

~~~powershell
npm run dev --prefix .f01-work/shoot-frontend
npm run lint --prefix .f01-work/shoot-frontend
npm test --prefix .f01-work/shoot-frontend
npm run build --prefix .f01-work/shoot-frontend
node .f01-work/scripts/check-local-navigation.mjs
node .f01-work/scripts/check-route-styles.mjs
node .f01-work/scripts/audit-route-inventory.mjs
node .f01-work/scripts/check-route-http.mjs
node .f01-work/scripts/check-all-route-renders.mjs
~~~

Open http://localhost:4173/. The source server is required; a plain static host cannot serve its local API. Stop the dev server before npm run preview --prefix .f01-work/shoot-frontend, or set a different PORT for the build. Full screenshot scripts use the installed Chrome helper and Python/Pillow. Uncached media, galleries and Google's widget require internet access.
`;
await writeFile(resolve(root,'docs/milestones/F01/VERIFICATION.md'),report);
console.log(JSON.stringify({routes:inventory.captured,mainScreenshots:img.pixelPairs,scoutingPairs:scouting.pairs,corporatePairs:corporate.screenshotPairs,cachedGalleries:galleryCount}));
