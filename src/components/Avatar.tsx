import { useState } from 'react';
import { User } from '../types';
import { UserCircle } from 'lucide-react';

interface AvatarProps {
  user: User;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-12 h-12 text-base',
  lg: 'w-16 h-16 text-lg'
};

const colorPalette = [
  'bg-blue-100 text-blue-800',
  'bg-green-100 text-green-800',
  'bg-purple-100 text-purple-800',
  'bg-pink-100 text-pink-800',
  'bg-yellow-100 text-yellow-800',
  'bg-indigo-100 text-indigo-800',
  'bg-red-100 text-red-800',
  'bg-teal-100 text-teal-800'
];

export function Avatar({ user, size = 'md', className = '' }: AvatarProps) {
  if (!user) {
    return (
      <div className={`${sizeClasses[size]} rounded-full overflow-hidden flex-shrink-0 bg-gray-100 flex items-center justify-center ${className}`}>
        <UserCircle className="w-full h-full text-gray-400" />
      </div>
    );
  }

  const [imageError, setImageError] = useState(false);
  
  // Generate consistent color based on user ID
  const colorIndex = user.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colorPalette.length;
  const colorClass = colorPalette[colorIndex];
  
  // Get initials from username
  const getInitials = (username: string) => {
    if (!username) return '?';
    return username
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (user.avatar && !imageError) {
    return (
      <div className={`${sizeClasses[size]} rounded-full overflow-hidden flex-shrink-0 ${className}`}>
        <img
          src={user.avatar}
          alt={user.username || 'User avatar'}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      </div>
    );
  }

  // Fallback to initials with background color
  if (getInitials(user.username || '')) {
    return (
      <div 
        className={`${sizeClasses[size]} ${colorClass} rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center font-medium ${className}`}
        title={user.username}
      >
        {getInitials(user.username || '')}
      </div>
    );
  }

  // Final fallback to user icon
  return (
    <div className={`${sizeClasses[size]} rounded-full overflow-hidden flex-shrink-0 bg-gray-100 flex items-center justify-center ${className}`}>
      <UserCircle className="w-full h-full text-gray-400" />
    </div>
  );
}