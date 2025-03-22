import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { searchUsers } from '../services/api';
import { User } from '../types';
import { useAuth } from '../hooks/useAuth';

interface UserSearchProps {
  onSelectUser: (user: User) => void;
}

export function UserSearch({ onSelectUser }: UserSearchProps) {
  const { user: currentUser } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setQuery(value);
    
    if (value.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const users = await searchUsers(value);
      // Filter out current user from results
      setResults(users.filter(user => user.id !== currentUser?.id));
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleSearch}
          placeholder="Search users..."
          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
      </div>

      {loading && (
        <div className="absolute w-full mt-1 p-2 bg-white rounded-lg shadow-lg">
          Loading...
        </div>
      )}

      {results.length > 0 && (
        <div className="absolute w-full mt-1 bg-white rounded-lg shadow-lg max-h-60 overflow-auto">
          {results.map((user) => (
            <button
              key={user.id}
              onClick={() => {
                onSelectUser(user);
                setQuery('');
                setResults([]);
              }}
              className="w-full p-2 hover:bg-gray-50 flex items-center gap-3"
            >
              <img
                src={user.avatar}
                alt={user.username}
                className="w-8 h-8 rounded-full"
              />
              <div className="text-left">
                <div className="font-medium">{user.username}</div>
                <div className="text-sm text-gray-500">{user.email}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}