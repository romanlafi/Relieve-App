import {createGlobalTheme} from '@vanilla-extract/css';

export const vars = createGlobalTheme(':root', {
    color: {
        background: '#161816',
        surface: '#20231f',
        text: '#ecece8',
        textMuted: '#a7aaa3',
        border: '#383c35',
    },
    space: {sm: '8px', md: '16px', lg: '24px'},
    radius: {sm: '6px'},
});
