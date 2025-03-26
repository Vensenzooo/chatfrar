import React, { useState, useEffect } from 'react';
import { Group, GroupMember, User } from '../types'; // Removed UserWithGroupMetadata
import { Avatar } from '../components/Avatar';
import { supabase } from '../services/api';

// Type pour représenter un membre qui pourrait être encapsulé
type MemberWithUser = { user: User };

// Fonction utilitaire pour vérifier si un objet contient un utilisateur
function hasUser(obj: any): obj is MemberWithUser {
  return obj && typeof obj === 'object' && 'user' in obj && obj.user && typeof obj.user === 'object';
}

interface GroupProfileProps {
  group: Group & { members: GroupMember[] };
  onlineUsers: Set<string>;
  onClose: () => void;
}

const GroupProfile: React.FC<GroupProfileProps> = ({ group, onlineUsers, onClose }) => {
  const [lastInteractions, setLastInteractions] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchLastInteractions = async () => {
      if (!group.id) {
        console.warn('Group id is undefined:', group);
        return;
      }

      const interactions: Record<string, string> = {};

      for (const member of group.members) {
        // Vérifiez si le membre est encapsulé dans un objet `user`
        const actualMember = hasUser(member) ? member.user : member;

        if (!actualMember || !actualMember.id) {
          console.warn('Member id is undefined or invalid for member:', member);
          continue;
        }

        const lastMessage = await getLastInteraction(actualMember.id, group.id);
        interactions[actualMember.id] = lastMessage;
      }

      console.log('Fetched last interactions:', interactions);
      setLastInteractions(interactions);
    };

    fetchLastInteractions();

    // Subscribe to real-time updates
    const messageSubscription = supabase
      .channel('public:messages')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        (payload: any) => {
          if (payload.new && payload.new.group_id === group.id) {
            fetchLastInteractions();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageSubscription);
    };
  }, [group]);

  // Function to get last interaction
  const getLastInteraction = async (userId: string, groupId: string): Promise<string> => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('created_at')
        .eq('group_id', groupId)
        .eq('sender_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching last interaction for userId:', userId, 'groupId:', groupId, error);
        return 'Jamais';
      }

      if (data) {
        const lastInteractionDate = new Date(data.created_at);
        const now = new Date();
        const diff = now.getTime() - lastInteractionDate.getTime();
        const days = Math.floor(diff / (1000 * 3600 * 24));

        if (days === 0) {
          return 'Aujourd\'hui';
        } else if (days === 1) {
          return 'Hier';
        } else {
          return `Il y a ${days} jours`;
        }
      } else {
        console.warn('No interaction found for userId:', userId, 'groupId:', groupId);
        return 'Jamais';
      }
    } catch (error) {
      console.error('Error in getLastInteraction:', error);
      return 'Jamais';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-white/90 p-6 rounded-2xl w-[480px] max-h-[80vh] overflow-y-auto shadow-xl border border-violet-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">{group.name} - Profil du Groupe</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>

        <div>
          <h3 className="font-semibold mb-3">Membres du Groupe</h3>
          {group.members.map((member, index) => {
            // Vérifiez si le membre est encapsulé dans un objet `user`
            const actualMember = hasUser(member) ? member.user : member;
            // Cast explicite pour ajouter les propriétés de group metadata
            const memberWithMeta = actualMember as GroupMember; // Updated type casting

            if (!actualMember || !actualMember.id) {
              console.warn('Member id is undefined or invalid for member:', member);
              return null; // Ignore invalid members
            }

            return (
              <div key={actualMember.id || `member-${index}`} className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Avatar user={actualMember} size="sm" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{actualMember.username}</span>
                      <span className={`w-2 h-2 rounded-full ${
                        onlineUsers.has(actualMember.id) ? 'bg-green-500' : 'bg-gray-300'
                      }`} />
                      {memberWithMeta.is_admin && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                          Admin
                        </span>
                      )}
                    </div>
                    {memberWithMeta.joined_at && (
                      <div className="text-sm text-gray-500">
                        Rejoint le: {new Date(memberWithMeta.joined_at).toLocaleDateString()}
                      </div>
                    )}
                    <div className="text-sm text-gray-500">
                      Dernière interaction: {lastInteractions[actualMember.id] || 'Chargement...'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default GroupProfile;
