import {globalStyle, style, styleVariants} from '@vanilla-extract/css';
import {vars} from '../styles/theme.css';

const floatingPanel = style({
    position: 'absolute',
    zIndex: 1,
    color: vars.color.text,
    background: 'rgba(32, 35, 31, 0.94)',
    border: '1px solid rgba(236, 236, 232, 0.12)',
    borderRadius: '14px',
    padding: vars.space.md,
    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.3)',
    backdropFilter: 'blur(14px)',
});

export const view = style({position: 'relative', width: '100%', height: '100%', overflow: 'hidden'});
export const toolbar = style({
    position: 'absolute', zIndex: 1, top: vars.space.md, left: vars.space.md,
    width: 'min(290px, calc(100% - 80px))', display: 'grid', gap: vars.space.sm,
    maxHeight: 'calc(100% - 160px)', overflowY: 'auto', overscrollBehavior: 'contain',
    '@media': {'(max-width: 640px)': {maxHeight: 'calc(100% - 160px)'}},
    selectors: {
        '&[hidden]': {display: 'none'},
        [`${view}[data-selected="true"] &`]: {
            '@media': {'(max-width: 640px)': {display: 'none'}},
        }
    },
});
export const stack = style({display: 'grid', gap: vars.space.sm, marginTop: vars.space.sm});
export const section = style({
    color: vars.color.text, background: 'rgba(32, 35, 31, 0.94)',
    border: '1px solid rgba(236, 236, 232, 0.12)', borderRadius: '12px',
    padding: vars.space.md, fontSize: '0.8rem', boxShadow: '0 8px 24px rgba(0, 0, 0, 0.24)',
    backdropFilter: 'blur(14px)',
});
export const summary = style({cursor: 'pointer', fontWeight: 600});
export const muted = style({margin: 0, color: vars.color.textMuted, fontSize: '0.75rem'});
export const progressRow = style({display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: vars.space.sm});
export const progress = style({width: '100%', height: '6px', gridColumn: '1 / -1', accentColor: vars.color.hut});
export const metadata = style({
    display: 'grid', gridTemplateColumns: 'auto 1fr', gap: vars.space.sm,
    fontSize: '0.75rem', color: vars.color.textMuted, margin: `${vars.space.md} 0`
});
globalStyle(`${metadata} dd`, {margin: 0, textAlign: 'right', overflowWrap: 'anywhere'});
export const map = style({
    position: 'absolute', inset: 0, background: vars.color.background,
    selectors: {'&.maplibregl-map': {position: 'absolute'}},
});
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
export const favoriteSwatch = style({color: vars.color.route, fontSize: '16px', lineHeight: 1});
export const swatch = styleVariants({
    peak: {background: vars.color.peak}, lake: {background: vars.color.lake}, hut: {background: vars.color.hut},
}, (color) => [swatchBase, color]);
export const placePicker = style([floatingPanel, {
    position: 'relative', display: 'grid', gap: vars.space.sm, fontSize: '0.75rem',
}]);
export const select = style({
    width: '100%', font: 'inherit', color: vars.color.text, background: vars.color.background,
    border: `1px solid ${vars.color.border}`, borderRadius: '10px', padding: vars.space.sm,
    ':focus-visible': {borderColor: vars.color.route},
});
export const button = style({
    color: vars.color.text, background: vars.color.background, font: 'inherit',
    border: `1px solid ${vars.color.border}`, borderRadius: '10px',
    padding: `${vars.space.sm} ${vars.space.md}`, marginTop: vars.space.sm, cursor: 'pointer',
    transition: 'background-color 140ms ease, border-color 140ms ease, transform 140ms ease',
    ':hover': {borderColor: vars.color.textMuted, background: '#292d27', transform: 'translateY(-1px)'},
    ':active': {transform: 'translateY(0)'},
});
export const details = style([floatingPanel, {
    bottom: '64px', right: vars.space.md, width: 'min(340px, calc(100% - 32px))',
    maxHeight: 'calc(100% - 160px)', overflowY: 'auto', padding: 0,
    borderRadius: '12px', boxShadow: '0 16px 48px rgba(0, 0, 0, 0.38)',
    zIndex: 2,
    '@media': {
        '(max-width: 640px)': {
            bottom: 'calc(64px + env(safe-area-inset-bottom))',
            left: vars.space.md,
            right: 'auto',
            maxHeight: 'min(70dvh, calc(100% - 128px))',
            width: 'calc(100% - 32px)',
            borderRadius: `${vars.radius.sm} ${vars.radius.sm} 0 0`,
            overscrollBehavior: 'contain',
            touchAction: 'pan-y'
        }
    },
}]);
export const close = style({
    flex: '0 0 44px', width: '44px', height: '44px', color: vars.color.text,
    background: 'rgba(255, 255, 255, 0.06)', border: `1px solid ${vars.color.border}`,
    borderRadius: '50%', fontSize: '1.5rem', cursor: 'pointer',
    ':hover': {background: 'rgba(255, 255, 255, 0.12)'},
});
export const detailsHeader = style({
    position: 'sticky', top: 0, zIndex: 1, display: 'flex', alignItems: 'flex-start',
    justifyContent: 'space-between', gap: vars.space.md, padding: vars.space.md,
    background: 'linear-gradient(135deg, #292d27, #20231f 72%)',
    borderBottom: `1px solid ${vars.color.border}`,
});
export const detailsHeading = style({minWidth: 0});
export const detailsContent = style({padding: vars.space.md});
export const sheetGrabber = style({
    display: 'none', position: 'absolute', top: '7px', left: '50%', transform: 'translateX(-50%)',
    width: '36px', height: '4px', borderRadius: '999px', background: vars.color.border,
    '@media': {'(max-width: 640px)': {display: 'block'}},
});
export const type = style({
    display: 'inline-flex', margin: '4px 0 0', padding: '3px 8px',
    color: vars.color.textMuted, background: 'rgba(255, 255, 255, 0.06)',
    border: `1px solid ${vars.color.border}`, borderRadius: '999px',
    fontSize: '0.68rem', fontWeight: 650, letterSpacing: '0.04em', textTransform: 'uppercase',
});
export const placeName = style({
    margin: `${vars.space.sm} 0 4px`,
    overflowWrap: 'anywhere',
    fontSize: '1.3rem', fontWeight: 700,
    lineHeight: 1.2
});
export const elevation = style({margin: 0, color: vars.color.route, fontSize: '0.9rem', fontWeight: 650});

globalStyle(`${view} .maplibregl-ctrl-top-right`, {top: vars.space.sm, right: vars.space.sm});
globalStyle(`${view} .maplibregl-ctrl-group`, {
    background: vars.color.surface, border: `1px solid ${vars.color.border}`, boxShadow: 'none',
});
globalStyle(`${view} .maplibregl-ctrl-group button`, {width: '36px', height: '36px'});
globalStyle(`${view} .maplibregl-ctrl-group button + button`, {borderTopColor: vars.color.border});
globalStyle(`${view} .maplibregl-ctrl-icon`, {filter: 'invert(1)'});
globalStyle(`${view} .maplibregl-ctrl-attrib`, {background: vars.color.surface, color: vars.color.textMuted});
globalStyle(`${view} .maplibregl-ctrl-attrib a`, {color: vars.color.textMuted});
globalStyle(`${view} .maplibregl-ctrl-attrib.maplibregl-compact`, {
    '@media': {'(max-width: 640px)': {
        width: '28px', minHeight: '28px', margin: vars.space.sm, padding: 0,
        background: 'transparent', borderRadius: '50%', boxShadow: 'none',
    }},
});
globalStyle(`${view} .maplibregl-ctrl-attrib-button`, {
    '@media': {'(max-width: 640px)': {
        width: '28px', height: '28px',
        backgroundColor: vars.color.surface,
        backgroundImage: 'url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2224%22 height=%2224%22 fill=%22%23ecece8%22 fill-rule=%22evenodd%22 viewBox=%220 0 20 20%22%3E%3Cpath d=%22M4 10a6 6 0 1 0 12 0 6 6 0 1 0-12 0m5-3a1 1 0 1 0 2 0 1 1 0 1 0-2 0m0 3a1 1 0 1 1 2 0v3a1 1 0 1 1-2 0%22/%3E%3C/svg%3E")',
        border: `1px solid ${vars.color.border}`, borderRadius: '50%',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)', opacity: 0.95,
    }},
});
globalStyle(`${view} .maplibregl-ctrl-attrib-button:focus:not(:focus-visible)`, {
    '@media': {'(max-width: 640px)': {outline: 'none', boxShadow: 'none'}},
});
globalStyle(`${view} .maplibregl-ctrl-attrib-button:focus-visible`, {
    '@media': {'(max-width: 640px)': {boxShadow: `0 0 0 2px ${vars.color.route}`}},
});
globalStyle(`${view} .maplibregl-ctrl-attrib.maplibregl-compact-show`, {
    '@media': {'(max-width: 640px)': {
        width: 'auto', maxWidth: 'calc(100vw - 32px)', minHeight: '28px',
        margin: vars.space.sm, padding: '8px 36px 8px 10px',
        color: vars.color.textMuted, background: vars.color.surface,
        border: `1px solid ${vars.color.border}`, borderRadius: vars.radius.sm,
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.32)', fontSize: '0.65rem', lineHeight: 1.35,
    }},
});

export const routeSwatch = style({width: '16px', height: '4px', background: vars.color.route});

export const showControls = style([button, {
    position: 'absolute', top: vars.space.sm, left: vars.space.md, zIndex: 3,
}]);
