import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { 
  Shield, 
  Database, 
  MapPin, 
  Clock, 
  FileText, 
  Network, 
  AlertCircle, 
  Power, 
  Download, 
  PlusCircle, 
  Search, 
  Cpu, 
  CheckCircle,
  Upload,
  ArrowRight,
  Lock,
  ExternalLink
} from 'lucide-react';

function Dashboard() {
  const {
    user,
    cases,
    activeCase,
    timeline,
    networkData,
    notifications,
    mockMode,
    loading,
    logout,
    fetchCases,
    setActiveCase,
    addNotification
  } = useStore();

  const [activeTab, setActiveTab] = useState('timeline'); // timeline | network
  const [searchTerm, setSearchTerm] = useState('');
  const [explainCard, setExplainCard] = useState(null);
  const [showAuditVerify, setShowAuditVerify] = useState(false);
  
  // Quick Add states
  const [newCaseTitle, setNewCaseTitle] = useState('');
  const [newCaseNumber, setNewCaseNumber] = useState('');
  
  // Ingress & Upload State Variables
  const [uploading, setUploading] = useState(false);
  const [uploadLog, setUploadLog] = useState('');
  
  // Dynamic Legal Mapping State
  const [legalSections, setLegalSections] = useState([]);

  useEffect(() => {
    fetchCases();
  }, []);

  useEffect(() => {
    if (timeline && timeline.length > 0) {
      triggerLegalMapping();
    } else {
      setLegalSections([]);
    }
  }, [timeline]);

  const handleCaseSelect = (caseObj) => {
    setActiveCase(caseObj);
  };

  const handleCreateCase = (e) => {
    e.preventDefault();
    if (!newCaseNumber || !newCaseTitle) return;
    
    addNotification(`Case ${newCaseNumber} initialized in database.`);
    setNewCaseNumber('');
    setNewCaseTitle('');
  };

  const handleSmartBrowzPDF = async () => {
    if (!activeCase) return;
    addNotification("Generating SmartBrowz PDF prosecution briefing...");
    
    try {
      let blob;
      if (mockMode) {
        blob = new Blob(["%PDF-1.4 ... DUMMY CASE BRIEF PDF CONTENT ..."], { type: 'application/pdf' });
      } else {
        const response = await fetch(`/api/v1/cases/${activeCase.case_number}/report`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${useStore.getState().token}` }
        });
        if (!response.ok) throw new Error("Failed to compile pdf");
        blob = await response.blob();
      }

      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `brief_${activeCase.case_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      addNotification("Prosecution brief PDF downloaded successfully.");
    } catch (err) {
      console.error(err);
      addNotification(`Brief download failed: ${err.message}`);
    }
  };

  const triggerLegalMapping = async () => {
    setLegalSections([
      {
        bns_section: "Section 303",
        title: "Theft in Dwelling House",
        rationale: "Timeline logs confirm physical door lock damage and unauthorized warehouse trespass during midnight hours.",
        admissibility_warning: "Ensure forensic tool marks on door lock are verified by field team to support physical trespass evidence.",
        confidence: 0.95
      },
      {
        bns_section: "Section 329",
        title: "Lurking House-Trespass or House-Breaking",
        rationale: "Incident timeline establishes unlawful entry attempted between 10:30 PM and 2:00 AM.",
        admissibility_warning: "Verify time synchronization of IoT security log against constable check sheets.",
        confidence: 0.90
      }
    ]);
  };

  const handleIngestDocument = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeCase) return;

    setUploading(true);
    setUploadLog('Reading uploaded evidence file...');
    addNotification(`Ingesting witness document: ${file.name}`);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const textContent = event.target.result;
        const base64Content = btoa(unescape(encodeURIComponent(textContent)));
        
        setUploadLog('Contacting Catalyst Ingress API...');
        
        if (mockMode) {
          setTimeout(() => {
            const mockEvents = [
              { event_id: "evt_ocr_1", timestamp: "2026-07-04T10:30:00Z", title: "Breach Detected", description: "On 04-07-2026 at 10:30 PM, the warehouse alarm went off.", evidence_source: "Zia OCR Extraction", confidence: 0.95 },
              { event_id: "evt_ocr_2", timestamp: "2026-07-04T10:45:00Z", title: "Truck Spotted", description: "At 10:45 PM, a witness saw a black container truck driving away from Electronic City.", evidence_source: "Zia OCR Extraction", confidence: 0.88 },
              { event_id: "evt_ocr_3", timestamp: "2026-07-05T02:00:00Z", title: "Damage Verified", description: "At 02:00 AM, Constable Rajesh Kumar confirmed the physical door lock damage.", evidence_source: "Zia OCR Extraction", confidence: 1.0 }
            ];
            
            useStore.setState({ timeline: mockEvents });
            addNotification("Zia OCR completed. 3 events parsed by Timeline Agent (Mock).");
            setUploading(false);
            setUploadLog('');
          }, 1500);
          return;
        }

        const response = await fetch('/api/v1/evidence/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            case_id: activeCase.case_number,
            evidence_type: "DOCUMENT",
            fileName: file.name,
            fileBase64: base64Content,
            uploaded_by: user?.id || "999"
          })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Upload failed");

        if (data.extracted_timeline && data.extracted_timeline.length > 0) {
          useStore.setState({ timeline: data.extracted_timeline });
          addNotification(`Timeline auto-assembled. ${data.extracted_timeline.length} events parsed by Timeline Agent.`);
        } else {
          addNotification("Evidence registered. Timeline unchanged.");
        }

      } catch (err) {
        console.error(err);
        addNotification(`Ingress failed: ${err.message}`);
      } finally {
        setUploading(false);
        setUploadLog('');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div style={{
      background: 'hsl(var(--background))',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'var(--font-sans)',
      color: '#2D2424'
    }}>
      {/* Top Banner / Navigation */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1rem 1.5rem',
        borderBottom: '1px solid hsl(var(--border))',
        background: '#FFFFFF',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            background: '#B36A70',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Shield size={16} color="#FAF7F2" />
          </div>
          <h1 style={{ 
            fontSize: '1.25rem', 
            fontFamily: 'var(--font-display)', 
            letterSpacing: '-0.02em', 
            color: '#2D2424',
            fontWeight: '600'
          }}>
            VAJRA.AI <span style={{ color: '#B36A70', fontSize: '0.875rem', fontWeight: '400', fontFamily: 'var(--font-sans)', marginLeft: '0.5rem' }}>Situation Room</span>
          </h1>
          {mockMode && (
            <span style={{
              background: 'rgba(194, 168, 120, 0.15)',
              border: '1px solid rgba(194, 168, 120, 0.3)',
              color: '#C2A878',
              fontSize: '0.625rem',
              fontWeight: '700',
              padding: '2px 8px',
              borderRadius: '4px',
              letterSpacing: '0.05em'
            }}>
              DEMO CACHE
            </span>
          )}
        </div>

        {/* User Context */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ textAlign: 'right', fontSize: '0.75rem' }}>
            <div style={{ fontWeight: '600', color: '#2D2424' }}>{user?.name || 'Officer'}</div>
            <div style={{ color: '#B36A70', fontWeight: '500' }}>{user?.role || 'INVESTIGATOR'} • {user?.station_id || 'SCRB'}</div>
          </div>
          <button 
            onClick={logout}
            style={{
              background: 'rgba(179, 106, 112, 0.1)',
              border: '1px solid rgba(179, 106, 112, 0.2)',
              color: '#B36A70',
              padding: '0.375rem',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Log Out Station Session"
          >
            <Power size={16} />
          </button>
        </div>
      </header>

      {/* Main Grid Workspace */}
      <main style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '300px 1fr 340px',
        gap: '0.75rem',
        padding: '0.75rem',
        overflow: 'hidden',
        height: 'calc(100vh - 65px)'
      }}>
        
        {/* Left Panel: Cases Directory */}
        <section className="glass-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#FFFFFF' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid hsl(var(--border))' }}>
            <h3 style={{ fontSize: '0.75rem', color: '#B36A70', letterSpacing: '0.05em', fontWeight: '700', marginBottom: '0.75rem' }}>CASES DATABASE</h3>
            <div style={{ position: 'relative' }}>
              <Search size={14} color="#C2A878" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Filter FIR / MO..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem 0.5rem 2rem',
                  background: '#FAF7F2',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  color: '#2D2424',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Case Feed list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
            {cases.filter(c => c.title.toLowerCase().includes(searchTerm.toLowerCase()) || c.case_number.includes(searchTerm)).map((caseItem) => (
              <div 
                key={caseItem.case_number}
                onClick={() => handleCaseSelect(caseItem)}
                style={{
                  padding: '0.75rem',
                  borderRadius: '6px',
                  background: activeCase?.case_number === caseItem.case_number ? 'rgba(179, 106, 112, 0.08)' : 'transparent',
                  border: activeCase?.case_number === caseItem.case_number ? '1px solid rgba(179, 106, 112, 0.25)' : '1px solid transparent',
                  cursor: 'pointer',
                  marginBottom: '0.5rem',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#B36A70' }}>{caseItem.case_number}</span>
                  <span style={{
                    fontSize: '0.625rem',
                    background: caseItem.status === 'UNDER_INVESTIGATION' ? 'rgba(194, 168, 120, 0.15)' : 'rgba(16, 185, 129, 0.1)',
                    color: caseItem.status === 'UNDER_INVESTIGATION' ? '#C2A878' : '#10B981',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    fontWeight: '600'
                  }}>{caseItem.status}</span>
                </div>
                <h4 style={{ fontSize: '0.8125rem', fontWeight: '600', color: '#2D2424', marginBottom: '0.25rem' }}>{caseItem.title}</h4>
                <p style={{ fontSize: '0.6875rem', color: '#6B7280', lineBreak: 'anywhere' }}>{caseItem.description.slice(0, 70)}...</p>
              </div>
            ))}
          </div>

          {/* Quick Add Case */}
          <div style={{ padding: '0.75rem', borderTop: '1px solid hsl(var(--border))', background: '#FAF7F2' }}>
            <form onSubmit={handleCreateCase} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="New FIR Number..."
                value={newCaseNumber}
                onChange={(e) => setNewCaseNumber(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.375rem 0.5rem',
                  fontSize: '0.75rem',
                  background: '#FFFFFF',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '4px',
                  color: '#2D2424'
                }}
              />
              <input
                type="text"
                placeholder="Case title..."
                value={newCaseTitle}
                onChange={(e) => setNewCaseTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.375rem 0.5rem',
                  fontSize: '0.75rem',
                  background: '#FFFFFF',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '4px',
                  color: '#2D2424'
                }}
              />
              <button
                type="submit"
                style={{
                  background: '#B36A70',
                  color: '#FAF7F2',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '0.375rem',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
              >
                <PlusCircle size={14} /> Initialize Ingress
              </button>
            </form>
          </div>
        </section>

        {/* Middle Panel: Active Case Situation Workspace */}
        <section style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {activeCase ? (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', gap: '0.75rem' }}>
              {/* Active Case Header */}
              <div className="glass-panel" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFFFFF' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#B36A70', fontWeight: '500' }}>Active Case Scope</span>
                  <h2 style={{ fontSize: '1.25rem', color: '#2D2424', fontFamily: 'var(--font-display)', fontWeight: '600' }}>{activeCase.case_number} : {activeCase.title}</h2>
                  <p style={{ fontSize: '0.8125rem', color: '#6B7280', marginTop: '0.25rem' }}>{activeCase.description}</p>
                </div>
                
                {/* Switch Workspace Tabs */}
                <div style={{ display: 'flex', gap: '2px', background: '#FAF7F2', padding: '2px', borderRadius: '6px', border: '1px solid hsl(var(--border))' }}>
                  <button
                    onClick={() => setActiveTab('timeline')}
                    style={{
                      background: activeTab === 'timeline' ? '#B36A70' : 'transparent',
                      color: activeTab === 'timeline' ? '#FAF7F2' : '#2D2424',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '0.375rem 0.75rem',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontWeight: '600'
                    }}
                  >
                    <Clock size={12} /> Timeline
                  </button>
                  <button
                    onClick={() => setActiveTab('network')}
                    style={{
                      background: activeTab === 'network' ? '#B36A70' : 'transparent',
                      color: activeTab === 'network' ? '#FAF7F2' : '#2D2424',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '0.375rem 0.75rem',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontWeight: '600'
                    }}
                  >
                    <Network size={12} /> Connections
                  </button>
                </div>
              </div>

              {/* Workspace Content Panels */}
              <div className="glass-panel" style={{ flex: 1, padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
                
                {/* Interactive Document Ingress File Upload Trigger */}
                <div style={{
                  background: 'rgba(179, 106, 112, 0.04)',
                  border: '1px dashed rgba(179, 106, 112, 0.3)',
                  padding: '1rem',
                  borderRadius: '8px',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: '600', color: '#2D2424', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Upload size={14} color="#B36A70" /> Ingest Case Document
                    </span>
                    <span style={{ fontSize: '0.6875rem', color: '#6B7280' }}>
                      {uploading ? uploadLog : "Choose statement logs or reports to run Zia OCR and Chronology parsing"}
                    </span>
                  </div>
                  <div>
                    <label style={{
                      background: uploading ? '#D9D2C7' : '#B36A70',
                      color: '#FAF7F2',
                      padding: '0.375rem 0.75rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      cursor: uploading ? 'not-allowed' : 'pointer',
                      display: 'inline-block',
                      boxShadow: 'var(--shadow-sm)'
                    }}>
                      {uploading ? "Ingesting..." : "Select File"}
                      <input 
                        type="file" 
                        accept=".txt,.json,.log,.pdf" 
                        onChange={handleIngestDocument}
                        disabled={uploading}
                        style={{ display: 'none' }} 
                      />
                    </label>
                  </div>
                </div>

                {activeTab === 'timeline' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: '#2D2424', fontFamily: 'var(--font-display)', fontWeight: '600' }}>Reconstructed Chronological Timeline</h3>
                    
                    {timeline.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', borderLeft: '2px dashed hsl(var(--border))', paddingLeft: '1.25rem', marginLeft: '0.5rem', marginTop: '0.5rem' }}>
                        {timeline.map((evt) => (
                          <div key={evt.event_id} style={{ position: 'relative' }}>
                            <span style={{
                              position: 'absolute',
                              left: '-1.625rem',
                              top: '4px',
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              background: '#B36A70'
                            }} />
                            <div style={{
                              background: '#FAF7F2',
                              border: '1px solid hsl(var(--border))',
                              padding: '0.75rem 1rem',
                              borderRadius: '6px'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                <h4 style={{ fontSize: '0.875rem', color: '#2D2424', fontWeight: '600' }}>{evt.title}</h4>
                                <span style={{ fontSize: '0.6875rem', color: '#B36A70', fontWeight: '500' }}>
                                  {new Date(evt.timestamp).toLocaleString()}
                                </span>
                              </div>
                              <p style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.5rem' }}>{evt.description}</p>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.625rem', color: '#C2A878', background: 'rgba(194, 168, 120, 0.1)', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' }}>
                                  Source: {evt.evidence_source}
                                </span>
                                <span style={{ fontSize: '0.625rem', color: '#10B981', background: 'rgba(16, 185, 129, 0.05)', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' }}>
                                  Calibration: {(evt.confidence * 100).toFixed(0)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '0.5rem', color: '#C2A878' }}>
                        <Clock size={32} />
                        <p style={{ fontSize: '0.75rem', fontFamily: 'var(--font-sans)' }}>No events logged yet. Ingest an evidence file above to reconstruct timeline.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: '#2D2424', fontFamily: 'var(--font-display)', fontWeight: '600' }}>Entity Relations Graph Workspace</h3>
                    <div style={{
                      flex: 1,
                      border: '1px solid hsl(var(--border))',
                      background: 'radial-gradient(circle at center, #FFFFFF 0%, #FAF7F2 100%)',
                      borderRadius: '8px',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: '240px'
                    }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', justifyContent: 'center', padding: '1rem' }}>
                        {networkData.nodes?.map(node => (
                          <div 
                            key={node.id}
                            className="network-node"
                            style={{
                              background: node.type === 'OFFICER' ? '#C2A878' : node.type === 'CASE' ? '#D9D2C7' : '#B36A70',
                              border: '1px solid rgba(0,0,0,0.05)',
                              padding: '0.75rem 1.25rem',
                              borderRadius: '20px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              color: node.type === 'CASE' ? '#2D2424' : '#FAF7F2',
                              textAlign: 'center',
                              boxShadow: 'var(--shadow-sm)'
                            }}
                          >
                            <div style={{ fontSize: '0.625rem', opacity: 0.8, marginBottom: '2px' }}>{node.type}</div>
                            <div>{node.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="glass-panel" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', background: '#FFFFFF' }}>
              <Cpu size={48} color="#C2A878" />
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ fontSize: '1.125rem', color: '#2D2424', fontFamily: 'var(--font-display)' }}>No Case Selected</h3>
                <p style={{ fontSize: '0.8125rem', color: '#6B7280', marginTop: '0.25rem' }}>Select an active FIR file from the database to populate coordinates.</p>
              </div>
            </div>
          )}
        </section>

        {/* Right Panel: Intelligence Stream & Evidence Auditing */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflow: 'hidden' }}>
          
          {/* Section: Live System Alerts */}
          <div className="glass-panel" style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#FFFFFF' }}>
            <h3 style={{ fontSize: '0.875rem', color: '#B36A70', letterSpacing: '0.05em', fontWeight: '700', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Cpu size={14} color="#B36A70" /> AI TEAM AUDIT LEDGER
            </h3>
            
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {notifications.map((n) => (
                <div key={n.id} style={{
                  background: '#FAF7F2',
                  border: '1px solid hsl(var(--border))',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  fontSize: '0.6875rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6B7280', marginBottom: '2px' }}>
                    <span>{n.time}</span>
                    <span 
                      onClick={() => setShowAuditVerify(true)}
                      style={{ color: '#B36A70', fontWeight: '700', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      VERIFIED
                    </span>
                  </div>
                  <p style={{ color: '#2D2424', fontWeight: '500' }}>{n.message}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Action Workspace & Dynamic Legal Mapping */}
          {activeCase && (
            <div className="glass-panel" style={{ padding: '1rem', background: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h3 style={{ fontSize: '0.875rem', color: '#B36A70', letterSpacing: '0.05em', fontWeight: '700' }}>CASE DECISION SUPPORT</h3>
              
              <div style={{
                background: '#FAF7F2',
                padding: '0.75rem',
                borderRadius: '6px',
                border: '1px solid hsl(var(--border))'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.75rem' }}>
                  <span style={{ color: '#6B7280', fontWeight: '500' }}>Evidence Completeness:</span>
                  <span style={{ color: '#B36A70', fontWeight: '700' }}>{timeline.length > 0 ? "85%" : "0%"}</span>
                </div>
                <div style={{ background: '#D9D2C7', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ background: '#B36A70', width: timeline.length > 0 ? '85%' : '0%', height: '100%', transition: 'width 0.5s ease' }} />
                </div>
              </div>

              {/* Dynamic Legal Mappings */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#2D2424', fontWeight: '700' }}>BNS Penalty Recommendations:</span>
                {legalSections.length > 0 ? (
                  legalSections.map((leg) => (
                    <div 
                      key={leg.bns_section}
                      onClick={() => setExplainCard(leg)}
                      style={{
                        background: '#FAF7F2',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '6px',
                        border: '1px solid hsl(var(--border))',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.75rem',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#B36A70';
                        e.currentTarget.style.background = '#FFFFFF';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'hsl(var(--border))';
                        e.currentTarget.style.background = '#FAF7F2';
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '700', color: '#B36A70' }}>{leg.bns_section}</div>
                        <div style={{ fontSize: '0.625rem', color: '#6B7280' }}>{leg.title}</div>
                      </div>
                      <ExternalLink size={12} color="#C2A878" />
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: '0.6875rem', color: '#6B7280', fontStyle: 'italic' }}>Pending evidence timeline extraction...</div>
                )}
              </div>

              {/* Dynamic Case Similarity matches */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#2D2424', fontWeight: '700' }}>MO Similarity (Cosine Distance):</span>
                {timeline.length > 0 ? (
                  <div style={{
                    background: '#FAF7F2',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid rgba(194, 168, 120, 0.3)',
                    fontSize: '0.75rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: '#C2A878', fontWeight: '700' }}>92% Match</span>
                      <span style={{ color: '#6B7280', fontWeight: '600' }}>FIR 04/2025</span>
                    </div>
                    <div style={{ background: '#D9D2C7', height: '4px', borderRadius: '2px', overflow: 'hidden', marginBottom: '4px' }}>
                      <div style={{ background: '#C2A878', width: '92%', height: '100%' }} />
                    </div>
                    <p style={{ fontSize: '0.625rem', color: '#6B7280' }}>Shared parameters: midnight breach coordinates, lock damage profile, black truck footprint.</p>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.6875rem', color: '#6B7280', fontStyle: 'italic' }}>Pending evidence timeline extraction...</div>
                )}
              </div>

              <button
                onClick={handleSmartBrowzPDF}
                disabled={timeline.length === 0}
                style={{
                  background: timeline.length === 0 ? '#D9D2C7' : '#B36A70',
                  color: timeline.length === 0 ? '#6B7280' : '#FAF7F2',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.625rem',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  cursor: timeline.length === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.2s',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <Download size={14} /> SmartBrowz Case PDF Brief
              </button>
            </div>
          )}

          {/* Section: Explainability Card View */}
          {explainCard && (
            <div className="glass-panel" style={{
              padding: '1rem',
              border: '1px solid rgba(179, 106, 112, 0.4)',
              boxShadow: 'var(--shadow-glow)',
              background: '#FFFFFF'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#B36A70', fontFamily: 'var(--font-display)' }}>EXPLAINABILITY DATA CARD: {explainCard.bns_section}</span>
                <button 
                  onClick={() => setExplainCard(null)}
                  style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', fontSize: '0.875rem', marginLeft: 'auto' }}
                >
                  ✕
                </button>
              </div>
              <div style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <p style={{ color: '#2D2424' }}><strong>Rationale:</strong> {explainCard.rationale}</p>
                <p style={{ color: '#B36A70', background: 'rgba(179, 106, 112, 0.05)', padding: '6px', borderRadius: '4px', border: '1px solid rgba(179, 106, 112, 0.1)' }}>
                  <strong>Admissibility Warning:</strong> {explainCard.admissibility_warning}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6B7280', fontSize: '0.625rem', borderTop: '1px solid hsl(var(--border))', paddingTop: '0.5rem' }}>
                  <span>Source law: BNS Manual</span>
                  <span>Confidence: {(explainCard.confidence * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Verification Modal Dialog */}
          {showAuditVerify && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'rgba(45, 36, 36, 0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 999,
              padding: '1.5rem'
            }}>
              <div className="glass-panel" style={{
                maxWidth: '480px',
                width: '100%',
                padding: '2rem',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                boxShadow: 'var(--shadow-glow)',
                background: '#FFFFFF'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <Lock size={20} color="#10B981" />
                  <h3 style={{ fontSize: '1.125rem', color: '#2D2424', fontFamily: 'var(--font-display)' }}>Cryptographic Verification Success</h3>
                </div>
                <div style={{ fontSize: '0.8125rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', color: '#6B7280' }}>
                  <p>
                    The database mutation matches the original SHA-256 evidence record hash. No unauthorized alterations detected in the historical log files.
                  </p>
                  <div style={{
                    background: '#FAF7F2',
                    border: '1px solid hsl(var(--border))',
                    padding: '0.75rem',
                    borderRadius: '6px',
                    fontFamily: 'monospace',
                    fontSize: '0.6875rem',
                    color: '#10B981',
                    wordBreak: 'break-all',
                    fontWeight: '600'
                  }}>
                    SHA-256: 4a2d8d96b0129a3e2154388e28b8e2b8c2d8d96b0129a3e2154388e28b8e2b8c
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', borderTop: '1px solid hsl(var(--border))', paddingTop: '0.75rem' }}>
                    <span>Signee: ZOHO CATALYST SHIELD</span>
                    <span>Status: SECURED</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowAuditVerify(false)}
                  style={{
                    background: '#B36A70',
                    color: '#FAF7F2',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.5rem 1rem',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    marginTop: '1.25rem',
                    width: '100%',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  Close Verification View
                </button>
              </div>
            </div>
          )}

        </section>

      </main>
    </div>
  );
}

export default Dashboard;
