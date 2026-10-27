import {style} from '@vanilla-extract/css';
import {vars} from '../styles/theme.css';
import {section, summary as disclosureSummary, select as fieldControl, button as actionButton} from './MapView.css';
export {badge} from './MapView.css';

export const panel = section;
export const summary = disclosureSummary;
export const fields = style({display: 'grid', gap: '14px', marginTop: '16px'});
export const label = style({display: 'grid', gap: '7px', fontSize: '0.75rem', color: vars.color.textMuted});
export const select = fieldControl;
export const numberInput = fieldControl;
export const button = style([actionButton, {width: '100%'}]);
export const message = style({margin: 0, color: vars.color.textMuted, fontSize: '0.75rem'});
