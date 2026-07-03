import React, { useState, useRef, useEffect } from "react";
import { Send, MapPin, Sparkles, Loader2, RefreshCw, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Message } from "../types";

interface CivicMindChatProps {
  latitude: number | null;
  longitude: number | null;
  requestLocation: () => void;
}

export default function CivicMindChat({ latitude, longitude, requestLocation }: CivicMindChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `### CivicMind Decision Intelligence Platform\n\nWelcome! I am your AI policy simulator. Ask me to run predictive analysis or locate resources:\n\n* **"Find nearby hospitals"** (calculates distance based on your active GPS coordinates)\n* **"Analyze urban mobility hotspots"**\n* **"Optimize smart grid energy demand"**\n* **"Audit local public safety response"**`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const promptSuggestions = [
    "Find nearest hospital",
    "Analyze traffic congestion",
    "Optimize grid demand",
    "Audit public safety"
  ];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg: Message = {
      role: "user",
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          latitude: latitude,
          longitude: longitude
        })
      });

      if (!response.ok) {
        throw new Error("Failed to communicate with decision server.");
      }

      const data = await response.json();
      
      const aiMsg: Message = {
        role: "assistant",
        content: data.response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        role: "assistant",
        content: `❌ **Error:** ${err.message || "Something went wrong while simulating decision analysis."}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: "assistant",
        content: `### CivicMind Decision Intelligence Platform\n\nWelcome! I am your AI policy simulator. Ask me to run predictive analysis or locate resources:\n\n* **"Find nearby hospitals"** (calculates distance based on your active GPS coordinates)\n* **"Analyze urban mobility hotspots"**\n* **"Optimize smart grid energy demand"**\n* **"Audit local public safety response"**`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  return (
    <div id="civicmind-chat-panel" className="flex flex-col h-[580px] bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
          </div>
          <h3 className="font-sans font-medium text-sm text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            Decision AI Copilot
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={requestLocation}
            title="Update Location"
            className={`p-1.5 rounded-md text-xs transition-colors duration-200 flex items-center gap-1 border ${
              latitude 
                ? "bg-cyan-950/40 border-cyan-800 text-cyan-400 hover:bg-cyan-950/60" 
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            {latitude ? `${latitude.toFixed(2)}, ${longitude?.toFixed(2)}` : "GPS Off"}
          </button>
          
          <button
            onClick={clearChat}
            title="Reset Conversation"
            className="p-1.5 rounded-md border border-slate-800 bg-slate-900 text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Message Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start animate-fade-in"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-4 py-3 text-sm shadow-md ${
                msg.role === "user"
                  ? "bg-cyan-600 text-white rounded-br-none"
                  : "bg-slate-950/60 border border-slate-800 text-slate-300 rounded-bl-none"
              }`}
            >
              <div className="markdown-body select-text overflow-x-auto leading-relaxed prose prose-invert prose-xs max-w-none">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
              <div className="mt-1.5 text-[10px] text-right text-slate-400/80 font-mono">
                {msg.timestamp}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-950/60 border border-slate-800 text-slate-400 rounded-lg rounded-bl-none px-4 py-3 flex items-center gap-2.5">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              <span className="text-xs font-mono tracking-wider">Simulating decision matrices...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Suggestion Pills */}
      <div className="px-4 py-2 bg-slate-950/40 border-t border-slate-800/60 flex gap-2 overflow-x-auto no-scrollbar scroll-smooth">
        {promptSuggestions.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSendMessage(prompt)}
            disabled={loading}
            className="flex-shrink-0 text-[11px] font-mono tracking-wide px-2.5 py-1 rounded-full border border-slate-800 bg-slate-900/60 text-slate-300 hover:border-cyan-800 hover:text-cyan-400 hover:bg-cyan-950/30 transition-all duration-200 disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage(inputValue);
        }}
        className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2"
      >
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={loading}
          placeholder="Ask analytical simulation questions..."
          className="flex-1 px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600 transition-colors"
        />
        <button
          type="submit"
          disabled={loading || !inputValue.trim()}
          className="p-2.5 rounded-lg bg-cyan-600 text-white hover:bg-cyan-500 disabled:opacity-40 disabled:hover:bg-cyan-600 transition-colors duration-200 flex items-center justify-center"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
