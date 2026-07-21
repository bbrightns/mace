# MACE - Project Documentation

MACE (Maintenance and Project Engineering Management System) is a comprehensive web application designed to track, schedule, and organize industrial plant maintenance, engineering projects, drawings, and audits.

---

## 📂 Project Structure

```bash
mace/
├── .node/                 # Local Node.js distribution binaries
├── node_modules/          # Installed dependencies
├── src/
│   ├── components/        # Layout and reusable UI components
│   │   ├── Layout.tsx     # Navigation sidebar and structural layout
│   │   └── Toast.tsx      # System-wide notifications context
│   ├── firebase/          # Database configuration and Firestore hooks
│   │   ├── config.js      # Firebase App Initialization
│   │   └── collections.js # CRUD helper functions & real-time subscriptions
│   ├── pages/             # App Pages (by function/feature group)
│   │   ├── Home.jsx       # Main Dashboard (KPIs, active counters, charts)
│   │   ├── document/      # Document Management Pages
│   │   │   ├── Audit.jsx  # Audit records and checklist tracking
│   │   │   └── Drawings.jsx # Technical drawings tracker
│   │   ├── maintenance/   # Maintenance Pages
│   │   │   ├── LongTermPlan.jsx # Capital/Long-term planning
│   │   │   ├── PMPlan.jsx       # Preventive Maintenance schedule & execution logs
│   │   │   ├── Purchasing.jsx   # Maintenance spare parts ordering & tracking
│   │   │   ├── TroubleRecord.jsx# Breakdown and repair log
│   │   │   └── VoiceOfShopFloor.jsx # Feedback and observations from the shop floor
│   │   └── project/       # Project Management Pages
│   │       ├── ProjectPlanning.jsx # Schedule/Gantt/Task tracking
│   │       └── ProjectRequests.jsx # Initial project requests & approvals
│   ├── utils.js           # Generic utility functions (e.g., date formatting)
│   ├── App.tsx            # App Routing, core states, and Firebase subscription binding
│   ├── index.css          # Styling stylesheet & design token declarations
│   └── main.tsx           # React entry point
├── package.json           # Scripts, dependencies, and settings
├── vite.config.ts         # Vite bundler configuration
└── seed-projects.js       # Firebase initial data seeding script
```

---

## 🛠️ Main Features & Pages

| Feature Category | Page Component | Firestore Collection | Description |
| :--- | :--- | :--- | :--- |
| **Dashboard** | `Home.jsx` | *(Multiple)* | Central KPI cards, active PM alerts, trouble history logs, and overview charts. |
| **Preventive Maintenance** | `PMPlan.jsx` | `mace_pm_plans`, `mace_pm_logs` | Calendar schedules for machinery checkups. Log items when maintenance is completed. |
| **Long-Term Plan** | `LongTermPlan.jsx` | `mace_longterm_plans` | Multi-year major overhauls and CAPEX planning. |
| **Shop Floor Feedback** | `VoiceOfShopFloor.jsx`| `mace_vosf` | Allows operators to submit issues, hazard logs, or ideas. |
| **Breakdown Log** | `TroubleRecord.jsx` | `mace_trouble_records` | Detailed record of machine downtime, root cause analysis, action items, and duration. |
| **Purchasing Tracker** | `Purchasing.jsx` | `mace_purchasing` | Procurement pipeline status from request to receipt for spare parts. |
| **Project Requests** | `ProjectRequests.jsx` | `mace_project_requests` | Formal project proposal approval workflow. |
| **Project Planning** | `ProjectPlanning.jsx` | `mace_project_planning` | Milestone and progress tracking for approved projects. |
| **Drawings Registry** | `Drawings.jsx` | `mace_drawings` | Blueprints library index. |
| **Safety & Audit** | `Audit.jsx` | `mace_audits` | Inspection reports and regulatory compliance logs. |

---

## ⚙️ Tech Stack & Key Libraries

- **React 19 + TypeScript**: Core framework and component engine.
- **Vite**: Ultra-fast build tool and development server configuration.
- **Firebase**: Backed by Firestore for real-time synchronization and collection updates.
- **Tailwind CSS v4**: Utility styles layered together with Custom Properties in `index.css`.
- **Lucide React**: Vector icons used consistently throughout navigation and page headers.
- **Motion** (Framer Motion): Fluid transitions and animation of UI states.
- **Recharts**: Responsive data visualization and analytics on the dashboard.

---

## 🔄 Adding/Modifying Pages Checklist

When adding a new feature page to the MACE app:
1. **Create the Component**: Add a new JSX/TSX page in `src/pages/<category>/` (e.g., `src/pages/maintenance/NewFeature.jsx`).
2. **Define Firestore Helpers**: Update `src/firebase/collections.js` if a new database schema is required.
3. **Register Page Route in `App.tsx`**:
   - Add state binding if needed for counters.
   - Import the component.
   - Add the key to the `renderPageContent` switch case.
4. **Update Navigation**: Add the tab link inside the sidebar menu within `src/components/Layout.tsx`.
5. **Verify Rules**: Check security settings in `firestore.rules` if introducing a new collection path.
