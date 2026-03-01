import axios from 'axios';

export interface LoginPayload { username: string; password: string; }
export interface SignupPayload { email: string; full_name: string; password: string; }
export interface AuthToken { access_token: string; token_type: string; }

const BASE_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:8000';

export async function login(payload: LoginPayload): Promise<AuthToken> {
    const form = new URLSearchParams();
    form.append('username', payload.username);
    form.append('password', payload.password);
    const { data } = await axios.post<AuthToken>(`${BASE_URL}/auth/login`, form, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return data;
}

export async function signup(payload: SignupPayload) {
    const { data } = await axios.post(`${BASE_URL}/auth/signup`, payload);
    return data;
}
