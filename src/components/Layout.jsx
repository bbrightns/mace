import React, { useState, useEffect } from 'react';
import { 
  Menu, 
  X, 
  Settings, 
  Layers, 
  Home, 
  Calendar, 
  Clock, 
  MessageSquare, 
  AlertTriangle, 
  ShoppingBag, 
  FileText, 
  BookOpen, 
  FileCheck2 
} from 'lucide-react';

export default function Layout({ children, currentPage, setCurrentPage, syncStatus = 'synced' }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [currentDateStr, setCurrentDateStr] = useState('');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Format current date
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[today.getMonth()];
    const year = today.getFullYear();
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekday = weekdays[today.getDay()];
    setCurrentDateStr(`${weekday}, ${day} ${month} ${year}`);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const menuGroups = [
    {
      title: 'General',
      items: [
        { id: 'home', label: 'Dashboard', icon: Home }
      ]
    },
    {
      title: 'Maintenance Work',
      items: [
        { id: 'pm-plan', label: 'PM Plan', icon: Calendar },
        { id: 'long-term-plan', label: 'Long Term Plan', icon: Clock },
        { id: 'vosf', label: 'Voice of Shop Floor', icon: MessageSquare },
        { id: 'trouble-record', label: 'Trouble Record', icon: AlertTriangle },
        { id: 'purchasing', label: 'Purchasing', icon: ShoppingBag }
      ]
    },
    {
      title: 'Project Work',
      items: [
        { id: 'project-requests', label: 'Project Requests', icon: Layers },
        { id: 'project-planning', label: 'Project Planning', icon: FileText }
      ]
    },
    {
      title: 'Document Work',
      items: [
        { id: 'drawings', label: 'Drawings', icon: BookOpen },
        { id: 'audit', label: 'Audit', icon: FileCheck2 }
      ]
    }
  ];

  // Map pages to breadcrumb titles
  const getBreadcrumb = () => {
    for (const group of menuGroups) {
      const matched = group.items.find(item => item.id === currentPage);
      if (matched) {
        return { group: group.title, label: matched.label };
      }
    }
    return { group: 'MACE', label: 'Workspace' };
  };

  const breadcrumb = getBreadcrumb();

  return (
    <div className="app-container" id="app-root-container">
      {/* Mobile backdrop overlay */}
      {mobileOpen && (
        <div 
          className="sidebar-backdrop" 
          onClick={() => setMobileOpen(false)} 
          aria-hidden="true"
          id="sidebar-mobile-backdrop"
        />
      )}

      {/* Sidebar navigation */}
      <aside className={`app-sidebar ${mobileOpen ? 'mobile-open' : ''}`} id="app-sidebar">
        <div className="sidebar-logo">
          <span className="sidebar-logo-text">MACE</span>
          <span className="sidebar-logo-sub">v1.2</span>
        </div>
        
        <nav className="sidebar-nav" aria-label="Main Navigation">
          {menuGroups.map((group, gIdx) => {
            let themeClass = 'theme-general';
            if (group.title === 'Maintenance Work') themeClass = 'theme-maintenance';
            else if (group.title === 'Project Work') themeClass = 'theme-project';
            else if (group.title === 'Document Work') themeClass = 'theme-document';

            return (
              <div key={gIdx} className="nav-group">
                <div className="nav-group-title">{group.title}</div>
                {group.items.map((item) => {
                  const IconComponent = item.icon;
                  const isActive = currentPage === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      id={`nav-item-${item.id}`}
                      className={`nav-item ${themeClass} ${isActive ? 'active' : ''}`}
                      aria-current={isActive ? 'page' : undefined}
                      onClick={() => {
                        setCurrentPage(item.id);
                        setMobileOpen(false);
                      }}
                    >
                      <IconComponent className="nav-item-icon" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>
        
        {/* Bottom User Section matching design aesthetic */}
        <div className="sidebar-user" id="sidebar-engineer-profile">
          <div className="sidebar-user-avatar">EE</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">Praween P.</div>
            <div className="sidebar-user-role">Electrical Lead</div>
          </div>
        </div>
      </aside>

      {/* Main workspace section */}
      <div className="app-content" id="app-content-wrapper">
        {/* Header bar */}
        <header className="app-header" id="app-header">
          <div className="header-left">
            <button 
              className="mobile-toggle" 
              onClick={() => setMobileOpen(!mobileOpen)}
              id="mobile-nav-toggle"
              aria-label="Toggle navigation menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            
            <div className="sync-status" style={{ fontWeight: 600, color: 'var(--text)' }}>
              <span className="font-mono" style={{ fontSize: '14px', letterSpacing: '-0.3px' }}>MACE</span>
            </div>
            
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-separator" style={{ fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{breadcrumb.group}</span>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-current">{breadcrumb.label}</span>
          </div>

          <div className="header-right">
            {currentDateStr && (
              <span className="current-date-badge" style={{ 
                fontSize: '11px', 
                fontWeight: '600', 
                color: 'var(--text2)', 
                fontFamily: 'var(--font-mono)',
                backgroundColor: 'var(--surface2)',
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                letterSpacing: '0.2px'
              }}>
                {currentDateStr}
              </span>
            )}
            <div className="sync-status" id="workspace-sync-status">
              <span className={`sync-dot ${syncStatus === 'syncing' ? 'syncing' : ''}`}></span>
              <span>{syncStatus === 'syncing' ? 'Updating...' : 'LIVE'}</span>
            </div>
          </div>
        </header>

        {/* Offline ambient bar */}
        {!isOnline && (
          <div className="offline-banner" id="mobile-offline-warning">
            Workspace running in standalone offline mode. Connectivity auto-restores when online.
          </div>
        )}

        {/* Dynamic page content layout wrapper */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
