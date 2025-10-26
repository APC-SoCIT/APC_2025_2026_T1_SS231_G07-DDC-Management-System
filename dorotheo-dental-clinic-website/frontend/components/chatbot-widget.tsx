"use client"

import { useState } from "react"
import { MessageCircle, X, Send } from "lucide-react"

interface Message {
  id: string
  text: string
  sender: "user" | "bot"
  timestamp: Date
}

const quickReplies = [
  "What services do you offer?",
  "How do I book an appointment?",
  "What are your clinic hours?",
  "I need to cancel my appointment",
  "Tell me about dental procedures",
  "How much does treatment cost?",
]

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hi there! 👋\nWelcome to Dorotheo Dental Clinic!\nHow can I help you today?",
      sender: "bot",
      timestamp: new Date(),
    },
  ])
  const [inputMessage, setInputMessage] = useState("")
  const [isTyping, setIsTyping] = useState(false)

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

    // Simulate AI response
    setTimeout(() => {
      const botResponse = getBotResponse(messageText)
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: botResponse,
        sender: "bot",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, botMessage])
      setIsTyping(false)
    }, 1000)
  }

  const getBotResponse = (userMessage: string): string => {
    const msg = userMessage.toLowerCase()

    if (msg.includes("service") || msg.includes("offer")) {
      return "We offer a wide range of dental services including:\n\n• Teeth Cleaning & Preventive Care\n• Dental Fillings & Restorations\n• Root Canal Treatment\n• Teeth Whitening\n• Orthodontics (Braces)\n• Dental Implants\n• Emergency Dental Care\n\nWould you like to know more about any specific service?"
    }

    if (msg.includes("book") || msg.includes("appointment") || msg.includes("schedule")) {
      return "To book an appointment:\n\n1. Go to the 'Appointments' section in your dashboard\n2. Click 'Book New Appointment'\n3. Select your preferred date and service\n4. Choose an available time slot\n\nOr you can call us at: (123) 456-7890\n\nWould you like me to guide you through the booking process?"
    }

    if (msg.includes("hours") || msg.includes("time") || msg.includes("open")) {
      return "Our clinic hours are:\n\n• Monday - Friday: 8:00 AM - 6:00 PM\n• Saturday: 9:00 AM - 3:00 PM\n• Sunday: Closed\n\nWe also offer emergency services 24/7 for urgent cases. How else can I help you?"
    }

    if (msg.includes("cancel")) {
      return "To cancel an appointment:\n\n1. Go to 'Appointments' in your dashboard\n2. Find your upcoming appointment\n3. Click 'Cancel Appointment'\n\nPlease note: Cancellations made less than 24 hours before the appointment may incur a fee.\n\nWould you like help with anything else?"
    }

    if (msg.includes("cost") || msg.includes("price") || msg.includes("fee")) {
      return "Our pricing varies depending on the service:\n\n• Routine Check-up: PHP 500\n• Teeth Cleaning: PHP 800\n• Dental Filling: PHP 1,500 - 3,000\n• Root Canal: PHP 5,000 - 8,000\n• Teeth Whitening: PHP 8,000\n\nFor specific pricing or to discuss payment plans, please contact our billing department or check your billing section.\n\nIs there anything else you'd like to know?"
    }

    if (msg.includes("procedure") || msg.includes("treatment")) {
      return "I can help you learn about our dental procedures! Which treatment are you interested in?\n\n• Root Canal Therapy\n• Dental Implants\n• Orthodontic Treatment\n• Teeth Whitening\n• Tooth Extraction\n• Crown & Bridge Work\n\nJust let me know which one you'd like to learn more about!"
    }

    if (msg.includes("hello") || msg.includes("hi") || msg.includes("hey")) {
      return "Hello! 👋 How can I assist you today? Feel free to ask me about:\n\n• Our services\n• Booking appointments\n• Clinic hours\n• Treatment costs\n• Dental procedures"
    }

    return "I'm here to help! I can assist you with:\n\n• Information about our dental services\n• Booking and managing appointments\n• Clinic hours and location\n• Treatment costs and billing\n• General dental health questions\n\nWhat would you like to know?"
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
        >
          <MessageCircle className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
            1
          </span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-96 h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-[var(--color-primary)] to-teal-600 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <MessageCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold">Dental Assistant</h3>
                <p className="text-xs text-white/80">Online • Always here to help</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-white/20 rounded-lg p-2 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    message.sender === "user"
                      ? "bg-gradient-to-r from-[var(--color-primary)] to-teal-600 text-white"
                      : "bg-white text-gray-800 border border-gray-200"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.text}</p>
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
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white text-gray-800 rounded-2xl px-4 py-3 border border-gray-200">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Replies */}
          {messages.length === 1 && (
            <div className="p-4 bg-white border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-2">Quick replies:</p>
              <div className="flex flex-wrap gap-2">
                {quickReplies.slice(0, 4).map((reply, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickReply(reply)}
                    className="text-xs bg-gradient-to-r from-[var(--color-primary)] to-teal-600 text-white px-3 py-1.5 rounded-full hover:opacity-90 transition-opacity"
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
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Write your message..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
              />
              <button
                onClick={() => handleSendMessage()}
                className="bg-gradient-to-r from-[var(--color-primary)] to-teal-600 text-white rounded-full p-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                disabled={!inputMessage.trim()}
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
