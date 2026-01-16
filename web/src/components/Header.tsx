import { Link } from 'react-router-dom';
import { Sparkles, Moon, Sun, Eye } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function Header() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 glass backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-b border-purple-100 dark:border-purple-900/30 shadow-sm">
      {/* Animated gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-4 relative">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            {/* Unique animated icon */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl blur opacity-50 group-hover:opacity-75 animate-glow transition-opacity"></div>
              <div className="relative bg-gradient-to-br from-purple-600 to-blue-600 p-2.5 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <Eye className="w-6 h-6 text-white animate-pulse-subtle" strokeWidth={2.5} />
              </div>
            </div>
            
            {/* Logo text with gradient */}
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 dark:from-purple-400 dark:via-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">
                TruthLens
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 -mt-0.5">Multi-Perspective Analysis</p>
            </div>
          </Link>
          
          <div className="flex items-center gap-4">
            {/* GDELT badge */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/30 dark:to-blue-900/30 rounded-full border border-purple-200 dark:border-purple-700/30 animate-fade-in">
              <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span className="text-xs font-medium text-purple-700 dark:text-purple-300">Powered by GDELT</span>
            </div>

            {/* Theme toggle button */}
            <button
              onClick={toggleTheme}
              className="relative p-2.5 rounded-xl bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/40 dark:to-blue-900/40 hover:scale-110 transition-all duration-300 border border-purple-200 dark:border-purple-700/30 group"
              aria-label="Toggle theme"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-blue-500 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity"></div>
              {theme === 'light' ? (
                <Moon className="w-5 h-5 text-purple-700 dark:text-purple-300 relative z-10 animate-scale-in" />
              ) : (
                <Sun className="w-5 h-5 text-purple-700 dark:text-purple-300 relative z-10 animate-scale-in" />
              )}
            </button>

            {/* Version */}
            <div className="text-xs text-slate-400 dark:text-slate-500 hidden sm:block">v1.0.0</div>
          </div>
        </div>
      </div>
    </header>
  );
}
