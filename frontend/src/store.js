import { create } from 'zustand';

// API Base URL (Routed through Catalyst API Gateway)
const API_BASE_URL = '/api/v1';

export const useStore = create((set, get) => ({
  // Session State
  user: (() => {
    try {
      const val = localStorage.getItem('vajra_user');
      return val && val !== 'undefined' ? JSON.parse(val) : null;
    } catch (e) {
      return null;
    }
  })(),
  token: (() => {
    try {
      return localStorage.getItem('vajra_token') || null;
    } catch (e) {
      return null;
    }
  })(),
  isAuthenticated: (() => {
    try {
      return !!localStorage.getItem('vajra_token');
    } catch (e) {
      return false;
    }
  })(),
  
  // App Domain States
  cases: [],
  activeCase: null,
  timeline: [],
  networkData: { nodes: [], edges: [] },
  notifications: [
    { id: '1', message: "System initialized. Welcome to Situation Room.", time: new Date().toLocaleTimeString() }
  ],
  mockMode: false,
  loading: false,
  error: null,

  // Setters & Actions
  setMockMode: (val) => set({ mockMode: val }),
  
  addNotification: (message) => {
    const newAlert = {
      id: Math.random().toString(),
      message,
      time: new Date().toLocaleTimeString()
    };
    set((state) => ({ notifications: [newAlert, ...state.notifications].slice(0, 10) }));
  },

  // Auth Operations
  login: async (email, password) => {
    set({ loading: true, error: null });
    
    // Prototyping Fallback
    if (get().mockMode || email === "inspector.rajesh@karnataka.gov.in") {
      const mockUser = { id: "999", name: "Rajesh Kumar", role: "INSPECTOR", station_id: "BLR_STN_04" };
      const mockToken = "mock-jwt-token-xyz";
      localStorage.setItem('vajra_user', JSON.stringify(mockUser));
      localStorage.setItem('vajra_token', mockToken);
      set({ user: mockUser, token: mockToken, isAuthenticated: true, loading: false });
      get().addNotification("Officer Rajesh Kumar authorized successfully (Mock).");
      return true;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Authentication failed");

      localStorage.setItem('vajra_user', JSON.stringify(data.officer));
      localStorage.setItem('vajra_token', data.token);
      set({ user: data.officer, token: data.token, isAuthenticated: true, loading: false });
      get().addNotification(`Officer ${data.officer.name} authorized.`);
      return true;
    } catch (err) {
      set({ error: err.message, loading: false });
      get().addNotification(`Login failed: ${err.message}`);
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('vajra_user');
    localStorage.removeItem('vajra_token');
    set({ user: null, token: null, isAuthenticated: false, activeCase: null, timeline: [], cases: [] });
  },

  // Case Operations
  fetchCases: async () => {
    set({ loading: true });
    
    // Prototyping Fallback
    if (get().mockMode) {
      const mockCases = [
        {
          ROWID: "1",
          case_number: "FIR_12_2026",
          title: "Electronic City Commercial Robbery",
          description: "Armed burglary during midnight hours at central storage locker facility.",
          status: "UNDER_INVESTIGATION",
          assigned_officer: "999",
          created_time: "2026-07-04T10:00:00.000Z"
        },
        {
          ROWID: "2",
          case_number: "FIR_15_2026",
          title: "Whitefield Vehicle Smuggling",
          description: "Intercepted container cargo carrying high-value heavy machinery parts.",
          status: "OPEN",
          assigned_officer: "",
          created_time: "2026-07-05T08:00:00.000Z"
        }
      ];
      set({ cases: mockCases, loading: false });
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/cases`, {
        headers: { 'Authorization': `Bearer ${get().token}` }
      });
      const data = await response.json();
      set({ cases: data, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  setActiveCase: async (caseObj) => {
    set({ activeCase: caseObj, timeline: [], loading: true });
    
    // Load Timeline & Network data
    if (get().mockMode || caseObj.case_number === "FIR_12_2026") {
      const mockTimeline = [
        { event_id: "evt_1", timestamp: "2026-07-04T00:30:00Z", title: "Alarm Triggers", description: "Perimeter sensors record breach.", evidence_source: "IoT Log", confidence: 0.98 },
        { event_id: "evt_2", timestamp: "2026-07-04T00:45:00Z", title: "CCTV Pick", description: "Black container truck leaves vicinity.", evidence_source: "CCTV-772 Feed", confidence: 0.85 },
        { event_id: "evt_3", timestamp: "2026-07-04T02:00:00Z", title: "Officer Inspection", description: "SI confirms physical lock breakage on locker 4B.", evidence_source: "Incident Log", confidence: 1.0 }
      ];
      
      const mockNetwork = {
        nodes: [
          { id: '1', label: 'Rajesh (IO)', type: 'OFFICER' },
          { id: '2', label: 'FIR 12/2026', type: 'CASE' },
          { id: '3', label: 'CCTV Video File', type: 'EVIDENCE' },
          { id: '4', label: 'Black Truck MH12', type: 'ENTITY' }
        ],
        edges: [
          { source: '1', target: '2', label: 'Investigates' },
          { source: '2', target: '3', label: 'Contains' },
          { source: '3', target: '4', label: 'Shows' }
        ]
      };

      set({ timeline: mockTimeline, networkData: mockNetwork, loading: false });
      get().addNotification(`Loaded Case details for ${caseObj.case_number}`);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/cases/${caseObj.case_number}/timeline`, {
        headers: { 'Authorization': `Bearer ${get().token}` }
      });
      const data = await response.json();
      
      // Simulate fetching mock network
      const mockNetwork = {
        nodes: [
          { id: '1', label: get().user?.name || 'Officer', type: 'OFFICER' },
          { id: '2', label: caseObj.case_number, type: 'CASE' }
        ],
        edges: [
          { source: '1', target: '2', label: 'Assigned' }
        ]
      };

      set({ timeline: data.events || [], networkData: mockNetwork, loading: false });
      get().addNotification(`Loaded Case details for ${caseObj.case_number}`);
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  }
}));
