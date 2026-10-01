import {style} from '@vanilla-extract/css';
import {vars} from '../styles/theme.css';

export const form = style({display: 'grid', gap: vars.space.md, marginTop: vars.space.md, fontSize: '0.875rem'});
export const fields = style({display: 'grid', gap: vars.space.md, border: 0, padding: 0, margin: 0, minWidth: 0});
export const field = style({display: 'grid', gap: vars.space.sm});
export const checkbox = style({display: 'flex', alignItems: 'center', gap: vars.space.sm});
export const control = style({
    width: '100%', font: 'inherit', color: vars.color.text, colorScheme: 'dark',
    background: vars.color.background, border: `1px solid ${vars.color.border}`,
    borderRadius: vars.radius.sm, padding: vars.space.sm,
    ':focus-visible': {outline: `2px solid ${vars.color.textMuted}`, outlineOffset: '2px'},
    ':disabled': {opacity: 0.6},
});
export const notes = style([control, {resize: 'vertical', minHeight: '70px'}]);
export const actions = style({display: 'flex', flexWrap: 'wrap', gap: vars.space.sm});
export const button = style({
    font: 'inherit', color: vars.color.text, background: vars.color.background,
    border: `1px solid ${vars.color.border}`, borderRadius: vars.radius.sm,
    padding: vars.space.sm, cursor: 'pointer',
    ':hover': {borderColor: vars.color.textMuted},
    ':disabled': {opacity: 0.6, cursor: 'wait'},
});
export const message = style({margin: 0, color: vars.color.textMuted, fontSize: '0.75rem'});
