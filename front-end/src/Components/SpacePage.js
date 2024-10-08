import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { MoreVertical, X, Upload, Home, Settings, LogOut, File, Check } from 'lucide-react';
import './SpacePage.css';

const ALLOWED_EXTENSIONS = ['.txt', '.doc', '.docx', '.pdf'];
const MAX_FILES = 5;

const SpacePage = () => {
  const { spaceName } = useParams();
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [transcribedFiles, setTranscribedFiles] = useState([]);
  const [fileMenuOpen, setFileMenuOpen] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [transcribedText, setTranscribedText] = useState('');
  const [loading, setLoading] = useState(false);
  const fileOptionsRef = useRef({});

  const fetchFiles = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:3000/user/${spaceName}/files`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.length === 0) {
        console.log("No files returned from the server");
      }

      let allFiles = response.data;
      let id = 1;
      const cleanedFiles = allFiles.map(file => ({
        id: id++, 
        name: file.key.split('/').filter(Boolean).pop(),
      }));

      const transcribedFilesResponse = await axios.get(
        `http://localhost:3000/user/${spaceName}/transcribedFiles`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (transcribedFilesResponse.data.length === 0) {
        console.log("No transcribed files returned from the server");
      }

      let transcribedFileNames = transcribedFilesResponse.data.map(file => 
        file.key.split('/').filter(Boolean).pop()
      );

      setFiles(cleanedFiles.filter(file => !transcribedFileNames.includes(file.name)));
      setTranscribedFiles(cleanedFiles.filter(file => transcribedFileNames.includes(file.name)));
    } catch (error) {
      console.error("Error fetching files:", error);
    }
  }, [spaceName]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleFileRename = async (fileId, currentName) => {
    try {
      const newName = prompt("Enter the new name for the file:", currentName);
      if (!newName || newName === currentName) return;

      const token = localStorage.getItem('token');

      await axios.post(
        `http://localhost:3000/user/${spaceName}/file/rename`,
        { 
          oldFileName: currentName, 
          newFileName: newName 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const fileExtension = currentName.substring(currentName.lastIndexOf('.'));
      const updatedName = newName + fileExtension;

      setFiles(prevFiles => prevFiles.map(file => 
        file.id === fileId ? { ...file, name: updatedName } : file
      ));
      setFileMenuOpen(null);
    } catch (error) {
      console.error("Error renaming file:", error);
    }
  };

  const handleFileDelete = async (fileId, fileName) => {
    try {
      const token = localStorage.getItem('token');
      
      await axios.delete(
        `http://localhost:3000/user/${spaceName}/file`, 
        {
          headers: { Authorization: `Bearer ${token}` },
          data: { 
            files: [{ name: fileName }] 
          }
        }
      );

      setFiles(prevFiles => prevFiles.filter(file => file.id !== fileId));
      setSelectedFiles(prevSelected => prevSelected.filter(id => id !== fileId));
      setFileMenuOpen(null);
    } catch (error) {
      console.error("Error deleting file:", error);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
      alert(`Only text documents are allowed (${ALLOWED_EXTENSIONS.join(', ')})`);
      return;
    }

    if (files.length >= MAX_FILES) {
      alert(`You can only upload a maximum of ${MAX_FILES} files.`);
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `http://localhost:3000/user/${spaceName}/file/upload`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      fetchFiles();
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  };

  const handleFileSelect = (fileId) => {
    setSelectedFiles(prev => 
      prev.includes(fileId) 
        ? prev.filter(id => id !== fileId) 
        : [...prev, fileId]
    );
  };

  const handleTranscribe = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const selectedFileNames = selectedFiles.map(id => 
        files.find(file => file.id === id).name
      );

      const response = await axios.post(
        `http://localhost:3000/user/${spaceName}/transcribe`,
        { files: selectedFileNames },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setTranscribedText(response.data.text);
    } catch (error) {
      console.error("Error transcribing files:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitToCloud = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `http://localhost:3000/user/${spaceName}/submit-transcription`,
        { text: transcribedText },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('Transcription submitted successfully!');
      setTranscribedText('');
      setSelectedFiles([]);
      fetchFiles();
    } catch (error) {
      console.error("Error submitting transcription:", error);
    }
  };

  const FileMenu = ({ fileId, fileName, onClose }) => {
    return (
      <div className="file-menu">
        <div className="file-menu-item" onClick={(e) => {
          e.stopPropagation();
          handleFileRename(fileId, fileName);
        }}>
          rename
        </div>
        <div className="file-menu-divider"></div>
        <div className="file-menu-item" onClick={(e) => {
          e.stopPropagation();
          handleFileDelete(fileId, fileName);
        }}>
          delete
        </div>
        <div className="file-menu-close" onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}>
          <X size={16} />
        </div>
      </div>
    );
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="space-page">
      <div className="sidebar">
        <div className="sidebar-item" onClick={() => navigate('/dashboard')}>
          <Home size={20} />
          <span>home</span>
        </div>
        <div className="sidebar-item" onClick={() => navigate('/settings')}>
          <Settings size={20} />
          <span>settings</span>
        </div>
        <div className="sidebar-item" onClick={handleLogout}>
          <LogOut size={20} />
          <span>logout</span>
        </div>
      </div>
      <div className="main-content">
        <h1 className="space-title">{spaceName}</h1>
        <div className="files-container">
          <div className="file-section">
            <h2 className="section-title">Files</h2>
            <div className="file-list">
            {files.length === 0 ? (
                <p>no files found. try uploading a file.</p>
              ) : (
                files.map(file => (
                  <div 
                    key={file.id} 
                    className={`file-item ${selectedFiles.includes(file.id) ? 'selected' : ''}`}
                    onClick={() => handleFileSelect(file.id)}
                  >
                    <div className="file-name">
                      <File size={20}/>
                      <span className="file-name-text">{file.name}</span>
                      {selectedFiles.includes(file.id) && <Check size={16} className="file-selected-icon" />}
                    </div>
                    <div className="file-actions">
                      <button 
                        className="delete-button" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFileDelete(file.id, file.name);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="file-section">
            <h2 className="section-title">Transcribed Files</h2>
            <div className="file-list">
              {transcribedFiles.length === 0 ? (
                <p>no transcribed files found.</p>
              ) : (
                transcribedFiles.map(file => (
                  <div 
                    key={file.id} 
                    className="file-item transcribed-file"
                    onClick={() => navigate(`/space/${encodeURIComponent(spaceName)}/${encodeURIComponent(file.name)}`)}
                  >
                    <div className="file-name">
                      <File size={20}/>
                      <span className="file-name-text">{file.name}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        <div className="upload-section">
          <label htmlFor="file-upload" className="upload-button">
            <Upload size={16} />
            upload file ({files.length}/{MAX_FILES})
          </label>
          <input
            id="file-upload"
            type="file"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </div>
        {selectedFiles.length > 0 && (
          <button className="transcribe-button" onClick={handleTranscribe}>
            {loading ? 'Transcribing...' : 'Transcribe Selected Files'}
          </button>
        )}
        {loading && <p>Loading transcription results...</p>}
        {transcribedText && (
          <div className="transcription-section">
            <textarea
              value={transcribedText}
              onChange={(e) => setTranscribedText(e.target.value)}
              className="transcription-text"
            />
            <button className="submit-button" onClick={handleSubmitToCloud}>
              Submit to Cloud
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpacePage;