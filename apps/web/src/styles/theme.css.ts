import {createGlobalTheme} from '@vanilla-extract/css';

export const placeColors = {
    peak: '#c2aa8e',
    lake: '#75aac2',
    hut: '#a8b991',
};

export const mapColors = {
    route: '#e5bd6b', background: '#161816', text: '#ecece8', terrain: '#8a806c', terrainShadow: '#20231f', terrainAccent: '#413f37',
};

export const vars = createGlobalTheme(':root', {
    color: {
        background: mapColors.background,
        surface: '#20231f',
        text: mapColors.text,
        textMuted: '#a7aaa3',
        border: '#383c35',
        terrain: mapColors.terrain,
        route: mapColors.route,
        ...placeColors,
    },
    space: {sm: '8px', md: '16px', lg: '24px'},
    radius: {sm: '6px'},
});
