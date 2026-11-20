import homepage from '../data/homepage.json' with { type: 'json' };
import { archive, territories, categories, filterTalent, searchArchive } from './catalog.mjs';

const app = document.querySelector('#app');
const path = location.pathname.replace(/\/+$/, '') || '/';
const state = {
  territory: '', category: 'model', gender: '', view: 'grid',
  archivePage: Math.max(1, Number(path.match(/page\/(\d+)/)?.[1] || 1)),
};
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
const image = (url, alt = '') => url ? `<img loading="lazy" src="${esc(url)}" alt="${esc(alt)}">` : '<span class="image-placeholder" aria-hidden="true"></span>';
const logo = '<a class="wordmark" href="/" aria-label="IMG Models home">IMG MODELS</a>';
const nav = [
  ['DIRECTORY','/directory/'], ['GET SCOUTED','https://getscouted.imgmodels.com/'],
  ['SEARCH','/search/'], ['CONTACT','/contact/'],
];
const footerLinks = [
  ['About Us','/about-us/'], ['Contact','/contact/'], ['We Love Your Genes','https://getscouted.imgmodels.com/'],
  ['Recruitment Warning','/recruitmentwarning/'], ['Do not sell my personal info','https://privacyportal.onetrust.com/webform/889c435d-64b4-46d8-ad05-06332fe1d097/db459d3a-bffa-4cb2-a6fd-0daa31651507?website=imgmodels.com'],
  ['Site Credits','https://projectsimply.com/'], ['Terms of use','https://wmefashion.com/terms-of-use/'],
  ['Privacy Policy','https://wmefashion.com/privacy-policy/'], ['Cookie Policy','https://wmefashion.com/cookies/'],
  ['Under 18 FAQs','/under-18-faq/'], ['New York State Fashion Workers Act','/new-york-state-fashion-workers-act/'],
];
function header() {
  const links = nav.map(([label, href]) => `<a href="${href}" ${href.startsWith('http') ? 'target="_blank" rel="noreferrer"' : ''}>${label}</a>`).join('');
  return `<header class="site-header">${logo}<nav class="desktop-nav" aria-label="Main navigation">${links}</nav><button class="menu-toggle" aria-expanded="false" aria-controls="mobile-menu">MENU</button><nav class="mobile-menu" id="mobile-menu" aria-label="Mobile navigation">${links}</nav></header>`;
}
function footer() {
  return `<footer class="site-footer"><nav class="footer-links" aria-label="Footer">${footerLinks.map(([label, href]) => `<a href="${href}" ${href.startsWith('http') ? 'target="_blank" rel="noreferrer"' : ''}>${label}</a>`).join('')}</nav><div class="social-links"><a href="https://www.instagram.com/imgmodels/" target="_blank" rel="noreferrer">Instagram</a><a href="https://www.tiktok.com/@imgmodels" target="_blank" rel="noreferrer">TikTok</a></div><span>Copyright IMG Worldwide, LLC</span></footer>`;
}
function cookie() {
  return '';
}
function workCard(item) {
  const match = archive.find(entry => entry.featuredId === item.featuredId);
  const src = item.image || match?.image || '';
  const video = match?.video;
  const label = `${item.talent || ''} ${item.title || ''}`.trim();
  return `<article class="work-card ${item.size === 'large' ? 'work-large' : ''}"><a href="${match?.featuredId ? `#work-${esc(match.featuredId)}` : '/from-the-archive/'}" data-work="${esc(match?.featuredId || '')}" aria-label="${esc(label)}">${video ? `<video muted autoplay loop playsinline poster="${esc(src)}"><source src="${esc(video)}" type="video/mp4"></video>` : image(src, label)}<div class="work-caption"><span>${esc(item.title)}</span><span>${esc(item.talent)}</span></div></a></article>`;
}
function workGrid(items) { return `<div class="work-grid">${items.map(workCard).join('')}</div>`; }
function home() {
  const [heroPeople, heroWork] = homepage.hero.caption.split(' Silver Lining By ');
  const heroPeopleMarkup = esc(heroPeople).replace(' &amp; Alex Consani', ' <span class="hero-narrow-break">&amp; Alex Consani</span>');
  const heroCaption = heroWork ? `${heroPeopleMarkup}<br class="hero-mobile-break">Silver Lining By ${esc(heroWork)}` : esc(homepage.hero.caption);
  return `<main><section class="hero" aria-label="${esc(homepage.hero.title)}" style="--hero:url('${esc(homepage.hero.image)}')"><div class="hero-label"><h1>${esc(homepage.hero.title)}</h1><a href="/from-the-archive/">${heroCaption}</a></div></section><section class="home-section"><h2>Latest</h2>${workGrid(homepage.latest)}</section><section class="home-section"><h2>Covers</h2>${workGrid(homepage.covers)}</section><a class="archive-link" href="/from-the-archive/">View the Archive +</a></main>`;
}
function personCard(person) {
  const photo = typeof person.thumbnail === 'string' ? person.thumbnail : person.thumbnail?.source;
  return `<article class="person-card"><a href="${esc(person.permalink || '#')}" target="_blank" rel="noreferrer">${image(photo, person.name)}<span>${esc(person.name)}</span></a></article>`;
}
function directory() {
  const result = filterTalent(state);
  const letters = [...new Set(result.map(person => person.name?.[0]?.toUpperCase()).filter(Boolean))].sort();
  return `<main class="directory-page"><div class="directory-head"><div><h1>Directory</h1><span>${result.length} Results</span></div><button class="filter-toggle" aria-expanded="false">Filters</button></div><div class="directory-controls"><label>Location<select id="territory"><option value="">All Locations</option>${territories.map(value => `<option value="${esc(value)}" ${state.territory === value ? 'selected' : ''}>${esc(value)}</option>`).join('')}</select></label><label>Category<select id="category">${categories.map(value => `<option value="${esc(value.id)}" ${state.category === value.id ? 'selected' : ''}>${esc(value.label)}</option>`).join('')}</select></label><label>Gender<select id="gender"><option value="">All</option><option value="woman" ${state.gender === 'woman' ? 'selected' : ''}>Women</option><option value="man" ${state.gender === 'man' ? 'selected' : ''}>Men</option></select></label><button id="reset-filters">Reset</button><div class="view-switch" aria-label="Display mode"><button data-view="grid" aria-pressed="${state.view === 'grid'}">Grid</button><button data-view="list" aria-pressed="${state.view === 'list'}">List</button></div></div><nav class="alphabet" aria-label="Jump to letter">${letters.map(letter => `<a href="#letter-${letter}">${letter}</a>`).join('')}</nav><div class="people-grid ${state.view === 'list' ? 'list-view' : ''}">${result.map(personCard).join('') || '<p>No profiles found.</p>'}</div></main>`;
}
function searchPage() {
  const query = new URLSearchParams(location.search).get('q') || '';
  const people = query ? filterTalent({ query }) : [];
  const works = query ? searchArchive(query) : [];
  const count = people.length + works.length;
  return `<main class="search-page"><form id="search-form"><label class="sr-only" for="q">Search</label><input id="q" name="q" value="${esc(query)}" placeholder="Search" autocomplete="off"><button type="submit">Search</button></form>${query ? `<div class="search-results"><h1>${count} Results for “${esc(query)}”</h1><div class="result-tabs"><button data-results="all" class="active">All (${count})</button><button data-results="people">Directory (${people.length})</button><button data-results="works">Work (${works.length})</button></div><section class="search-people"><h2>Directory</h2><div class="people-grid">${people.slice(0, 50).map(personCard).join('') || '<p>No directory matches.</p>'}</div></section><section class="search-work"><h2>Work</h2>${workGrid(works.slice(0, 40).map(item => ({ ...item, size: item.layout })))}</section></div>` : ''}</main>`;
}
function archivePage() {
  const page = Math.min(29, state.archivePage);
  const entries = archive.filter(entry => entry.page === page).map(entry => ({ ...entry, size: entry.layout }));
  return `<main class="archive-page"><h1>From the Archive</h1>${workGrid(entries)}<nav class="pagination" aria-label="Archive pages">${page > 1 ? `<a href="/from-the-archive/page/${page - 1}/">Previous</a>` : ''}<span>Page ${page} of 29</span>${page < 29 ? `<a href="/from-the-archive/page/${page + 1}/">Next</a>` : ''}</nav></main>`;
}
const offices = [
  ['New York','304 Park Ave South','Penthouse North','New York, NY 10010','NewYork@imgmodels.com','+1 ( 212) 253 8884'],
  ['Los Angeles','8201 Beverly Blvd.','Suite 600','Los Angeles, CA 90048','LosAngeles@imgmodels.com','+1 ( 310) 550 3405'],
  ['Paris','31 rue du Colisee','3rd Floor','75008 Paris, France','Paris@imgmodels.com','+33 1 7305 9696'],
  ['Sydney','Level 52, 25 Martin Place','','Sydney, Australia 2000','Sydney@imgmodels.com','+61 (2) 9285 8000'],
  ['London','2, Arundel Street Building','5th Floor, 180 The Strand','London WC2R 3DA','London@imgmodels.com','+44 207 665 5500'],
  ['Milan','Via Vittoria Colonna, 4','','20149 Milan','Milan@imgmodels.com','+39 02 7274 71'],
];
const aboutCopy = [
  'IMG Models is the international leader in talent discovery and model management, widely recognized for its diverse client roster. The agency’s offices are located in six world capitals: New York, Los Angeles, Paris, London, Milan, and Sydney.',
  'Legendary sports agent Mark McCormack founded IMG Models as a new division of the hugely successful IMG Worldwide. He believed models could be managed as talent in the same vein as professional athletes, actors, and other entertainers, and that their popularity could be leveraged into strong personal brands beyond the magazine page or runway. McCormack’s conviction resulted in the industry’s highest standard of excellence.',
  'By managing careers over bookings, a point of difference that has propelled IMG Models’ nonstop growth, the agency has claimed the vanguard for over two decades.',
  'As an industry pioneer, IMG Models continues to challenge the status quo with its clients, and broaden opportunities for all of its talent.',
  'IMG Models’ commitment to the personalities it represents is its greatest strength. The stability and depth of experience of its management team—the core of which has worked together to shape the careers of newcomers and superstars alike since the early ‘90s—allows the agency to stand out in a business where volatility is the norm.',
  'The agency’s ability to manage and maximize a model’s career at every stage has been proven innumerable times, whether by nurturing newly discovered talent, or revitalizing the professional lives of established models. IMG Models believes in the potential of the entire individual and has taken an unyielding stance against segmenting talent by race, age, or size.',
  'IMG also created the industry’s first bi-annual health initiative devoted to young models’ total wellbeing known as Model Prep; a more sustained, year-round effort is currently in development.',
  'IMG Models is part of WME Fashion, a division of WME, the world’s preeminent talent agency.',
];
const recruitmentCopy = [
  'IMG Models considers the safety and well-being of aspiring models a top priority. We pride ourselves on our professionalism, transparency, and authenticity and believe it is important to advise models about unscrupulous people who prey on their ambitions.',
  'Please be aware there are certain individuals on the internet falsely claiming to be representatives (or “scouts”) of IMG Models. If you are contacted by anyone claiming to be a representative of IMG Models, do not respond without first verifying their identity. Promptly call us directly at one of our offices and we will be happy to assist.',
  'Should someone claiming to be a representative or model manager from any agency contact you, immediately alert your parents and/or a guardian.',
  'Please note: IMG Models does not conduct interviews via Skype, we never request photos in the nude or lingerie, and we never require monetary payment.',
  'We wish you well in your pursuits and remind you to always be safe.',
];
const faq = [
  ['Can my child apply if they are under 18 years old?', 'Yes, we accept applications from aspiring models between 14 and 18 years old. There are sometimes commercial opportunities for minors, and if we are interested, we begin the development process soon after their application is accepted. However, we emphasize that modelling is considered a hobby, and that education remains the top priority. We require consent from their legal guardian(s) before proceeding with the application process.'],
  ['What type of photos should we submit with the application?', 'We prefer natural snapshots taken in daylight, as indicated on the website. Professional photos are not necessary. Please ensure your child is not wearing makeup, so we can see their natural features.'],
  ['Will my child be safe during the application and selection process?', 'Absolutely. The safety and well-being of our young applicants is our top priority. All interactions and meetings will be conducted with professionalism, and a legal guardian must accompany minors to any in-person meetings or video calls.'],
  ['Is there a fee for applying or signing with IMG Models?', 'No, there is no fee to apply or to sign with IMG Models. We do not charge any application or registration fees.'],
  ['What happens if my child is selected?', 'If selected, you and your child will be invited for a follow-up meeting or video call where we will explain the next steps in detail. During this meeting, we will outline what it means to be represented by IMG Models and discuss the development process.'],
  ['How does IMG Models ensure the well being of its underage models?', 'We take the well-being of our models very seriously. We provide guidance and support throughout their career, including workshops and resources designed to help young models navigate the industry safely and successfully. Guardians are encouraged to be involved at every step.'],
  ['What happens to the photos submitted with your child’s application?', 'The photos submitted with your child’s application will be used solely for assessment purposes. After the assessment is complete, the photos will be securely deleted from our system to ensure your child’s privacy. For further information on our privacy practices, please see the privacy policy.'],
];
function officeMarkup([name, address1, address2, city, email, phone]) {
  return `<section><h2>${esc(name)}</h2><p>${esc(address1)}${address2 ? `<br>${esc(address2)}` : ''}<br>${esc(city)}</p><p><a href="mailto:${esc(email)}">E-Mail ${esc(email)}</a><br><a href="tel:${phone.replace(/[^+\d]/g, '')}">Main ${esc(phone)}</a></p></section>`;
}
const aboutOffices = [
  ['New York','304 Park Ave South','Penthouse North','New York, NY 10010','+1 ( 212) 253 8884','+1 (212) 253 8883'],
  ['Los Angeles','8201 Beverly Blvd.','Suite 600','Los Angeles, CA 90048','+1 ( 310) 550 3405',''],
  ['Paris','31 Rue Du Colisée','3rd Floor','75008 Paris, France','+33 1 7305 9696',''],
  ['Sydney','Level 25, 25 Martin Place','','Sydney, Australia 2000','+61 (2) 9285 8000','+61 (2) 9285 8001','Sydney@imgmodels.com'],
  ['London','2, Arundel Street Building','5th Floor, 180 The Strand','London WC2R 3DA','+44 207 665 5500','+44 207 665 5501','London@imgmodels.com'],
  ['Milan','Via Vittoria Colonna, 4','','20149 Milan','+39 02 7274 71','+39 02 4074 6005'],
];
function aboutOfficeMarkup([name, address1, address2, city, phone, fax, email]) {
  return `<section><h2>${esc(name)}</h2><p>${esc(address1)}${address2 ? `<br>${esc(address2)}` : ''}<br>${esc(city)}</p>${email ? `<p><a href="mailto:${esc(email)}">E-Mail ${esc(email)}</a></p>` : ''}<p><a href="tel:${phone.replace(/[^+\d]/g, '')}">Main ${esc(phone)}</a>${fax ? `<br>Fax ${esc(fax)}` : ''}</p></section>`;
}
function contentPage() {
  if (path === '/contact') return `<main class="content-page"><h1>Contact</h1><div class="office-grid">${offices.map(officeMarkup).join('')}</div></main>`;
  if (path === '/about-us') return `<main class="content-page about-page"><h1>About Us</h1><div class="about-copy">${aboutCopy.map(text => `<p>${esc(text)}</p>`).join('')}</div><div class="office-grid">${aboutOffices.map(aboutOfficeMarkup).join('')}</div></main>`;
  if (path === '/recruitmentwarning') return `<main class="content-page narrow"><h1>Recruitment Warning</h1><h2 class="subheading">Recruitment Warning: Beware of Imposters</h2>${recruitmentCopy.map(text => `<p>${esc(text)}</p>`).join('')}</main>`;
  if (path === '/under-18-faq') return `<main class="content-page narrow"><h1>FAQs for Under 18 Applicants</h1><h2 class="subheading">FAQs for Under 18 Applicants</h2><div class="faq-list">${faq.map(([question, answer], index) => `<section><h3>${index + 1}. ${esc(question)}</h3><p>${esc(answer)}</p></section>`).join('')}</div></main>`;
  if (path === '/new-york-state-fashion-workers-act') return `<main class="content-page narrow"><h1>New York State Fashion Workers Act</h1><p>The official page is listed on IMG Models, but I could not inspect its contents in this environment. See the <a href="https://dol.ny.gov/fashion-workers-act" target="_blank" rel="noreferrer">New York State Department of Labor</a> for the official act information.</p></main>`;
  return `<main class="content-page"><h1>Page not found</h1><a href="/">Return home</a></main>`;
}
function render() {
  const body = path === '/' ? home() : path === '/directory' ? directory() : path === '/search' ? searchPage() : path === '/from-the-archive' || path.startsWith('/from-the-archive/page') ? archivePage() : contentPage();
  app.innerHTML = `${header()}${body}${footer()}${cookie()}<dialog class="work-dialog"><button class="dialog-close" aria-label="Close">×</button><div class="dialog-body"></div></dialog>`;
}
render();
app.addEventListener('click', event => {
  const menu = event.target.closest('.menu-toggle');
  if (menu) { const open = menu.getAttribute('aria-expanded') === 'true'; menu.setAttribute('aria-expanded', String(!open)); app.querySelector('.mobile-menu').classList.toggle('open', !open); }
  const view = event.target.closest('[data-view]');
  if (view) { state.view = view.dataset.view; render(); }
  const filter = event.target.closest('.filter-toggle');
  if (filter) { const controls = app.querySelector('.directory-controls'); const open = controls.classList.toggle('show-mobile'); filter.setAttribute('aria-expanded', String(open)); }
  if (event.target.closest('#reset-filters')) { state.territory = ''; state.category = 'model'; state.gender = ''; render(); }
  const work = event.target.closest('[data-work]');
  if (work?.dataset.work) { const item = archive.find(entry => entry.featuredId === work.dataset.work); const dialog = app.querySelector('.work-dialog'); dialog.querySelector('.dialog-body').innerHTML = `${item.video ? `<video controls autoplay src="${esc(item.video)}"></video>` : image(item.image, item.title)}<h2>${esc(item.title)}</h2><p>${esc(item.talent)}</p>`; dialog.showModal(); }
  if (event.target.closest('.dialog-close')) app.querySelector('.work-dialog').close();
  const tab = event.target.closest('[data-results]');
  if (tab) { for (const section of app.querySelectorAll('.search-people, .search-work')) section.hidden = tab.dataset.results === 'people' ? !section.classList.contains('search-people') : tab.dataset.results === 'works' ? section.classList.contains('search-people') : false; }
});
app.addEventListener('change', event => {
  if (event.target.id === 'territory') state.territory = event.target.value;
  if (event.target.id === 'category') state.category = event.target.value;
  if (event.target.id === 'gender') state.gender = event.target.value;
  if (['territory', 'category', 'gender'].includes(event.target.id)) render();
});
app.addEventListener('submit', event => {
  if (event.target.id === 'search-form') { event.preventDefault(); location.href = `/search/?q=${encodeURIComponent(new FormData(event.target).get('q') || '')}`; }
});
document.addEventListener('keydown', event => { if (event.key === 'Escape') { const dialog = app.querySelector('.work-dialog'); if (dialog.open) dialog.close(); } });
