import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../services/api';
import { Avatar } from './Avatar';

interface UserSearchProps {
  onSelectUser: (user: User) => void;
}

export function UserSearch({ onSelectUser }: UserSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const searchUsers = async () => {
      if (!searchTerm.trim()) {
        setUsers([]);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .ilike('username', `%${searchTerm}%`)
          .limit(5);

        if (error) throw error;
        setUsers(data || []);
      } catch (error) {
        console.error('Error searching users:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimeout = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounceTimeout);
  }, [searchTerm]);

  return (
    <div className="relative">
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Rechercher un utilisateur..."
        className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      
      {loading && (
        <div className="absolute right-2 top-2">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {users.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg">
          {users.map((user) => (
            <button
              key={user.id}
              onClick={() => {
                onSelectUser(user);
                setSearchTerm('');
                setUsers([]);
              }}
              className="flex items-center gap-2 w-full p-2 hover:bg-gray-50"
            >
              <Avatar user={user} size="sm" />
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