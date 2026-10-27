import {createGlobalTheme} from '@vanilla-extract/css';

export const placeColors = {
    peak: '#dfb987',
    lake: '#82c4d7',
    hut: '#b1ca98',
};

export const mapColors = {
    route: '#e8c58b', background: '#141917', text: '#f3f1e9', terrain: '#8a806c', terrainShadow: '#20231f', terrainAccent: '#413f37',
};

export const vars = createGlobalTheme(':root', {
    color: {
        background: mapColors.background,
        surface: '#1d2420',
        text: mapColors.text,
        textMuted: '#adb7ad',
        border: '#364139',
        accentSurface: '#32392b',
        terrain: mapColors.terrain,
        route: mapColors.route,
        ...placeColors,
    },
    space: {sm: '8px', md: '16px', lg: '24px'},
    radius: {sm: '10px'},
});
