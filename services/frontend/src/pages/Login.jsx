import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, KeyRound, Mail } from 'lucide-react';
import api from '../api/axios';
import AuthShell from '../components/AuthShell';
import { Button } from '../components/ui/button';

function getErrorMessage(err) {
  if (err.response?.data?.error) return err.response.data.error;
  if (Array.isArray(err.response?.data?.errors) && err.response.data.errors.length) {
    return err.response.data.errors[0].msg;
  }
  return 'Tidak bisa masuk sekarang. Periksa koneksi atau kredensial Anda.';
}

export default function Login() {
  const [email, setEmail] = useState('admin@it-ops-hub.local');
  const [password, setPassword] = useState('Admin@123!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      navigate('/dashboard');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Operator Sign In"
      title="Masuk ke workspace operasional Anda"
      description="Akses dashboard, inventaris aset, dan service desk dari satu panel yang terasa lebih layak dipakai tim internal."
      footer={(
        <p className="text-sm text-slate-400">
          Belum punya akun?{' '}
          <Link to="/register" className="font-medium text-amber-300 transition hover:text-amber-200">
            Buat akun baru
          </Link>
        </p>
      )}
    >
      <div className="space-y-2">
        <p className="auth-form-kicker">Secure access</p>
        <h2 className="auth-form-title">Sign in</h2>
        <p className="auth-form-copy">
          Gunakan akun yang sudah terdaftar untuk membuka dashboard operasi dan ticket queue Anda.
        </p>
      </div>

      {error && (
        <div className="auth-alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-5">
        <label className="auth-field">
          <span className="auth-label">Email</span>
          <span className="auth-input-wrap">
            <Mail className="auth-input-icon" size={18} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-input"
              placeholder="admin@it-ops-hub.local"
              autoComplete="email"
              required
            />
          </span>
        </label>

        <label className="auth-field">
          <span className="auth-label">Password</span>
          <span className="auth-input-wrap">
            <KeyRound className="auth-input-icon" size={18} />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-input"
              placeholder="Masukkan password Anda"
              autoComplete="current-password"
              required
            />
          </span>
        </label>

        <Button type="submit" disabled={loading} size="lg" className="auth-submit">
          {loading ? 'Memproses...' : 'Masuk ke dashboard'}
          <ArrowRight size={18} />
        </Button>
      </form>
    </AuthShell>
  );
}
