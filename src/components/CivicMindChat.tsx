import React, { useState, useRef, useEffect } from "react";
import { Send, MapPin, Sparkles, Loader2, RefreshCw, Trash2, Mic, Volume2, Image, X, Maximize2, Minimize2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Message } from "../types";

interface CivicMindChatProps {
  latitude: number | null;
  longitude: number | null;
  requestLocation: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onActiveUse?: () => void;
}

export default function CivicMindChat({ 
  latitude, 
  longitude, 
  requestLocation,
  isExpanded = false,
  onToggleExpand,
  onActiveUse
}: CivicMindChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `### CivicMind Decision Intelligence Platform\n\nWelcome! I am your AI policy simulator. Ask me to run predictive analysis or locate resources:\n\n* **"Find nearby hospitals"** (calculates distance based on your active GPS coordinates)\n* **"Analyze urban mobility hotspots"**\n* **"Optimize smart grid energy demand"**\n* **"Audit local public safety response"**`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      image: null
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Audio and Multimodal states
  const [image, setImage] = useState<{ data: string; mimeType: string } | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [activeSpeakingText, setActiveSpeakingText] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const promptSuggestions = [
    "Find nearest hospital",
    "Find nearby metros",
    "Analyze traffic in present area",
    "Optimize grid demand",
    "Audit public safety"
  ];

  // Speech Recognition (Speech-to-Text) Initialization
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-US";
      
      rec.onstart = () => {
        setIsListening(true);
      };
      
      rec.onend = () => {
        setIsListening(false);
      };
      
      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        handleSendMessage(transcript);
      };
      
      recognitionRef.current = rec;
    }

    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }
    
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  // Speech Synthesis (Text-to-Speech) Function
  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        if (activeSpeakingText === text) {
          setActiveSpeakingText(null);
          return;
        }
      }
      
      // Strip markdown syntax and math for cleaner audio
      const cleanText = text
        .replace(/[*#`_~\-+|]/g, "") 
        .replace(/\\\[[\s\S]*?\\\]/g, "") 
        .replace(/\\$$[\s\S]*?\\$$/g, "")
        .replace(/\$\$[\s\S]*?\$\$/g, "")
        .replace(/\$[\s\S]*?\$/g, "")
        .trim();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      
      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find(v => v.lang.startsWith("en"));
      if (voice) utterance.voice = voice;

      utterance.onend = () => {
        setActiveSpeakingText(null);
      };
      
      utterance.onerror = () => {
        setActiveSpeakingText(null);
      };

      setActiveSpeakingText(text);
      window.speechSynthesis.speak(utterance);
    } else {
      alert("Text-to-speech is not supported in this browser.");
    }
  };

  // Dynamic Incident Preset generator
  const generatePresetImage = (type: "pothole" | "garbage" | "traffic" | "grid") => {
    const canvas = document.createElement("canvas");
    canvas.width = 120;
    canvas.height = 90;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, 120, 90);

    if (type === "pothole") {
      ctx.fillStyle = "#334155";
      ctx.fillRect(0, 30, 120, 30);
      ctx.fillStyle = "#1e293b";
      ctx.beginPath();
      ctx.ellipse(60, 45, 22, 11, 0, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = "#f43f5e";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = "#f43f5e";
      ctx.font = "bold 7px monospace";
      ctx.fillText("POTHOLE DETECTED", 18, 78);
    } else if (type === "garbage") {
      ctx.fillStyle = "#16a34a";
      ctx.beginPath();
      ctx.arc(45, 55, 14, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = "#2563eb";
      ctx.beginPath();
      ctx.arc(70, 50, 12, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = "#ea580c";
      ctx.beginPath();
      ctx.arc(58, 60, 10, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = "#ea580c";
      ctx.font = "bold 7px monospace";
      ctx.fillText("ILLEGAL WASTE BLOCK", 12, 78);
    } else if (type === "traffic") {
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(10, 40, 100, 8);
      ctx.fillRect(10, 55, 100, 8);
      ctx.fillStyle = "#334155";
      ctx.fillRect(35, 15, 10, 60);
      ctx.fillStyle = "#eab308";
      ctx.beginPath();
      ctx.arc(40, 44, 4, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = "#ef4444";
      ctx.font = "bold 7px monospace";
      ctx.fillText("GRIDLOCK ANOMALY", 18, 78);
    } else if (type === "grid") {
      ctx.fillStyle = "#0284c7";
      ctx.fillRect(20, 25, 30, 20);
      ctx.fillRect(70, 25, 30, 20);
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(50, 35);
      ctx.lineTo(70, 35);
      ctx.stroke();
      ctx.strokeStyle = "#e11d48";
      ctx.beginPath();
      ctx.moveTo(60, 20);
      ctx.lineTo(60, 50);
      ctx.stroke();
      ctx.fillStyle = "#e11d48";
      ctx.font = "bold 7px monospace";
      ctx.fillText("SUBSTATION FAULT", 18, 78);
    }

    return {
      data: canvas.toDataURL("image/jpeg"),
      mimeType: "image/jpeg"
    };
  };

  const handlePresetSelect = (type: "pothole" | "garbage" | "traffic" | "grid") => {
    onActiveUse?.();
    const preset = generatePresetImage(type);
    if (!preset) return;
    setImage(preset);
    
    let promptText = "";
    if (type === "pothole") {
      promptText = "Assess road safety hazards and draft a repair dispatch ticket for this pothole obstruction.";
    } else if (type === "garbage") {
      promptText = "Analyze this illegal waste dump and formulate a sanitation clearance routing order.";
    } else if (type === "traffic") {
      promptText = "Audit the traffic flow density in this gridlock photo and calculate alternative lane signal patterns.";
    } else if (type === "grid") {
      promptText = "Evaluate the electrical transformer grid failure in this image and recommend supply reallocation offsets.";
    }
    setInputValue(promptText);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImage({
        data: reader.result as string,
        mimeType: file.type
      });
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSendMessage = async (textToSend: string, imageToSend = image) => {
    if (!textToSend.trim() || loading) return;
    onActiveUse?.();

    const userMsg: Message = {
      role: "user",
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      image: imageToSend
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue("");
    setImage(null);
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          latitude: latitude,
          longitude: longitude,
          image: imageToSend
        })
      });

      if (!response.ok) {
        throw new Error("Failed to communicate with decision server.");
      }

      const data = await response.json();
      
      const aiMsg: Message = {
        role: "assistant",
        content: data.response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        image: null
      };
      
      setMessages(prev => [...prev, aiMsg]);
      
      // Auto speak if TTS voice is active or user requests
      // speakText(data.response); // uncomment for auto-speak
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
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setActiveSpeakingText(null);
    setMessages([
      {
        role: "assistant",
        content: `### CivicMind Decision Intelligence Platform\n\nWelcome! I am your AI policy simulator. Ask me to run predictive analysis or locate resources:\n\n* **"Find nearby hospitals"** (calculates distance based on your active GPS coordinates)\n* **"Analyze urban mobility hotspots"**\n* **"Optimize smart grid energy demand"**\n* **"Audit local public safety response"**`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  return (
    <div id="civicmind-chat-panel" className={`flex flex-col transition-all duration-300 ${isExpanded ? 'h-[680px]' : 'h-[580px]'} bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-955 border-b border-slate-800">
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
          
          {onToggleExpand && (
            <button
              type="button"
              onClick={onToggleExpand}
              title={isExpanded ? "Minimize Chat" : "Maximize Chat"}
              className="p-1.5 rounded-md border border-slate-800 bg-slate-900 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}

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
              className={`max-w-[85%] rounded-lg px-4 py-3 text-sm shadow-md relative group ${
                msg.role === "user"
                  ? "bg-cyan-600 text-white rounded-br-none"
                  : "bg-slate-950/60 border border-slate-800 text-slate-300 rounded-bl-none"
              }`}
            >
              {msg.image && (
                <div className="mb-2 rounded-lg overflow-hidden border border-slate-700/60 max-w-[200px] shadow-sm">
                  <img src={msg.image.data} alt="Visual Attachment" className="w-full h-auto object-cover" />
                </div>
              )}
              <div className="markdown-body select-text overflow-x-auto leading-relaxed prose prose-invert prose-xs max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-slate-850/60 pt-1.5 gap-4">
                <button
                  type="button"
                  onClick={() => speakText(msg.content)}
                  className={`p-1 rounded hover:bg-slate-800/80 text-slate-400 hover:text-cyan-400 transition-colors ${
                    activeSpeakingText === msg.content ? "text-cyan-400 animate-pulse bg-cyan-950/40" : ""
                  }`}
                  title="Read Aloud"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
                <div className="text-[9px] text-slate-400/80 font-mono">
                  {msg.timestamp}
                </div>
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

      {/* Demo Incident Presets */}
      <div className="px-4 py-2 bg-slate-950/60 border-t border-slate-800/60 flex flex-col gap-1.5">
        <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500 block">Visual Incident Demo Presets</span>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => handlePresetSelect("pothole")}
            className="flex-shrink-0 text-[10px] font-mono px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:border-cyan-600 hover:text-cyan-400 transition-colors"
          >
            🚧 Pothole Obstacle
          </button>
          <button
            type="button"
            onClick={() => handlePresetSelect("garbage")}
            className="flex-shrink-0 text-[10px] font-mono px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:border-cyan-600 hover:text-cyan-400 transition-colors"
          >
            ♻️ Illegal Dump
          </button>
          <button
            type="button"
            onClick={() => handlePresetSelect("traffic")}
            className="flex-shrink-0 text-[10px] font-mono px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:border-cyan-600 hover:text-cyan-400 transition-colors"
          >
            🚦 Traffic Overload
          </button>
          <button
            type="button"
            onClick={() => handlePresetSelect("grid")}
            className="flex-shrink-0 text-[10px] font-mono px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:border-cyan-600 hover:text-cyan-400 transition-colors"
          >
            ⚡ Substation Fault
          </button>
        </div>
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

      {/* Image Preview Area */}
      {image && (
        <div className="px-4 py-2 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={image.data} alt="Upload Thumbnail" className="w-12 h-9 object-cover rounded border border-slate-700" />
            <span className="text-[10px] font-mono text-slate-400">Attached: {image.mimeType}</span>
          </div>
          <button
            type="button"
            onClick={() => setImage(null)}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage(inputValue);
        }}
        className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2"
      >
        <button
          type="button"
          onClick={toggleListening}
          className={`p-2.5 rounded-lg border transition-colors flex items-center justify-center ${
            isListening
              ? "bg-rose-600 border-rose-600 text-white animate-pulse"
              : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          }`}
          title={isListening ? "Listening... Speak now" : "Use Voice Input"}
        >
          <Mic className="w-4 h-4" />
        </button>

        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            onActiveUse?.();
          }}
          disabled={loading}
          placeholder="Ask simulation questions..."
          className="flex-1 px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600 transition-colors"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          title="Upload Municipal Incident Image"
        >
          <Image className="w-4 h-4" />
        </button>
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
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
