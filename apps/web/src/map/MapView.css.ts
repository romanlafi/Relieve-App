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
export const toolbar = style({
    position: 'absolute', zIndex: 1, top: vars.space.md, left: vars.space.md,
    width: 'min(290px, calc(100% - 80px))', display: 'grid', gap: vars.space.sm,
    maxHeight: 'calc(100% - 120px)', overflowY: 'auto', overscrollBehavior: 'contain',
    '@media': {'(max-width: 640px)': {maxHeight: 'calc(100% - 96px)'}},
    selectors: {
        [`${view}[data-selected="true"] &`]: {
            '@media': {'(max-width: 640px)': {display: 'none'}},
        }
    },
});
export const stack = style({display: 'grid', gap: vars.space.sm, marginTop: vars.space.sm});
export const section = style({
    color: vars.color.text, background: vars.color.surface,
    border: `1px solid ${vars.color.border}`, borderRadius: vars.radius.sm, padding: vars.space.sm, fontSize: '0.8rem'
});
export const summary = style({cursor: 'pointer', fontWeight: 600});
export const muted = style({margin: 0, color: vars.color.textMuted, fontSize: '0.75rem'});
export const progressRow = style({display: 'grid', gridTemplateColumns: '1fr auto', gap: vars.space.sm});
export const progress = style({width: '100%', height: '6px', gridColumn: '1 / -1', accentColor: vars.color.hut});
export const metadata = style({
    display: 'grid', gridTemplateColumns: 'auto 1fr', gap: vars.space.sm,
    fontSize: '0.75rem', color: vars.color.textMuted, margin: `${vars.space.md} 0`
});
globalStyle(`${metadata} dd`, {margin: 0, textAlign: 'right', overflowWrap: 'anywhere'});
export const map = style({position: 'absolute', inset: 0, background: vars.color.background});
export const brand = style([floatingPanel, {
    position: 'relative',
    padding: `${vars.space.sm} ${vars.space.md}`,
    selectors: {[`${view}[data-selected="true"] &`]: {'@media': {'(max-width: 640px)': {display: 'none'}}}},
}]);
export const title = style({margin: 0, fontSize: '1.25rem', fontWeight: 650, letterSpacing: '0.04em'});
export const subtitle = style({margin: 0, color: vars.color.textMuted, fontSize: '0.75rem'});
export const status = style([floatingPanel, {
    position: 'relative',
    fontSize: '0.8rem', padding: vars.space.sm,
    selectors: {'&:empty': {display: 'none'}},
    '@media': {'(max-width: 640px)': {selectors: {[`${view}[data-selected="true"] &`]: {display: 'none'}}}},
}]);
globalStyle(`${status} p`, {margin: 0});
export const legend = style([floatingPanel, {
    bottom: '64px', left: vars.space.md, display: 'flex', flexWrap: 'wrap', gap: vars.space.md,
    maxWidth: 'min(360px, calc(100% - 32px))',
    padding: vars.space.sm, fontSize: '0.75rem',
    '@media': {'(max-width: 640px)': {bottom: '64px', maxWidth: 'calc(100% - 32px)', gap: vars.space.sm}},
    selectors: {[`${view}[data-selected="true"] &`]: {'@media': {'(max-width: 640px)': {display: 'none'}}}},
}]);
export const legendItem = style({display: 'flex', alignItems: 'center', gap: vars.space.sm});
const swatchBase = style({display: 'inline-block', width: '9px', height: '9px', borderRadius: '50%'});
export const pendingSwatch = style([swatchBase, {border: `2px solid ${vars.color.textMuted}`}]);
export const visitedSwatch = style([swatchBase, {
    background: vars.color.textMuted,
    border: `2px solid ${vars.color.text}`
}]);
export const swatch = styleVariants({
    peak: {background: vars.color.peak}, lake: {background: vars.color.lake}, hut: {background: vars.color.hut},
}, (color) => [swatchBase, color]);
export const placePicker = style([floatingPanel, {
    position: 'relative', display: 'grid', gap: vars.space.sm, fontSize: '0.75rem',
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
    bottom: '64px', right: vars.space.md, width: 'min(340px, calc(100% - 32px))',
    maxHeight: 'calc(100% - 160px)', overflowY: 'auto',
    zIndex: 2,
    '@media': {
        '(max-width: 640px)': {
            bottom: '64px',
            left: vars.space.md,
            right: 'auto',
            maxHeight: '55%',
            width: 'calc(100% - 32px)',
            borderRadius: `${vars.radius.sm} ${vars.radius.sm} 0 0`,
            overscrollBehavior: 'contain'
        }
    },
}]);
export const close = style({
    position: 'absolute', top: vars.space.sm, right: vars.space.sm,
    width: '44px', height: '44px', color: vars.color.text, background: 'transparent',
    border: 0, borderRadius: vars.radius.sm, fontSize: '1.5rem', cursor: 'pointer',
    ':hover': {background: vars.color.background},
});
export const type = style({margin: 0, color: vars.color.textMuted, fontSize: '0.75rem'});
export const placeName = style({
    margin: `${vars.space.sm} 0`,
    paddingRight: '32px',
    fontSize: '1.2rem',
    lineHeight: 1.2
});
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
