import assert from 'node:assert/strict';
import {test} from 'node:test';
import {announceSessionChange, apiFetch} from '../src/auth/apiFetch.js';

test('apiFetch forces same-origin cookies and announces expired sessions', async () => {
    const originalFetch = globalThis.fetch;
    const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    const events: Event[] = [];
    let requestInit: RequestInit | undefined;
    Object.defineProperty(globalThis, 'window', {configurable: true, value: {
        dispatchEvent: (event: Event) => { events.push(event); return true; },
    }});
    globalThis.fetch = async (_input, init) => {
        requestInit = init;
        return new Response(null, {status: 401});
    };
    try {
        const response = await apiFetch('/api/me', {credentials: 'include'});
        assert.equal(response.status, 401);
        assert.equal(requestInit?.credentials, 'same-origin');
        assert.equal(events.length, 1);
        assert.equal(events[0]?.type, 'relieve-session-expired');
    } finally {
        globalThis.fetch = originalFetch;
        if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
        else Reflect.deleteProperty(globalThis, 'window');
    }
});

test('announceSessionChange writes a timestamp and tolerates unavailable storage', () => {
    const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    let value: string | null = null;
    Object.defineProperty(globalThis, 'localStorage', {configurable: true, value: {
        setItem: (_key: string, next: string) => { value = next; },
    }});
    try {
        announceSessionChange();
        assert.ok(value && Number.isFinite(Number(value)));

        Object.defineProperty(globalThis, 'localStorage', {configurable: true, get() { throw new Error('blocked'); }});
        assert.doesNotThrow(announceSessionChange);
    } finally {
        if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage);
        else Reflect.deleteProperty(globalThis, 'localStorage');
    }
});
