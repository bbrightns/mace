import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import { ToastProvider } from './components/Toast';
import { subscribeCollection } from './firebase/collections';

// Import Pages
import Home from './pages/Home';
import PMPlan from './pages/maintenance/PMPlan';
import LongTermPlan from './pages/maintenance/LongTermPlan';
import VoiceOfShopFloor from './pages/maintenance/VoiceOfShopFloor';
import TroubleRecord from './pages/maintenance/TroubleRecord';
import Purchasing from './pages/maintenance/Purchasing';
import ProjectRequests from './pages/project/ProjectRequests';
import ProjectPlanning from './pages/project/ProjectPlanning';
import Drawings from './pages/document/Drawings';
import Audit from './pages/document/Audit';

function MainApp() {
  const [currentPage, setCurrentPage] = useState(() => {
    return localStorage.getItem('mace_current_page') || 'home';
  });

  useEffect(() => {
    if (currentPage) {
      localStorage.setItem('mace_current_page', currentPage);
    }
  }, [currentPage]);

  const [syncStatus, setSyncStatus] = useState('synced');

  // Master collections states for dashboard counters
  const [pmPlans, setPmPlans] = useState([]);
  const [pmLogs, setPmLogs] = useState([]);
  const [longTermPlans, setLongTermPlans] = useState([]);
  const [vosfItems, setVosfItems] = useState([]);
  const [troubleRecords, setTroubleRecords] = useState([]);
  const [purchasingItems, setPurchasingItems] = useState([]);
  const [projectRequests, setProjectRequests] = useState([]);
  const [projectPlanning, setProjectPlanning] = useState([]);
  const [drawings, setDrawings] = useState([]);
  const [audits, setAudits] = useState([]);

  // Setup real-time listeners for general dashboard calculations
  useEffect(() => {
    setSyncStatus('syncing');
    
    const unsub1 = subscribeCollection('mace_pm_plans', (data) => {
      setPmPlans(data);
    }, () => {});

    const unsubLogs = subscribeCollection('mace_pm_logs', (data) => {
      setPmLogs(data);
    }, () => {});
    
    const unsub2 = subscribeCollection('mace_longterm_plans', (data) => {
      setLongTermPlans(data);
    }, () => {});

    const unsub3 = subscribeCollection('mace_vosf', (data) => {
      setVosfItems(data);
    }, () => {});

    const unsub4 = subscribeCollection('mace_trouble_records', (data) => {
      setTroubleRecords(data);
    }, () => {});

    const unsub5 = subscribeCollection('mace_purchasing', (data) => {
      setPurchasingItems(data);
    }, () => {});

    const unsub6 = subscribeCollection('mace_project_requests', (data) => {
      setProjectRequests(data);
    }, () => {});

    const unsub7 = subscribeCollection('mace_project_planning', (data) => {
      setProjectPlanning(data);
    }, () => {});

    const unsub8 = subscribeCollection('mace_drawings', (data) => {
      setDrawings(data);
    }, () => {});

    const unsub9 = subscribeCollection('mace_audits', (data) => {
      setAudits(data);
      setSyncStatus('synced');
    }, () => {
      setSyncStatus('synced');
    });

    return () => {
      unsub1();
      unsubLogs();
      unsub2();
      unsub3();
      unsub4();
      unsub5();
      unsub6();
      unsub7();
      unsub8();
      unsub9();
    };
  }, []);

  const renderPageContent = () => {
    switch (currentPage) {
      case 'home':
        return (
          <Home 
            setCurrentPage={setCurrentPage}
            pmPlans={pmPlans}
            pmLogs={pmLogs}
            longTermPlans={longTermPlans}
            vosfItems={vosfItems}
            troubleRecords={troubleRecords}
            purchasingItems={purchasingItems}
            projectRequests={projectRequests}
            projectPlanning={projectPlanning}
            drawings={drawings}
            audits={audits}
          />
        );
      case 'pm-plan':
        return <PMPlan />;
      case 'long-term-plan':
        return <LongTermPlan />;
      case 'vosf':
        return <VoiceOfShopFloor />;
      case 'trouble-record':
        return <TroubleRecord />;
      case 'purchasing':
        return <Purchasing />;
      case 'project-requests':
        return <ProjectRequests />;
      case 'project-planning':
        return <ProjectPlanning />;
      case 'drawings':
        return <Drawings />;
      case 'audit':
        return <Audit />;
      default:
        return (
          <Home 
            setCurrentPage={setCurrentPage}
            pmPlans={pmPlans}
            pmLogs={pmLogs}
            longTermPlans={longTermPlans}
            vosfItems={vosfItems}
            troubleRecords={troubleRecords}
            purchasingItems={purchasingItems}
            projectRequests={projectRequests}
            projectPlanning={projectPlanning}
            drawings={drawings}
            audits={audits}
          />
        );
    }
  };

  return (
    <Layout 
      currentPage={currentPage} 
      setCurrentPage={setCurrentPage} 
      syncStatus={syncStatus}
    >
      {renderPageContent()}
    </Layout>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <MainApp />
    </ToastProvider>
  );
}
