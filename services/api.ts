/**
 * Central API client for Google Apps Script backend.
 * All API calls go through this module.
 */

const API_URL = (import.meta as any).env?.VITE_APPS_SCRIPT_URL || '';

export async function apiGet(action: string, params: Record<string, string> = {}): Promise<any> {
    const url = new URL(API_URL);
    url.searchParams.set('action', action);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const response = await fetch(url.toString());
    if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    return response.json();
}

export async function apiPost(action: string, body: Record<string, any> = {}): Promise<any> {
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' }, // Apps Script requires text/plain for CORS
        body: JSON.stringify({ action, ...body }),
    });
    if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    return response.json();
}

export function isApiConfigured(): boolean {
    return Boolean(API_URL && API_URL !== '' && !API_URL.includes('YOUR_'));
}
