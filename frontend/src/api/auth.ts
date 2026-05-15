import client from './client';

export interface LoginPayload { username: string; password: string; }
export interface SignupPayload { email: string; full_name: string; password: string; }
export interface AuthToken { access_token: string; token_type: string; }

// All auth requests now use the standard client with /api prefix

export async function login(payload: LoginPayload): Promise<AuthToken> {
    const form = new URLSearchParams();
    form.append('username', payload.username);
    form.append('password', payload.password);
    const { data } = await client.post<AuthToken>(`/auth/login`, form, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return data;
}

export async function signup(payload: SignupPayload) {
    const { data } = await client.post(`/auth/signup`, payload);
    return data;
}

export async function forgotPassword(email: string): Promise<void> {
    await client.post(`/auth/forgot-password`, { email });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
    await client.post(`/auth/reset-password`, { token, new_password: newPassword });
}

export async function verifyResetToken(token: string): Promise<{ valid: boolean }> {
    const { data } = await client.get<{ valid: boolean }>(`/auth/verify-reset-token`, {
        params: { token },
    });
    return data;
}

