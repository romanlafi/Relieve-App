// Shared by interface SVGs and the map's canvas sprites.
export const iconPaths = {
    star: 'm12 3 2.8 5.7 6.3.9-4.5 4.4 1.1 6.2-5.7-3-5.7 3 1.1-6.2L3.2 9.6l6-.9L12 3Z',
    peak: 'M3 19 10 5l4 8 3-5 5 11H3ZM7.5 10l2.5 2 2.5-2',
    lake: 'M3 8c3-4 6 4 9 0s6 4 9 0M3 14c3-4 6 4 9 0s6 4 9 0M5 20h14',
    hut: 'm3 11 9-8 9 8M5 10v11h14V10M10 21v-7h4v7',
    pass: 'M3 5c4 0 3 14 9 14S17 5 21 5M3 19h18',
    viewpoint: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
    route: 'M6 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0M24 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0M6 6h9a4 4 0 0 1 0 8H9a4 4 0 0 0 0 8h9',
    search: 'M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0m-2 5 6 6',
    close: 'm6 6 12 12M18 6 6 18',
    chevron: 'm9 5 7 7-7 7',
    filters: 'M4 7h16M4 17h16M9 4v6M15 14v6',
    chart: 'M4 4v16h17M9 15v-4M14 15V7M19 15v-6',
    heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
    check: 'm5 12 4 4L19 6',
    map: 'm3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Zm6-2v16m6-14v16',
    layers: 'm12 3 10 6-10 6L2 9l10-6ZM2 14l10 6 10-6',
    pin: 'M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0ZM14 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0',
    edit: 'm14 5 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14v6Z',
    save: 'm5 12 4 4L19 6',
    upload: 'M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5',
    refresh: 'M20 7a9 9 0 1 0 1 9M20 3v5h-5',
    calendar: 'M5 5h14v16H5V5Zm3-3v6m8-6v6M5 11h14',
} as const;

export type IconName = keyof typeof iconPaths;
