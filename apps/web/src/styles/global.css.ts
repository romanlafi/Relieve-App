import {globalStyle} from '@vanilla-extract/css';
import {vars} from './theme.css';

globalStyle('*, *::before, *::after', {boxSizing: 'border-box'});
globalStyle('html', {colorScheme: 'dark'});
globalStyle('body', {
    margin: 0,
    minWidth: '320px',
    minHeight: '100vh',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    lineHeight: 1.5,
    background: vars.color.background,
    color: vars.color.text,
    WebkitFontSmoothing: 'antialiased',
});
globalStyle(':focus-visible', {
    outline: `2px solid ${vars.color.route}`,
    outlineOffset: '3px',
});
globalStyle('button, input, select, textarea', {font: 'inherit'});
globalStyle('button, summary, input, select, textarea', {WebkitTapHighlightColor: 'transparent'});
globalStyle('button:disabled', {opacity: 0.45, cursor: 'not-allowed'});
globalStyle('input, select, textarea', {accentColor: vars.color.route, colorScheme: 'dark'});
globalStyle('input::placeholder, textarea::placeholder', {color: '#859186'});
globalStyle('summary', {cursor: 'pointer'});
globalStyle('button', {touchAction: 'manipulation'});
globalStyle('*', {scrollbarWidth: 'thin', scrollbarColor: `${vars.color.border} transparent`});
