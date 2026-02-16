"use client"

import { useState, useEffect, useRef } from "react"
import { MessageCircle, X, Send, Loader2, Trash2, Calendar, RefreshCw, XCircle } from "lucide-react"
import { chatbotQuery } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import ReactMarkdown from 'react-markdown'

interface Message {
  id: string
  text: string
  sender: "user" | "bot"
  timestamp: Date
  quickReplies?: string[]
}

const quickActions = [
  { icon: Calendar, text: "📅 Book Appointment", message: "I want to book an appointment" },
  { icon: RefreshCw, text: "🔄 Reschedule", message: "I want to reschedule my appointment" },
  { icon: XCircle, text: "❌ Cancel", message: "I want to cancel my appointment" },
]

const defaultSuggestions = [
  "What dental services do you offer?",
  "Who are the dentists?",
  "What are your clinic hours?",
]

export default function ChatbotWidget() {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: string; content: string }>>([])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)

  // Load chat history from localStorage on mount and when user changes
  useEffect(() => {
    // Detect if user has changed
    if (user?.id && user.id !== currentUserId) {
      setCurrentUserId(user.id)
      // User changed, load their specific chat history
      const savedMessages = localStorage.getItem(`chatbot_messages_${user.id}`)
      const savedHistory = localStorage.getItem(`chatbot_history_${user.id}`)
      
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
    } else if (!user?.id && currentUserId !== null) {
      // User logged out, clear chat
      setCurrentUserId(null)
      initializeChat()
    } else if (!user?.id) {
      // No user, initialize chat normally
      const savedMessages = localStorage.getItem('chatbot_messages')
      const savedHistory = localStorage.getItem('chatbot_history')
      
      if (savedMessages && savedHistory) {
        try {
          const parsedMessages = JSON.parse(savedMessages)
          const parsedHistory = JSON.parse(savedHistory)
          
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
      } else if (messages.length === 0) {
        initializeChat()
      }
    }
  }, [user?.id])

  // Save chat history to localStorage whenever it changes (patient-specific)
  useEffect(() => {
    if (messages.length > 0) {
      if (user?.id) {
        localStorage.setItem(`chatbot_messages_${user.id}`, JSON.stringify(messages))
        localStorage.setItem(`chatbot_history_${user.id}`, JSON.stringify(conversationHistory))
      } else {
        localStorage.setItem('chatbot_messages', JSON.stringify(messages))
        localStorage.setItem('chatbot_history', JSON.stringify(conversationHistory))
      }
    }
  }, [messages, conversationHistory, user?.id])

  const initializeChat = () => {
    const welcomeMessage: Message = {
      id: "1",
      text: "Welcome to Dorotheo Dental Clinic! \n\nI'm **Sage**, your AI scheduling concierge. I can help you with:\n\n• **Book, reschedule, or cancel** appointments\n• Information about our dental services\n• Our dentists, clinics, and hours\n• General dental health questions\n\nHow may I assist you today?",
      sender: "bot",
      timestamp: new Date(),
    }
    setMessages([welcomeMessage])
    setConversationHistory([])
  }

  const handleDeleteHistory = () => {
    if (user?.id) {
      localStorage.removeItem(`chatbot_messages_${user.id}`)
      localStorage.removeItem(`chatbot_history_${user.id}`)
    } else {
      localStorage.removeItem('chatbot_messages')
      localStorage.removeItem('chatbot_history')
    }
    initializeChat()
    setShowDeleteConfirm(false)
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

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
          className="fixed bottom-6 right-6 z-50 bg-[var(--color-primary)] text-white rounded-full p-4 shadow-2xl hover:scale-110 transition-transform duration-300 group"
          aria-label="Open chat"
        >
          <MessageCircle className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 bg-[var(--color-primary-dark)] text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold border-2 border-white">
            S
          </span>
        </button>
      )}

      {/* Chat Window - Bigger size */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[480px] h-[700px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
          {/* Header */}
          <div className="bg-[var(--color-primary)] text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center border-2 border-white/30">
                <MessageCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold">Sage - AI Concierge</h3>
                <p className="text-xs text-white/80">Professional • Calming • Efficient</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="hover:bg-white/20 rounded-lg p-2 transition-colors"
                aria-label="Delete chat history"
                title="Delete chat history"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="hover:bg-white/20 rounded-lg p-2 transition-colors"
                aria-label="Close chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 rounded-2xl">
              <div className="bg-white rounded-xl p-6 m-4 max-w-sm">
                <h4 className="font-semibold text-lg mb-2">Delete Chat History?</h4>
                <p className="text-gray-600 text-sm mb-4">
                  This will permanently delete all your chat messages. This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteHistory}
                    className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((message) => (
              <div key={message.id}>
                <div className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      message.sender === "user"
                        ? "bg-[var(--color-primary)] text-white"
                        : "bg-white text-gray-800 border border-gray-200"
                    }`}
                  >
                    {message.sender === "bot" ? (
                      <div className="text-sm prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-li:my-0">
                        <ReactMarkdown>{message.text.replace(/<!--[\s\S]*?-->/g, '').trim()}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                    )}
                    <p
                      className={`text-xs mt-1 ${
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
                  <div className="flex justify-start mt-2 ml-2">
                    <div className="flex flex-wrap gap-2 max-w-[80%]">
                      {message.quickReplies.map((reply, index) => (
                        <button
                          key={index}
                          onClick={() => handleQuickReply(reply)}
                          disabled={isTyping}
                          className="text-xs bg-[var(--color-primary)] text-white px-3 py-2 rounded-full hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm"
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
                <div className="bg-white text-gray-800 rounded-2xl px-4 py-3 border border-gray-200 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-gray-600">AI is thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions & Suggestions */}
          <div className="p-3 bg-white border-t border-gray-200">
            <p className="text-xs text-gray-700 mb-2 font-semibold">Quick Actions:</p>
            <div className="grid grid-cols-3 gap-1.5 mb-3">
              {quickActions.map((action, index) => {
                const Icon = action.icon
                return (
                  <button
                    key={index}
                    onClick={() => handleQuickReply(action.message)}
                    disabled={isTyping}
                    className="flex items-center justify-center gap-1 text-xs bg-[var(--color-primary)] text-white px-2 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm font-medium"
                  >
                    <span>{action.text}</span>
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-gray-500 mb-1.5 font-medium">Or ask me:</p>
            <div className="flex flex-wrap gap-1.5">
              {defaultSuggestions.map((reply, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickReply(reply)}
                  disabled={isTyping}
                  className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  {reply}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="p-4 bg-white border-t border-gray-200">
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && !isTyping && handleSendMessage()}
                placeholder="Ask Sage about dental care..."
                disabled={isTyping}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm disabled:opacity-50"
              />
              <button
                onClick={() => handleSendMessage()}
                className="bg-[var(--color-primary)] text-white rounded-full p-2.5 hover:opacity-90 transition-opacity disabled:opacity-50"
                disabled={!inputMessage.trim() || isTyping}
                aria-label="Send message"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
