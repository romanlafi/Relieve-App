import {style} from '@vanilla-extract/css';
import {vars} from '../styles/theme.css';
import {select, button as sharedButton} from './MapView.css';
export {primaryButton} from './MapView.css';

export const section = style({display: 'grid', gap: '12px', marginTop: '24px', paddingTop: '20px', borderTop: `1px solid ${vars.color.border}`});
export const heading = style({margin: 0, fontSize: '0.9rem'});
export const field = style({display: 'grid', gap: vars.space.sm, fontSize: '0.8rem'});
export const fields = style({display: 'grid', gap: vars.space.md, border: 0, padding: 0, margin: 0, minWidth: 0});
export const control = select;
export const actions = style({display: 'flex', flexWrap: 'wrap', gap: vars.space.sm});
export const button = sharedButton;
export const message = style({margin: 0, color: vars.color.textMuted, fontSize: '0.75rem'});
