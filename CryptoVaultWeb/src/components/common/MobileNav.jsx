// src/components/common/MobileNav.jsx
import { NavLink } from 'react-router-dom'

const MOBILE_NAV = [
  { to: '/dashboard',  icon: 'bi-grid-1x2-fill',     label: 'Home' },
  { to: '/send',       icon: 'bi-arrow-up-right',     label: 'Send' },
  { to: '/swap',       icon: 'bi-arrow-left-right',   label: 'Swap' },
  { to: '/watchlist',  icon: 'bi-star-fill',          label: 'Watch' },
  { to: '/settings',   icon: 'bi-gear-fill',          label: 'Settings' },
]

export default function MobileNav() {
  return (
    <nav className="mobile-nav">
      <div className="mobile-nav-inner">
        {MOBILE_NAV.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}
          >
            <i className={`bi ${item.icon}`} />
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}