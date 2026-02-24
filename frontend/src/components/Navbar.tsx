import { Link, NavLink, useNavigate } from 'react-router-dom';

export default function Navbar() {
    const navigate = useNavigate();

    function logout() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_id');
        navigate('/login');
    }

    return (
        <nav className="navbar">
            <Link to="/dashboard" className="navbar-brand">
                ⚡ AI Career Partner
            </Link>
            <div className="navbar-links">
                <NavLink to="/dashboard" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                    Dashboard
                </NavLink>
                <NavLink to="/interview" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                    Interview Coach
                </NavLink>
                <button className="btn btn-outline" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }} onClick={logout}>
                    Logout
                </button>
            </div>
        </nav>
    );
}
