import {style} from '@vanilla-extract/css';
import {vars} from './styles/theme.css';

export const page = style({
    maxWidth: '48rem',
    margin: '0 auto',
    padding: vars.space.lg,
});

export const title = style({
    color: vars.color.text,
    marginBottom: vars.space.md,
});

export const button = style({
    background: vars.color.surface,
    color: vars.color.text,
    border: `1px solid ${vars.color.border}`,
    borderRadius: vars.radius.sm,
    padding: `${vars.space.sm} ${vars.space.md}`,
    font: 'inherit',
    cursor: 'pointer',
    ':hover': {borderColor: vars.color.textMuted},
});
