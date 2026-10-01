import {globalStyle, style, styleVariants} from '@vanilla-extract/css';
import {vars} from '../styles/theme.css';

const floatingPanel = style({
    position: 'absolute',
    zIndex: 1,
    color: vars.color.text,
    background: vars.color.surface,
    border: `1px solid ${vars.color.border}`,
    borderRadius: vars.radius.sm,
    padding: vars.space.md,
});

export const view = style({position: 'relative', width: '100%', height: '100%', overflow: 'hidden'});
export const map = style({position: 'absolute', inset: 0, background: vars.color.background});
export const brand = style([floatingPanel, {
    top: vars.space.md,
    left: vars.space.md,
    padding: `${vars.space.sm} ${vars.space.md}`
}]);
export const title = style({margin: 0, fontSize: '1.25rem', fontWeight: 650, letterSpacing: '0.04em'});
export const subtitle = style({margin: 0, color: vars.color.textMuted, fontSize: '0.75rem'});
export const status = style([floatingPanel, {
    top: '94px', left: vars.space.md, maxWidth: 'min(320px, calc(100% - 84px))',
    fontSize: '0.8rem', padding: vars.space.sm,
    selectors: {'&:empty': {display: 'none'}},
}]);
globalStyle(`${status} p`, {margin: 0});
export const legend = style([floatingPanel, {
    bottom: '64px', left: vars.space.md, display: 'flex', gap: vars.space.md,
    padding: vars.space.sm, fontSize: '0.75rem',
}]);
export const legendItem = style({display: 'flex', alignItems: 'center', gap: vars.space.sm});
const swatchBase = style({display: 'inline-block', width: '9px', height: '9px', borderRadius: '50%'});
export const swatch = styleVariants({
    peak: {background: vars.color.peak}, lake: {background: vars.color.lake}, hut: {background: vars.color.hut},
}, (color) => [swatchBase, color]);
export const placePicker = style([floatingPanel, {
    bottom: '116px', left: vars.space.md, display: 'grid', gap: vars.space.sm,
    width: 'min(280px, calc(100% - 32px))', fontSize: '0.75rem',
}]);
export const select = style({
    width: '100%', font: 'inherit', color: vars.color.text, background: vars.color.background,
    border: `1px solid ${vars.color.border}`, borderRadius: vars.radius.sm, padding: vars.space.sm,
});
export const button = style({
    color: vars.color.text, background: vars.color.background, font: 'inherit',
    border: `1px solid ${vars.color.border}`, borderRadius: vars.radius.sm,
    padding: `${vars.space.sm} ${vars.space.md}`, marginTop: vars.space.sm, cursor: 'pointer',
    ':hover': {borderColor: vars.color.textMuted},
});
export const details = style([floatingPanel, {
    bottom: '64px', right: vars.space.md, width: 'min(300px, calc(100% - 32px))', paddingRight: '48px',
    '@media': {'(max-width: 640px)': {bottom: '206px', left: vars.space.md, right: 'auto'}},
}]);
export const close = style({
    position: 'absolute', top: vars.space.sm, right: vars.space.sm,
    width: '32px', height: '32px', color: vars.color.text, background: 'transparent',
    border: 0, borderRadius: vars.radius.sm, fontSize: '1.5rem', cursor: 'pointer',
    ':hover': {background: vars.color.background},
});
export const type = style({margin: 0, color: vars.color.textMuted, fontSize: '0.75rem'});
export const placeName = style({margin: `${vars.space.sm} 0`, fontSize: '1.2rem', lineHeight: 1.2});
export const elevation = style({margin: 0, fontSize: '0.875rem'});

globalStyle(`${view} .maplibregl-ctrl-top-right`, {top: vars.space.sm, right: vars.space.sm});
globalStyle(`${view} .maplibregl-ctrl-group`, {
    background: vars.color.surface, border: `1px solid ${vars.color.border}`, boxShadow: 'none',
});
globalStyle(`${view} .maplibregl-ctrl-group button`, {width: '36px', height: '36px'});
globalStyle(`${view} .maplibregl-ctrl-group button + button`, {borderTopColor: vars.color.border});
globalStyle(`${view} .maplibregl-ctrl-icon`, {filter: 'invert(1)'});
globalStyle(`${view} .maplibregl-ctrl-attrib`, {background: vars.color.surface, color: vars.color.textMuted});
globalStyle(`${view} .maplibregl-ctrl-attrib a`, {color: vars.color.textMuted});
