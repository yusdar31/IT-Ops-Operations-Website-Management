import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Building2, KeyRound, Mail, UserRound } from 'lucide-react';
import api from '../api/axios';
import AuthShell from '../components/AuthShell';
import { Button } from '../components/ui/button';

function getErrorMessage(err) {
  if (err.response?.data?.error) return err.response.data.error;
  if (Array.isArray(err.response?.data?.errors) && err.response.data.errors.length) {
    return err.response.data.errors[0].msg;
  }
  return 'Pendaftaran belum bisa diproses. Coba lagi beberapa saat lagi.';
}

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    department: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const updateField = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (form.password !== form.confirmPassword) {
      setError('Konfirmasi password belum sama.');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/signup', {
        name: form.name,
        email: form.email,
        department: form.department,
        password: form.password,
      });

      setSuccess('Akun berhasil dibuat. Anda bisa langsung masuk sekarang.');
      setTimeout(() => navigate('/login'), 900);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="New Workspace Access"
      title="Buat akun untuk mulai memakai IT Operations Hub"
      description="Registrasi publik ini membuat akun dengan role viewer terlebih dulu, cocok untuk pelapor tiket atau pengguna internal umum."
      footer={(
        <p className="text-sm text-slate-400">
          Sudah punya akun?{' '}
          <Link to="/login" className="font-medium text-amber-300 transition hover:text-amber-200">
            Kembali ke login
          </Link>
        </p>
      )}
    >
      <div className="space-y-2">
        <p className="auth-form-kicker">Create account</p>
        <h2 className="auth-form-title">Register</h2>
        <p className="auth-form-copy">
          Isi identitas dasar Anda. Admin tetap bisa menaikkan role setelah akun aktif di sistem.
        </p>
      </div>

      {error && (
        <div className="auth-alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <label className="auth-field">
          <span className="auth-label">Nama lengkap</span>
          <span className="auth-input-wrap">
            <UserRound className="auth-input-icon" size={18} />
            <input
              type="text"
              value={form.name}
              onChange={updateField('name')}
              className="auth-input"
              placeholder="Nama Anda"
              autoComplete="name"
              required
            />
          </span>
        </label>

        <label className="auth-field">
          <span className="auth-label">Email kerja</span>
          <span className="auth-input-wrap">
            <Mail className="auth-input-icon" size={18} />
            <input
              type="email"
              value={form.email}
              onChange={updateField('email')}
              className="auth-input"
              placeholder="nama@perusahaan.com"
              autoComplete="email"
              required
            />
          </span>
        </label>

        <label className="auth-field">
          <span className="auth-label">Departemen</span>
          <span className="auth-input-wrap">
            <Building2 className="auth-input-icon" size={18} />
            <input
              type="text"
              value={form.department}
              onChange={updateField('department')}
              className="auth-input"
              placeholder="Contoh: Finance, HR, IT Ops"
              autoComplete="organization"
            />
          </span>
        </label>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="auth-field">
            <span className="auth-label">Password</span>
            <span className="auth-input-wrap">
              <KeyRound className="auth-input-icon" size={18} />
              <input
                type="password"
                value={form.password}
                onChange={updateField('password')}
                className="auth-input"
                placeholder="Minimal 8 karakter"
                autoComplete="new-password"
                required
              />
            </span>
          </label>

          <label className="auth-field">
            <span className="auth-label">Konfirmasi password</span>
            <span className="auth-input-wrap">
              <KeyRound className="auth-input-icon" size={18} />
              <input
                type="password"
                value={form.confirmPassword}
                onChange={updateField('confirmPassword')}
                className="auth-input"
                placeholder="Ulangi password"
                autoComplete="new-password"
                required
              />
            </span>
          </label>
        </div>

        <Button type="submit" disabled={loading} size="lg" className="auth-submit">
          {loading ? 'Membuat akun...' : 'Buat akun'}
          <ArrowRight size={18} />
        </Button>
      </form>
    </AuthShell>
  );
}
