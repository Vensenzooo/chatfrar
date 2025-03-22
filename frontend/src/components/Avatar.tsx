import React from 'react';
import { User } from '../types';

interface AvatarProps {
  user: User;
  size?: 'sm' | 'md' | 'lg';
}

export const Avatar: React.FC<AvatarProps> = ({ user, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };

  return (
    <div className={`relative ${sizeClasses[size]}`}>
      <img
        src={user.avatar}
        alt={user.username}
        className="w-full h-full rounded-full object-cover"
      />
    </div>
  );
}; 