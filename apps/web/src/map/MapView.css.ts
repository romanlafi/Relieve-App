import {globalStyle, style, styleVariants} from '@vanilla-extract/css';
import {vars} from '../styles/theme.css';

const panel = {
    color: vars.color.text, background: 'rgba(25, 32, 28, 0.96)',
    border: '1px solid rgba(218, 229, 212, 0.14)', borderRadius: '20px',
    boxShadow: '0 16px 48px rgba(0, 0, 0, 0.3)', backdropFilter: 'blur(20px)',
};
export const view = style({position: 'relative', width: '100%', height: '100%', overflow: 'hidden'});
export const map = style({position: 'absolute', inset: 0, background: vars.color.background,
    selectors: {'&.maplibregl-map': {position: 'absolute'}}});
export const controlRail = style({
    position: 'absolute', zIndex: 1, top: '24px', bottom: '36px', left: '24px', width: '316px',
    display: 'flex', flexDirection: 'column', gap: '12px', pointerEvents: 'none',
    '@media': {'(max-width: 640px)': {top: '12px', bottom: '48px', left: '12px', width: 'min(316px, calc(100% - 76px))'}},
    selectors: {[`${view}[data-selected="true"] &`]: {'@media': {'(max-width: 900px)': {display: 'none'}}}},
});
export const toolbar = style({
    ...panel, minHeight: 0, flexShrink: 1, pointerEvents: 'auto', overflowY: 'auto',
    overscrollBehavior: 'contain', padding: '20px', display: 'grid', gap: '20px',
    '@media': {'(max-width: 640px)': {padding: '16px', gap: '16px', borderRadius: '16px'}},
    selectors: {'&[hidden]': {display: 'none'}, [`${view}[data-selected="true"] &`]: {
        '@media': {'(max-width: 640px)': {display: 'none'}},
    }},
});
export const brand = style({display: 'flex', alignItems: 'center', gap: '12px'});
export const brandMark = style({display: 'grid', placeItems: 'center', width: '42px', height: '42px', flexShrink: 0,
    borderRadius: '13px', color: vars.color.route, background: vars.color.accentSurface,
    border: '1px solid rgba(232, 197, 139, 0.2)'});
export const title = style({margin: 0, fontSize: '1.5rem', fontWeight: 650, lineHeight: 1.15, letterSpacing: '-0.05em'});
export const subtitle = style({margin: '4px 0 0', color: vars.color.textMuted, fontSize: '0.72rem', letterSpacing: '0.025em'});
export const iconButton = style({display: 'grid', placeItems: 'center', flexShrink: 0, width: '36px', height: '36px',
    borderRadius: '10px', background: 'transparent', color: vars.color.textMuted,
    border: `1px solid ${vars.color.border}`, cursor: 'pointer', marginLeft: 'auto',
    ':hover': {background: vars.color.accentSurface, color: vars.color.text}});
export const status = style({fontSize: '0.75rem', color: vars.color.textMuted, marginTop: '-6px',
    borderBottom: `1px solid ${vars.color.border}`, paddingBottom: '16px', selectors: {'&:empty': {display: 'none'}}});
globalStyle(`${status} p`, {margin: 0});
export const stack = style({display: 'grid', gap: '14px', marginTop: '16px'});
export const section = style({borderTop: `1px solid ${vars.color.border}`, paddingTop: '18px', fontSize: '0.8125rem'});
export const summary = style({display: 'flex', alignItems: 'center', gap: '10px', listStyle: 'none', fontWeight: 600,
    fontSize: '0.8125rem', minHeight: '28px', cursor: 'pointer',
    '::after': {content: '""', width: '6px', height: '6px', borderRight: '1.5px solid currentColor',
        borderBottom: '1.5px solid currentColor', transform: 'rotate(-45deg)', marginLeft: 'auto',
        flexShrink: 0, transition: 'transform 160ms ease'},
    selectors: {'details[open] > &::after': {transform: 'rotate(45deg)'}}});
globalStyle(`${summary}::-webkit-details-marker`, {display: 'none'});
export const badge = style({fontSize: '0.65rem', fontWeight: 600, borderRadius: '6px', padding: '2px 6px',
    color: vars.color.route, background: vars.color.accentSurface, fontVariantNumeric: 'tabular-nums'});
export const muted = style({margin: 0, color: vars.color.textMuted, fontSize: '0.75rem', lineHeight: 1.65});
export const placePicker = style({display: 'grid', gap: '10px', fontSize: '0.75rem'});
export const fieldLabel = style({fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.04em', color: vars.color.textMuted});
export const searchField = style({position: 'relative', display: 'flex', alignItems: 'center', color: vars.color.textMuted});
export const searchIcon = style({position: 'absolute', left: '12px', pointerEvents: 'none'});
export const select = style({width: '100%', minWidth: 0, minHeight: '42px', font: 'inherit', color: vars.color.text,
    background: 'rgba(8, 14, 10, 0.35)', border: `1px solid ${vars.color.border}`, borderRadius: '10px', padding: '10px 12px',
    transition: 'border-color 150ms ease, background-color 150ms ease',
    ':hover': {borderColor: '#596653'}, ':focus-visible': {borderColor: vars.color.route}});
export const searchInput = style([select, {paddingLeft: '38px', paddingRight: '36px',
    ':focus-visible': {outline: 'none', outlineOffset: 0, borderColor: '#a69a76'},
    selectors: {'&[aria-expanded="true"]': {borderBottomLeftRadius: 0, borderBottomRightRadius: 0}}}]);
export const clearSearch = style({position: 'absolute', right: '4px', display: 'grid', placeItems: 'center',
    width: '32px', height: '34px', padding: 0, border: 0, borderRadius: '6px',
    background: 'transparent', color: vars.color.textMuted, cursor: 'pointer',
    ':hover': {color: vars.color.text, background: vars.color.accentSurface}});
export const searchResults = style({
    maxHeight: 'min(280px, 35dvh)', overflowY: 'auto', overscrollBehavior: 'contain',
    border: `1px solid ${vars.color.border}`, borderTop: 0, borderRadius: '0 0 10px 10px',
    background: vars.color.background, padding: '4px',
    selectors: {'&[hidden]': {display: 'none'}, '&:empty': {border: 0, padding: 0}},
});
export const searchResult = style({
    display: 'flex', alignItems: 'center', gap: '10px', width: '100%', minHeight: '58px',
    padding: '10px 8px', border: 0, borderRadius: '7px', background: 'transparent',
    color: vars.color.text, textAlign: 'left', cursor: 'pointer',
    ':hover': {background: vars.color.accentSurface},
    selectors: {'&[aria-selected="true"]': {background: vars.color.accentSurface, boxShadow: `inset 2px 0 ${vars.color.route}`}},
});
export const resultIcon = style({display: 'grid', placeItems: 'center', width: '30px', height: '34px', flexShrink: 0});
export const resultText = style({display: 'grid', gap: '3px', flex: 1, minWidth: 0});
export const resultName = style({fontSize: '0.8125rem', fontWeight: 550, lineHeight: 1.35, overflowWrap: 'anywhere'});
export const resultMeta = style({fontSize: '0.6875rem', color: vars.color.textMuted});
export const searchEmpty = style({margin: 0, padding: '14px 12px', border: `1px solid ${vars.color.border}`,
    borderTop: 0, borderRadius: '0 0 10px 10px', fontSize: '0.75rem', color: vars.color.textMuted});
export const button = style({display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', minHeight: '40px',
    font: 'inherit', fontSize: '0.8125rem', fontWeight: 550, color: vars.color.text,
    background: 'rgba(255, 255, 255, 0.035)', border: `1px solid ${vars.color.border}`,
    borderRadius: '10px', padding: '9px 12px', cursor: 'pointer',
    transition: 'background-color 150ms ease, border-color 150ms ease',
    selectors: {'&:hover:not(:disabled)': {borderColor: '#71806a', background: vars.color.accentSurface}}});
export const primaryButton = style([button, {background: vars.color.route, color: vars.color.background, borderColor: vars.color.route,
    selectors: {'&:hover:not(:disabled)': {background: '#f2d6a7', borderColor: '#f2d6a7'}}}]);
export const progressRow = style({display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '8px', fontSize: '0.75rem'});
export const progress = style({width: '100%', height: '5px', gridColumn: '1 / -1', accentColor: vars.color.hut, border: 0, borderRadius: '8px', overflow: 'hidden'});
globalStyle(`${progress}::-webkit-progress-bar`, {background: vars.color.border});
globalStyle(`${progress}::-webkit-progress-value`, {background: vars.color.hut, borderRadius: '8px'});
export const statGrid = style({display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px'});
export const stat = style({display: 'grid', gap: '5px', padding: '12px 8px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.035)', color: vars.color.textMuted, fontSize: '0.65rem'});
globalStyle(`${stat} strong`, {color: vars.color.route, fontSize: '1.4rem', fontWeight: 550, lineHeight: 1.2, fontVariantNumeric: 'tabular-nums'});
export const metadata = style({display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr)', gap: '12px', fontSize: '0.75rem', color: vars.color.textMuted, margin: '0 0 18px'});
globalStyle(`${metadata} dd`, {margin: 0, textAlign: 'right', overflowWrap: 'anywhere', color: vars.color.text, fontVariantNumeric: 'tabular-nums'});
export const legend = style({...panel, flexShrink: 0, pointerEvents: 'auto', marginTop: 'auto',
    maxHeight: '40%', overflowY: 'auto', padding: '12px 16px', borderRadius: '14px',
    selectors: {[`${view}[data-selected="true"] &`]: {'@media': {'(max-width: 640px)': {display: 'none'}}}}});
export const legendContent = style({display: 'flex', flexWrap: 'wrap', gap: '14px', paddingTop: '16px', fontSize: '0.7rem'});
export const legendItem = style({display: 'inline-flex', alignItems: 'center', gap: '7px'});
export const typeColor = styleVariants({peak: {color: vars.color.peak}, lake: {color: vars.color.lake}, hut: {color: vars.color.hut}, pass: {color: vars.color.peak}, viewpoint: {color: vars.color.peak}});
const swatchBase = style({display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%'});
export const pendingSwatch = style([swatchBase, {border: `1.5px solid ${vars.color.textMuted}`}]);
export const visitedSwatch = style([swatchBase, {background: vars.color.hut, border: `2px solid ${vars.color.text}`}]);
export const favoriteSwatch = style({color: vars.color.route});
export const routeSwatch = style({width: '18px', height: '3px', borderRadius: '2px', background: vars.color.route});
export const details = style({...panel, position: 'absolute', zIndex: 2, top: '24px', right: '80px',
    width: 'min(360px, calc(100% - 32px))', maxHeight: 'calc(100% - 64px)', overflowY: 'auto',
    '@media': {
        '(max-width: 900px)': {top: 'auto', bottom: 'calc(48px + env(safe-area-inset-bottom))', left: '12px', right: '12px', width: 'auto', maxHeight: 'min(72dvh, calc(100% - 208px))', borderRadius: '20px', overscrollBehavior: 'contain', touchAction: 'pan-y'},
    }});
export const detailsHeader = style({position: 'sticky', top: 0, zIndex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', padding: '24px', background: '#232d25', borderBottom: `1px solid ${vars.color.border}`,
    '@media': {'(max-width: 640px)': {padding: '24px 20px 20px'},
        '(max-width: 900px) and (max-height: 500px)': {padding: '12px 16px'}}});
export const detailsHeading = style({minWidth: 0});
export const detailsContent = style({padding: '24px', '@media': {'(max-width: 640px)': {padding: '20px'}}});
export const close = style([iconButton, {width: '44px', height: '44px', background: 'rgba(0, 0, 0, 0.12)'}]);
export const sheetGrabber = style({display: 'none', '@media': {'(max-width: 640px)': {display: 'block', position: 'absolute', top: '8px', left: 'calc(50% - 18px)', width: '36px', height: '3px', borderRadius: '8px', background: vars.color.border}}});
export const type = style({display: 'inline-flex', alignItems: 'center', gap: '7px', margin: 0, fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase'});
export const placeName = style({margin: '12px 0 8px', overflowWrap: 'anywhere', fontSize: '1.7rem', fontWeight: 600, letterSpacing: '-0.035em', lineHeight: 1.15});
export const elevation = style({margin: 0, color: vars.color.route, fontSize: '1.1rem', fontWeight: 500, fontVariantNumeric: 'tabular-nums'});
export const showControls = style([button, {...panel, position: 'absolute', top: '24px', left: '24px', zIndex: 3, borderRadius: '12px', '@media': {'(max-width: 640px)': {top: '12px', left: '12px'}}}]);

globalStyle(`${view} .maplibregl-ctrl-top-right`, {top: '14px', right: '14px', '@media': {'(max-width: 640px)': {top: '2px', right: '2px'}}});
globalStyle(`${view} .maplibregl-ctrl-group`, {...panel, borderRadius: '12px', overflow: 'hidden'});
globalStyle(`${view} .maplibregl-ctrl-group button`, {width: '40px', height: '42px'});
globalStyle(`${view} .maplibregl-ctrl-group button + button`, {borderTopColor: vars.color.border});
globalStyle(`${view} .maplibregl-ctrl-icon`, {filter: 'invert(0.9)'});
globalStyle(`${view} .maplibregl-ctrl-attrib`, {background: vars.color.surface, color: vars.color.textMuted, fontSize: '10px'});
globalStyle(`${view} .maplibregl-ctrl-attrib a`, {color: vars.color.textMuted});
globalStyle(`${view} .maplibregl-ctrl-attrib-button`, {filter: 'invert(0.85)'});
globalStyle(`${view} .maplibregl-ctrl-attrib.maplibregl-compact`, {
    background: vars.color.surface, color: vars.color.textMuted, border: `1px solid ${vars.color.border}`,
    '@media': {'(max-width: 640px)': {maxWidth: 'calc(100vw - 24px)'}},
});
globalStyle(`${view} .maplibregl-ctrl-attrib.maplibregl-compact a`, {color: vars.color.textMuted});
globalStyle(`${view} input[type="file"]::file-selector-button`, {
    background: vars.color.accentSurface, color: vars.color.text, border: 0,
    borderRadius: '6px', padding: '6px 8px', marginRight: '8px', font: 'inherit', cursor: 'pointer',
});
