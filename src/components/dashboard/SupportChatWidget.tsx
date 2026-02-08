import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Loader2, Headphones, Paperclip, Smile } from 'lucide-react';
import { supabase } from '../../lib/supabase'; 
import { useSupportChat } from '../../hooks/useSupportChat';
import EmojiPicker, { type EmojiClickData, Theme } from 'emoji-picker-react';

interface Props {
    userId: string;
    mode?: 'floating' | 'inline'; // 👈 NEW PROP
}

export default function SupportChatWidget({ userId, mode = 'floating' }: Props) {
  const [isOpen, setIsOpen] = useState(false); // Only used for floating mode
  const [leadId, setLeadId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  
  // --- STATES ---
  const [showEmoji, setShowEmoji] = useState(false);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSendingRef = useRef(false);

  // 1. Get the Hook
  const { messages, loading, sending } = useSupportChat(leadId);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 2. Find my Lead ID & Listen for Unread
  useEffect(() => {
    const fetchLeadId = async () => {
      const { data } = await supabase
        .from('crm_leads')
        .select('id')
        .eq('trading_account_id', userId)
        .single();
      
      if (data) {
          setLeadId(data.id);
          fetchUnread(data.id);
      }
    };
    fetchLeadId();

    const channel = supabase.channel('client-widget-badge')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages' }, (payload) => {
            if (payload.new.sender_id !== userId) {
                // If floating and closed, OR if inline (header handles its own badge usually, but we update count anyway)
                if (mode === 'floating' && !isOpen) {
                    setUnreadCount(prev => prev + 1);
                }
            }
        })
        .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, isOpen, mode]);

  // 3. Fetch Unread Count
  const fetchUnread = async (id: string) => {
      if (mode === 'floating' && isOpen) return; 
      
      const { count } = await supabase
        .from('support_messages')
        .select('id', { count: 'exact', head: true })
        .eq('lead_id', id)
        .eq('is_read', false)
        .neq('sender_id', userId);
      
      if (count) setUnreadCount(count);
  };

  // 4. Auto-Scroll & Clear Badge
  useEffect(() => {
    // If inline, it's always "open" effectively when rendered
    const isVisible = mode === 'inline' || (mode === 'floating' && isOpen);

    if (isVisible && leadId) {
        setUnreadCount(0);
        supabase.from('support_messages')
            .update({ is_read: true })
            .eq('lead_id', leadId)
            .neq('sender_id', userId)
            .then(() => {});
    }

    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen, leadId, userId, mode]);

  // --- ACTIONS ---
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSendingRef.current) return;
    if (!leadId) return;
    if (!input.trim() && !previewFile) return;
    
    isSendingRef.current = true;
    setUploading(true);

    try {
        let finalMessage = input;
        let msgType = 'text';

        if (previewFile) {
            const fileExt = previewFile.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${leadId}/${fileName}`;

            const { error: uploadError } = await supabase.storage.from('support-attachments').upload(filePath, previewFile);
            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('support-attachments').getPublicUrl(filePath);
            finalMessage = data.publicUrl;
            msgType = 'image';
        }

        await supabase.from('support_messages').insert({
            lead_id: leadId,
            sender_id: userId,
            sender_name: 'Client',
            message_text: finalMessage,
            type: msgType,
            is_read: false
        });

        setInput('');
        setPreviewFile(null);
        setPreviewUrl(null);
        setShowEmoji(false);

    } catch (error) {
        console.error('Send failed', error);
    } finally {
        setUploading(false);
        isSendingRef.current = false;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setPreviewFile(file);
    setPreviewUrl(objectUrl);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!leadId) return mode === 'inline' ? <div className="p-4 text-xs text-red-500">Connecting...</div> : null;

  // --- RENDER CONTENT (Shared between modes) ---
  const chatWindow = (
    <div className={`${mode === 'floating' ? 'mb-2 w-80 h-[500px] border border-[#334155] rounded-2xl shadow-2xl animate-in slide-in-from-bottom-5 fade-in duration-200' : 'w-80 h-[500px] border-l border-b border-r border-[#334155] rounded-b-2xl shadow-xl'} bg-[#1e293b] flex flex-col overflow-hidden`}>
          
          {/* Header */}
          <div className="bg-[#21ce99] p-3 flex items-center justify-between shadow-md shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="font-bold text-[#0b0e11] text-xs">Live Support</span>
            </div>
            {mode === 'floating' && (
                <button onClick={() => setIsOpen(false)} className="text-[#0b0e11]/70 hover:text-black transition">
                    <X size={16} />
                </button>
            )}
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#1e293b]">
            {loading && <div className="text-center text-xs text-gray-500">Connecting...</div>}
            
            {messages.length === 0 && !loading && (
               <div className="text-center mt-10 text-gray-500 text-xs">
                  <Headphones className="mx-auto mb-2 opacity-50 text-[#21ce99]" size={32}/>
                  How can we help you today?
               </div>
            )}

            {messages.map((msg) => {
              const isMe = msg.sender_id === userId;
              
              let displayName = 'Support';
              if (isMe) displayName = 'Me';
              else if (msg.sender_name && msg.sender_name !== 'Client') displayName = msg.sender_name; 
              else displayName = 'Support Team'; 

              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs font-medium shadow-sm break-words overflow-hidden ${
                    isMe 
                      ? 'bg-[#21ce99] text-[#0b0e11] rounded-br-none' 
                      : 'bg-[#334155] text-gray-200 rounded-bl-none' 
                  }`}>
                    {!isMe && <span className="block text-[9px] font-bold text-[#21ce99] mb-1 opacity-80 uppercase">{displayName}</span>}

                    {msg.type === 'image' ? (
                        <img 
                            src={msg.message_text} 
                            alt="attachment" 
                            onClick={() => setFullScreenImage(msg.message_text)}
                            className="max-w-full rounded-md cursor-zoom-in border border-black/10" 
                        />
                    ) : (
                        <p className="whitespace-pre-wrap break-words">{msg.message_text}</p>
                    )}
                  </div>
                  <span className="text-[9px] text-gray-500 mt-1 px-1 opacity-60">
                    {new Date(msg.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                  </span>
                </div>
              );
            })}
          </div>

          {/* PREVIEW */}
          {previewUrl && (
             <div className="px-4 pb-2 bg-[#0f172a] flex items-center gap-2 border-t border-[#334155]">
                <div className="relative mt-2">
                    <img src={previewUrl} alt="Preview" className="w-10 h-10 object-cover rounded-md border border-[#334155]" />
                    <button onClick={() => { setPreviewFile(null); setPreviewUrl(null); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"><X size={10}/></button>
                </div>
                <span className="text-[10px] text-gray-400 mt-2">Image attached</span>
             </div>
          )}

          {/* EMOJI */}
          {showEmoji && (
             <div className="absolute bottom-16 left-2 z-50">
                 <div className="fixed inset-0 z-40" onClick={() => setShowEmoji(false)} />
                 <div className="relative z-50">
                    <EmojiPicker 
                        onEmojiClick={(e: EmojiClickData) => setInput(prev => prev + e.emoji)} 
                        theme={Theme.DARK} 
                        width={280} 
                        height={350} 
                    />
                 </div>
             </div>
          )}

          {/* Input */}
          <form className="p-3 bg-[#0f172a] border-t border-[#334155] flex items-end gap-2 shrink-0">
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
            
            <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-400 hover:text-white transition">
                <Paperclip size={16} />
            </button>

            <div className="flex-1 relative">
                <textarea
                  className="w-full bg-[#1e293b] border border-[#334155] rounded-lg pl-3 pr-8 py-2 text-xs text-white focus:outline-none focus:border-[#21ce99] transition resize-none custom-scrollbar"
                  placeholder="Type message..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  style={{ minHeight: '34px', maxHeight: '100px' }}
                />
                <button 
                    type="button" 
                    onClick={() => setShowEmoji(!showEmoji)} 
                    className="absolute right-2 bottom-2 text-gray-400 hover:text-yellow-400"
                >
                    <Smile size={16} />
                </button>
            </div>

            <button 
              onClick={(e) => handleSend(e)}
              disabled={sending || (!input.trim() && !uploading)}
              className="p-2 bg-[#21ce99] hover:brightness-110 rounded-lg text-[#0b0e11] disabled:opacity-50 transition shadow-[0_0_10px_rgba(33,206,153,0.2)] h-[34px] w-[34px] flex items-center justify-center"
            >
              {sending || uploading ? <Loader2 size={14} className="animate-spin"/> : <Send size={14} />}
            </button>
          </form>
    </div>
  );

  // --- RETURN LOGIC ---

  // 1. INLINE MODE (For Header) - Just the window
  if (mode === 'inline') {
      return (
        <>
            {chatWindow}
            {/* Lightbox for Inline */}
            {fullScreenImage && (
                <div className="fixed inset-0 z-[10000] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setFullScreenImage(null)}>
                    <button onClick={() => setFullScreenImage(null)} className="absolute top-6 right-6 text-white/70 hover:text-white bg-black/50 rounded-full p-2 transition"><X size={32} /></button>
                    <img src={fullScreenImage} alt="Full Size" className="max-w-full max-h-full rounded-md shadow-2xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()} />
                </div>
            )}
        </>
      );
  }

  // 2. FLOATING MODE (For Dashboard) - Button + Window
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-2">
      
      {isOpen && chatWindow}

      {/* FLOAT BUTTON */}
      <div className="relative flex flex-col items-center gap-1">
          {!isOpen && unreadCount > 0 && (
              <div className="absolute -top-1 -right-1 z-50 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-[#0b0e11] animate-bounce">
                  {unreadCount}
              </div>
          )}

          {!isOpen && (
             <span className="text-[10px] font-bold text-[#21ce99] uppercase tracking-wider bg-black/40 px-2 py-0.5 rounded-md border border-[#21ce99]/30 backdrop-blur-sm animate-in fade-in zoom-in duration-300">
               Support
             </span>
          )}
          
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="w-14 h-14 bg-[#21ce99] hover:brightness-110 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(33,206,153,0.4)] transition-all hover:scale-110 active:scale-95 text-[#0b0e11]"
          >
            {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
          </button>
      </div>

      {/* Lightbox for Floating */}
      {fullScreenImage && (
          <div className="fixed inset-0 z-[10000] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setFullScreenImage(null)}>
              <button onClick={() => setFullScreenImage(null)} className="absolute top-6 right-6 text-white/70 hover:text-white bg-black/50 rounded-full p-2 transition"><X size={32} /></button>
              <img src={fullScreenImage} alt="Full Size" className="max-w-full max-h-full rounded-md shadow-2xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()} />
          </div>
      )}
    </div>
  );
}