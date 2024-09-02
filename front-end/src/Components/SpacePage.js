import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { MoreVertical, X, Upload, Home, Settings, LogOut } from 'lucide-react';
import './SpacePage.css';

const SpacePage = () => {
  const { spaceName } = useParams();
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [fileMenuOpen, setFileMenuOpen] = useState(null);
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

      let files = response.data;
      let id = 1;
      const cleanedFiles = files.map(file => ({
        id: id++, 
        name: file.key.split('/').filter(Boolean).pop(),
      }));
      
      setFiles(cleanedFiles);
    } catch (error) {
      console.error("Error fetching files:", error);
      if (error.response) {
        console.log("Response data:", error.response.data);
        console.log("Response status:", error.response.status);
      }
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
        `http://localhost:3000/user/directory/${spaceName}/rename`,
        { oldName: currentName, newName },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setFiles(prevFiles => prevFiles.map(file => 
        file.id === fileId ? { ...file, name: newName } : file
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
        `http://localhost:3000/user/directory/${spaceName}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          data: { name: fileName }
        }
      );

      setFiles(prevFiles => prevFiles.filter(file => file.id !== fileId));
      setFileMenuOpen(null);
    } catch (error) {
      console.error("Error deleting file:", error);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

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

  const FileMenu = ({ fileId, fileName, onClose }) => {
    const optionsRect = fileOptionsRef.current[fileId]?.getBoundingClientRect();
    
    return (
      <div className="file-menu" style={{
        position: 'absolute',
        top: `${optionsRect ? optionsRect.bottom + window.scrollY : 0}px`,
        left: `${optionsRect ? optionsRect.left + window.scrollX : 0}px`,
      }}>
        <div className="file-menu-item" onClick={() => handleFileRename(fileId, fileName)}>
          Rename
        </div>
        <div className="file-menu-divider"></div>
        <div className="file-menu-item" onClick={() => handleFileDelete(fileId, fileName)}>
          Delete
        </div>
        <div className="file-menu-close" onClick={onClose}>
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
        <div className="file-list">
          {files.length === 0 ? (
            <p>No files found. Try uploading a file.</p>
          ) : (
            files.map(file => (
                <div key={file.id} className="file-item">
                <span className="file-name">{file.name}</span>
                <div 
                  className="file-options"
                  ref={el => fileOptionsRef.current[file.id] = el}
                  onClick={() => setFileMenuOpen(fileMenuOpen === file.id ? null : file.id)}
                >
                  <MoreVertical size={16} />
                </div>
                {fileMenuOpen === file.id && (
                  <FileMenu 
                    key={file.id + "-menu"}  // Add a unique key prop for the FileMenu component
                    fileId={file.id} 
                    fileName={file.name}
                    onClose={() => setFileMenuOpen(null)} 
                  />
                )}
              </div>
            
            ))
          )}
        </div>
        <div className="upload-section">
          <label htmlFor="file-upload" className="upload-button">
            <Upload size={16} />
            Upload File
          </label>
          <input
            id="file-upload"
            type="file"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </div>
      </div>
    </div>
  );
};

export default SpacePage;