import React, { useEffect, useState, useRef } from 'react';
import { 
  Send, 
  MessageSquare, 
  Users, 
  Terminal, 
  Globe
} from 'lucide-react';
import { useAuth } from '../App';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  serverTimestamp
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { CommunityMessage } from '../types';

export default function Community() {
  const { user } = useAuth();
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
      
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    const qDevs = query(collection(db, 'users'), limit(15));
    const unsubDevs = onSnapshot(qDevs, (snap) => {
      const devs: any[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        devs.push({
          id: docSnap.id,
          displayName: data.displayName || 'Developer',
          photoURL: data.photoURL,
          githubUsername: data.githubUsername || '',
        });
      });
      setOnlineDevs(devs);
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
        senderName: user.displayName || 'Developer',
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-screen space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-zinc-800">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight text-white">Community</h1>
          <p className="text-zinc-400 text-sm">Chat with other developers on the platform.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-zinc-400 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-md">
          <Globe className="h-4 w-4" />
          <span>Global Chat</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[600px]">
        <div className="lg:col-span-3 bg-black border border-zinc-800 rounded-lg flex flex-col overflow-hidden">
          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                <MessageSquare className="h-8 w-8 text-zinc-500" />
                <p className="text-zinc-500 text-sm">No messages yet. Say hello!</p>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((msg) => {
                  const isCurrentSender = msg.senderId === user?.uid;
                  return (
                    <div 
                      key={msg.id} 
                      className={`flex gap-3 max-w-[85%] ${isCurrentSender ? 'ml-auto flex-row-reverse' : ''}`}
                    >
                      <div className="h-8 w-8 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 mt-1">
                        {msg.senderPhoto ? (
                          <img src={msg.senderPhoto} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <Terminal className="h-full w-full p-2 text-zinc-500" />
                        )}
                      </div>

                      <div className={`space-y-1 ${isCurrentSender ? 'text-right' : ''}`}>
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                          <span className="font-medium text-zinc-300">{msg.senderName}</span>
                          {msg.createdAt && (
                            <span>{new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          )}
                        </div>

                        <div className={`p-3 rounded-lg text-sm inline-block text-left break-words ${
                          isCurrentSender 
                            ? 'bg-white text-black' 
                            : 'bg-zinc-900 text-zinc-100 border border-zinc-800'
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

          {user ? (
            <form onSubmit={handleSendMessage} className="p-4 border-t border-zinc-800 bg-zinc-950 flex gap-3">
              <input
                type="text"
                required
                maxLength={1000}
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 bg-black border border-zinc-800 rounded-md px-4 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
              />
              <button
                type="submit"
                disabled={isSending || !newMessage.trim()}
                className="bg-white text-black hover:bg-zinc-200 disabled:opacity-50 font-medium px-4 py-2 rounded-md transition-colors flex items-center justify-center gap-2"
              >
                Send
                <Send className="h-4 w-4" />
              </button>
            </form>
          ) : (
            <div className="p-4 text-center border-t border-zinc-800 bg-zinc-950 text-sm text-zinc-500">
              Sign in to send messages.
            </div>
          )}
        </div>

        <div className="bg-black border border-zinc-800 rounded-lg overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-950 flex items-center gap-2">
            <Users className="h-4 w-4 text-zinc-400" />
            <h3 className="font-medium text-sm text-white">Online ({onlineDevs.length})</h3>
          </div>

          <div className="p-4 overflow-y-auto flex-1 space-y-4">
            {onlineDevs.map((dev) => (
              <div key={dev.id} className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0">
                  {dev.photoURL ? (
                    <img src={dev.photoURL} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Terminal className="h-full w-full p-2 text-zinc-500" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{dev.displayName}</p>
                  {dev.githubUsername && (
                    <p className="text-xs text-zinc-500 truncate">@{dev.githubUsername}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
