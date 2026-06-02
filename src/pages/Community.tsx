import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  MessageSquare, 
  Users, 
  Terminal, 
  Globe, 
  Cpu, 
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../App';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  serverTimestamp,
  getDocs
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { CommunityMessage } from '../types';

export default function Community() {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [onlineDevs, setOnlineDevs] = useState<any[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      setMessages([]);
      setOnlineDevs([]);
      return;
    }

    // 1. Real-time message listener
    const qMessages = query(collection(db, 'community_messages'), orderBy('createdAt', 'asc'), limit(150));
    const unsubMessages = onSnapshot(qMessages, (snap) => {
      const msgs: CommunityMessage[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        msgs.push({
          id: docSnap.id,
          senderId: data.senderId,
          senderName: data.senderName,
          senderPhoto: data.senderPhoto,
          text: data.text,
          createdAt: data.createdAt
        });
      });
      setMessages(msgs);
      
      // Auto-scroll on snap read
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'community_messages');
    });

    // 2. Fetch some developers dynamically to show under the "Online Cluster Lobby" list
    const qDevs = query(collection(db, 'users'), limit(15));
    const unsubDevs = onSnapshot(qDevs, (snap) => {
      const devs: any[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        devs.push({
          id: docSnap.id,
          displayName: data.displayName || 'Vortex Architect',
          photoURL: data.photoURL,
          githubUsername: data.githubUsername || '',
          role: data.role || 'developer'
        });
      });
      setOnlineDevs(devs);
    }, (err) => {
      console.warn("Devs list sync skipped:", err);
    });

    return () => {
      unsubMessages();
      unsubDevs();
    };
  }, [user]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim()) return;

    setIsSending(true);
    try {
      await addDoc(collection(db, 'community_messages'), {
        senderId: user.uid,
        senderName: user.displayName || 'Developer Node',
        senderPhoto: user.photoURL || '',
        text: newMessage.trim(),
        createdAt: serverTimestamp()
      });
      setNewMessage('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'community_messages');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 min-h-screen">
      {/* Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-6 border-b border-slate-800/80">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold font-heading text-white">Developers Cluster Lobby</h1>
          <p className="text-slate-400 text-sm font-sans">Global real-time workspace chat. Share URLs and chat systems infrastructure.</p>
        </div>

        {/* Global Stats counter */}
        <div className="hidden sm:flex items-center gap-4 font-mono text-xs">
          <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-full">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Node Lobbies Sync Done</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch h-[650px]">
        {/* Chat window pane */}
        <div className="lg:col-span-8 bg-[#0b1222]/50 border border-slate-800/80 rounded-3xl flex flex-col justify-between overflow-hidden shadow-xl">
          {/* Messages container list */}
          <div className="p-6 overflow-y-auto flex-grow space-y-4 scrollbar-hide">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-3">
                <MessageSquare className="h-8 w-8 text-slate-500 animate-pulse" />
                <p className="text-slate-400 font-semibold">Workspace lobby lobby silent</p>
                <p className="text-slate-500 text-xs max-w-sm">No transmissions compiled. Formulate your first greeting node below.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => {
                  const isCurrentSender = msg.senderId === user?.uid;
                  return (
                    <div 
                      key={msg.id} 
                      className={`flex gap-3 max-w-[85%] ${isCurrentSender ? 'ml-auto flex-row-reverse' : ''}`}
                    >
                      {/* Avatar */}
                      <div className="h-9 w-9 rounded-full bg-slate-800 border border-slate-700/80 overflow-hidden flex-shrink-0">
                        {msg.senderPhoto ? (
                          <img src={msg.senderPhoto} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <Terminal className="h-full w-full p-2 text-cyan-400" />
                        )}
                      </div>

                      {/* Msg Bubble details */}
                      <div className="space-y-1">
                        <div className={`flex items-center gap-2 text-[10px] font-mono text-slate-500 ${isCurrentSender ? 'justify-end' : ''}`}>
                          <span className="font-bold text-slate-300">{msg.senderName}</span>
                          {msg.createdAt && (
                            <span>{new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          )}
                        </div>

                        <div className={`p-3 rounded-2xl text-xs font-sans break-all leading-relaxed ${
                          isCurrentSender 
                            ? 'bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white rounded-tr-none' 
                            : 'bg-slate-900 border border-slate-800 text-slate-100 rounded-tl-none'
                        }`}>
                          {msg.text}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>
            )}
          </div>

          {/* New message input container */}
          {user ? (
            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800/80 bg-slate-950/40 flex gap-3">
              <input
                type="text"
                required
                maxLength={1000}
                placeholder="Broadcast something to developers lobby..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-grow bg-[#050810] border border-slate-800 rounded-xl px-4 py-3.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                disabled={isSending || !newMessage.trim()}
                className="bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 text-[#050810] font-bold px-6 py-3.5 rounded-xl transition-all shadow-md shadow-cyan-400/10 flex items-center justify-center gap-1.5"
              >
                <span>Compile</span>
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          ) : (
            <div className="p-6 text-center border-t border-slate-800 bg-slate-950/40 text-xs font-mono text-slate-500">
              Please deploy your session profile details to broadcast messages.
            </div>
          )}
        </div>

        {/* Right Devs index sidebar */}
        <div className="lg:col-span-4 bg-[#0b1222]/30 border border-slate-800/80 rounded-3xl p-6 overflow-y-auto scrollbar-hide shadow-xl flex flex-col justify-start">
          <div className="pb-4 border-b border-slate-800 mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-cyan-400" />
            <h3 className="font-bold text-sm tracking-wide text-white font-heading">Cluster Members ({onlineDevs.length})</h3>
          </div>

          <div className="space-y-3">
            {onlineDevs.map((dev) => (
              <div 
                key={dev.id}
                className="flex items-center gap-3 p-2 bg-[#050810]/40 rounded-xl border border-slate-900/50 hover:border-slate-800 transition-colors"
              >
                <div className="h-8 w-8 rounded-full bg-slate-800 overflow-hidden ring-1 ring-slate-800 flex-shrink-0">
                  {dev.photoURL ? (
                    <img src={dev.photoURL} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Terminal className="h-full w-full p-2 text-cyan-400" />
                  )}
                </div>

                <div className="space-y-0.5 truncate">
                  <p className="text-xs font-bold text-slate-100 truncate">{dev.displayName}</p>
                  <p className="text-[10px] font-mono text-cyan-500 truncate">
                    {dev.githubUsername ? `@${dev.githubUsername}` : 'Developer Node'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
