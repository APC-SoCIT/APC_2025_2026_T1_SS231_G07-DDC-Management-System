"use client"

import { useState, useEffect, useRef } from "react"
import { MessageCircle, X, Send, Loader2, Trash2, Calendar, XCircle, Mic, MicOff } from "lucide-react"
import { chatbotQuery } from "@/lib/api"
import ReactMarkdown from 'react-markdown'

interface Message {
  id: string
  text: string
  sender: "user" | "bot"
  timestamp: Date
  quickReplies?: string[]
}

const initialQuickActions = [
  { icon: Calendar, text: "📅 Book Appointment", message: "I want to book an appointment" },
  { icon: Calendar, text: "🔄 Reschedule Appointment", message: "I need to reschedule my appointment" },
  { icon: XCircle, text: "❌ Cancel Appointment", message: "I want to cancel my appointment" },
]

const quickReplies = [
  "What dental services do you offer?",
  "Who are the available dentists?",
  "What are your clinic hours?",
  "Show me available time slots",
]

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: string; content: string }>>([])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [voiceLanguage, setVoiceLanguage] = useState<'en-US' | 'fil-PH'>('en-US')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)

  // Load chat history from localStorage on mount
  useEffect(() => {
    const savedMessages = localStorage.getItem('chatbot_messages')
    const savedHistory = localStorage.getItem('chatbot_history')
    
    if (savedMessages && savedHistory) {
      try {
        const parsedMessages = JSON.parse(savedMessages)
        const parsedHistory = JSON.parse(savedHistory)
        
        // Convert timestamp strings back to Date objects
        const messagesWithDates = parsedMessages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
        
        setMessages(messagesWithDates)
        setConversationHistory(parsedHistory)
      } catch (error) {
        console.error('Error loading chat history:', error)
        initializeChat()
      }
    } else {
      initializeChat()
    }
  }, [])

  // Save chat history to localStorage whenever it changes
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('chatbot_messages', JSON.stringify(messages))
      localStorage.setItem('chatbot_history', JSON.stringify(conversationHistory))
    }
  }, [messages, conversationHistory])

  const initializeChat = () => {
    const welcomeMessage: Message = {
      id: "1",
      text: "Welcome to Dorotheo Dental Clinic! 🌿✨\n\nI'm **Sage**, your premium virtual concierge. I'm here to provide you with professional, calming, and efficient assistance.\n\nI can help you with:\n\n• **📅 Book, reschedule, or cancel appointments**\n• Information about our dental services and procedures\n• Available appointment slots and dentist schedules\n• Clinic hours, locations, and contact information\n• General dental health questions\n\nHow may I assist you today?",
      sender: "bot",
      timestamp: new Date(),
    }
    setMessages([welcomeMessage])
    setConversationHistory([])
  }

  const handleDeleteHistory = () => {
    localStorage.removeItem('chatbot_messages')
    localStorage.removeItem('chatbot_history')
    initializeChat()
    setShowDeleteConfirm(false)
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Initialize speech recognition (only once)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = false
        recognitionRef.current.interimResults = false
        recognitionRef.current.lang = 'en-US'

        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript
          setInputMessage(transcript)
          setIsListening(false)
        }

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error)
          setIsListening(false)
        }

        recognitionRef.current.onend = () => {
          setIsListening(false)
        }
      }
    }
  }, [])

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert('Voice recognition is not supported in your browser. Please use Chrome or Edge.')
      return
    }

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      recognitionRef.current.lang = voiceLanguage // Update language before starting
      recognitionRef.current.start()
      setIsListening(true)
    }
  }

  const toggleLanguage = () => {
    setVoiceLanguage(prev => prev === 'en-US' ? 'fil-PH' : 'en-US')
  }

  const handleSendMessage = async (message?: string) => {
    const messageText = message || inputMessage.trim()
    if (!messageText) return

    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      sender: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputMessage("")
    setIsTyping(true)

    // Update conversation history
    const newHistory = [...conversationHistory, { role: "user", content: messageText }]
    setConversationHistory(newHistory)

    try {
      // Get user token if logged in
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

      // Call Ollama API through backend
      const response = await chatbotQuery(messageText, newHistory, token || undefined)

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.response,
        sender: "bot",
        timestamp: new Date(),
        quickReplies: response.quick_replies || []
      }

      setMessages((prev) => [...prev, botMessage])
      
      // Update conversation history with bot response
      setConversationHistory([...newHistory, { role: "assistant", content: response.response }])
      
    } catch (error: any) {
      console.error("Chatbot error:", error)
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: error.message.includes("Gemini") || error.message.includes("API")
          ? "⚠️ I'm having trouble connecting to my AI service. Please try again in a moment or contact our clinic directly.\n\nYou can reach us at (123) 456-7890."
          : "I apologize, but I encountered an issue. Please try again or contact our clinic directly at (123) 456-7890 for immediate assistance.",
        sender: "bot",
        timestamp: new Date(),
      }
      
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
    }
  }

  const handleQuickReply = (reply: string) => {
    handleSendMessage(reply)
  }

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 bg-gradient-to-r from-emerald-600 to-yellow-600 text-white rounded-full p-3 sm:p-4 shadow-2xl hover:scale-110 transition-transform duration-300 group"
          aria-label="Open chat"
        >
          <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="absolute -top-1 -right-1 bg-gradient-to-r from-green-500 to-yellow-500 text-white text-xs rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center font-bold border-2 border-white">
            S
          </span>
        </button>
      )}

      {/* Chat Window - Responsive size */}
      {isOpen && (
        <div className="fixed inset-2 sm:inset-auto sm:bottom-6 sm:right-6 z-50 sm:w-[480px] sm:h-[700px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-yellow-600 text-white p-3 sm:p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-full flex items-center justify-center border-2 border-white/30">
                <MessageCircle className="w-4 h-4 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-sm sm:text-base">Sage - AI Concierge</h3>
                <p className="text-[10px] sm:text-xs text-white/80">Professional • Calming • Efficient</p>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="hover:bg-white/20 rounded-lg p-1.5 sm:p-2 transition-colors"
                aria-label="Delete chat history"
                title="Delete chat history"
              >
                <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="hover:bg-white/20 rounded-lg p-1.5 sm:p-2 transition-colors"
                aria-label="Close chat"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 rounded-2xl p-4">
              <div className="bg-white rounded-xl p-4 sm:p-6 m-4 max-w-sm w-full">
                <h4 className="font-semibold text-base sm:text-lg mb-2">Delete Chat History?</h4>
                <p className="text-gray-600 text-xs sm:text-sm mb-4">
                  This will permanently delete all your chat messages. This action cannot be undone.
                </p>
                <div className="flex gap-2 sm:gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 px-3 py-2 sm:px-4 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteHistory}
                    className="flex-1 px-3 py-2 sm:px-4 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 bg-gray-50">
            {messages.map((message) => (
              <div key={message.id}>
                <div className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] sm:max-w-[80%] rounded-2xl px-3 py-2 sm:px-4 ${
                      message.sender === "user"
                        ? "bg-gradient-to-r from-emerald-600 to-yellow-600 text-white"
                        : "bg-white text-gray-800 border border-gray-200"
                    }`}
                  >
                    {message.sender === "bot" ? (
                      <div className="text-xs sm:text-sm prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-li:my-0">
                        <ReactMarkdown>{message.text}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-xs sm:text-sm whitespace-pre-wrap">{message.text}</p>
                    )}
                    <p
                      className={`text-[10px] sm:text-xs mt-1 ${
                        message.sender === "user" ? "text-white/70" : "text-gray-500"
                      }`}
                    >
                      {message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
                
                {/* Quick Reply Buttons */}
                {message.sender === "bot" && message.quickReplies && message.quickReplies.length > 0 && (
                  <div className="flex justify-start mt-2 ml-1 sm:ml-2">
                    <div className="flex flex-wrap gap-1.5 sm:gap-2 max-w-[85%] sm:max-w-[80%]">
                      {message.quickReplies.map((reply, index) => (
                        <button
                          key={index}
                          onClick={() => handleQuickReply(reply)}
                          disabled={isTyping}
                          className="text-[10px] sm:text-xs bg-gradient-to-r from-emerald-600 to-yellow-600 text-white px-2 py-1.5 sm:px-3 sm:py-2 rounded-full hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm"
                        >
                          {reply}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white text-gray-800 rounded-2xl px-3 py-2 sm:px-4 sm:py-3 border border-gray-200 flex items-center gap-2">
                  <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                  <span className="text-xs sm:text-sm text-gray-600">AI is thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Action Buttons (always visible) */}
          <div className="p-2 sm:p-3 bg-white border-t border-gray-200">
            <p className="text-[10px] sm:text-xs text-gray-700 mb-1.5 sm:mb-2 font-semibold">Quick Actions:</p>
            <div className="grid grid-cols-1 gap-1 sm:gap-1.5 mb-2 sm:mb-3">
              {initialQuickActions.map((action, index) => {
                const Icon = action.icon
                return (
                  <button
                    key={index}
                    onClick={() => handleQuickReply(action.message)}
                    disabled={isTyping}
                    className="flex items-center justify-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs bg-gradient-to-r from-emerald-600 to-yellow-600 text-white px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm font-medium"
                  >
                    <span>{action.text}</span>
                  </button>
                )
              })}
            </div>
            <p className="text-[10px] sm:text-xs text-gray-500 mb-1 sm:mb-1.5 font-medium">Or ask me:</p>
            <div className="flex flex-wrap gap-1 sm:gap-1.5">
              {quickReplies.map((reply, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickReply(reply)}
                  disabled={isTyping}
                  className="text-[10px] sm:text-xs bg-gray-100 text-gray-700 px-2 py-1 sm:px-2.5 rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  {reply}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="p-2 sm:p-4 bg-white border-t border-gray-200">
            <div className="flex gap-1 sm:gap-2 items-center">
              <button
                onClick={toggleLanguage}
                className="px-2 py-2 sm:px-3 sm:py-2.5 bg-gradient-to-r from-emerald-600 to-yellow-600 text-white rounded-full text-[10px] sm:text-xs font-semibold hover:opacity-90 transition-opacity"
                disabled={isTyping || isListening}
                title={`Switch to ${voiceLanguage === 'en-US' ? 'Filipino' : 'English'}`}
              >
                {voiceLanguage === 'en-US' ? '🇺🇸' : '🇵🇭'}
              </button>
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && !isTyping && !isListening && handleSendMessage()}
                placeholder={isListening ? `Listening...` : "Ask Sage..."}
                disabled={isTyping || isListening}
                className="flex-1 px-3 py-2 sm:px-4 sm:py-2.5 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm disabled:opacity-50"
              />
              <button
                onClick={toggleVoiceInput}
                className={`rounded-full p-2 sm:p-2.5 transition-all ${
                  isListening 
                    ? 'bg-red-500 text-white animate-pulse' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                disabled={isTyping}
                aria-label={isListening ? "Stop recording" : "Start voice input"}
                title={isListening ? "Stop recording" : `Voice input (${voiceLanguage === 'en-US' ? 'English' : 'Filipino'})`}
              >
                {isListening ? <MicOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Mic className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>
              <button
                onClick={() => handleSendMessage()}
                className="bg-gradient-to-r from-emerald-600 to-yellow-600 text-white rounded-full p-2 sm:p-2.5 hover:opacity-90 transition-opacity disabled:opacity-50"
                disabled={!inputMessage.trim() || isTyping || isListening}
                aria-label="Send message"
              >
                <Send className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}