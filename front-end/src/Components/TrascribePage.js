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
      // check if study guide already exists
      const check = await axios.get(
        `http://localhost:3000/user/${spaceName}/study-guide/${transcribedName}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      let studyGuideText = '';
      if (check.data === 'Study guide does not exist') {
        console.log('Study guide does not exist. Creating study guide...');
        const response = await axios.get(
          `http://localhost:3000/user/${spaceName}/transcribe/${transcribedName}/study-guide`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        studyGuideText = response.data.summary;
  
        await axios.post(
          `http://localhost:3000/user/${spaceName}/study-guide/${transcribedName}/upload`,
          { studyGuide: studyGuideText },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        studyGuideText = check.data;
      }

      const doc = new jsPDF();
      doc.setFontSize(10);
  
      const pageWidth = doc.internal.pageSize.getWidth();
      const margins = 10;
      const textWidth = pageWidth - margins * 2;
  
      const wrappedText = doc.splitTextToSize(studyGuideText, textWidth);

      doc.text(wrappedText, margins, 10);
      doc.save(`${transcribedName}_Study_Guide.pdf`);
  
      console.log('Study guide uploaded and PDF generated successfully.');
    } catch (error) {
      console.error("Error fetching or uploading study guide", error);
    } finally {
      setStudyGuideLoading(false);
    }
  };
  

  const handleCreateFlashCards = async () => {
    try {
      setFlashCardsLoading(true);
      const token = localStorage.getItem('token');

      const check = await axios.get(
        `http://localhost:3000/user/${spaceName}/flash-cards/${transcribedName}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      let flashCardsText = '';
      if (check.data === 'Flashcards do not exist') {
        const response = await axios.get(
          `http://localhost:3000/user/${spaceName}/transcribe/${transcribedName}/flash-cards`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        flashCardsText = response.data.summary;

        await axios.post(
          `http://localhost:3000/user/${spaceName}/flash-cards/${transcribedName}/upload`,
          { flashcards: flashCardsText },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        flashCardsText = check.data;
        console.log('Flash cards already exist. Fetching flash cards...');
      }

      const doc = new jsPDF();
      doc.setFontSize(10);
  
      const pageWidth = doc.internal.pageSize.getWidth();
      const margins = 10;
      const textWidth = pageWidth - margins * 2;
  
      const wrappedText = doc.splitTextToSize(flashCardsText, textWidth);
  
      doc.text(wrappedText, margins, 10);
      doc.save(`${transcribedName}_Flash_Cards.pdf`);
  
      console.log('Flashcards uploaded and PDF generated successfully.');
    } catch (error) {
      console.error("Error fetching or uploading flash cards", error);
    } finally {
      setFlashCardsLoading(false);
    }
  };
  

  const handleCreateSummary = async () => {
    try {
      setSummaryLoading(true);
      const token = localStorage.getItem('token');

      const check = await axios.get(
        `http://localhost:3000/user/${spaceName}/summary/${transcribedName}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (check.data === 'Summary does not exist') {
        const summaryResponse = await axios.get(
          `http://localhost:3000/user/${spaceName}/transcribe/${transcribedName}/summary`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
    
        const summary = summaryResponse.data.summary;
        setSummary(summary);
        setSummaryGenerated(true);

        const uploadResponse = await axios.post(
          `http://localhost:3000/user/${spaceName}/summary/${transcribedName}/upload`,
          { summary },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (uploadResponse.status === 200) {
          console.log("Summary uploaded successfully:", uploadResponse.data.fileName);
        }
      } else {
        setSummary(check.data);
        setSummaryGenerated(true);
        console.log('Summary already exists. Fetching summary...');
      }
        
    } catch (error) {
      console.error("Error generating or uploading summary", error);
      setSummary("Failed to generate or upload summary.");
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
