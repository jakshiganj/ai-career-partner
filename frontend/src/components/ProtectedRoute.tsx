import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
    const location = useLocation();

    // Check URL first for OAuth redirect tokens
    const params = new URLSearchParams(location.search);
    const urlToken = params.get('token');
    const urlUid = params.get('user_id');

    if (urlToken) {
        localStorage.setItem('access_token', urlToken); // Used by ProtectedRoute & Login
        localStorage.setItem('token', urlToken); // Backwards compatibility for Dashboard 
        if (urlUid) localStorage.setItem('user_id', urlUid);

        // Strip the token from the URL browser history so it cant be copied
        window.history.replaceState({}, document.title, window.location.pathname);
        return <>{children}</>;
    }

    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    if (!token) return <Navigate to="/login" replace />;
    return <>{children}</>;
}
