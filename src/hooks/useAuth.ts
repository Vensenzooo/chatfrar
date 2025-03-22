import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, signIn, signUp } from '../services/api';
import { User } from '../types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (initialized) return;
    loadUser();
    setInitialized(true);
  }, [initialized]);

  async function loadUser() {
    setError(null);
    try {
      const user = await getCurrentUser();
      setUser(user);
      if (user) {
        if (window.location.pathname === '/login') {
          navigate('/chat');
        }
      } else {
        if (window.location.pathname !== '/login') {
          navigate('/login');
        }
      }
    } catch (error) {
      console.error('Error loading user:', error);
      setError(error instanceof Error ? error.message : 'Failed to load user');
      if (window.location.pathname !== '/login') {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    setError(null);
    await signIn(email, password);
    await loadUser();
    navigate('/chat');
  }

  async function register(email: string, password: string, username: string) {
    await signUp(email, password, username);
    await login(email, password);
  }

  return { user, loading, error, login, register };
}