import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/client';
import { Hexagon, Loader2 } from 'lucide-react';
import { BaseButton } from './ui/BaseButton';

export function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.auth.signup({ email, password, name });
      login(res.accessToken, res.user);
      navigate('/app', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Signup failed. Please check your information and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-[var(--radius-card)] bg-surface border border-border flex items-center justify-center mb-6 shadow-sm">
            <Hexagon className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-page-title text-primary">Create an account</h1>
          <p className="text-secondary mt-2">Join KRAMA OS today</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-[var(--radius-card)] p-6 shadow-[var(--shadow-resting)] space-y-5">
          {error && (
            <div className="text-body text-danger bg-danger/5 border border-danger/20 p-3 rounded-[var(--radius-input)] animate-in fade-in duration-200">
              {error}
            </div>
          )}
          <div>
            <label className="block text-caption font-mono font-bold text-primary uppercase mb-2">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-border rounded-[var(--radius-input)] bg-background text-primary placeholder:text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-200 ease-out"
              placeholder="Full Name"
              required
            />
          </div>
          <div>
            <label className="block text-caption font-mono font-bold text-primary uppercase mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-border rounded-[var(--radius-input)] bg-background text-primary placeholder:text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-200 ease-out"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-caption font-mono font-bold text-primary uppercase mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-border rounded-[var(--radius-input)] bg-background text-primary placeholder:text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-200 ease-out"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>
          <BaseButton type="submit" variant="primary" className="w-full justify-center mt-2" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign Up'}
          </BaseButton>
        </form>

        <p className="text-center text-secondary mt-6">
          Already have an account? <Link to="/login" className="text-accent hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
