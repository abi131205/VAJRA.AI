import { create } from 'zustand';
import axios from 'axios';

const API = '/api/v1';

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
    created_time: '2026-07-04T10:00:00.000Z'
  },
  {
    ROWID: '2', case_number: 'FIR_15_2026',
    title: 'Whitefield Vehicle Smuggling Ring',
    description: 'Intercepted container cargo carrying high-value heavy machinery parts with forged manifests.',
    status: 'OPEN', assigned_officer: '',
    created_time: '2026-07-05T08:00:00.000Z'
  },
  {
    ROWID: '3', case_number: 'FIR_08_2026',
    title: 'Koramangala ATM Skimming Network',
    description: 'Multi-location ATM tampering. Suspects using Bluetooth-enabled skimming devices. 3 arrests made.',
    status: 'CHARGE_SHEETED', assigned_officer: '998',
    created_time: '2026-06-28T06:00:00.000Z'
  },
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
  { lat: 12.9716, lng: 77.5946, intensity: 0.9, type: 'Robbery', count: 14 },
  { lat: 12.9352, lng: 77.6245, intensity: 0.75, type: 'Vehicle Theft', count: 9 },
  { lat: 12.9766, lng: 77.7232, intensity: 0.6, type: 'ATM Skimming', count: 7 },
  { lat: 12.9141, lng: 77.6387, intensity: 0.85, type: 'Robbery', count: 11 },
  { lat: 12.9902, lng: 77.5494, intensity: 0.4, type: 'Assault', count: 4 },
  { lat: 12.9550, lng: 77.6700, intensity: 0.7, type: 'Burglary', count: 8 },
  { lat: 12.9300, lng: 77.5800, intensity: 0.55, type: 'Theft', count: 6 },
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

    if (get().mockMode || email === 'inspector.rajesh@karnataka.gov.in') {
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
      return;
    }
    try {
      const { data } = await axios.get(`${API}/cases`, {
        headers: { Authorization: `Bearer ${get().token}` }
      });
      set({ cases: data, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  setActiveCase: async (caseObj) => {
    set({ activeCase: caseObj, timeline: [], loading: true });
    if (get().mockMode || caseObj.case_number === 'FIR_12_2026') {
      await new Promise(r => setTimeout(r, 400));
      set({ timeline: MOCK_TIMELINE, networkData: MOCK_NETWORK, loading: false });
      get().addNotification(`Loaded case ${caseObj.case_number} — ${MOCK_TIMELINE.length} events reconstructed.`);
      return;
    }
    try {
      const { data } = await axios.get(`${API}/cases/${caseObj.case_number}/timeline`, {
        headers: { Authorization: `Bearer ${get().token}` }
      });
      set({ timeline: data.events || [], networkData: { nodes: [], edges: [] }, loading: false });
      get().addNotification(`Loaded case ${caseObj.case_number}.`);
    } catch (err) {
      set({ error: err.message, loading: false });
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
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
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
              if (answer?.citations) {
                for (const c of answer.citations) sources.push({ label: c.source, type: c.type || 'SYSTEM' });
              }
              updateLastMessage({
                content: content || JSON.stringify(answer?.primary_data || answer, null, 2),
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
        headers: { Authorization: `Bearer ${get().token}` }
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
        headers: { Authorization: `Bearer ${get().token}` }
      });
      set({ hotspots: data, hotspotsLoading: false });
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

  uploadEvidence: async (file, caseId) => {
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

    // Real upload via XHR for progress tracking
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('case_id', caseId);
      formData.append('evidence_type', 'DOCUMENT');
      formData.append('uploaded_by', useStore.getState().user?.id || '');

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API}/evidence/upload`);
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) set({ uploadProgress: Math.round((e.loaded / e.total) * 100) });
      };

      xhr.onload = async () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            set({ uploadStatus: 'processing' });
            // Poll for OCR completion
            const evidenceId = data.evidence_id;
            let attempts = 0;
            const poll = async () => {
              if (attempts++ > 15) {
                set({ uploadStatus: 'complete', uploadResult: data });
                resolve(data);
                return;
              }
              const res = await axios.get(`${API}/evidence/${evidenceId}/status`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              if (res.data.status === 'PROCESSED') {
                set(s => ({
                  uploadStatus: 'complete', uploadResult: res.data,
                  timeline: [...s.timeline, ...(res.data.extracted_timeline || [])],
                }));
                addNotification(`OCR complete — evidence ${evidenceId} processed.`);
                resolve(res.data);
              } else {
                setTimeout(poll, 2000);
              }
            };
            poll();
          } else {
            throw new Error(data.error || 'Upload failed');
          }
        } catch (e) {
          set({ uploadStatus: 'error' });
          reject(e);
        }
      };
      xhr.onerror = () => { set({ uploadStatus: 'error' }); reject(new Error('Network error')); };
      xhr.send(formData);
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
        headers: { Authorization: `Bearer ${get().token}` }
      });
      set({ legalSections: data });
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
        headers: { Authorization: `Bearer ${token}` }
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
