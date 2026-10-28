export async function apiFetch(input: RequestInfo | URL, init?: RequestInit) {
    const response = await fetch(input, {...init, credentials: 'same-origin'});
    if (response.status === 401) window.dispatchEvent(new Event('relieve-session-expired'));
    return response;
}

export function announceSessionChange() {
    try { localStorage.setItem('relieve-auth-changed', String(Date.now())); }
    catch { /* Session cookies continue to work when localStorage is unavailable. */ }
}
