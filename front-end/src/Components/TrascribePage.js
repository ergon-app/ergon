import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Home, Settings, LogOut, BookOpen, BookPlus, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import './TranscribePage.css';

const TranscribePage = () => {
  const { spaceName, transcribedName } = useParams();
  const navigate = useNavigate();
  const [transcribedText, setTranscribedText] = useState('');
  const [transcribedTextLoading, setTranscribedTextLoading] = useState(true);

  const [summary, setSummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryGenerated, setSummaryGenerated] = useState(false);

  const [studyGuideLoading, setStudyGuideLoading] = useState(false);
  const [flashCardsLoading, setFlashCardsLoading] = useState(false);

  useEffect(() => {
    const fetchTranscribedText = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `http://localhost:3000/user/${spaceName}/transcribe/${transcribedName}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
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
      setStudyGuideLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:3000/user/${spaceName}/transcribe/${transcribedName}/study-guide`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const studyGuideText = response.data.summary;
  
      const doc = new jsPDF();
      doc.setFontSize(10);
  
      const pageWidth = doc.internal.pageSize.getWidth();
      const margins = 10;
      const textWidth = pageWidth - margins * 2;
  
      const wrappedText = doc.splitTextToSize(studyGuideText, textWidth);
  
      doc.text(wrappedText, margins, 10);
      doc.save(`${transcribedName}_Study_Guide.pdf`);
    } catch (error) {
      console.error("Error fetching study guide", error);
    } finally {
      setStudyGuideLoading(false);
    }
  };

  const handleCreateFlashCards = async () => {
    try {
      setFlashCardsLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:3000/user/${spaceName}/transcribe/${transcribedName}/flash-cards`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const flashCardsText = response.data.summary;
      
      const doc = new jsPDF();
      doc.setFontSize(10);

      const pageWidth = doc.internal.pageSize.getWidth();
      const margins = 10;
      const textWidth = pageWidth - margins * 2;

      const wrappedText = doc.splitTextToSize(flashCardsText, textWidth);

      doc.text(wrappedText, margins, 10);
      doc.save(`${transcribedName}_Flash_Cards.pdf`);
    } catch (error) {
      console.error("Error fetching flash cards", error);
    } finally {
      setFlashCardsLoading(false);
    }
  };

  const handleCreateSummary = async () => {
    try {
      setSummaryLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:3000/user/${spaceName}/transcribe/${transcribedName}/summary`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSummary(response.data.summary);
      setSummaryGenerated(true);
    } catch (error) {
      console.error("Error fetching summary", error);
      setSummary("Failed to generate summary.");
    } finally {
      setSummaryLoading(false);
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
                {studyGuideLoading ? 'Creating Study Guide...' : 'Create Study Guide'}
              </button>
              <button className="action-button flash-cards" onClick={handleCreateFlashCards}>
                <BookPlus size={20} />
                {flashCardsLoading ? 'Creating Flash Cards...' : 'Create Flash Cards'}
              </button>
              <button className="action-button summary" onClick={handleCreateSummary}>
                <FileText size={20} />
                {summaryLoading ? 'Creating Summary...' : 'Create Summary'}
              </button>
            </div>
            {summaryGenerated && (
              <div className="summary-section">
                <h2>Summary</h2>
                {summaryLoading ? (
                  <p>Loading summary...</p>
                ) : (
                  <textarea className="summary-text" readOnly value={summary} />
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TranscribePage;
