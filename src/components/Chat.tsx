import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, X, Minimize2, Maximize2, Send, 
  Search, User as UserIcon, Bell, Check, CheckCheck,
  ChevronDown, MoreVertical, Paperclip, Smile, File as FileIcon, 
  Loader2, Download, Image as ImageIcon, Mail, MapPin, Phone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, ChatMessage, ChatNotification, Contract } from '../types';
import { cn } from '../lib/utils';
import { createSupabaseClient, getSupabaseConfig } from '../lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';

import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

interface ChatProps {
  currentUser: User;
  users: User[];
  contracts: Contract[];
}

export function Chat({ currentUser, users, contracts }: ChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeChat, setActiveChat] = useState<User | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadBySender, setUnreadBySender] = useState<Record<string, number>>({});
  const [showToast, setShowToast] = useState<ChatMessage | null>(null);
  const [notifications, setNotifications] = useState<ChatNotification[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Record<string, boolean>>({});
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ url: string; name: string; type: string } | null>(null);
  
  const [userToView, setUserToView] = useState<User | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const config = getSupabaseConfig();
  const supabase = config.enabled ? createSupabaseClient(config.url, config.key) : null;

  const activeChatRef = useRef<User | null>(null);
  const isOpenRef = useRef<boolean>(false);
  const isMinimizedRef = useRef<boolean>(false);
  
  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);
  useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);
  useEffect(() => { isMinimizedRef.current = isMinimized; }, [isMinimized]);

  useEffect(() => {
    if (config.enabled && currentUser) {
      // Periodic sync for unread counts (every 30s) as a safety net if Realtime drops
      const interval = setInterval(() => {
        fetchUnread();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [currentUser?.id, config.enabled]);

  // Load unread count function (moved out to be reusable)
  const fetchUnread = async () => {
    if (!supabase || !currentUser) return;
    const { data, count, error } = await supabase
      .from('chat_messages')
      .select('sender_id', { count: 'exact' })
      .eq('receiver_id', currentUser.id)
      .eq('is_read', false);
    
    if (error) {
      console.error('Chat: Error fetching unread count:', error);
      return;
    }

    if (count !== null) setUnreadCount(count);
    
    if (data) {
      const counts: Record<string, number> = {};
      data.forEach(m => {
        counts[m.sender_id] = (counts[m.sender_id] || 0) + 1;
      });
      setUnreadBySender(counts);
    }
  };

  // Filter users from same company
  const companyUsers = users.filter(u => u.companyId === currentUser?.companyId && u.id !== currentUser?.id);

  useEffect(() => {
    if (config.enabled) {
      console.log('Chat: Setting up optimized channel for user:', currentUser.id);
      
      fetchUnread();
      
      // Load notification history
      const fetchNotifications = async () => {
        const { data, error } = await supabase
          .from('chat_notifications')
          .select('*')
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false })
          .limit(20);
        
        if (error) {
          console.error('Chat: Error fetching notifications:', error);
          return;
        }
        if (data) setNotifications(data as ChatNotification[]);
      };
      
      fetchNotifications();

      // Optimize: Listen to all changes and filter in JS for better reliability (sometimes postgres filters are flaky in v2)
      const channel = supabase
        .channel(`chat_global_${currentUser.id}`)
        .on(
          'postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'chat_messages'
          }, 
          (payload) => {
            const msg = payload.new as ChatMessage;
            
            // Only handle if message is for me
            if (msg.receiver_id !== currentUser.id) {
              // Check if it's my own message (sync across tabs)
              if (msg.sender_id === currentUser.id) {
                const currentActiveChat = activeChatRef.current;
                const isInThisChat = currentActiveChat && msg.receiver_id === currentActiveChat.id;
                
                if (isInThisChat) {
                  setMessages(prev => {
                    if (prev.find(m => m.id === msg.id)) return prev;
                    return [...prev, msg];
                  });
                }
              }
              return;
            }

            console.log('Chat: Incoming message for me detected:', msg.id);
            
            const currentActiveChat = activeChatRef.current;
            const currentIsOpen = isOpenRef.current;
            const currentIsMinimized = isMinimizedRef.current;
            
            // Fallback for iframe focus issues: we don't strictly require hasFocus if the chat isn't visible or looking at the sender
            const isInThisChat = currentActiveChat && msg.sender_id === currentActiveChat.id;
            const isChatVisible = currentIsOpen && !currentIsMinimized;
            const isFocused = document.hasFocus();

            if (isInThisChat && isChatVisible) {
              // User is actively in this chat
              markAsRead(msg.sender_id);
            } else {
              // Message from someone else OR chat not visible/focused
              setUnreadCount(prev => prev + 1);
              setUnreadBySender(prev => {
                const newCount = (prev[msg.sender_id] || 0) + 1;
                console.log(`Chat: Updating unread for ${msg.sender_id} to ${newCount}`);
                return {
                  ...prev,
                  [msg.sender_id]: newCount
                };
              });
              
              // Show notification if:
              // 1. Not in this chat
              // 2. Chat is hidden/minimized
              showNotification(msg);
            }

            if (isInThisChat) {
              setMessages(prev => {
                if (prev.find(m => m.id === msg.id)) return prev;
                return [...prev, msg];
              });
            }
          }
        )
        // READ STATUS UPDATES
        .on(
          'postgres_changes', 
          { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'chat_messages'
          }, 
          (payload) => {
            const msg = payload.new as ChatMessage;
            if (msg.receiver_id === currentUser.id && msg.is_read) {
              // If marked as read elsewhere, sync our local unread counts
              fetchUnread();
            }
            if (msg.sender_id === currentUser.id || msg.receiver_id === currentUser.id) {
              setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, ...msg } : m));
            }
          }
        )
        .subscribe((status) => {
          console.log(`Chat: Realtime subscription status [V2-Robust]:`, status);
        });

      // Presence Management
      const presenceChannel = supabase.channel('online-users');
      
      presenceChannel
        .on('presence', { event: 'sync' }, () => {
          const newState = presenceChannel.presenceState();
          const onlineMap: Record<string, boolean> = {};
          Object.keys(newState).forEach(key => {
            const presence = newState[key] as any;
            if (presence && presence.length > 0) {
              const userId = presence[0].user_id;
              if (userId) onlineMap[userId] = true;
            }
          });
          setOnlineUsers(onlineMap);
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          console.log('Joined:', key, newPresences);
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          console.log('Left:', key, leftPresences);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await presenceChannel.track({
              user_id: currentUser.id,
              online_at: new Date().toISOString(),
            });
          }
        });

      return () => {
        console.log('Chat: Cleaning up channel');
        supabase.removeChannel(channel);
        supabase.removeChannel(presenceChannel);
      };
    } else {
      // Local fallback for offline/preview without Supabase
      const fetchUnreadLocal = () => {
        const msgs: ChatMessage[] = JSON.parse(localStorage.getItem('chat_messages') || '[]');
        const count = msgs.filter(m => m.receiver_id === currentUser.id && !m.is_read).length;
        setUnreadCount(count);
      };
      
      fetchUnreadLocal();
      
      const handleStorage = (e: StorageEvent) => {
        if (e.key === 'chat_messages') {
          fetchUnreadLocal();
          window.dispatchEvent(new Event('chat_messages_updated'));
        }
      };

      const handleLocalEvent = () => fetchUnreadLocal();

      window.addEventListener('storage', handleStorage);
      window.addEventListener('chat_messages_updated', handleLocalEvent);
      
      return () => {
        window.removeEventListener('storage', handleStorage);
        window.removeEventListener('chat_messages_updated', handleLocalEvent);
      };
    }
  }, [supabase, currentUser?.id]);

  useEffect(() => {
    if (activeChat && isOpen) {
      loadMessages(activeChat.id);
      markAsRead(activeChat.id);
      
      // Polling fallback to guarantee 100% Supabase Sync even if Realtime events are dropped
      const interval = setInterval(() => {
        loadMessages(activeChat.id);
        if (supabase) {
           const fetchUnread = async () => {
             const { count } = await supabase
               .from('chat_messages')
               .select('sender_id', { count: 'exact' })
               .eq('receiver_id', currentUser.id)
               .eq('is_read', false);
             if (count !== null) setUnreadCount(count);
           };
           fetchUnread();
        }
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [activeChat, isOpen, supabase]);

  // Handle window focus to mark as read when returning to tab
  useEffect(() => {
    const handleFocus = () => {
      if (activeChatRef.current && isOpenRef.current && !isMinimizedRef.current) {
        markAsRead(activeChatRef.current.id);
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [supabase]);

  // Make loadMessages and markAsRead responsive to local updates
  useEffect(() => {
    if (!supabase && activeChat) {
       const handler = () => {
         loadMessages(activeChat.id);
         markAsRead(activeChat.id);
       };
       window.addEventListener('chat_messages_updated', handler);
       return () => window.removeEventListener('chat_messages_updated', handler);
    }
  }, [supabase, activeChat]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadMessages = async (otherUserId: string) => {
    if (supabase) {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Chat: Error loading messages from Supabase:', error);
        return;
      }

      if (data) setMessages(data as ChatMessage[]);
    } else {
      const msgs: ChatMessage[] = JSON.parse(localStorage.getItem('chat_messages') || '[]');
      const filtered = msgs.filter(m => 
        (m.sender_id === currentUser.id && m.receiver_id === otherUserId) ||
        (m.sender_id === otherUserId && m.receiver_id === currentUser.id)
      ).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      
      setMessages(filtered);
    }
  };

  const markAsRead = async (senderId: string) => {
    if (supabase) {
      // Optimistically update local counts
      const senderUnreadCount = unreadBySender[senderId] || 0;
      if (senderUnreadCount > 0) {
        setUnreadBySender(prev => {
          const newState = { ...prev };
          delete newState[senderId];
          return newState;
        });
        setUnreadCount(prev => Math.max(0, prev - senderUnreadCount));
      }

      const { error } = await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('sender_id', senderId)
        .eq('receiver_id', currentUser.id)
        .eq('is_read', false);
      
      if (error) {
        console.error('Chat: Error marking as read:', error);
      }
      
      // Refresh global exact count from DB
      const { count } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', currentUser.id)
        .eq('is_read', false);
      if (count !== null) setUnreadCount(count);
    } else {
      const msgs: ChatMessage[] = JSON.parse(localStorage.getItem('chat_messages') || '[]');
      let changed = false;
      const updated = msgs.map(m => {
        if (m.sender_id === senderId && m.receiver_id === currentUser.id && !m.is_read) {
          changed = true;
          return { ...m, is_read: true };
        }
        return m;
      });
      if (changed) {
        localStorage.setItem('chat_messages', JSON.stringify(updated));
        window.dispatchEvent(new Event('chat_messages_updated'));
      }
      const count = updated.filter(m => m.receiver_id === currentUser.id && !m.is_read).length;
      setUnreadCount(count);
    }
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !supabase) return;

    // Check size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      alert('Arquivo muito grande. Máximo 50MB.');
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `chat/${currentUser.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(filePath, { download: file.name });

      setPendingFile({
        url: publicUrl,
        name: file.name,
        type: file.type
      });
    } catch (error) {
      console.error('Chat: Error uploading file:', error);
      alert('Erro ao enviar arquivo. Verifique se o bucket "chat-attachments" existe no Supabase.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const sendMessage = async () => {
    if ((!newMessage.trim() && !pendingFile) || !activeChat) return;

    const msgId = uuidv4();
    const msg: ChatMessage = {
      id: msgId,
      sender_id: currentUser.id,
      receiver_id: activeChat.id,
      company_id: currentUser.companyId || '',
      content: newMessage.trim() || (pendingFile?.name || 'Arquivo'),
      created_at: new Date().toISOString(),
      is_read: false,
      sender_name: currentUser.name,
      attachment_url: pendingFile?.url,
      attachment_name: pendingFile?.name
    };

    // --- OPTIMISTIC UI ---
    // Update local state immediately
    setMessages(prev => [...prev, msg]);
    setNewMessage('');
    setPendingFile(null);
    setShowEmojiPicker(false);

    if (supabase) {
      console.log('Chat: Sending optimistic message to Supabase...', msgId);
      const { error } = await supabase.from('chat_messages').insert([msg]);
      if (error) {
        console.error('Chat: Error sending message to Supabase:', error);
        // On error, the realtime listener won't find it, but it's already in the UI.
        // We could flag it as "failed" but for now we keep it simple.
      }
    } else {
      const msgs: ChatMessage[] = JSON.parse(localStorage.getItem('chat_messages') || '[]');
      msgs.push(msg);
      localStorage.setItem('chat_messages', JSON.stringify(msgs));
      window.dispatchEvent(new Event('chat_messages_updated'));
    }
  };

  const showNotification = (msg: ChatMessage) => {
    // 1. In-app Toast
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 5000);

    // 2. Browser Notifications API
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        const notif = new Notification(`Mensagem de ${msg.sender_name || 'Alguém'}`, {
          body: msg.content,
          icon: '/favicon.ico',
          tag: msg.sender_id // Group multiple messages from same sender
        });
        notif.onclick = () => {
          window.focus();
          const sender = users.find(u => u.id === msg.sender_id);
          if (sender) setActiveChat(sender);
          setIsOpen(true);
          setIsMinimized(false);
        };
      }
    }

    // 3. Persist to History (if supabase enabled)
    const newNotif: ChatNotification = {
      id: uuidv4(),
      user_id: currentUser.id,
      company_id: currentUser.companyId || '',
      title: `Mensagem de ${msg.sender_name || 'Colega'}`,
      message: msg.content,
      type: 'chat',
      created_at: new Date().toISOString(),
      read: false
    };
    
    if (supabase) {
      supabase.from('chat_notifications').insert([newNotif]).then(({ error }) => {
        if (error) console.error('Chat: Error persisting notification:', error);
      });
    }
    
    setNotifications(prev => [newNotif, ...prev]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  useEffect(() => {
    // Attempt to request notification permission on mount
    if ('Notification' in window && Notification.permission === 'default') {
      setTimeout(() => {
        Notification.requestPermission();
      }, 5000);
    }
  }, []);

  if (!currentUser) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4 pointer-events-none">
      {/* Visual Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.9 }}
            onClick={() => {
              const sender = users.find(u => u.id === showToast.sender_id);
              if (sender) setActiveChat(sender);
              setIsOpen(true);
              setIsMinimized(false);
              setShowToast(null);
            }}
            className="bg-white border border-blue-100 shadow-2xl rounded-2xl p-4 w-72 pointer-events-auto cursor-pointer hover:bg-blue-50 transition-colors flex gap-3 items-start mb-2"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-gray-900 truncate">{showToast.sender_name || 'Colega'}</p>
              <p className="text-xs text-gray-600 line-clamp-2 mt-0.5">{showToast.content}</p>
              <p className="text-[10px] text-gray-400 mt-1 uppercase font-medium">Clique para responder</p>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); setShowToast(null); }}
              className="p-1 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95, width: '400px' }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              height: isMinimized ? '48px' : (activeChat ? '700px' : '600px'),
              width: activeChat ? '500px' : '400px'
            }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={cn(
              "bg-white rounded-3xl shadow-2xl border border-border overflow-hidden flex flex-col pointer-events-auto",
              "transition-all duration-300"
            )}
          >
            {/* Header */}
            <div className="bg-blue-600 p-4 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => setActiveChat(null)}>
                  {activeChat ? (
                    <button 
                      onClick={(e) => { e.stopPropagation(); setActiveChat(null); }}
                      className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <ChevronDown className="w-5 h-5 rotate-90" />
                    </button>
                  ) : (
                    <MessageCircle className="w-5 h-5" />
                  )}
                  <div 
                    className="flex flex-col min-w-0"
                    onClick={(e) => {
                      if (activeChat) {
                        e.stopPropagation();
                        setUserToView(activeChat);
                      }
                    }}
                  >
                    <span className="font-bold text-sm tracking-tight uppercase truncate">
                      {activeChat ? activeChat.name : 'Mensagens'}
                    </span>
                    {activeChat && (
                      <span className="text-[9px] text-blue-100 font-medium truncate">
                        {onlineUsers[activeChat.id] ? "ONLINE AGORA" : "OFFLINE"}
                      </span>
                    )}
                  </div>
                </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
                >
                  {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                </button>
                <button 
                  onClick={() => {
                    setIsOpen(false);
                    setActiveChat(null);
                  }}
                  className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* User Profile Modal */}
            <Dialog open={!!userToView} onOpenChange={(open) => !open && setUserToView(null)}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Perfil de Usuário</DialogTitle>
                  <DialogDescription>Dados de contato do profissional</DialogDescription>
                </DialogHeader>
                {userToView && (
                  <div className="space-y-6 pt-4">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow-md flex items-center justify-center">
                        {userToView.profilePhoto ? (
                          <img src={userToView.profilePhoto} alt={userToView.name} className="w-full h-full object-cover" />
                        ) : (
                          <UserIcon className="w-12 h-12 text-gray-300" />
                        )}
                      </div>
                      <div className="text-center">
                        <h3 className="text-lg font-bold text-gray-900">{userToView.name}</h3>
                        <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">{userToView.jobFunction || userToView.role}</p>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                          <Mail className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase font-bold">E-mail</p>
                          <p className="text-sm text-gray-700">{userToView.email || 'Não informado'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
                          <Phone className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase font-bold">Telefone</p>
                          <p className="text-sm text-gray-700">{userToView.phone || 'Não informado'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-600">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase font-bold">Localização</p>
                          <p className="text-sm text-gray-700">{userToView.address || 'Não informado'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-xl flex items-center justify-between border border-gray-100">
                      <span className="text-xs font-medium text-gray-500">Status no Chat</span>
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-2.5 h-2.5 rounded-full",
                          onlineUsers[userToView.id] ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" : "bg-gray-300"
                        )} />
                        <span className="text-xs font-bold text-gray-700">
                          {onlineUsers[userToView.id] ? "Disponível" : "Indisponível"}
                        </span>
                      </div>
                    </div>

                    <Button 
                      className="w-full bg-blue-600" 
                      onClick={() => {
                        setActiveChat(userToView);
                        setUserToView(null);
                      }}
                    >
                      Enviar Mensagem
                    </Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {!isMinimized && (
              <div className="flex-1 flex overflow-hidden">
                {/* User List / Search */}
                {!activeChat ? (
                  <div className="flex-1 flex flex-col">
                    <div className="p-4 border-b border-gray-50 bg-gray-50/30">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input 
                          type="text"
                          placeholder="Buscar colegas..."
                          className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2">
                      {(() => {
                        const filtered = companyUsers.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()));
                        
                        // Grouping logic
                        const groups: Record<string, { label: string, users: User[] }> = {
                          'management': { label: 'Administração / Escritório', users: [] },
                          'no_obra': { label: 'Sem Obra Definida', users: [] }
                        };

                        contracts.forEach(c => {
                          groups[c.id] = { label: c.workName || c.contractNumber || 'Sem nome', users: [] };
                        });

                        filtered.forEach(u => {
                          if (u.role === 'master' || u.role === 'admin') {
                            groups['management'].users.push(u);
                          } else if (u.allowedContractIds && u.allowedContractIds.length > 0) {
                            u.allowedContractIds.forEach(cid => {
                              if (groups[cid]) {
                                if (!groups[cid].users.find(existing => existing.id === u.id)) {
                                  groups[cid].users.push(u);
                                }
                              }
                            });
                          } else {
                            groups['no_obra'].users.push(u);
                          }
                        });

                        const sortedGroupIds = Object.keys(groups).sort((a, b) => {
                          if (a === 'management') return -1;
                          if (b === 'management') return 1;
                          if (a === 'no_obra') return 1;
                          if (b === 'no_obra') return -1;
                          return groups[a].label.localeCompare(groups[b].label);
                        });

                        return sortedGroupIds.map(gid => {
                          const group = groups[gid];
                          if (group.users.length === 0) return null;

                          return (
                            <div key={gid} className="mb-4">
                              <div className="px-3 mb-1 flex items-center gap-2">
                                <div className="h-[1px] flex-1 bg-gray-100" />
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
                                  {group.label}
                                </span>
                                <div className="h-[1px] flex-1 bg-gray-100" />
                              </div>
                              {group.users.map(user => (
                                <div
                                  key={user.id}
                                  onClick={() => setActiveChat(user)}
                                  className="w-full flex items-center gap-3 p-3 hover:bg-blue-50 rounded-2xl transition-all group text-left cursor-pointer"
                                >
                                  <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center shrink-0 text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors overflow-hidden">
                                    {user.profilePhoto ? (
                                      <img src={user.profilePhoto} alt={user.name} className="w-full h-full object-cover" />
                                    ) : (
                                      <UserIcon className="w-6 h-6" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <p className="font-bold text-sm text-gray-900 truncate">{user.name}</p>
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setUserToView(user);
                                        }}
                                        className="p-1 text-gray-300 hover:text-blue-600 transition-colors"
                                        title="Ver Perfil"
                                      >
                                        <UserIcon className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                    <p className="text-xs text-gray-500 truncate uppercase tracking-widest">{user.jobFunction || user.role}</p>
                                  </div>
                                  <div className="flex flex-col items-end gap-1">
                                    {unreadBySender[user.id] > 0 && (
                                      <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                        {unreadBySender[user.id]}
                                      </span>
                                    )}
                                    <div className={cn(
                                      "w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm",
                                      onlineUsers[user.id] ? "bg-green-500" : "bg-gray-300"
                                    )} title={onlineUsers[user.id] ? "Online" : "Offline"} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                ) : (
                  /* Active Chat View */
                  <div className="flex-1 flex flex-col bg-gray-50">
                    <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                      {messages.map((msg, idx) => {
                        const isMe = msg.sender_id === currentUser.id;
                        return (
                          <div 
                            key={`${msg.id || idx}-${idx}`}
                            className={cn(
                              "flex flex-col max-w-[85%]",
                              isMe ? "ml-auto items-end" : "mr-auto items-start"
                            )}
                          >
                            <div className={cn(
                              "p-3 rounded-2xl text-sm shadow-sm break-words whitespace-pre-wrap",
                              isMe ? "bg-blue-600 text-white rounded-tr-none font-medium" : "bg-white text-gray-800 border border-gray-100 rounded-tl-none"
                            )}>
                              {msg.attachment_url && (
                                <div className="mb-2 overflow-hidden rounded-lg group/attach transition-all">
                                  {msg.attachment_name?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                    <div className="relative group">
                                      <img 
                                        src={msg.attachment_url} 
                                        alt={msg.attachment_name} 
                                        className="max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity rounded-lg"
                                        onClick={() => window.open(msg.attachment_url, '_blank')}
                                      />
                                      <a 
                                        href={msg.attachment_url}
                                        download={msg.attachment_name}
                                        className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                                        title="Baixar imagem"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <Download className="w-4 h-4" />
                                      </a>
                                    </div>
                                  ) : (
                                    <a 
                                      href={msg.attachment_url} 
                                      download={msg.attachment_name || 'anexo'}
                                      className={cn(
                                        "flex items-center gap-2 p-3 rounded-xl border transition-all",
                                        isMe 
                                          ? "bg-white/10 border-white/20 text-white hover:bg-white/20" 
                                          : "bg-gray-50 border-gray-100 text-gray-700 hover:bg-gray-100"
                                      )}
                                    >
                                      <div className={cn(
                                        "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                                        isMe ? "bg-white/20" : "bg-white shadow-sm"
                                      )}>
                                        <FileIcon className="w-5 h-5" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold truncate">{msg.attachment_name || 'Arquivo'}</p>
                                        <p className="text-[10px] opacity-60 uppercase font-bold">Clique para baixar</p>
                                      </div>
                                      <Download className="w-4 h-4 opacity-40 group-hover/attach:opacity-100" />
                                    </a>
                                  )}
                                </div>
                              )}
                              {msg.content}
                            </div>
                            <div className="flex items-center gap-1 mt-1 px-1">
                              <span className="text-[10px] text-gray-400">
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {isMe && (
                                msg.is_read ? <CheckCheck className="w-3 h-3 text-blue-500" /> : <Check className="w-3 h-3 text-gray-400" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-white border-t border-gray-100 relative">
                      <AnimatePresence>
                        {showEmojiPicker && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.9 }}
                            className="absolute bottom-full right-4 mb-2 z-50 shadow-2xl rounded-2xl overflow-hidden"
                          >
                            <EmojiPicker onEmojiClick={onEmojiClick} width={300} height={400} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                      
                      {pendingFile && (
                        <div className="mb-3 p-3 bg-blue-50 rounded-2xl flex items-center gap-3 border border-blue-100">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600">
                            {pendingFile.type.startsWith('image/') ? <ImageIcon className="w-5 h-5" /> : <FileIcon className="w-5 h-5" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-blue-900 truncate">{pendingFile.name}</p>
                            <p className="text-[10px] text-blue-500 uppercase font-bold">Arquivo pronto para enviar</p>
                          </div>
                          <button 
                            onClick={() => setPendingFile(null)}
                            className="p-1.5 hover:bg-white rounded-lg text-blue-400 hover:text-red-500 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      <div className="flex items-end gap-2 bg-gray-50 p-2 rounded-2xl focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                        <input 
                          type="file" 
                          ref={fileInputRef}
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className="p-2 text-gray-400 hover:text-blue-600 transition-colors disabled:opacity-50"
                        >
                          {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
                        </button>
                        <textarea
                          placeholder="Digite sua mensagem..."
                          className="flex-1 bg-transparent border-none focus:ring-0 text-sm resize-none py-2 max-h-32 text-gray-900"
                          rows={1}
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={handleKeyDown}
                        />
                        <button 
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          className={cn(
                            "p-2 transition-colors",
                            showEmojiPicker ? "text-blue-600" : "text-gray-400 hover:text-blue-600"
                          )}
                        >
                          <Smile className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={sendMessage}
                          disabled={(!newMessage.trim() && !pendingFile) || isUploading}
                          className={cn(
                            "p-2.5 rounded-xl transition-all",
                            (newMessage.trim() || pendingFile) ? "bg-blue-600 text-white shadow-xl shadow-blue-500/20" : "text-gray-300"
                          )}
                        >
                          <Send className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          if (isOpen) setActiveChat(null);
          setIsOpen(!isOpen);
        }}
        className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 border-4 border-white pointer-events-auto relative overflow-hidden group",
          isOpen ? "bg-red-500 rotate-90" : "bg-blue-600 hover:bg-blue-700"
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/20" />
        {isOpen ? (
          <X className="w-8 h-8 text-white relative z-10" />
        ) : (
          <div className="relative z-10 flex items-center justify-center">
            <MessageCircle className="w-8 h-8 text-white" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-[10px] font-black rounded-full border-2 border-white flex items-center justify-center animate-bounce">
                {unreadCount > 9 ? '+9' : unreadCount}
              </span>
            )}
          </div>
        )}
      </motion.button>
    </div>
  );
}
