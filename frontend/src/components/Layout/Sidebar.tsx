import React, { useState, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard, TrendingUp, Package, ShoppingCart,
  Upload, Users, LogOut, ChevronRight, Pin, PinOff,
} from 'lucide-react'

const EPR_AZUL = '#1A3A6B'
const EPR_AMARELO = '#F5A623'

function NavItem({ to, icon: Icon, label, end }: { to: string; icon: React.ElementType; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all relative ${
          isActive ? 'text-white' : 'text-white/60 hover:text-white hover:bg-white/10'
        }`
      }
      style={({ isActive }) => isActive ? { backgroundColor: 'rgba(255,255,255,0.15)' } : {}}
    >
      {({ isActive }) => (
        <>
          <Icon size={16} style={{ color: isActive ? EPR_AMARELO : undefined, opacity: isActive ? 1 : 0.7 }} />
          <span>{label}</span>
          {isActive && <span className="absolute left-0 top-1 bottom-1 w-0.5 rounded-r" style={{ background: EPR_AMARELO }} />}
        </>
      )}
    </NavLink>
  )
}

export default function Sidebar() {
  const { user, logout } = useAuth()
  const [pinned, setPinned] = useState(false)
  const [hovered, setHovered] = useState(false)
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isOpen = pinned || hovered

  function handleMouseEnter() {
    if (leaveTimer.current) clearTimeout(leaveTimer.current)
    setHovered(true)
  }
  function handleMouseLeave() {
    if (pinned) return
    leaveTimer.current = setTimeout(() => setHovered(false), 180)
  }
  function togglePin() {
    setPinned(v => { if (v) setHovered(false); return !v })
  }

  return (
    <>
      {/* Hover trigger strip */}
      <div
        className="fixed left-0 top-0 h-full z-40 w-2 cursor-pointer"
        onMouseEnter={handleMouseEnter}
        style={{ background: 'linear-gradient(to right, rgba(26,58,107,0.6), transparent)' }}
      >
        {!isOpen && (
          <div className="absolute top-1/2 -translate-y-1/2 left-0 w-6 h-10 flex items-center justify-center rounded-r-lg opacity-70 hover:opacity-100 transition-opacity" style={{ background: EPR_AZUL }}>
            <ChevronRight size={12} className="text-white" />
          </div>
        )}
      </div>

      <aside
        className="fixed left-0 top-0 h-full z-50 flex flex-col transition-all duration-300 overflow-hidden shadow-2xl"
        style={{ width: isOpen ? '224px' : '0px', background: EPR_AZUL, borderRight: isOpen ? '1px solid rgba(255,255,255,0.1)' : 'none' }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="flex flex-col h-full w-[224px]">
          {/* Logo */}
          <div className="flex items-center justify-between px-4 py-5 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.15)' }}>
                <TrendingUp size={16} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-white font-bold text-xs leading-tight">Software</p>
                <p className="font-bold text-xs leading-tight" style={{ color: EPR_AMARELO }}>MMX</p>
              </div>
            </div>
            <button onClick={togglePin} className="text-white/40 hover:text-white transition-colors flex-shrink-0 ml-2" title={pinned ? 'Soltar menu' : 'Fixar menu'}>
              {pinned ? <PinOff size={14} /> : <Pin size={14} />}
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
            <p className="px-3 pt-1 pb-2 text-[10px] font-semibold uppercase tracking-wider text-white/35">Principal</p>
            <NavItem to="/" icon={LayoutDashboard} label="Dashboard" end />
            <NavItem to="/previsao" icon={TrendingUp} label="Previsão de Demanda" />
            <NavItem to="/estoque" icon={Package} label="Gestão de Estoque" />
            <NavItem to="/pedidos" icon={ShoppingCart} label="Pedidos de Compra" />
            <NavItem to="/importar" icon={Upload} label="Importar Dados" />

            {user?.is_admin && (
              <>
                <div className="pt-4 pb-1">
                  <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/35">Administração</p>
                </div>
                <NavItem to="/admin/usuarios" icon={Users} label="Usuários" />
              </>
            )}
          </nav>

          {/* User */}
          <div className="flex-shrink-0 p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg mb-1">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: EPR_AMARELO, color: EPR_AZUL }}>
                {user?.nome?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-semibold truncate leading-tight">{user?.nome}</p>
                <p className="text-white/40 text-[10px] truncate leading-tight">{user?.cargo ?? user?.empresa ?? user?.email}</p>
              </div>
            </div>
            <button onClick={logout} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-white/50 hover:bg-white/10 hover:text-white text-xs transition-colors">
              <LogOut size={13} /> Sair
            </button>
          </div>
        </div>
      </aside>

      {pinned && <div className="flex-shrink-0" style={{ width: '224px' }} />}
    </>
  )
}
