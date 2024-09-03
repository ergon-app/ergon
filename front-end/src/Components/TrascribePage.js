import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Home, Settings, LogOut, BookOpen, BookPlus, FileText } from 'lucide-react';
import './TranscribePage.css';

const TranscribePage = () => {
  const { spaceName, transcribedName } = useParams();
  const navigate = useNavigate();
  const [transcribedText, setTranscribedText] = useState('');
  const [transcribedTextLoading, setTranscribedTextLoading] = useState(true);

  useEffect(() => {
    const fetchTranscribedText = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `http://localhost:3000/user/${spaceName}/transcribe/${transcribedName}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log(response)
        setTranscribedText(response.data);
        setTranscribedTextLoading(false);
      } catch (error) {
        console.error("Error fetching transcribed text:", error);
        setTranscribedTextLoading(false);
      }
    };

    fetchTranscribedText();
  }, [spaceName, transcribedName]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleCreateStudyGuide = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:3000/user/${spaceName}/transcribe/${transcribedName}/study-guide`
      )
    } catch (error) {
      console.error("Error fetching study guide", error);
    }
  };

  const handleCreateFlashCards = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:3000/user/${spaceName}/transcribe/${transcribedName}/flash-cards`
      )
    } catch (error) {
      console.error("Error fetching study guide", error);
    }
  };

  const handleCreateSummary = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:3000/user/${spaceName}/transcribe/${transcribedName}/summary`
      )
    } catch (error) {
      console.error("Error fetching study guide", error);
    }
  };

  return (
    <div className="transcribe-page">
      <div className="sidebar">
        <div className="sidebar-item" onClick={() => navigate('/dashboard')}>
          <Home size={20} />
          <span>Home</span>
        </div>
        <div className="sidebar-item" onClick={() => navigate('/settings')}>
          <Settings size={20} />
          <span>Settings</span>
        </div>
        <div className="sidebar-item" onClick={handleLogout}>
          <LogOut size={20} />
          <span>Logout</span>
        </div>
      </div>
      <div className="main-content">
        <h1 className="transcribe-title">{transcribedName}</h1>
        {transcribedTextLoading ? (
          <p>Loading transcribed text...</p>
        ) : (
          <>
            <div className="transcribed-text">
              <h2>Transcribed Text</h2>
              <textarea className="transcription-text" readOnly value={transcribedText} />
            </div>
            <div className="action-buttons">
              <button className="action-button study-guide" onClick={handleCreateStudyGuide}>
                <BookOpen size={20} />
                Create Study Guide
              </button>
              <button className="action-button flash-cards" onClick={handleCreateFlashCards}>
                <BookPlus size={20} />
                Create Flash Cards
              </button>
              <button className="action-button summary" onClick={handleCreateSummary}>
                <FileText size={20} />
                Create Summary
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TranscribePage;