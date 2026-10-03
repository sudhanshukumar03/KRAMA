import { useNavigate } from 'react-router-dom';

export function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-full py-20 text-primary">
      <h1 className="text-6xl font-bold mb-4">404</h1>
      <h2 className="text-2xl font-semibold mb-6">Page Not Found</h2>
      <p className="text-secondary mb-8 max-w-md text-center">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <button
        onClick={() => navigate('/')}
        className="px-6 py-2.5 bg-accent hover:bg-accent-hover text-on-accent font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer active:scale-[0.98]"
      >
        Return to Cockpit
      </button>
    </div>
  );
}
