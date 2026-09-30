import {globalStyle} from '@vanilla-extract/css';
import {vars} from './theme.css';

globalStyle('*, *::before, *::after', {boxSizing: 'border-box'});
globalStyle('html', {colorScheme: 'dark'});
globalStyle('body', {
    margin: 0,
    minWidth: '320px',
    minHeight: '100vh',
    fontFamily: 'system-ui, sans-serif',
    lineHeight: 1.5,
    background: vars.color.background,
    color: vars.color.textMuted,
});
globalStyle(':focus-visible', {
    outline: `2px solid ${vars.color.text}`,
    outlineOffset: '4px',
});
