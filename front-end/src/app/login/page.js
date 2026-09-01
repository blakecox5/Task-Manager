'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit() {
    const url = mode === 'login' ? '/api/login' : '/api/register';
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userName, password }),
      credentials: 'include',
    });

    const json = await res.json();

    if (!json.status) {
      setError(json.error);
      return;
    }

    setError('');
    if (mode === 'login') {
      router.replace('/dashboard');
    } else {
      setMode('login');
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">To-Do List App</div>
        <div className="auth-subtitle">Create, manage, organize, and share your tasks efficiently.</div>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => { setMode('login'); setError(''); }}
          >
            Login
          </button>
          <button
            className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => { setMode('register'); setError(''); }}
          >
            Register
          </button>
        </div>

        <div className="field">
          <label>Username</label>
          <input
            value={userName}
            onChange={e => setUserName(e.target.value)}
            placeholder="username"
          />
        </div>

        <div className="field">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="password"
          />
        </div>

        {error && <div className="error-msg">{error}</div>}

        <button
          className="btn-primary"
          onClick={handleSubmit}
          disabled={!userName || !password}
        >
          {mode === 'login' ? 'Login' : 'Create Account'}
        </button>
      </div>
    </div>
  );
}
