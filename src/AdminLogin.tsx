import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase-config';
import { useNavigate } from 'react-router-dom';
import './AdminLogin.css';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Navigate to admin dashboard after successful login
      navigate('/admin-dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
      console.error('Admin login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-box">
        <div className="admin-login-header">
          <h1 className="admin-title">
            Sizabantu <span className="admin-subtitle">Barbershop</span>
          </h1>
          <p className="admin-login-label">ADMIN ACCESS</p>
        </div>

        <form onSubmit={handleLogin} className="admin-login-form">
          <div className="form-group">
            <label htmlFor="admin-email">Email Address</label>
            <input
              id="admin-email"
              type="email"
              placeholder="cbrprints22@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading} className="admin-login-btn">
            {loading ? 'Signing in...' : 'Login as Admin'}
          </button>
        </form>

        <div className="admin-login-footer">
          <p>
            <a href="/">Back to Sign In / Sign Up</a>
          </p>
        </div>
      </div>
    </div>
  );
}
