import {style} from '@vanilla-extract/css';
import {vars} from '../styles/theme.css';
export const heading = style({fontSize: '0.9rem', margin: `${vars.space.sm} 0`});
export const detected = style({display: 'grid', gap: vars.space.sm, maxHeight: '200px', overflowY: 'auto'});
export const place = style({display: 'flex', alignItems: 'center', gap: vars.space.sm, fontSize: '0.75rem'});
export const tabs = style({display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', padding: '4px',
    background: 'rgba(0, 0, 0, 0.22)', borderRadius: '12px', border: `1px solid ${vars.color.border}`});
export const tab = style({display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    minHeight: '40px', border: '1px solid transparent', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600,
    color: vars.color.textMuted, background: 'transparent', cursor: 'pointer',
    ':hover': {color: vars.color.text},
    selectors: {'&[aria-pressed="true"]': {background: vars.color.accentSurface,
        color: vars.color.route, borderColor: 'rgba(232, 197, 139, 0.15)', boxShadow: '0 2px 6px rgba(0, 0, 0, 0.12)'}}});
