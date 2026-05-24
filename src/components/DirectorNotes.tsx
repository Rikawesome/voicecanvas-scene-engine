import React, { useState } from 'react';

interface DirectorNotesProps {
  selectedId: string | null;
  onExecuteCommand: (action: string) => void;
  isLandscapeSidebar?: boolean; // New property to determine docking style
}

export function DirectorNotes({ selectedId, onExecuteCommand, isLandscapeSidebar = false }: DirectorNotesProps) {
  const [noteText, setNoteText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    
    // Pass raw casing down—the backend NLP compilation engine handles lowercasing safely
    onExecuteCommand(noteText.trim());
    setNoteText('');
  };

  // 1. Clean Styling Definition for when it's docked inside the Sidebar (Landscape)
  const sidebarStyle: React.CSSProperties = {
    padding: '16px 20px',
    backgroundColor: '#18181f',
    borderTop: '1px solid #29292e',
    borderBottom: '1px solid #29292e',
  };

  // 2. Original Floating Style for Desktop & Portrait Canvas
  const floatingStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '90%',
    maxWidth: '500px',
    zIndex: 100,
    backgroundColor: 'rgba(32, 32, 36, 0.92)',
    backdropFilter: 'blur(8px)',
    border: '1px solid #44475a',
    borderRadius: '12px',
    padding: '12px 16px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
  };

  return (
    <div style={isLandscapeSidebar ? sidebarStyle : floatingStyle}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <input 
          type="text"
          // CRITICAL UX UPDATE: Placeholder explicitly prompts for global environment capability if no actor is clicked
          placeholder={selectedId ? "Type director notes (e.g., 'Riku guard stance', 'mood tense')..." : "Type global notes (e.g., 'mood suspense')..."}
          disabled={false} // NEVER disable! Allow global lighting/mood controls to execute freely without selection
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          style={{
            flex: 1,
            background: isLandscapeSidebar ? '#202024' : '#18181f',
            border: '1px solid #29292e',
            borderRadius: '6px',
            padding: '10px 14px',
            color: '#f8f8f2',
            fontSize: '0.85rem',
            outline: 'none',
            width: '100%' // Mandates full-width usage inside the sidebar
          }}
        />
        <button 
          type="submit"
          disabled={!noteText.trim()} // Only block execution if the actual string pool input is empty
          style={{
            background: '#50fa7b',
            color: '#282a36',
            border: 'none',
            borderRadius: '6px',
            padding: '10px 16px',
            fontWeight: 'bold',
            fontSize: '0.85rem',
            cursor: 'pointer',
            opacity: !noteText.trim() ? 0.5 : 1,
            transition: 'opacity 0.15s ease'
          }}
        >
          Action
        </button>
      </form>
    </div>
  );
}