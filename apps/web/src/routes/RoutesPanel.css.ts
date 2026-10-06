import {style} from '@vanilla-extract/css';
import {vars} from '../styles/theme.css';
export const heading = style({fontSize: '0.9rem', margin: `${vars.space.sm} 0`});
export const detected = style({display: 'grid', gap: vars.space.sm, maxHeight: '200px', overflowY: 'auto'});
export const place = style({display: 'flex', alignItems: 'center', gap: vars.space.sm, fontSize: '0.75rem'});
export const tabs = style({display: 'flex', gap: vars.space.sm});
