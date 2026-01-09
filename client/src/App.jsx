import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// --- SUB-COMPONENTS (Now defined OUTSIDE to fix the typing bug) ---

const Navbar = ({ view, token, setView, handleLogout }) => (
  <nav className="navbar">
    <div className="brand" onClick={() => setView(token ? 'dashboard' : 'landing')}>
      TaskTracker
    </div>
    <div className="nav-buttons">
      {token ? (
        <button onClick={handleLogout} className="primary-btn">Logout</button>
      ) : (
        <>
          <button onClick={() => setView('login')}>Log In</button>
          <button onClick={() => setView('register')} className="primary-btn">Sign Up</button>
        </>
      )}
    </div>
  </nav>
);

const Landing = ({ setView }) => (
  <div className="centered-container">
    <div className="hero">
      <h1>Organize your work<br />efficiently.</h1>
      <p>
        A simple, clean, and distraction-free way to track your daily tasks.
        Create your account today and start getting things done.
      </p>
      <button className="hero-btn" onClick={() => setView('register')}>
        Get Started for Free
      </button>
    </div>
  </div>
);

const AuthForm = ({ type, username, setUsername, password, setPassword, handleAuth, error, setView, setError }) => (
  <div className="centered-container">
    <div className="auth-card">
      <h2>{type === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
      {error && <p className="error-msg">{error}</p>}
      
      <div className="form-group">
        <label>Username</label>
        <input 
          type="text" 
          value={username} 
          onChange={(e) => setUsername(e.target.value)} 
          autoFocus
        />
      </div>
      <div className="form-group">
        <label>Password</label>
        <input 
          type="password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
        />
      </div>
      
      <button className="full-width-btn" onClick={() => handleAuth(type === 'register')}>
        {type === 'login' ? 'Log In' : 'Sign Up'}
      </button>

      <div className="switch-auth" onClick={() => { setError(''); setView(type === 'login' ? 'register' : 'login'); }}>
        {type === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Log In"}
      </div>
    </div>
  </div>
);

const Dashboard = ({ tasks, input, setInput, addTask, toggleTask, deleteTask }) => (
  <div className="dashboard-container">
    <div className="task-input-group">
      <input 
        type="text" 
        placeholder="What needs to be done?" 
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && addTask()}
      />
      <button className="add-btn" onClick={addTask}>Add</button>
    </div>

    <ul className="task-list">
      {tasks.length === 0 && <p className="empty-state">No tasks yet. Add one above!</p>}
      
      {tasks.map(task => (
        <li key={task._id} className="task-item">
          <label className="checkbox-container">
            <input 
              type="checkbox" 
              checked={task.isCompleted} 
              onChange={() => toggleTask(task._id)}
            />
            <span className="checkmark"></span>
          </label>
          
          <span className={`task-text ${task.isCompleted ? 'completed-text' : ''}`}>
            {task.title}
          </span>
          <button className="delete-btn" onClick={() => deleteTask(task._id)}>✕</button>
        </li>
      ))}
    </ul>
  </div>
);

// --- MAIN APP COMPONENT ---

function App() {
  const [tasks, setTasks] = useState([]);
  const [input, setInput] = useState('');
  const [view, setView] = useState(localStorage.getItem('token') ? 'dashboard' : 'landing');
  const [token, setToken] = useState(localStorage.getItem('token'));
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const authHeaders = { headers: { Authorization: token } };

  useEffect(() => {
    if (view === 'dashboard' && token) {
      axios.get(`${API_URL}/tasks`, authHeaders)
        .then(res => setTasks(res.data))
        .catch(() => handleLogout());
    }
  }, [view, token]);

  const handleAuth = async (isRegister) => {
    setError('');
    const endpoint = isRegister ? '/register' : '/login';
    try {
      const res = await axios.post(`${API_URL}${endpoint}`, { username, password });
      if (isRegister) {
        setView('login');
        setError('Account created! Please log in.');
      } else {
        localStorage.setItem('token', res.data.token);
        setToken(res.data.token);
        setView('dashboard');
      }
      setUsername('');
      setPassword('');
    } catch (err) {
      setError(err.response?.data?.error || "Authentication failed");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setTasks([]);
    setView('landing');
  };

  const addTask = () => {
    if (!input.trim()) return;
    axios.post(`${API_URL}/tasks`, { title: input }, authHeaders)
      .then(res => {
        setTasks([...tasks, res.data]);
        setInput('');
      });
  };

  const toggleTask = (id) => {
    const updatedTasks = tasks.map(t => t._id === id ? { ...t, isCompleted: !t.isCompleted } : t);
    setTasks(updatedTasks);
    axios.put(`${API_URL}/tasks/${id}`, {}, authHeaders).catch(() => setTasks(tasks));
  };

  const deleteTask = (id) => {
    axios.delete(`${API_URL}/tasks/${id}`, authHeaders)
      .then(() => setTasks(tasks.filter(t => t._id !== id)));
  };

  return (
    <div className="app-root">
      <Navbar view={view} token={token} setView={setView} handleLogout={handleLogout} />
      
      {view === 'landing' && <Landing setView={setView} />}
      
      {(view === 'login' || view === 'register') && (
        <AuthForm 
          type={view} 
          username={username} setUsername={setUsername}
          password={password} setPassword={setPassword}
          handleAuth={handleAuth} error={error} setView={setView} setError={setError}
        />
      )}
      
      {view === 'dashboard' && (
        <Dashboard 
          tasks={tasks} input={input} setInput={setInput}
          addTask={addTask} toggleTask={toggleTask} deleteTask={deleteTask}
        />
      )}
    </div>
  );
}

export default App;