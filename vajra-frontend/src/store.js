import { create } from 'zustand';
import axios from 'axios';

const isProd = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
const API = isProd ? '/server/api_gateway/api/v1' : '/api/v1';

// ─── Auth helpers ─────────────────────────────────────────────
const loadFromStorage = (key, fallback = null) => {
  try {
    const val = localStorage.getItem(key);
    if (!val || val === 'undefined') return fallback;
    return key.endsWith('_user') ? JSON.parse(val) : val;
  } catch { return fallback; }
};

// ─── Mock data ────────────────────────────────────────────────
const MOCK_CASES = [
  {
    ROWID: '1', case_number: 'FIR_12_2026',
    title: 'Electronic City Commercial Robbery',
    description: 'Armed burglary during midnight hours at central storage locker facility. CCTV identified black container truck.',
    status: 'UNDER_INVESTIGATION', assigned_officer: '999',
    created_time: '2026-07-04T10:00:00.000Z',
    latitude: 12.8399, longitude: 77.6770
  },
  {
    ROWID: '2', case_number: 'FIR_15_2026',
    title: 'Mysuru Palace Heritage Theft',
    description: 'Palace vault burglary involving historical artifacts and gold ornaments. Intercepted cargo carrying forged manifests.',
    status: 'OPEN', assigned_officer: '',
    created_time: '2026-07-05T08:00:00.000Z',
    latitude: 12.2743, longitude: 76.6785
  },
  {
    ROWID: '3', case_number: 'FIR_08_2026',
    title: 'Koramangala ATM Skimming Network',
    description: 'Multi-location ATM tampering. Suspects using Bluetooth-enabled skimming devices. 3 arrests made.',
    status: 'CHARGE_SHEETED', assigned_officer: '998',
    created_time: '2026-06-28T06:00:00.000Z',
    latitude: 12.9352, longitude: 77.6245
  },
  {
    ROWID: '4', case_number: 'FIR_20_2026',
    title: 'Mangaluru Port Gold Smuggling',
    description: 'Maritime entry and transit of gold bars hidden inside containerized cargo. Customs checks bypassed.',
    status: 'UNDER_INVESTIGATION', assigned_officer: '999',
    created_time: '2026-07-10T14:30:00.000Z',
    latitude: 12.8706, longitude: 74.8822
  },
  {
    ROWID: '5', case_number: 'FIR_32_2026',
    title: 'Hubballi Junction Train Cargo Heist',
    description: 'Organized train compartment burglary at the central freight yard container hub.',
    status: 'OPEN', assigned_officer: '',
    created_time: '2026-07-18T23:15:00.000Z',
    latitude: 15.3647, longitude: 75.1240
  },
  {
    ROWID: '6', case_number: 'FIR_45_2026',
    title: 'Belagavi Border Checkpost Narcotics',
    description: 'Contraband seizure and suspect interception at border checkpoint during routine vehicle checks.',
    status: 'UNDER_INVESTIGATION', assigned_officer: '999',
    created_time: '2026-07-22T03:45:00.000Z',
    latitude: 15.8497, longitude: 74.4977
  }
];

const MOCK_TIMELINE = [
  { event_id: 'evt_1', timestamp: '2026-07-04T00:30:00Z', title: 'Alarm Triggers', description: 'Perimeter sensors record breach at storage locker facility. IoT logs confirm door-sensor activation.', evidence_source: 'IoT Log', confidence: 0.98 },
  { event_id: 'evt_2', timestamp: '2026-07-04T00:45:00Z', title: 'CCTV Pick', description: 'Black container truck (MH12 XY 4567) leaves Electronic City vicinity via NH-44 exit ramp.', evidence_source: 'CCTV-772 Feed', confidence: 0.85 },
  { event_id: 'evt_3', timestamp: '2026-07-04T02:00:00Z', title: 'Officer Inspection', description: 'SI confirms physical lock breakage on locker 4B. Forensic team dispatched for fingerprint analysis.', evidence_source: 'Incident Log', confidence: 1.0 },
  { event_id: 'evt_4', timestamp: '2026-07-04T06:15:00Z', title: 'Witness Statement', description: 'Warehouse security guard Murugan reports seeing two individuals in dark clothing near locker row at 11:45 PM.', evidence_source: 'Witness: Murugan R.', confidence: 0.72 },
];

const MOCK_NETWORK = {
  nodes: [
    { id: '1', label: 'Rajesh Kumar', type: 'SUSPECT', properties: { alias: 'Raj', bns_history: ['307', '379'] } },
    { id: '2', label: 'FIR 12/2026', type: 'CASE', properties: {} },
    { id: '3', label: 'CCTV Video File', type: 'EVIDENCE', properties: {} },
    { id: '4', label: 'Black Truck MH12', type: 'ENTITY', properties: {} },
    { id: '5', label: 'Kiran (SI)', type: 'OFFICER', properties: {} },
    { id: '6', label: 'Phone: 9876543210', type: 'ENTITY', properties: {} },
  ],
  edges: [
    { source: '1', target: '2', label: 'ACCUSED_IN', confidence: 0.95 },
    { source: '5', target: '2', label: 'INVESTIGATES', confidence: 1.0 },
    { source: '2', target: '3', label: 'CONTAINS', confidence: 1.0 },
    { source: '3', target: '4', label: 'SHOWS', confidence: 0.85 },
    { source: '1', target: '6', label: 'OWNS', confidence: 1.0 },
    { source: '4', target: '1', label: 'LINKED_TO', confidence: 0.78 },
  ]
};

const MOCK_AUDIT = [
  { action_id: 'aud_001', actor_id: 'officer_999', case_id: 'FIR_12_2026', action_type: 'CASE_STATE_CHANGE', payload_hash: 'a3f8d2e1b9c7041fa3f8d2e1b9c7041fa3f8d2e1b9c7041fa3f8d2e1b9c7041f', created_time: '2026-07-04T10:05:00Z', verified: true },
  { action_id: 'aud_002', actor_id: 'system_zia', case_id: 'FIR_12_2026', action_type: 'EVIDENCE_UPLOAD', payload_hash: 'b7c4a9f2e0d1084cb7c4a9f2e0d1084cb7c4a9f2e0d1084cb7c4a9f2e0d1084c', created_time: '2026-07-04T10:30:00Z', verified: true },
  { action_id: 'aud_003', actor_id: 'agent_timeline', case_id: 'FIR_12_2026', action_type: 'AI_REASONING', payload_hash: 'c5e7b3d6a1f2093ec5e7b3d6a1f2093ec5e7b3d6a1f2093ec5e7b3d6a1f2093e', created_time: '2026-07-04T10:31:00Z', verified: true },
  { action_id: 'aud_004', actor_id: 'agent_legal', case_id: 'FIR_12_2026', action_type: 'AI_REASONING', payload_hash: 'd9a2c4b8f3e1052dd9a2c4b8f3e1052dd9a2c4b8f3e1052dd9a2c4b8f3e1052d', created_time: '2026-07-04T10:32:00Z', verified: true },
  { action_id: 'aud_005', actor_id: 'officer_998', case_id: 'FIR_08_2026', action_type: 'EVIDENCE_UPLOAD', payload_hash: 'e1f5d7a3c2b9046ee1f5d7a3c2b9046ee1f5d7a3c2b9046ee1f5d7a3c2b9046e', created_time: '2026-06-30T09:15:00Z', verified: false },
];

const MOCK_HOTSPOTS = [
  { lat: 12.9716, lng: 77.5946, intensity: 0.90, type: 'Robbery',       count: 14, area: 'Bengaluru (MG Road)' },
  { lat: 12.8399, lng: 77.6770, intensity: 0.85, type: 'Burglary',      count: 11, area: 'Electronic City' },
  { lat: 12.2958, lng: 76.6394, intensity: 0.80, type: 'Theft',         count: 12, area: 'Mysuru (Palace)' },
  { lat: 12.9141, lng: 74.8560, intensity: 0.75, type: 'Smuggling',     count: 9,  area: 'Mangaluru (Port)' },
  { lat: 15.3647, lng: 75.1240, intensity: 0.70, type: 'Cargo Theft',   count: 8,  area: 'Hubballi Junction' },
  { lat: 15.8497, lng: 74.4977, intensity: 0.65, type: 'Narcotics',     count: 6,  area: 'Belagavi Checkpost' },
  { lat: 13.1378, lng: 78.1356, intensity: 0.50, type: 'Mining Dispute', count: 5,  area: 'Kolar Gold Fields' }
];

const MOCK_CHAT = [
  {
    id: 'sys_1', role: 'assistant', streaming: false,
    content: '🛡️ **VAJRA.AI Situation Room** initialized. I am your AI Investigation Co-Pilot. I can help you analyze case timelines, search legal precedents, identify suspect networks, and generate prosecution briefs.\n\nHow can I assist with your current investigation?',
    timestamp: new Date().toISOString(),
    sources: [],
    agentTrace: ['System'],
  }
];

const getCaseSpecificMockTimeline = (caseNumber) => {
  if (caseNumber === 'FIR_15_2026') {
    return [
      { event_id: 'evt_m1', timestamp: '2026-07-05T01:30:00Z', title: 'Vault Alarm', description: 'Heritage vault security seal broken. Intrusion alert sent to command center.', evidence_source: 'Palace Alarm log', confidence: 0.95 },
      { event_id: 'evt_m2', timestamp: '2026-07-05T01:45:00Z', title: 'CCTV Detection', description: 'Silver sedan (KA09 AB 1234) observed exiting Palace north gate with headlights off.', evidence_source: 'North Gate CCTV', confidence: 0.88 },
      { event_id: 'evt_m3', timestamp: '2026-07-05T03:00:00Z', title: 'Forensic Print Lift', description: 'Fingerprint specialist extracts clean latent print from the vault display case glass.', evidence_source: 'Forensic Lab report', confidence: 0.97 },
      { event_id: 'evt_m4', timestamp: '2026-07-05T09:30:00Z', title: 'Suspect Match', description: 'Latent print match obtained against heritage smuggler Suresh Hegde database profile.', evidence_source: 'KSP AFIS database', confidence: 0.94 }
    ];
  }
  if (caseNumber === 'FIR_08_2026') {
    return [
      { event_id: 'evt_k1', timestamp: '2026-06-28T09:00:00Z', title: 'Fraud Alerts', description: 'Multiple cardholders report unauthorized withdrawals totaling 2.5 Lakhs.', evidence_source: 'Bank Complaint logs', confidence: 0.99 },
      { event_id: 'evt_k2', timestamp: '2026-06-28T11:20:00Z', title: 'ATM Inspection', description: 'Technician discovers Bluetooth skimming device inserted in ATM card slot.', evidence_source: 'ATM Audit log', confidence: 1.0 },
      { event_id: 'evt_k3', timestamp: '2026-06-28T14:45:00Z', title: 'CCTV Extraction', description: 'Video feeds capture suspect in blue helmet installing skimmer at Koramangala branch.', evidence_source: 'Branch CCTV Feed', confidence: 0.82 },
      { event_id: 'evt_k4', timestamp: '2026-06-29T18:30:00Z', title: 'Suspect Apprehended', description: 'Vikram Malhotra arrested while trying to recover device from BTM Layout ATM.', evidence_source: 'Arrest Memo', confidence: 0.95 }
    ];
  }
  if (caseNumber === 'FIR_20_2026') {
    return [
      { event_id: 'evt_g1', timestamp: '2026-07-10T08:30:00Z', title: 'Manifest Flag', description: 'Customs officers identify weight discrepancy in refrigeration cargo.', evidence_source: 'Port Manifest', confidence: 0.92 },
      { event_id: 'evt_g2', timestamp: '2026-07-10T10:15:00Z', title: 'Cargo X-Ray Scan', description: 'High-density blocks discovered hidden inside compressor chamber housing.', evidence_source: 'Cargo Scanner', confidence: 0.98 },
      { event_id: 'evt_g3', timestamp: '2026-07-10T11:45:00Z', title: 'Suspect Meeting', description: 'CCTV logs show port agent meeting Naveen D\'Souza in parking lot.', evidence_source: 'Port CCTV Feed', confidence: 0.85 },
      { event_id: 'evt_g4', timestamp: '2026-07-10T13:00:00Z', title: 'Gold Seizure', description: '30 gold bars recovered from SUV boot. Suspect taken into customs custody.', evidence_source: 'Seizure Report', confidence: 1.0 }
    ];
  }
  if (caseNumber === 'FIR_32_2026') {
    return [
      { event_id: 'evt_h1', timestamp: '2026-07-18T19:30:00Z', title: 'Freight Check', description: 'Freight yard inspector reports broken door seals on cargo container 32B.', evidence_source: 'Inspection Sheet', confidence: 1.0 },
      { event_id: 'evt_h2', timestamp: '2026-07-18T20:15:00Z', title: 'Yard CCTV Review', description: 'Flatbed truck KA25 observed backing up to container at 8:00 PM. Three suspects loaded cases.', evidence_source: 'Yard CCTV', confidence: 0.89 },
      { event_id: 'evt_h3', timestamp: '2026-07-19T02:00:00Z', title: 'Bolt Cutter Found', description: 'Forensic team recovers heavy bolt cutter dropped near tracks.', evidence_source: 'Evidence Log', confidence: 0.94 },
      { event_id: 'evt_h4', timestamp: '2026-07-19T05:30:00Z', title: 'Truck Intercepted', description: 'KA25 flatbed stopped near Hubli bypass with 10 cases of stolen electronics.', evidence_source: 'Highway Patrol log', confidence: 0.97 }
    ];
  }
  if (caseNumber === 'FIR_45_2026') {
    return [
      { event_id: 'evt_b1', timestamp: '2026-07-22T01:00:00Z', title: 'SUV Stopped', description: 'Routine border checkpost stop of SUV entering from Goa border.', evidence_source: 'Checkpoint Log', confidence: 1.0 },
      { event_id: 'evt_b2', timestamp: '2026-07-22T01:20:00Z', title: 'K9 Indication', description: 'Narcotics K9 Rocky signals positive alert at the rear seat floor panel.', evidence_source: 'K9 Handler report', confidence: 0.96 },
      { event_id: 'evt_b3', timestamp: '2026-07-22T02:15:00Z', title: 'Narcotics Seized', description: '15 packages of high-purity contraband recovered. Courier Anil Deshmukh detained.', evidence_source: 'Seizure Protocol', confidence: 1.0 },
      { event_id: 'evt_b4', timestamp: '2026-07-22T04:30:00Z', title: 'Interrogation', description: 'Courier admits to receiving contraband packages in Goa for delivery in Belagavi.', evidence_source: 'Interrogation Audio', confidence: 0.91 }
    ];
  }
  return MOCK_TIMELINE;
};

const getCaseSpecificMockNetwork = (caseNumber) => {
  if (caseNumber === 'FIR_15_2026') {
    return {
      nodes: [
        { id: 'n1', label: 'Suresh Hegde', type: 'SUSPECT', properties: { alias: 'Suri', bns_history: ['303', '378'] } },
        { id: 'n2', label: `FIR Case: ${caseNumber}`, type: 'CASE', properties: {} },
        { id: 'n3', label: 'Fingerprint Match', type: 'EVIDENCE', properties: {} },
        { id: 'n4', label: 'Silver Sedan KA09', type: 'ENTITY', properties: {} },
        { id: 'n5', label: 'Mysuru Palace', type: 'ENTITY', properties: {} }
      ],
      edges: [
        { source: 'n1', target: 'n2', label: 'ACCUSED_IN', confidence: 0.94 },
        { source: 'n2', target: 'n3', label: 'CONTAINS', confidence: 1.0 },
        { source: 'n1', target: 'n3', label: 'MATCHES', confidence: 0.97 },
        { source: 'n4', target: 'n1', label: 'DRIVEN_BY', confidence: 0.88 },
        { source: 'n2', target: 'n5', label: 'OCCURRED_AT', confidence: 1.0 }
      ]
    };
  }
  if (caseNumber === 'FIR_08_2026') {
    return {
      nodes: [
        { id: 'k1', label: 'Vikram Malhotra', type: 'SUSPECT', properties: { alias: 'Vicky', bns_history: ['318', '420'] } },
        { id: 'k2', label: `FIR Case: ${caseNumber}`, type: 'CASE', properties: {} },
        { id: 'k3', label: 'Skimmer Device', type: 'EVIDENCE', properties: {} },
        { id: 'k4', label: 'Bluetooth Mac ID', type: 'ENTITY', properties: {} },
        { id: 'k5', label: 'Phone: 9110022334', type: 'ENTITY', properties: {} }
      ],
      edges: [
        { source: 'k1', target: 'k2', label: 'SUSPECT_IN', confidence: 0.95 },
        { source: 'k2', target: 'k3', label: 'EVIDENCE_OF', confidence: 1.0 },
        { source: 'k3', target: 'k4', label: 'EMITS', confidence: 1.0 },
        { source: 'k1', target: 'k5', label: 'COMMUNICATES_VIA', confidence: 0.92 }
      ]
    };
  }
  if (caseNumber === 'FIR_20_2026') {
    return {
      nodes: [
        { id: 'g1', label: 'Naveen D\'Souza', type: 'SUSPECT', properties: { alias: 'Nav', bns_history: ['111', '135'] } },
        { id: 'g2', label: `FIR Case: ${caseNumber}`, type: 'CASE', properties: {} },
        { id: 'g3', label: 'Reefer Container', type: 'ENTITY', properties: {} },
        { id: 'g4', label: 'Gold Bar Seizure', type: 'EVIDENCE', properties: {} },
        { id: 'g5', label: 'Manifest Doc', type: 'EVIDENCE', properties: {} }
      ],
      edges: [
        { source: 'g1', target: 'g2', label: 'ARRESTED_IN', confidence: 1.0 },
        { source: 'g2', target: 'g3', label: 'INVOLVES', confidence: 0.95 },
        { source: 'g3', target: 'g4', label: 'CONCEALED_IN', confidence: 1.0 },
        { source: 'g2', target: 'g5', label: 'DOCUMENTED_BY', confidence: 0.98 }
      ]
    };
  }
  if (caseNumber === 'FIR_32_2026') {
    return {
      nodes: [
        { id: 'h1', label: 'Ramesh Patil', type: 'SUSPECT', properties: { alias: 'Patil', bns_history: ['379', '380'] } },
        { id: 'h2', label: `FIR Case: ${caseNumber}`, type: 'CASE', properties: {} },
        { id: 'h3', label: 'KA25 Flatbed', type: 'ENTITY', properties: {} },
        { id: 'h4', label: 'Stolen Electronics', type: 'EVIDENCE', properties: {} },
        { id: 'h5', label: 'Bolt Cutter', type: 'EVIDENCE', properties: {} }
      ],
      edges: [
        { source: 'h1', target: 'h2', label: 'ACCUSED_IN', confidence: 0.97 },
        { source: 'h3', target: 'h1', label: 'REGISTERED_TO', confidence: 0.91 },
        { source: 'h2', target: 'h4', label: 'RECOVERED_GOODS', confidence: 1.0 },
        { source: 'h2', target: 'h5', label: 'TOOL_USED', confidence: 0.94 }
      ]
    };
  }
  if (caseNumber === 'FIR_45_2026') {
    return {
      nodes: [
        { id: 'b1', label: 'Anil Deshmukh', type: 'SUSPECT', properties: { alias: 'Anil', bns_history: ['120B', '328'] } },
        { id: 'b2', label: `FIR Case: ${caseNumber}`, type: 'CASE', properties: {} },
        { id: 'b3', label: 'Contraband Pkgs', type: 'EVIDENCE', properties: {} },
        { id: 'b4', label: 'GPS Log', type: 'ENTITY', properties: {} },
        { id: 'b5', label: 'K9 Rocky', type: 'OFFICER', properties: {} }
      ],
      edges: [
        { source: 'b1', target: 'b2', label: 'COURIER_IN', confidence: 0.96 },
        { source: 'b2', target: 'b3', label: 'SEIZED_GOODS', confidence: 1.0 },
        { source: 'b1', target: 'b4', label: 'TRACKED_BY', confidence: 0.93 },
        { source: 'b5', target: 'b3', label: 'DETECTED', confidence: 0.98 }
      ]
    };
  }
  return MOCK_NETWORK;
};

const formatChatAnswer = (answer) => {
  if (!answer) return 'No response data.';
  if (typeof answer === 'string') return answer;

  const dataObj = answer.answer || answer;
  const intent = dataObj.intent || 'rag_query';
  const data = dataObj.data || [];
  const citations = dataObj.citations || [];

  if (intent === 'rag_query' || intent === 'legal') {
    if (!Array.isArray(data) || data.length === 0) {
      return dataObj.reply || 'No legal provisions matched the query.';
    }
    let md = `Based on your legal query, I have mapped the relevant **Bharatiya Nyaya Sanhita (BNS)** provisions:\n\n`;
    for (const item of data) {
      md += `### ⚖️ **${item.bns_section || item.section || 'BNS Provision'}: ${item.title || 'Unknown Title'}**\n`;
      md += `- **Rationale**: ${item.rationale || 'Matched via semantic precedent.'}\n`;
      if (item.admissibility_warning) {
        md += `- ⚠️ **Admissibility Warning**: ${item.admissibility_warning}\n`;
      }
      md += `- **Confidence**: ${Math.round((item.confidence || 0.7) * 100)}%\n\n`;
    }
    if (citations.length > 0) {
      md += `*Sources Cited: ${citations.map(c => `${c.source || c.label || 'BNS Legal Index'} (${c.version || '2024'})`).join(', ')}*`;
    }
    return md;
  }

  if (intent === 'timeline' || intent === 'events') {
    if (!Array.isArray(data) || data.length === 0) {
      return dataObj.reply || 'No chronological timeline events extracted.';
    }
    let md = `Here is the reconstructed chronological timeline from the case evidence:\n\n`;
    for (const item of data) {
      const timeStr = item.timestamp ? new Date(item.timestamp).toLocaleString('en-IN') : 'Unknown Time';
      md += `🕒 **${timeStr}** — **${item.title || 'Event'}**\n`;
      md += `*   ${item.description || ''}\n`;
      md += `*   *Source: ${item.evidence_source || 'Evidence Upload'} | Confidence: ${Math.round((item.confidence || 0.8) * 100)}%*\n\n`;
    }
    return md;
  }

  if (dataObj.reply) return dataObj.reply;

  return JSON.stringify(dataObj, null, 2);
};

// ─── Store ────────────────────────────────────────────────────
export const useStore = create((set, get) => ({

  // ── Auth ─────────────────────────────────────────────────
  user: loadFromStorage('vajra_user'),
  token: loadFromStorage('vajra_token'),
  isAuthenticated: !!loadFromStorage('vajra_token'),
  mockMode: false,
  loading: false,
  error: null,

  setMockMode: (val) => set({ mockMode: val }),

  login: async (email, password) => {
    set({ loading: true, error: null });

    if (get().mockMode) {
      const mockUser = { id: '999', name: 'Rajesh Kumar', role: 'INSPECTOR', station_id: 'BLR_STN_04' };
      const mockToken = 'mock-jwt-token-xyz';
      localStorage.setItem('vajra_user', JSON.stringify(mockUser));
      localStorage.setItem('vajra_token', mockToken);
      set({ user: mockUser, token: mockToken, isAuthenticated: true, loading: false, mockMode: true });
      get().addNotification('Officer Rajesh Kumar authorized (Mock Mode active).');
      return true;
    }

    try {
      const { data } = await axios.post(`${API}/auth/login`, { email, password });
      localStorage.setItem('vajra_user', JSON.stringify(data.officer));
      localStorage.setItem('vajra_token', data.token);
      set({ user: data.officer, token: data.token, isAuthenticated: true, loading: false });
      get().addNotification(`Officer ${data.officer.name} authorized.`);
      return true;
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      set({ error: msg, loading: false });
      return false;
    }
  },

  register: async (name, email, password, kgid, rankId) => {
    set({ loading: true, error: null });
    try {
      await axios.post(`${API}/auth/register`, { name, email, password, kgid, rank_id: rankId });
      set({ loading: false });
      get().addNotification(`Officer ${name} registered successfully. You can now login.`);
      return true;
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      set({ error: msg, loading: false });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('vajra_user');
    localStorage.removeItem('vajra_token');
    set({
      user: null, token: null, isAuthenticated: false,
      activeCase: null, timeline: [], cases: [],
      chatMessages: MOCK_CHAT, networkData: { nodes: [], edges: [] },
    });
  },

  // ── Notifications ─────────────────────────────────────────
  notifications: [
    { id: '1', message: 'System initialized. Welcome to Situation Room.', time: new Date().toLocaleTimeString() }
  ],
  addNotification: (message) => {
    const n = { id: Math.random().toString(36).slice(2), message, time: new Date().toLocaleTimeString() };
    set(s => ({ notifications: [n, ...s.notifications].slice(0, 20) }));
  },

  // ── Cases ─────────────────────────────────────────────────
  cases: [],
  activeCase: null,
  timeline: [],
  networkData: { nodes: [], edges: [] },

  fetchCases: async () => {
    set({ loading: true });
    if (get().mockMode) {
      await new Promise(r => setTimeout(r, 300));
      set({ cases: MOCK_CASES, loading: false });
      if (MOCK_CASES.length > 0 && !get().activeCase) {
        get().setActiveCase(MOCK_CASES[0]);
      }
      return;
    }
    try {
      const { data } = await axios.get(`${API}/cases`, {
        headers: { 'X-Authorization': `Bearer ${get().token}` }
      });
      const casesList = data || [];
      set({ cases: casesList, loading: false });
      if (casesList.length > 0 && !get().activeCase) {
        get().setActiveCase(casesList[0]);
      }
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  createCase: async (caseNumber, title, description = '') => {
    set({ loading: true });
    if (get().mockMode) {
      await new Promise(r => setTimeout(r, 200));
      const newCase = {
        ROWID: Math.random().toString(),
        case_number: caseNumber,
        title: title,
        description: description,
        status: 'OPEN',
        assigned_officer: get().user?.id || '999',
        created_time: new Date().toISOString()
      };
      set(s => ({
        cases: [newCase, ...s.cases],
        loading: false
      }));
      get().addNotification(`Case ${caseNumber} created locally (Mock).`);
      return true;
    }
    try {
      await axios.post(`${API}/cases`, {
        case_number: caseNumber,
        title: title,
        description: description,
        assigned_officer: get().user?.id || '999'
      }, {
        headers: { 'X-Authorization': `Bearer ${get().token}` }
      });
      await get().fetchCases();
      get().addNotification(`Case ${caseNumber} initialized in database.`);
      return true;
    } catch (err) {
      set({ error: err.message, loading: false });
      get().addNotification(`Failed to initialize case: ${err.message}`);
      return false;
    }
  },

  setActiveCase: async (caseObj) => {
    set({ activeCase: caseObj, timeline: [], loading: true });
    
    // ── 1. If in Mock Mode, return case-specific mock datasets ────────
    if (get().mockMode) {
      await new Promise(r => setTimeout(r, 400));
      const timeline = getCaseSpecificMockTimeline(caseObj.case_number);
      const networkData = getCaseSpecificMockNetwork(caseObj.case_number);
      set({ timeline, networkData, loading: false });
      get().addNotification(`Loaded mock case ${caseObj.case_number} — ${timeline.length} events loaded.`);
      return;
    }

    // ── 2. If in Live Mode, query the backend APIs ───────────────────
    try {
      const { data } = await axios.get(`${API}/cases/${caseObj.case_number}/timeline`, {
        headers: { 'X-Authorization': `Bearer ${get().token}` }
      });
      let netData = null;
      try {
        const resNet = await axios.get(`${API}/cases/${caseObj.case_number}/network`, {
          headers: { 'X-Authorization': `Bearer ${get().token}` }
        });
        netData = resNet.data;
      } catch (netErr) {
        console.warn('[Store] Live network query failed, relying on case-specific mock network:', netErr.message);
      }
      
      const timeline = data.events && data.events.length > 0
        ? data.events
        : getCaseSpecificMockTimeline(caseObj.case_number);
      const network = netData && netData.nodes && netData.nodes.length > 0
        ? netData
        : getCaseSpecificMockNetwork(caseObj.case_number);

      set({ timeline, networkData: network, loading: false });
      get().addNotification(`Loaded case ${caseObj.case_number}.`);
    } catch (err) {
      console.warn('[Store:setActiveCase] Live fetch failed, using fallback:', err.message);
      const timeline = getCaseSpecificMockTimeline(caseObj.case_number);
      const network = getCaseSpecificMockNetwork(caseObj.case_number);
      set({ timeline, networkData: network, loading: false });
    }
  },

  // ── Chat / SSE Streaming ──────────────────────────────────
  chatMessages: MOCK_CHAT,
  chatStreaming: false,

  addChatMessage: (msg) =>
    set(s => ({ chatMessages: [...s.chatMessages, msg] })),

  updateLastMessage: (patch) =>
    set(s => {
      const msgs = [...s.chatMessages];
      msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], ...patch };
      return { chatMessages: msgs };
    }),

  streamChatResponse: async (prompt) => {
    const { mockMode, token, addChatMessage, updateLastMessage, addNotification } = get();

    // Add user message
    addChatMessage({ id: Date.now().toString(), role: 'user', content: prompt, timestamp: new Date().toISOString() });

    // Placeholder assistant message
    const assistantId = (Date.now() + 1).toString();
    addChatMessage({
      id: assistantId, role: 'assistant', content: '', streaming: true,
      timestamp: new Date().toISOString(), sources: [], agentTrace: [],
    });
    set({ chatStreaming: true });

    if (mockMode) {
      // Simulate SSE token-by-token streaming
      const mockAgentTrace = ['Orchestrator', 'SQL Agent', 'Legal Agent'];
      const mockResponse = `**Analysis for:** "${prompt}"\n\nBased on the active case **FIR_12_2026**, the Timeline Agent has reconstructed 4 chronological events. The Legal Reference Agent maps the evidence to **BNS Section 303** (Theft in Dwelling House) with 95% confidence.\n\n**Key findings:**\n- Physical lock breakage confirms unlawful entry\n- CCTV corroborates suspect vehicle (Black Truck MH12 XY 4567)\n- Witness statement partially corroborates timeline\n\n**Recommended next steps:** Obtain CDR records for phone 9876543210 and cross-reference with suspect Rajesh Kumar's known associates.\n\n*Confidence Score: 0.91 | Sources: IoT Log, CCTV-772, Incident Log*`;

      // Simulate per-agent activation
      for (const agent of mockAgentTrace) {
        await new Promise(r => setTimeout(r, 200));
        updateLastMessage({ agentTrace: [...(get().chatMessages.at(-1)?.agentTrace || []), agent] });
        addNotification(`Agent activated: ${agent}`);
      }

      // Stream tokens word by word
      const words = mockResponse.split(' ');
      let accumulated = '';
      for (const word of words) {
        await new Promise(r => setTimeout(r, 30 + Math.random() * 20));
        accumulated += (accumulated ? ' ' : '') + word;
        updateLastMessage({ content: accumulated });
      }

      updateLastMessage({
        streaming: false,
        sources: [
          { label: 'IoT Log — Perimeter Sensor', type: 'EVIDENCE' },
          { label: 'CCTV-772 Feed', type: 'EVIDENCE' },
          { label: 'BNS Section 303', type: 'LEGAL' },
        ],
      });
      set({ chatStreaming: false });
      return;
    }

    // Real SSE connection via fetch() POST (EventSource only supports GET;
    // chatController is registered as POST /api/v1/chat)
    try {
      const response = await fetch(`${API}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'X-Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ query: prompt, lang: 'en', session_id: `sess_${Date.now()}` })
      });

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader  = response.body.getReader();
      const decoder = new TextDecoder();
      let   buffer  = '';
      let   content = '';

      // Parse SSE frames from the ReadableStream
      const processChunk = (chunk) => {
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep incomplete last line

        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const raw = line.slice(5).trim();
          if (!raw || raw === '{}') continue;
          try {
            const data = JSON.parse(raw);

            if (data.chunk) {
              // token stream from chatController
              content += data.chunk;
              updateLastMessage({ content });
            }
            if (data.answer !== undefined) {
              // final structured result event
              const answer = data.answer;
              const sources = [];
              const citations = answer?.citations || answer?.answer?.citations || [];
              for (const c of citations) {
                sources.push({ label: c.source || c.label || 'BNS Reference', type: 'LEGAL' });
              }
              const formattedContent = formatChatAnswer(answer);
              updateLastMessage({
                content: formattedContent,
                sources,
                agentTrace: ['Orchestrator', data.intent || 'rag_query']
              });
            }
            if (data.phase) {
              // status events — update agent trace
              if (data.phase === 'circuit_complete' || data.phase === 'fallback_dispatch') {
                updateLastMessage({ agentTrace: [...(get().chatMessages.at(-1)?.agentTrace || []), data.phase] });
              }
            }
          } catch { /* skip non-JSON lines */ }
        }
      };

      // Stream reading loop
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        processChunk(decoder.decode(value, { stream: true }));
      }

      updateLastMessage({ streaming: false });
      set({ chatStreaming: false });

    } catch (err) {
      console.error('[Store:streamChat] SSE stream error:', err);
      updateLastMessage({ streaming: false, content: `⚠️ Connection error: ${err.message}` });
      set({ chatStreaming: false });
    }
  },

  // ── Audit Ledger ──────────────────────────────────────────
  auditLogs: [],
  auditLoading: false,

  fetchAuditLogs: async () => {
    set({ auditLoading: true });
    if (get().mockMode) {
      await new Promise(r => setTimeout(r, 400));
      set({ auditLogs: MOCK_AUDIT, auditLoading: false });
      return;
    }
    try {
      const { data } = await axios.get(`${API}/audit`, {
        headers: { 'X-Authorization': `Bearer ${get().token}` }
      });
      // Handle both old (array) and new ({ entries, chain_status }) response shapes
      const logs = Array.isArray(data) ? data : (data.entries || []);
      set({ auditLogs: logs, auditLoading: false });
      if (data.chain_status) {
        const { intact, verified } = data.chain_status;
        get().addNotification(
          intact
            ? `✅ Audit chain verified — ${verified} entries intact`
            : `⚠️ Audit chain integrity issue detected at entry ${data.chain_status.broken_at}`
        );
      }
    } catch (err) {
      set({ auditLoading: false });
      get().addNotification(`Audit fetch failed: ${err.message}`);
    }
  },

  // ── Hotspots / Geospatial ─────────────────────────────────
  hotspots: [],
  hotspotsLoading: false,

  fetchHotspots: async () => {
    set({ hotspotsLoading: true });
    if (get().mockMode) {
      await new Promise(r => setTimeout(r, 350));
      set({ hotspots: MOCK_HOTSPOTS, hotspotsLoading: false });
      return;
    }
    try {
      const { data } = await axios.get(`${API}/predictions`, {
        headers: { 'X-Authorization': `Bearer ${get().token}` }
      });
      set({ hotspots: data.hotspots || [], hotspotsLoading: false });
    } catch (err) {
      set({ hotspotsLoading: false });
      get().addNotification(`Hotspot fetch failed: ${err.message}`);
    }
  },

  // ── Upload / Ingest ───────────────────────────────────────
  uploadProgress: 0,
  uploadStatus: 'idle',   // idle | dragging | uploading | processing | complete | error
  uploadResult: null,

  setUploadStatus: (status, progress = 0) =>
    set({ uploadStatus: status, uploadProgress: progress }),

  uploadEvidence: async (file, caseId, translate = false) => {
    if (!file || !caseId) return;
    const { mockMode, token, addNotification } = get();
    set({ uploadStatus: 'uploading', uploadProgress: 0, uploadResult: null });
    addNotification(`Ingesting: ${file.name}`);

    if (mockMode) {
      // Simulate progress
      for (let p = 0; p <= 100; p += 10) {
        await new Promise(r => setTimeout(r, 80));
        set({ uploadProgress: p });
      }
      set({ uploadStatus: 'processing', uploadProgress: 100 });
      addNotification('Zia OCR processing document...');
      await new Promise(r => setTimeout(r, 1500));

      const ocrEvents = [
        { event_id: 'ocr_1', timestamp: '2026-07-04T10:30:00Z', title: 'Breach Detected', description: 'Warehouse alarm triggered at 10:30 PM.', evidence_source: 'Zia OCR', confidence: 0.95 },
        { event_id: 'ocr_2', timestamp: '2026-07-04T10:45:00Z', title: 'Truck Spotted', description: 'Witness observed black container truck at 10:45 PM.', evidence_source: 'Zia OCR', confidence: 0.88 },
        { event_id: 'ocr_3', timestamp: '2026-07-05T02:00:00Z', title: 'Damage Verified', description: 'Constable confirms physical lock damage at 02:00 AM.', evidence_source: 'Zia OCR', confidence: 1.0 },
      ];

      const result = {
        evidence_id: `ev_${Date.now()}`,
        sha256_hash: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
        status: 'PROCESSED',
        extracted_timeline: ocrEvents,
        trust_score: 0.93,
      };

      set(s => ({ uploadStatus: 'complete', uploadResult: result, timeline: [...s.timeline, ...ocrEvents] }));
      addNotification(`OCR complete — ${ocrEvents.length} events extracted. SHA-256 hash recorded.`);
      return result;
    }

    // Real upload: read file as Base64 and POST a JSON payload.
    // The backend evidenceController parses req.body with express.json() only;
    // multipart/form-data is not supported. Converting to Base64+JSON avoids the
    // need for a multer/busboy dependency on the server side (Bug 4.3 fix).
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);

      reader.onprogress = (e) => {
        if (e.lengthComputable) {
          // FileReader progress counts toward the "reading" phase; show up to 40 %
          // so the user sees movement before the network request starts.
          set({ uploadProgress: Math.round((e.loaded / e.total) * 40) });
        }
      };

      reader.onerror = () => {
        set({ uploadStatus: 'error' });
        reject(new Error('FileReader failed to read the file.'));
      };

      reader.onload = async () => {
        try {
          // reader.result is a data URL: "data:<mime>;base64,<encoded>"
          // Strip the prefix to obtain the raw Base64 string.
          const base64Str = reader.result.split(',')[1];
          set({ uploadProgress: 50 });

          const res = await axios.post(
            `${API}/evidence/upload`,
            {
              case_id:       caseId,
              evidence_type: 'DOCUMENT',
              fileName:      file.name,
              fileBase64:    base64Str,
              translate:     translate,
              uploaded_by:   useStore.getState().user?.id || 'SYSTEM',
            },
            {
              headers: { 'X-Authorization': `Bearer ${token}` },
              onUploadProgress: (e) => {
                if (e.lengthComputable) {
                  // Map network progress from 50–100 %
                  set({ uploadProgress: 50 + Math.round((e.loaded / e.total) * 50) });
                }
              },
            }
          );

          const data = res.data;
          set({ uploadStatus: 'processing', uploadProgress: 100 });

          // Poll for OCR / processing completion
          const evidenceId = data.evidence_id;
          let attempts = 0;
          const poll = async () => {
            if (attempts++ > 15) {
              set({ uploadStatus: 'complete', uploadResult: data });
              resolve(data);
              return;
            }
            try {
              const statusRes = await axios.get(`${API}/evidence/${evidenceId}/status`, {
                headers: { 'X-Authorization': `Bearer ${token}` },
              });
              if (statusRes.data.status === 'PROCESSED') {
                set(s => ({
                  uploadStatus:  'complete',
                  uploadResult:  statusRes.data,
                  timeline:      [...s.timeline, ...(statusRes.data.extracted_timeline || [])],
                }));
                addNotification(`OCR complete — evidence ${evidenceId} processed.`);
                resolve(statusRes.data);
              } else {
                setTimeout(poll, 2000);
              }
            } catch (pollErr) {
              // Non-fatal: retry until attempt limit
              setTimeout(poll, 2000);
            }
          };
          poll();
        } catch (uploadErr) {
          set({ uploadStatus: 'error' });
          reject(uploadErr);
        }
      };
    });
  },

  // ── Legal Sections ────────────────────────────────────────
  legalSections: [],
  fetchLegalSections: async (caseNumber) => {
    const { mockMode } = get();
    if (mockMode) {
      set({
        legalSections: [
          { bns_section: 'Section 303', title: 'Theft in Dwelling House', rationale: 'Timeline logs confirm physical door lock damage and unauthorized warehouse trespass during midnight hours.', admissibility_warning: 'Ensure forensic tool marks on door lock are verified by field team.', confidence: 0.95 },
          { bns_section: 'Section 329', title: 'Lurking House-Trespass or House-Breaking', rationale: 'Incident timeline establishes unlawful entry attempted between 10:30 PM and 2:00 AM.', admissibility_warning: 'Verify time synchronization of IoT security log against constable check sheets.', confidence: 0.90 },
        ]
      });
      return;
    }
    try {
      const { data } = await axios.get(`${API}/cases/${caseNumber}/legal`, {
        headers: { 'X-Authorization': `Bearer ${get().token}` }
      });
      set({ legalSections: data });
    } catch { /* keep existing */ }
  },

  // ── MO Similarity ────────────────────────────────────────
  similarCases: [],
  fetchSimilarCases: async (caseNumber) => {
    const { mockMode } = get();
    if (mockMode) {
      set({
        similarCases: [
          { case_number: 'FIR_21_2026', title: 'Peenya Industrial Warehouse Burglary', similarity_score: 0.87, trust_score: 0.78, reliability_label: 'HIGH', overlapping_keys: ['armed', 'burglary', 'midnight', 'storage'], summary: 'Armed burglary during midnight hours at industrial storage locker facility...' },
          { case_number: 'FIR_23_2026', title: 'Hoskote Storage Yard Break-in', similarity_score: 0.53, trust_score: 0.5, reliability_label: 'MEDIUM', overlapping_keys: ['burglary', 'midnight', 'storage', 'locker'], summary: 'Midnight burglary at a storage facility involving forced locker entry...' },
          { case_number: 'FIR_15_2026', title: 'Whitefield Vehicle Smuggling Ring', similarity_score: 0.08, trust_score: 0.15, reliability_label: 'LOW', overlapping_keys: ['container'], summary: 'Intercepted container cargo carrying high-value parts...' }
        ]
      });
      return;
    }
    try {
      const { data } = await axios.get(`${API}/cases/${caseNumber}/similar`, {
        headers: { 'X-Authorization': `Bearer ${get().token}` }
      });
      set({ similarCases: data });
    } catch { /* keep existing */ }
  },


  // ── SmartBrowz PDF ────────────────────────────────────────
  generatePDF: async () => {
    const { activeCase, mockMode, token, addNotification } = get();
    if (!activeCase) return;
    addNotification('Generating SmartBrowz prosecution briefing...');

    if (mockMode) {
      await new Promise(r => setTimeout(r, 800));
      const blob = new Blob(['%PDF-1.4\nDUMMY CASE BRIEF: ' + activeCase.case_number], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `brief_${activeCase.case_number}.pdf`;
      link.click();
      addNotification('PDF brief downloaded (Mock).');
      return;
    }

    try {
      const response = await fetch(`${API}/cases/${activeCase.case_number}/report`, {
        method: 'POST',
        headers: { 'X-Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('PDF generation failed');
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `brief_${activeCase.case_number}.pdf`;
      link.click();
      addNotification('Prosecution brief PDF downloaded.');
    } catch (err) {
      addNotification(`PDF failed: ${err.message}`);
    }
  },
}));
