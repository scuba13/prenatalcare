import React from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const menuItems = [
    { label: 'Dashboard', icon: 'dashboard', path: '/' },
    { label: 'Gestantes', icon: 'group', path: '/patients' },
    { label: 'Agenda', icon: 'calendar_month', path: '/schedule' },
    { label: 'Relatórios', icon: 'bar_chart', path: '/reports' },
  ];

  const handleLogout = () => {
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen">
      {/* SideNavBar */}
      <aside className="w-64 flex-shrink-0 bg-[#1c2625] border-r border-white/10 flex flex-col p-4 fixed h-full z-20 hidden md:flex">
        <div className="mb-8 px-2">
          <h1 className="text-white text-2xl font-bold tracking-tight">
            Gestão<span className="text-primary">Care</span>
          </h1>
        </div>
        
        <div className="flex flex-col gap-2 flex-grow">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive(item.path)
                  ? 'bg-primary/20 text-white'
                  : 'text-[#9db8b5] hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className={`material-symbols-outlined ${isActive(item.path) ? 'text-primary filled' : ''}`}>
                {item.icon}
              </span>
              <p className="text-sm font-medium leading-normal">{item.label}</p>
            </Link>
          ))}
          
          <div className="mt-auto">
             <div className="border-t border-white/10 my-4"></div>
             <div className="flex flex-col gap-1">
                <Link to="/settings" className="flex items-center gap-3 px-3 py-2 rounded-lg text-[#9db8b5] hover:bg-white/10 hover:text-white">
                  <span className="material-symbols-outlined">settings</span>
                  <p className="text-sm font-medium leading-normal">Configurações</p>
                </Link>
                <Link to="/help" className="flex items-center gap-3 px-3 py-2 rounded-lg text-[#9db8b5] hover:bg-white/10 hover:text-white">
                  <span className="material-symbols-outlined">help</span>
                  <p className="text-sm font-medium leading-normal">Ajuda</p>
                </Link>
             </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 mt-4">
          <div className="flex items-center gap-3 px-2">
            <div
              className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 border border-white/10"
              style={{
                backgroundImage:
                  'url("https://lh3.googleusercontent.com/aida-public/AB6AXuATjSrdkWoiL71cchoqqrztap2wLY3LW-kbHWXEmle6T6xvE27vTw68zc--B47lj84D82_LyL-ghvBECtr0_AjLvQd6Er9J022EuqXR7bVGveL4guWHF9mYz3xDiCgo1peLE4rpbVUcLP3NAXD08BSpGVxlRT7TvKXeyG8uDBvFSiNL5Zjjro3SPPSDUc1d5dOl8WLCGkC45ZuACaInXmpfWTzSYSvELcS3dIBmrp0vhDOn5OMMkCsdOXkuIWdQgg5egKL0P7Ewfesn")',
              }}
            ></div>
            <div className="flex flex-col overflow-hidden">
              <h1 className="text-white text-sm font-medium leading-normal truncate">Dr. Sobrenome</h1>
              <p className="text-[#9db8b5] text-xs font-normal leading-normal truncate">Clínico Geral</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 text-[#9db8b5] hover:text-white w-full text-left">
            <span className="material-symbols-outlined">logout</span>
            <p className="text-sm font-medium leading-normal">Sair</p>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 w-full min-h-screen bg-[#111817] text-white overflow-y-auto">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-white/10 bg-[#1c2625] sticky top-0 z-30">
           <h1 className="text-white text-lg font-bold tracking-tight">
            Gestão<span className="text-primary">Care</span>
          </h1>
          <div className="flex gap-4">
             <button className="text-white"><span className="material-symbols-outlined">menu</span></button>
          </div>
        </div>
        
        {children}
      </main>
    </div>
  );
};

export default Layout;
