'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// Sort helpers
const SORT_OPTIONS = [
  { value: 'default',    label: 'Default' },
  { value: 'date-asc',   label: 'Date: Oldest First' },
  { value: 'date-desc',  label: 'Date: Newest First' },
  { value: 'alphabet-asc',  label: 'A-Z' },
  { value: 'alphabet-desc', label: 'Z-A' },
  { value: 'priority',   label: 'Priority' },
  { value: 'custom',     label: 'Custom Order' },
];

const PRIORITY_ORDER = { High: 0, Medium: 1, Low: 2 };

function applySort(tasks, sort, customOrder) {
  const list = [...tasks];
  if (sort === 'date-asc')   return list.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  if (sort === 'date-desc')  return list.sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate));
  if (sort === 'alphabet-asc')  return list.sort((a, b) => a.title.localeCompare(b.title));
  if (sort === 'alphabet-desc') return list.sort((a, b) => b.title.localeCompare(a.title));
  if (sort === 'priority')   return list.sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3));
  if (sort === 'custom') {
    const indexMap = {};
    customOrder.forEach((id, i) => { indexMap[id] = i; });
    return list.sort((a, b) => (indexMap[a.id] ?? 999) - (indexMap[b.id] ?? 999));
  }
  return list;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState({ title: '', description: '', dueDate: '', priority: 'Low' });
  const [taskError, setTaskError] = useState('');
  const [taskMessage, setTaskMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [shareInputs, setShareInputs] = useState({});
  const [shareMessages, setShareMessages] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sort, setSort] = useState(null);
  const [customOrder, setCustomOrder] = useState([]);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', dueDate: '', priority: 'Low' });
  const pollRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    fetch('/api/user', { credentials: 'include' })
      .then(res => {
        if (!res.ok) { router.replace('/login'); return null; }
        return res.json();
      })
      .then(json => {
        if (json) {
          setUser(json.data);
          loadTasks();
          pollUnreadCount();
        }
      });

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Make customOrder persist
  useEffect(() => {
    setCustomOrder(prev => {
      const ids      = tasks.map(t => t.id);
      const filtered = prev.filter(id => ids.includes(id));
      const added    = ids.filter(id => !filtered.includes(id));
      return [...filtered, ...added];
    });
  }, [tasks]);

  const persistOrder = useCallback((order) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSaving(true);
      await fetch('/api/reorderTasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ orderedIds: order }),
      });
      setSaving(false);
    }, 800);
  }, []);

  // Move a task up or down in custom order
  function moveTask(id, direction) {
    setCustomOrder(prev => {
      const arr  = [...prev];
      const i  = arr.indexOf(id);
      if (i === -1) return prev;
      const swap = i + direction;
      if (swap < 0 || swap >= arr.length) return prev;
      [arr[i], arr[swap]] = [arr[swap], arr[i]];
      persistOrder(arr);
      return arr;
    });
  }

  function pollUnreadCount() {
    fetchUnreadCount();
    pollRef.current = setInterval(fetchUnreadCount, 8000);
  }

  function fetchUnreadCount() {
    fetch('/api/getNotifications', { credentials: 'include' })
      .then(res => res.json())
      .then(json => {
        if (json.status) {
          const unread = json.data.filter(n => !n.read).length;
          setUnreadCount(unread);
        }
      });
  }

  function loadTasks() {
    fetch('/api/getAllTasks', { credentials: 'include' })
      .then(res => res.json())
      .then(json => {
        if (json.status) {
          setTasks(json.data);
          setCustomOrder(json.data.map(t => t.id));
        }
      });
  }

  async function logout() {
    if (pollRef.current) clearInterval(pollRef.current);
    try {
      await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      // Fall back to clearing the browser cookie locally.
    }
    document.cookie = 'auth=; max-age=0; path=/';
    router.replace('/login');
  }

  function openNotifications() {
    fetch('/api/getNotifications', { credentials: 'include' })
      .then(res => res.json())
      .then(json => {
        if (json.status) {
          setNotifications(json.data);
          setShowNotifications(true);
          fetch('/api/markNotificationsRead', { method: 'PUT', credentials: 'include' })
            .then(() => setUnreadCount(0));
        }
      });
  }

  // Helper function for displaying temporary task success messages
  function showTaskMessage(message) {
    setTaskMessage(message);
    setTimeout(() => {
      setTaskMessage('');
    }, 3000);
  }

  async function deleteSingleNotification(notifId) {
    await fetch('/api/deleteNotification', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id: notifId }),
    });
    setNotifications(prev => prev.filter(n => n.id !== notifId));
  }

  async function clearAllNotifications() {
    await fetch('/api/clearAllNotifications', {
      method: 'DELETE',
      credentials: 'include',
    });
    setNotifications([]);
    setUnreadCount(0);
  }

  async function createTask() {
    setTaskMessage('');
    if (!newTask.title.trim() || !newTask.description.trim() || !newTask.dueDate) {
      setTaskError('Please fill in all fields.');
      return;
    }
    setLoading(true);

    let res;
    try {
      res = await fetch('/api/createTask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newTask),
      });
    } catch (err) {
      setTaskError('Network error. Please try again.');
      setLoading(false);
      return;
    }

    const json = await res.json();
    if (json.status) {
      setNewTask({ title: '', description: '', dueDate: '', priority: 'Low' });
      setTaskError('');
      loadTasks();
      showTaskMessage('Task added successfully!');
    } else {
      setTaskError(json.error);
    }
    setLoading(false);
  }

  async function deleteTask(id) {
    setTaskMessage('');
    if(!confirm('Are you sure you want to delete this task?')) return;
    setLoading(true);

    try{
      await fetch('/api/deleteTask', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id }),
      });
    } catch (err) {
      setTaskError('Network error. Please try again.');
      setLoading(false);
      return;
    }

    loadTasks();
    setTaskError('');
    showTaskMessage('Task deleted successfully!');
    setLoading(false);
  }

  async function toggleComplete(id) {
    setTaskMessage('');
    setLoading(true);

    try {
      await fetch('/api/completeTask', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id }),
      });
    } catch (err) {
      setTaskError('Network error. Please try again.');
      setLoading(false);
      return;
    }

    loadTasks();
    fetchUnreadCount();
    setTaskError('');
    showTaskMessage('Task updated successfully!');
    setLoading(false);
  }

  function startEdit(task) {
    setEditingId(task.id);
    setEditForm({
      title: task.title,
      description: task.description,
      dueDate: task.dueDate,
      priority: task.priority,
    });
    setTaskError('');
    setTaskMessage('');
  }

  function cancelEdit() {
    setEditingId(null);
    setTaskError('');
  }

  async function saveEdit(id) {
    if (!editForm.title.trim() || !editForm.description.trim() || !editForm.dueDate) {
      setTaskError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    const res = await fetch('/api/updateTask', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id, ...editForm }),
    });
    const json = await res.json();
    if (json.status) {
      setEditingId(null);
      setTaskError('');
      loadTasks();
      showTaskMessage('Task updated successfully!');
    } else {
      setTaskError(json.error || 'Failed to update task.');
    }
    setLoading(false);
  }

  async function shareTask(taskId) {
    setLoading(true);
    const targetUserName = shareInputs[taskId] || '';
    if (!targetUserName.trim()) {
      setShareMessages(prev => ({ ...prev, [taskId]: 'Please enter a username.' }));
      setLoading(false);
      return;
    }
    const res = await fetch('/api/shareTask', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ taskId, targetUserName }),
    });
    const json = await res.json();
    setShareMessages(prev => ({ ...prev, [taskId]: json.status ? 'Task shared!' : json.error }));
    if (json.status) {
      setShareInputs(prev => ({ ...prev, [taskId]: '' }));
      loadTasks();
    }
    setLoading(false);
  }

  if (!user) {
    return (
      <div className="center-screen">
        <div className="spinner" />
      </div>
    );
  }

  const myTasks = tasks.filter(t => t.userName === user.userName && (!t.sharedWith || t.sharedWith.length === 0));
  const sortedMyTasks = sort ? applySort(myTasks, sort, customOrder) : myTasks;
  const sharedByMe = tasks.filter(t => t.userName === user.userName && t.sharedWith && t.sharedWith.length > 0);
  const sharedWithMe = tasks.filter(t => t.userName !== user.userName);

  return (
    <div className="dashboard">
      <nav className="navbar">
        <div className="navbar-logo">To-Do List App</div>
        <div className="navbar-right" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>

          {/* Notification Bell */}
          <div
            style={{ position: 'relative', cursor: 'pointer', fontSize: '1.4rem' }}
            onClick={openNotifications}
            title="Notifications"
          >
            🔔
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: '-8px', right: '-8px',
                background: 'red', color: 'white', borderRadius: '50%',
                fontSize: '0.65rem', fontWeight: 'bold',
                width: '18px', height: '18px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid white', boxShadow: '0 0 4px rgba(0,0,0,0.4)'
              }}>
                {unreadCount}
              </span>
            )}
          </div>

          <span className="navbar-user">{user.userName}</span>
          <button className="btn-ghost" onClick={logout}>Logout</button>
        </div>
      </nav>

      {/* Notifications Panel */}
      {showNotifications && (
        <div style={{
          position: 'fixed', top: '60px', right: '20px', zIndex: 1000,
          background: '#1a1a1a', border: '1px solid #444', borderRadius: '8px',
          padding: '16px', minWidth: '320px', maxWidth: '420px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.6)'
        }}>
          {/* Panel Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <strong style={{ color: '#fff', fontSize: '1rem' }}>🔔 Notifications</strong>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {notifications.length > 0 && (
                <button
                  onClick={clearAllNotifications}
                  style={{ fontSize: '0.75rem', color: '#f88', background: 'none', border: '1px solid #f88', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer' }}
                >
                  Clear All
                </button>
              )}
              <button className="btn-ghost" onClick={() => setShowNotifications(false)}>✕</button>
            </div>
          </div>

          {/* Notification List */}
          {notifications.length === 0 ? (
            <p style={{ color: '#888', fontSize: '0.9rem' }}>No notifications.</p>
          ) : (
            [...notifications].reverse().map(n => (
              <div key={n.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                padding: '10px 12px', marginBottom: '8px', borderRadius: '6px',
                background: n.read ? '#2a2a2a' : '#1a3a2a',
                border: `1px solid ${n.read ? '#333' : '#2a5a3a'}`
              }}>
                <p style={{ margin: 0, color: '#fff', fontSize: '0.88rem', flex: 1, marginRight: '8px' }}>
                  {n.message}
                </p>
                <button
                  onClick={() => deleteSingleNotification(n.id)}
                  style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '0.85rem', flexShrink: 0, padding: '0 4px' }}
                  title="Dismiss"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      )}

      <div className="main">

        {/* Create Task Form */}
        <div className="user-card">
          <h2>Create a New Task 📋</h2>
          <hr></hr><br></br>
          <div className="field">
            <label>Title</label>
            <input
              value={newTask.title}
              onChange={e => setNewTask({ ...newTask, title: e.target.value })}
              placeholder="Enter your task title"
            />
          </div>
          <div className="field">
            <label>Description</label>
            <input
              value={newTask.description}
              onChange={e => setNewTask({ ...newTask, description: e.target.value })}
              placeholder="Enter a task description"
            />
          </div>
          <div className="field">
            <label>Due Date</label>
            <input
              type="date"
              value={newTask.dueDate}
              onChange={e => setNewTask({ ...newTask, dueDate: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Priority</label>
            <select
              value={newTask.priority}
              onChange={e => setNewTask({ ...newTask, priority: e.target.value })}
            >
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </div>
          {taskError && <div className="error-msg">{taskError}</div>}
          {taskMessage && <div className="success-msg">{taskMessage}</div>}
          <button className="btn-primary" onClick={createTask} disabled={loading}>
            {loading ? 'Adding Task...' : 'Add Task'}
          </button>
        </div>

        {/* My Tasks */}
        <br></br><br></br>
        <div className="user-card" style={{border: '5pt solid #333'}}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>My Tasks 🗓️</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '12px', color: '#aaa', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sort</label>
              <select
                value={sort || ''}
                onChange={e => setSort(e.target.value || null)}
                style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #333', background: '#111', color: '#fff', fontSize: '13px', cursor: 'pointer' }}
              >
                <option value=''> Default (/getAllTasks) </option>
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {saving && <span style={{ fontSize: '11px', color: '#aaa', fontStyle: 'italic' }}>Saving…</span>}
            </div>
          </div>
          <hr></hr>
          {sort === 'custom' && (
            <p style={{ fontSize: '12px', color: '#aaa', margin: '8px 0 4px', padding: '8px 12px', background: '#111', borderRadius: '6px', border: '1px solid #333' }}>
              Use ↑ ↓ arrows to reorder tasks.
            </p>
          )}
          {myTasks.length === 0 && <p style={{ color: '#888', marginTop: '1.3rem' }}>No personal tasks made, yet.<br></br> Create one above using the form!</p>}
          {sortedMyTasks.map((task, idx) => {

            // Highlight overdue incomplete tasks with a red border
            const overdue = !task.completed && new Date(task.dueDate) < new Date();
            return (
              <div key={task.id} style={{ borderBottom: '1px solid #333', borderLeft: overdue ? '5px solid red' : 'none', paddingLeft: overdue ? '10px' : '0px', paddingTop: '12px', paddingBottom: '15px', marginBottom: '12px' }}>
                {editingId === task.id ? (
                  <div>
                    <div className="field">
                      <label>Title</label>
                      <input value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} />
                    </div>
                    <div className="field">
                      <label>Description</label>
                      <input value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
                    </div>
                    <div className="field">
                      <label>Due Date</label>
                      <input type="date" value={editForm.dueDate} onChange={e => setEditForm({ ...editForm, dueDate: e.target.value })} />
                    </div>
                    <div className="field">
                      <label>Priority</label>
                      <select value={editForm.priority} onChange={e => setEditForm({ ...editForm, priority: e.target.value })}>
                        <option>Low</option>
                        <option>Medium</option>
                        <option>High</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn-primary" onClick={() => saveEdit(task.id)} disabled={loading}>
                        {loading ? 'Saving...' : 'Save'}
                      </button>
                      <button className="btn-ghost" onClick={cancelEdit} disabled={loading}>Cancel</button>
                    </div>
                  </div>
                ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <strong style={{ textDecoration: task.completed ? 'line-through' : 'none' }}>
                    {task.title}
                  </strong>
                  <p style={{ margin: '4px 0', fontSize: '0.9rem', color: '#aaa' }}>{task.description}</p>
                  <p style={{ margin: '2px 0', fontSize: '0.8rem', color: '#888' }}>
                    Due: {task.dueDate} | Priority: {task.priority} | {task.completed ? '✅ Complete' : '⏳ Incomplete'}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0, marginLeft: '12px', alignItems: 'center' }}>
                  {sort === 'custom' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <button onClick={() => moveTask(task.id, -1)} disabled={idx === 0}
                        style={{ width: '24px', height: '20px', fontSize: '11px', background: 'transparent', color: '#aaa', cursor: 'pointer', opacity: idx === 0 ? 0.25 : 1 }}>↑</button>
                      <button onClick={() => moveTask(task.id, 1)} disabled={idx === sortedMyTasks.length - 1}
                        style={{ width: '24px', height: '20px', fontSize: '11px', background: 'transparent', color: '#aaa', cursor: 'pointer', opacity: idx === sortedMyTasks.length - 1 ? 0.25 : 1 }}>↓</button>
                    </div>
                  )}
                  <button className="btn-ghost" onClick={() => startEdit(task)} disabled={loading}>Edit</button>
                  <button className="btn-ghost" onClick={() => toggleComplete(task.id)} disabled={loading}>
                    {loading ? 'Updating...' : task.completed ? 'Undo' : 'Complete'}
                  </button>
                  <button className="btn-ghost" onClick={() => deleteTask(task.id)} disabled={loading}>
                    {loading ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
                )}
              <div style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  placeholder="Share with username..."
                  value={shareInputs[task.id] || ''}
                  onChange={e => setShareInputs(prev => ({ ...prev, [task.id]: e.target.value }))}
                  style={{ flex: 1, padding: '4px 8px', borderRadius: '4px', border: '1px solid #555', background: '#111', color: '#fff' }}
                />
                <button className="btn-ghost" onClick={() => shareTask(task.id)} disabled={loading}>
                  {loading ? 'Sharing...' : 'Share'}
                </button>
              </div>
              {shareMessages[task.id] && (
                <p style={{ fontSize: '0.8rem', color: shareMessages[task.id] === 'Task shared!' ? 'lightgreen' : 'salmon', margin: '4px 0' }}>
                  {shareMessages[task.id]}
                </p>
              )}
            </div>
          );
        })}
        </div>

        {/* Tasks I Shared */}
        {sharedByMe.length > 0 && (
          <div className="user-card">
            <h2>Tasks I Shared 📤</h2>
            {sharedByMe.map(task => (
              <div key={task.id} style={{ borderBottom: '1px solid #333', paddingBottom: '12px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <strong style={{ textDecoration: task.completed ? 'line-through' : 'none' }}>
                      {task.title}
                    </strong>
                    <p style={{ margin: '4px 0', fontSize: '0.9rem', color: '#aaa' }}>{task.description}</p>
                    <p style={{ margin: '2px 0', fontSize: '0.8rem', color: '#888' }}>
                      Due: {task.dueDate} | Priority: {task.priority} | {task.completed ? '✅ Complete' : '⏳ Incomplete'}
                    </p>
                    <p style={{ margin: '2px 0', fontSize: '0.8rem', color: '#f90' }}>
                      Shared with: {task.sharedWith.join(', ')}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0, marginLeft: '12px' }}>
                    <button className="btn-ghost" onClick={() => toggleComplete(task.id)} disabled={loading}>
                      {loading ? 'Updating...' : task.completed ? 'Undo' : 'Complete'}
                    </button>
                    <button className="btn-ghost" onClick={() => deleteTask(task.id)} disabled={loading}>
                      {loading ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tasks Shared With Me */}
        {sharedWithMe.length > 0 && (
          <div className="user-card">
            <h2>Tasks Shared With Me 📨</h2>
            {sharedWithMe.map(task => (
              <div key={task.id} style={{ borderBottom: '1px solid #333', paddingBottom: '12px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <strong style={{ textDecoration: task.completed ? 'line-through' : 'none' }}>
                      {task.title}
                    </strong>
                    <p style={{ margin: '4px 0', fontSize: '0.9rem', color: '#aaa' }}>{task.description}</p>
                    <p style={{ margin: '2px 0', fontSize: '0.8rem', color: '#888' }}>
                      Due: {task.dueDate} | Priority: {task.priority} | {task.completed ? '✅ Complete' : '⏳ Incomplete'}
                    </p>
                    <p style={{ margin: '2px 0', fontSize: '0.8rem', color: '#6af' }}>
                      Shared by: {task.userName}
                    </p>
                  </div>
                  <button className="btn-ghost" style={{ flexShrink: 0, marginLeft: '12px' }} onClick={() => toggleComplete(task.id)} disabled={loading}>
                    {loading ? 'Updating...' : task.completed ? 'Undo' : 'Mark Complete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
