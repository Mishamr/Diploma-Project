/**
 * Store chain constants — only active scrapers.
 */

export const CHAINS = [
    { slug: 'atb', name: 'АТБ', color: '#e74c3c', type: 'light' },
];

export const getChainBySlug = (slug) => CHAINS.find((c) => c.slug === slug);
export const getChainColor = (slug) => getChainBySlug(slug)?.color || '#7c3aed';
export const getChainName = (slug) => getChainBySlug(slug)?.name || slug;

export default CHAINS;
