/**
 * Store chain constants — Lviv stores, no emoji icons.
 * Colors match brand identity of each chain.
 */

export const CHAINS = [
    { slug: 'atb',        name: 'АТБ',       color: '#e74c3c' },
    { slug: 'silpo',      name: 'Сільпо',    color: '#f39c12' },
    { slug: 'auchan',     name: 'Ашан',      color: '#27ae60' },
];

export const getChainBySlug = (slug) => CHAINS.find((c) => c.slug === slug);
export const getChainColor  = (slug) => getChainBySlug(slug)?.color || '#7c3aed';
export const getChainName   = (slug) => getChainBySlug(slug)?.name || slug;

export default CHAINS;
