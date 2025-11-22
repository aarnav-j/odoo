import { Link } from 'react-router-dom';
import { Menu, Sparkles } from 'lucide-react';

export default function Header() {
  return (
    <header className="relative">
      <div className="mx-auto max-w-7xl px-6 py-5">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo-2.jpg" alt="StockMaster Logo" className="h-8 w-8 object-contain rounded" />
            <span className="text-base font-semibold tracking-tight text-slate-100">StockMaster</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#product" className="text-sm font-medium text-slate-300 hover:text-slate-100 transition-colors">
              Product
            </a>
            <a href="#operations" className="text-sm font-medium text-slate-300 hover:text-slate-100 transition-colors">
              Operations
            </a>
            <a href="#how" className="text-sm font-medium text-slate-300 hover:text-slate-100 transition-colors">
              How it works
            </a>
            <a href="#security" className="text-sm font-medium text-slate-300 hover:text-slate-100 transition-colors">
              Security
            </a>
          </nav>
          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-slate-300 hover:text-slate-100">
              Sign in
            </Link>
            <Link to="/login" className="inline-flex items-center gap-2 rounded-md bg-slate-100 text-slate-900 text-sm font-semibold px-3.5 py-2 hover:bg-white transition-colors">
              <Sparkles className="h-4 w-4" />
              Get started
            </Link>
          </div>
          <button className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 hover:border-white/20">
            <Menu className="h-5 w-5 text-slate-200" />
          </button>
        </div>
      </div>
    </header>
  );
}

