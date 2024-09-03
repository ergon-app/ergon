import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { MoreVertical, X, Home, Settings, LogOut, FolderPlus, Folder } from 'lucide-react';
import { createPortal } from 'react-dom';
import fetchUserInfo from './api';
import './Dashboard.css';

function logout() {
  localStorage.removeItem('token'); 
}

const Dashboard = () => {
  const [greeting, setGreeting] = useState('');
  const [files, setFiles] = useState([]);
  const [username, setUsername] = useState('');
  const [expandedFileId, setExpandedFileId] = useState(null);
  const [fileMenuOpen, setFileMenuOpen] = useState(null);
  const fileOptionsRef = useRef({});
  const navigate = useNavigate();

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('good morning');
    else if (hour < 18) setGreeting('good afternoon');
    else setGreeting('good evening');

    async function getUserInfo() {
      try {
        const userInfo = await fetchUserInfo();
        if (userInfo) {
          setUsername(userInfo);
        } else {
          console.error('Failed to fetch user info');
          navigate('/login'); 
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
        navigate('/login');
      }
    }
    getUserInfo();

    parseFilesToArray();
  }, [navigate]);

  const parseFilesToArray = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        'http://localhost:3000/user/directory',
        { headers: {
          Authorization: `Bearer ${token}`
         }
        }
      );
      const files = response.data;

      let id = 1;
      const spaces = files.map(file => ({
        id: id++, 
        name: file.key.split('/').filter(Boolean).pop(),
        isExpanded: false
      }));

      setFiles(spaces);
    } catch (error) {
      console.error("Error fetching directories:", error);
    }
  };

  const handleCreateFile = async () => {
    try {
      const fileName = prompt("enter the name of the new space:");
      if (!fileName) return; 

      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:3000/user/directory',
        { name: fileName },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.status === 200) {
        setFiles(prevFiles => [
          ...prevFiles,
          { id: prevFiles.length + 1, name: fileName, isExpanded: false }
        ]);
        console.log('File created successfully');
      }
    } catch (error) {
      console.error("Error creating file:", error);
    }
  };

  const handleFileClick = (fileId) => {
    const file = files.find(f => f.id === fileId);
    navigate(`/space/${encodeURIComponent(file.name)}`);
  };

  const handleFileRename = async (fileId) => {
    try {
      const newName = prompt("Enter the new name for the space:");
      if (!newName) return;
  
      const token = localStorage.getItem('token');
      await axios.post(
        `http://localhost:3000/user/directory/rename`,
        {
          oldName: files.find(file => file.id === fileId).name,
          newName: newName
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
  
      setFiles(prevFiles => prevFiles.map(file => file.id === fileId ? { ...file, name: newName } : file));
      setFileMenuOpen(null);
    } catch (error) {
      console.error("Error renaming file:", error);
    }
  };
  

  const handleFileDelete = async (fileId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `http://localhost:3000/user/directory`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          },
          data: {
            name: files.find(file => file.id === fileId).name
          }
        }
      );

      setFiles(prevFiles => prevFiles.filter(file => file.id !== fileId));
      setFileMenuOpen(null);
    } catch (error) {
      console.error("Error deleting file:", error);
    }
  };

  const handleSettingsClick = () => {
    navigate('/settings');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const FileMenu = ({ fileId, onClose }) => {
    const optionsRect = fileOptionsRef.current[fileId]?.getBoundingClientRect();
    
    return createPortal(
      <div className="file-menu" style={{
        position: 'absolute',
        top: `${optionsRect ? optionsRect.bottom + window.scrollY : 0}px`,
        left: `${optionsRect ? optionsRect.left + window.scrollX : 0}px`,
      }}>
        <div className="file-menu-item" onClick={(event) => {
          event.stopPropagation();
          handleFileRename(fileId);
        }}>
          rename
          <div className="file-menu-close" onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}>
            <X size={16} />
          </div>
        </div>
        <div className="file-menu-divider"></div>
        <div className="file-menu-item" onClick={(event) => {
          event.stopPropagation();
          handleFileDelete(fileId);
        }}>
          delete
        </div>
      </div>,
      document.body
    );
  };

  return (
    <div className="dashboard">
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
        <h1 className="greeting">{greeting}, {username || 'user'}</h1>
        <div className="files-section">
          <h2>your spaces</h2>
          <button className="create-file-btn" onClick={handleCreateFile}>
            <FolderPlus size={20}/>
            <span>new space</span>
          </button>
          <div className="file-list">
            {files.map(file => (
              <div key={file.id} className={`file-item ${file.id === expandedFileId ? 'expanded' : ''}`} onClick={() => handleFileClick(file.id)}>
                <div className="file-name">
                  <Folder size={20}/>
                  <span className="file-name-text">
                    {file.name}
                  </span>
                  <div 
                    className="file-options"
                    ref={el => fileOptionsRef.current[file.id] = el}
                    onClick={(event) => {
                      event.stopPropagation();
                      setFileMenuOpen(fileMenuOpen === file.id ? null : file.id);
                    }}
                  >
                    <MoreVertical size={16} />
                  </div>
                </div>
                {fileMenuOpen === file.id && (
                  <FileMenu fileId={file.id} onClose={() => setFileMenuOpen(null)} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;