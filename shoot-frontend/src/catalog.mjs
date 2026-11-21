import talentData from '../data/talent.json' with { type: 'json' };
import archiveData from '../data/archive.json' with { type: 'json' };
export const talent = talentData.entries || talentData.items || talentData;
export const archive = archiveData.pages.flatMap(page => page.cards.map(card => ({ ...card, page: page.page })));
export const territories = ['London', 'Los Angeles', 'Milan', 'New York', 'Paris', 'Sydney'];
export const categories = [{ id: 'model', label: 'Model' }, { id: 'development', label: 'Development' }, { id: 'talent', label: 'Talent' }];
export function filterTalent({ territory = '', category = '', gender = '', query = '' } = {}) {
  const q = query.trim().toLocaleLowerCase();
  const norm = value => String(value).toLocaleLowerCase().replace(/[ _]+/g, '-');
  return talent.filter(item => (!territory || (item.territories || []).some(x => norm(x) === norm(territory))) && (!category || (item.categories || []).includes(category)) && (!gender || (item.genders || []).includes(gender)) && (!q || `${item.name} ${item.slug}`.toLocaleLowerCase().includes(q)));
}
export function searchArchive(query = '') {
  const q = query.trim().toLocaleLowerCase();
  return q ? archive.filter(item => `${item.title} ${item.talent}`.toLocaleLowerCase().includes(q)) : archive;
}
