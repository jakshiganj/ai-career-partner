import client from './client';

export interface LoginPayload { username: string; password: string; }
export interface SignupPayload { email: string; full_name: string; password: string; }
export interface AuthToken { access_token: string; token_type: string; }

export async function login(payload: LoginPayload): Promise<AuthToken> {
    const form = new URLSearchParams();
    form.append('username', payload.username);
    form.append('password', payload.password);
    const { data } = await client.post<AuthToken>('/auth/login', form, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return data;
}

export async function signup(payload: SignupPayload) {
    const { data } = await client.post('/auth/signup', payload);
    return data;
}
