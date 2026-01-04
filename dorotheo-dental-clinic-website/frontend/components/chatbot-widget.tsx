"use client"

import { useState, useEffect, useRef } from "react"
import { MessageCircle, X, Send, Loader2, Trash2, Calendar, XCircle } from "lucide-react"
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
  { icon: Calendar, text: "Book an appointment", message: "I want to book an appointment" },
  { icon: Calendar, text: "Check availability", message: "Show me available appointment slots" },
  { icon: XCircle, text: "Cancel appointment", message: "I want to cancel my appointment" },
  { icon: Calendar, text: "Reschedule", message: "I need to reschedule my appointment" },
]

const quickReplies = [
  "What services do you offer?",
  "Show me available appointment slots",
  "What are your clinic hours?",
  "Tell me about dental procedures",
]

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: string; content: string }>>([])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

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
      text: "Hi there! 👋\nWelcome to Dorotheo Dental Clinic!\n\nI'm your AI dental assistant. I can help you with:\n\n• **Book, reschedule, or cancel appointments**\n• Information about our services\n• Available appointment slots\n• Clinic hours and location\n• General dental health questions\n\nHow can I help you today?",
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
        text: error.message.includes("Ollama") 
          ? "⚠️ I'm having trouble connecting to the AI service. Please try again or contact our clinic directly.\n\nYou can reach us at (123) 456-7890."
          : "Sorry, I encountered an error. Please try again or contact our clinic directly at (123) 456-7890.",
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
          className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-[var(--color-primary)] to-teal-600 text-white rounded-full p-4 shadow-2xl hover:scale-110 transition-transform duration-300 group"
          aria-label="Open chat"
        >
          <MessageCircle className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
            AI
          </span>
        </button>
      )}

      {/* Chat Window - Bigger size */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[480px] h-[700px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-[var(--color-primary)] to-teal-600 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <MessageCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold">AI Dental Assistant</h3>
                <p className="text-xs text-white/80">Always here to help</p>
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
                        ? "bg-gradient-to-r from-[var(--color-primary)] to-teal-600 text-white"
                        : "bg-white text-gray-800 border border-gray-200"
                    }`}
                  >
                    {message.sender === "bot" ? (
                      <div className="text-sm prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-li:my-0">
                        <ReactMarkdown>{message.text}</ReactMarkdown>
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
                          className="text-xs bg-gradient-to-r from-[var(--color-primary)] to-teal-600 text-white px-3 py-2 rounded-full hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm"
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

          {/* Quick Action Buttons (shown when no conversation or at start) */}
          {messages.length <= 1 && (
            <div className="p-4 bg-white border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-3 font-medium">Quick Actions:</p>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {initialQuickActions.map((action, index) => {
                  const Icon = action.icon
                  return (
                    <button
                      key={index}
                      onClick={() => handleQuickReply(action.message)}
                      disabled={isTyping}
                      className="flex items-center gap-2 text-xs bg-gradient-to-r from-[var(--color-primary)] to-teal-600 text-white px-3 py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm"
                    >
                      <Icon className="w-4 h-4" />
                      <span>{action.text}</span>
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-gray-500 mb-2 font-medium">Or ask me:</p>
              <div className="flex flex-wrap gap-2">
                {quickReplies.map((reply, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickReply(reply)}
                    disabled={isTyping}
                    className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    {reply}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 bg-white border-t border-gray-200">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && !isTyping && handleSendMessage()}
                placeholder="Ask me anything about dental care..."
                disabled={isTyping}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm disabled:opacity-50"
              />
              <button
                onClick={() => handleSendMessage()}
                className="bg-gradient-to-r from-[var(--color-primary)] to-teal-600 text-white rounded-full p-2.5 hover:opacity-90 transition-opacity disabled:opacity-50"
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