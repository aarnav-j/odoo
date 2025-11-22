import TopNav from './TopNav';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-slate-950">
      <TopNav />
      <main className="p-4 lg:p-6">{children}</main>
    </div>
  );
}

