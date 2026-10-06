import {style} from '@vanilla-extract/css';
import {vars} from '../styles/theme.css';

export const panel = style({
    padding: vars.space.sm,
    color: vars.color.text, background: vars.color.surface,
    border: `1px solid ${vars.color.border}`, borderRadius: vars.radius.sm, fontSize: '0.8rem',
});
export const summary = style({cursor: 'pointer', fontWeight: 600});
export const fields = style({display: 'grid', gap: vars.space.sm, marginTop: vars.space.sm});
export const label = style({display: 'grid', gap: vars.space.sm});
export const select = style({
    width: '100%', font: 'inherit', color: vars.color.text, background: vars.color.background,
    border: `1px solid ${vars.color.border}`, borderRadius: vars.radius.sm, padding: vars.space.sm,
});
export const message = style({margin: 0, color: vars.color.textMuted});
