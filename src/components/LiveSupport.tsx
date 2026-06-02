import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, X, Send, Minus, Bot, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';
import { collection, addDoc, serverTimestamp, doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { auth } from '../lib/firebase';

interface ChatMessage {
  id: string;
  text: string;
  sender: 'bot' | 'user';
  timestamp: Date;
}

interface LiveSupportProps {
  inline?: boolean;
}

export default function LiveSupport({ inline = false }: LiveSupportProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(inline);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    if (inline) {
      setIsOpen(true);
      setIsMinimized(false);
    }
  }, [inline]);

  useEffect(() => {
    const handleOpen = () => {
      if (!inline) {
        setIsOpen(true);
        setIsMinimized(false);
      }
    };
    window.addEventListener('open-live-support', handleOpen);
    return () => window.removeEventListener('open-live-support', handleOpen);
  }, [inline]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setIsTyping(true);
      setTimeout(() => {
        const introMsg: ChatMessage = {
          id: '1',
          text: t('help.chatIntro'),
          sender: 'bot',
          timestamp: new Date()
        };
        setMessages([introMsg]);
        setIsTyping(false);
        
        // Log the start of a transcript
        const user = auth.currentUser;
        setDoc(doc(db, 'support_messages', sessionId), {
          type: 'live_chat',
          userId: user?.uid || 'anonymous',
          userEmail: user?.email || 'N/A',
          createdAt: serverTimestamp(),
          status: 'active',
          subject: 'Live Support Session',
          messages: [{ ...introMsg, timestamp: new Date().toISOString() }]
        });
      }, 1000);
    }
  }, [isOpen, t, sessionId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date()
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    const currentInput = input;
    setInput('');

    // Update Firestore transcript
    try {
      await updateDoc(doc(db, 'support_messages', sessionId), {
        messages: newMessages.map(m => ({ ...m, timestamp: m.timestamp.toISOString() })),
        lastMessage: currentInput,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Error updating transcript:', err);
    }

    // Simulate bot response
    setIsTyping(true);
    setTimeout(async () => {
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: "Thanks for your question! One of our support specialists will be with you shortly. In the meantime, feel free to check our Help Center for quick answers.",
        sender: 'bot',
        timestamp: new Date()
      };
      const updatedWithBot = [...newMessages, botMsg];
      setMessages(updatedWithBot);
      setIsTyping(false);

      // Update Firestore again with bot response
      try {
        await updateDoc(doc(db, 'support_messages', sessionId), {
          messages: updatedWithBot.map(m => ({ ...m, timestamp: m.timestamp.toISOString() })),
          updatedAt: serverTimestamp()
        });
      } catch (err) {
        console.error('Error updating transcript with bot:', err);
      }
    }, 2000);
  };

  return (
    <div className={cn(
      inline ? "w-full h-full" : "fixed bottom-8 right-8 z-[100] flex flex-col items-end pointer-events-none"
    )}>
      <AnimatePresence>
        {isOpen && !isMinimized && (
          <motion.div
            initial={inline ? { opacity: 0 } : { opacity: 0, y: 40, scale: 0.9, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={inline ? { opacity: 0 } : { opacity: 0, y: 40, scale: 0.9, filter: 'blur(10px)' }}
            className={cn(
              "bg-white border border-gray-100 overflow-hidden flex flex-col pointer-events-auto",
              inline ? "w-full h-full rounded-[2.5rem]" : "w-[90vw] sm:w-[400px] rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(79,70,229,0.25)] mb-6 h-[600px]"
            )}
          >
            {/* Header */}
            <div className="bg-indigo-600 p-8 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-400/20 rounded-full -ml-12 -mb-12 blur-xl" />
              
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20">
                    <Bot className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base tracking-tight">{t('help.liveSupportTitle')}</h3>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      <p className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest leading-none">Support Agent Online</p>
                    </div>
                  </div>
                </div>
                {!inline && (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setIsMinimized(true)}
                      className="p-2 hover:bg-white/20 rounded-xl transition-all duration-300"
                    >
                      <Minus className="h-5 w-5" />
                    </button>
                    <button 
                      onClick={() => setIsOpen(false)}
                      className="p-2 hover:bg-white/20 rounded-xl transition-all duration-300"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-8 space-y-6 bg-gray-50/30 scroll-smooth"
            >
              {messages.map((msg) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  key={msg.id}
                  className={cn(
                    "flex flex-col group",
                    msg.sender === 'user' ? "ml-auto items-end" : "items-start"
                  )}
                >
                  <div className={cn(
                    "px-5 py-4 rounded-[1.5rem] text-sm leading-relaxed max-w-[90%] shadow-sm",
                    msg.sender === 'user' 
                      ? "bg-indigo-600 text-white rounded-br-none" 
                      : "bg-white border border-gray-100 text-gray-800 rounded-bl-none"
                  )}>
                    {msg.text}
                  </div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase mt-2 px-1 tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </motion.div>
              ))}
              {isTyping && (
                <div className="flex items-start">
                  <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-bl-none shadow-sm flex gap-1 items-center">
                    <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-6 bg-white border-t border-gray-50">
              <form onSubmit={handleSend} className="flex gap-3">
                <input 
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder={t('help.chatPlaceholder')}
                  className="flex-1 bg-gray-50 border border-transparent px-6 py-4 rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:bg-white focus:border-indigo-200 outline-none transition-all text-sm font-medium"
                />
                <button 
                  type="submit"
                  disabled={!input.trim()}
                  className="p-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50 disabled:shadow-none translate-y-0 active:translate-y-0.5"
                >
                  <Send className="h-5 w-5" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!inline && (
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setIsOpen(true);
              setIsMinimized(false);
            }}
            className={cn(
              "h-16 w-16 rounded-[2rem] flex items-center justify-center shadow-[0_20px_50px_rgba(79,70,229,0.3)] transition-all duration-500 pointer-events-auto",
              isOpen && !isMinimized 
                ? "bg-white text-indigo-600 rotate-180 opacity-0 pointer-events-none translate-y-12" 
                : "bg-indigo-600 text-white translate-y-0 shadow-indigo-200"
            )}
          >
            <MessageCircle className="h-8 w-8" />
          </motion.button>
        )}
      </AnimatePresence>

      {!inline && isOpen && isMinimized && (
        <motion.button
          initial={{ y: 40, opacity: 0, filter: 'blur(10px)' }}
          animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
          whileHover={{ y: -5 }}
          onClick={() => setIsMinimized(false)}
          className="absolute -top-14 right-0 bg-indigo-600 text-white px-6 py-3 rounded-2xl text-xs font-bold shadow-xl shadow-indigo-100 flex items-center gap-3 pointer-events-auto border border-indigo-500"
        >
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          {t('help.liveSupportTitle')}
        </motion.button>
      )}
    </div>
  );
}
