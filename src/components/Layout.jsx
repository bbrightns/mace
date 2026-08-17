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
  FileCheck2,
  Cpu,
  HelpCircle,
  PanelLeftClose,
  PanelLeftOpen,
  PanelLeft
} from 'lucide-react';

export default function Layout({ children, currentPage, setCurrentPage, syncStatus = 'synced' }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('mace_sidebar_collapsed') === 'true';
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [currentDateStr, setCurrentDateStr] = useState('');
  const [showHelpModal, setShowHelpModal] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('mace_sidebar_collapsed', String(next));
      return next;
    });
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      const targetTag = e.target?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select') {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        if (window.innerWidth <= 1024) {
          setMobileOpen(prev => !prev);
        } else {
          toggleSidebar();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
        { id: 'task-management', label: 'Task Management', icon: MessageSquare },
        { id: 'pm-plan', label: 'PM Plan', icon: Calendar },
        { id: 'long-term-plan', label: 'Long Term Plan', icon: Clock },
        { id: 'machine-classify', label: 'Machine Classify', icon: Cpu },
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
      <aside className={`app-sidebar ${mobileOpen ? 'mobile-open' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`} id="app-sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-brand">
            <span className="sidebar-logo-text">MACE</span>
            <span className="sidebar-logo-sub">v1.2</span>
          </div>
          <button 
            type="button" 
            className="sidebar-collapse-btn"
            onClick={() => {
              if (mobileOpen) {
                setMobileOpen(false);
              } else {
                toggleSidebar();
              }
            }}
            aria-label="Hide sidebar (Ctrl+B)"
            title="Hide sidebar (Ctrl+B)"
          >
            <PanelLeftClose size={18} />
          </button>
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
      <div className={`app-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`} id="app-content-wrapper">
        {/* Header bar */}
        <header className="app-header" id="app-header">
          <div className="header-left">
            <button 
              type="button"
              className="sidebar-toggle-btn" 
              onClick={() => {
                if (window.innerWidth <= 1024) {
                  setMobileOpen(!mobileOpen);
                } else {
                  toggleSidebar();
                }
              }}
              id="sidebar-toggle-btn"
              aria-label={sidebarCollapsed ? "Show sidebar (Ctrl+B)" : "Hide sidebar (Ctrl+B)"}
              title={sidebarCollapsed ? "Show sidebar (Ctrl+B)" : "Hide sidebar (Ctrl+B)"}
            >
              {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
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

            <button 
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowHelpModal(true)}
              title="Keyboard Shortcuts Guide"
              style={{ padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}
              aria-label="Keyboard Shortcuts"
            >
              <HelpCircle size={14} />
              <span className="font-mono">Shortcuts</span>
            </button>

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

        {/* Shortcuts Helper Dialog Modal */}
        {showHelpModal && (
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px'
            }}
            onClick={() => setShowHelpModal(false)}
          >
            <div 
              className="card" 
              style={{ width: '100%', maxWidth: '480px', padding: '24px', backgroundColor: 'var(--surface)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Keyboard Shortcuts</h3>
                <button type="button" className="btn btn-secondary" onClick={() => setShowHelpModal(false)} style={{ padding: '4px 8px' }}>
                  <X size={16} />
                </button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', backgroundColor: 'var(--surface2)', borderRadius: '6px' }}>
                  <span>Toggle Sidebar (Hide / Show)</span>
                  <kbd style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>Ctrl + B</kbd>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', backgroundColor: 'var(--surface2)', borderRadius: '6px' }}>
                  <span>Focus Search Input</span>
                  <kbd style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>Ctrl + K</kbd>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', backgroundColor: 'var(--surface2)', borderRadius: '6px' }}>
                  <span>Go to Dashboard Home</span>
                  <kbd style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>Alt + H</kbd>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', backgroundColor: 'var(--surface2)', borderRadius: '6px' }}>
                  <span>Go to Trouble Record</span>
                  <kbd style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>Alt + T</kbd>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', backgroundColor: 'var(--surface2)', borderRadius: '6px' }}>
                  <span>Go to PM Plan</span>
                  <kbd style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>Alt + P</kbd>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', backgroundColor: 'var(--surface2)', borderRadius: '6px' }}>
                  <span>Multi-Row Range Select</span>
                  <kbd style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>Shift + Click</kbd>
                </div>
              </div>
            </div>
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
