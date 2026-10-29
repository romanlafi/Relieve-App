import {afterEach, vi} from 'vitest';
import {cleanup} from '@testing-library/react';

Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {configurable: true, value: vi.fn()});
Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {configurable: true, value: vi.fn(function(this: HTMLDialogElement) {
    this.setAttribute('open', '');
})});
Object.defineProperty(window, 'matchMedia', {configurable: true, value: vi.fn((media: string) => ({
    matches: false, media, onchange: null, addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
}))});
afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});
