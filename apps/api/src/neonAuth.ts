import {Hono} from 'hono';
import type {Context} from 'hono';
import {bodyLimit} from 'hono/body-limit';
import {z} from 'zod';
import type {ApiEnvironment} from './environment.js';

export function neonAuthUrl(value: string): string {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !/\.neonauth\.[a-z0-9.-]+\.neon\.(tech|build)$/.test(url.hostname)
        || url.username || url.password || url.search || url.hash || !url.pathname.endsWith('/auth')) {
        throw new Error('Invalid Neon Auth configuration');
    }
    return url.href;
}

export function authCookies(header: string | undefined): string {
    return (header ?? '').split(';').map((cookie) => cookie.trim())
        .filter((cookie) => /^(?:__Secure-)?neon-?auth\.[a-z_]+=/.test(cookie)).join('; ');
}

export function publicSessionCookie(cookie: string): string {
    // Keep the session on Relieve's own domain, in an HttpOnly cookie. The
    // browser never needs to store a session token in localStorage or JS state.
    let result = cookie.replace(/;\s*Domain=[^;]+/gi, '').replace(/;\s*Path=[^;]+/gi, '; Path=/')
        .replace(/;\s*SameSite=[^;]+/gi, '; SameSite=Lax');
    if (!/;\s*Path=/i.test(result)) result += '; Path=/';
    if (!/;\s*SameSite=/i.test(result)) result += '; SameSite=Lax';
    if (!/;\s*HttpOnly(?:;|$)/i.test(result)) result += '; HttpOnly';
    if (!/;\s*Secure(?:;|$)/i.test(result)) result += '; Secure';
    return result;
}

export function setAuthResponseCookies(context: Context<ApiEnvironment>, response: Response) {
    for (const cookie of response.headers.getSetCookie()) {
        if (/^(?:__Secure-)?neon-?auth\.[a-z_]+=/.test(cookie)) {
            context.header('Set-Cookie', publicSessionCookie(cookie), {append: true});
        }
    }
}

const email = z.email().max(254).transform((value) => value.toLowerCase());
const password = z.string().min(8).max(128);
const otp = z.string().regex(/^\d{6}$/);
const operations = {
    '/sign-up/email': z.object({email, password, name: z.string().trim().min(1).max(80)}).strict(),
    '/sign-in/email': z.object({email, password, rememberMe: z.boolean().optional()}).strict(),
    '/sign-out': z.object({}).strict(),
    '/email-otp/verify-email': z.object({email, otp}).strict(),
    '/email-otp/send-verification-otp': z.object({email, type: z.literal('email-verification')}).strict(),
    '/email-otp/request-password-reset': z.object({email}).strict(),
    '/email-otp/reset-password': z.object({email, otp, password}).strict(),
};

export const authRoutes = new Hono<ApiEnvironment>();
authRoutes.use('*', bodyLimit({maxSize: 8192}));
authRoutes.post('*', async (context) => {
    const path = context.req.path.slice('/auth'.length);
    const schema = operations[path as keyof typeof operations];
    if (!schema) return context.json({error: {code: 'NOT_FOUND'}}, 404);
    if (!context.env.NEON_AUTH_URL) return context.json({error: {code: 'AUTH_NOT_CONFIGURED'}}, 503);
    let body: unknown;
    try { body = await context.req.json(); }
    catch { return context.json({error: {code: 'INVALID_JSON'}}, 400); }
    const parsed = schema.safeParse(body);
    if (!parsed.success) return context.json({error: {code: 'INVALID_AUTH_INPUT'}}, 400);
    const headers = new Headers({'Content-Type': 'application/json', Origin: new URL(context.req.url).origin});
    const cookies = authCookies(context.req.header('Cookie'));
    if (cookies) headers.set('Cookie', cookies);
    const ip = context.req.header('CF-Connecting-IP');
    if (ip) { headers.set('X-Forwarded-For', ip); headers.set('X-Real-IP', ip); }
    let response: Response;
    try {
        response = await fetch(neonAuthUrl(context.env.NEON_AUTH_URL) + path, {
            method: 'POST', headers, body: JSON.stringify(parsed.data), redirect: 'manual',
            signal: AbortSignal.timeout(15000),
        });
    } catch (error) {
        console.error('Neon Auth upstream request failed:', error instanceof Error ? error.message : 'Unknown error');
        return context.json({error: {code: 'AUTH_UNAVAILABLE'}}, 503);
    }
    const result = await response.json().catch(() => null) as {code?: string; user?: {emailVerified?: boolean}} | null;
    if (!result) return context.json({error: {code: 'AUTH_UNAVAILABLE'}}, 503);
    if (!response.ok) {
        return context.json({error: {code: result.code ?? 'AUTH_FAILED'}},
            response.status === 429 ? 429 : response.status >= 500 ? 503 : 400);
    }
    setAuthResponseCookies(context, response);
    return context.json({success: true, requiresVerification: path === '/sign-up/email' && !result.user?.emailVerified});
});
