import {globalStyle, style} from '@vanilla-extract/css';
import {vars} from '../styles/theme.css';

export const account = style({display: 'grid', gap: '8px', padding: '12px 0', borderBottom: `1px solid ${vars.color.border}`});
export const actions = style({display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px'});
export const message = style({margin: 0, color: vars.color.textMuted, fontSize: '0.75rem', lineHeight: 1.6, overflowWrap: 'anywhere'});
export const name = style({margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', overflowWrap: 'anywhere'});
export const dialog = style({width: 'min(420px, calc(100vw - 32px))', maxHeight: 'calc(100dvh - 32px)', overflowY: 'auto',
    padding: '28px', color: vars.color.text, background: vars.color.surface, border: `1px solid ${vars.color.border}`,
    borderRadius: '16px', boxShadow: '0 16px 64px rgba(0,0,0,0.4)'});
globalStyle(`${dialog}::backdrop`, {background: 'rgba(9,15,12,0.7)'});
export const heading = style({display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '16px', marginBottom: '12px'});
export const title = style({margin: 0, fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.3});
export const form = style({display: 'grid', gap: '16px', marginTop: '20px'});
export const label = style({display: 'grid', gap: '7px', fontSize: '0.8125rem', color: vars.color.textMuted});
export const input = style({width: '100%', minWidth: 0, minHeight: '44px', border: `1px solid ${vars.color.border}`,
    borderRadius: '8px', background: vars.color.background, color: vars.color.text, padding: '10px 12px',
    selectors: {'&:focus-visible': {outline: 'none', borderColor: vars.color.route, boxShadow: `inset 0 0 0 1px ${vars.color.route}`}}});
export const link = style({background: 'none', border: 0, padding: '6px 0', color: vars.color.route,
    cursor: 'pointer', fontSize: '0.8125rem', textAlign: 'left', textDecoration: 'underline', textUnderlineOffset: '3px'});
export const notice = style([message, {padding: '12px', background: vars.color.background, borderRadius: '8px'}]);
