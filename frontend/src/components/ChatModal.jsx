import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

// SVG Icon Components (retained for brevity)
const CloseIcon = ({ className = "w-6 h-6" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
    </svg>
);

const SendIcon = ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 16.571V11.5a1 1 0 011-1h.094a1 1 0 01.997.923l.003.007v5.071a1 1 0 00.788.972l5 1.428a1 1 0 001.17-1.408l-7-14z"></path>
    </svg>
);

// ChatModal Component
const ChatModal = ({ isOpen, onClose }) => {
    const [message, setMessage] = useState('');
    const [chatMessages, setChatMessages] = useState([
        { id: "initial-1", text: "Hello there! How can I help you today?", sender: "other", time: "10:00 AM" },
    ]);
    const [isLoading, setIsLoading] = useState(false); // To indicate API call in progress
    const chatEndRef = useRef(null); // For scrolling to the bottom

    const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

    // Effect to prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // Effect to scroll to the bottom of the chat messages
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);


    // Handle sending a message
    const handleSendMessage = async (e) => {
        e.preventDefault();
        const userMessageText = message.trim();
        if (userMessageText === '') return;

        // Add user's message to chat
        const userMessage = {
            id: `user-${Date.now()}`,
            text: userMessageText,
            sender: "me",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setChatMessages(prevMessages => [...prevMessages, userMessage]);
        setMessage(''); // Clear input field
        setIsLoading(true); // Set loading state

        try {
            // API call to /nlp/chat
            const response = await fetch(`${API_URL}/nlp/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: userMessageText }),
            });

            if (!response.ok) {
                // If response is not OK, try to parse error from backend if available
                let errorData;
                try {
                    errorData = await response.json();
                } catch (parseError) {
                    // If response is not JSON, use status text
                    throw new Error(response.statusText || `API request failed with status ${response.status}`);
                }
                throw new Error(errorData.error || errorData.message || `API request failed with status ${response.status}`);
            }

            const data = await response.json();

            const botReplyText = data.response || data.message || "Sorry, I couldn't get a response.";

            const botMessage = {
                id: `bot-${Date.now()}`,
                text: botReplyText,
                sender: "other",
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            setChatMessages(prevMessages => [...prevMessages, botMessage]);

        } catch (error) {
            console.error("Failed to send message or get reply:", error);
            const errorMessage = {
                id: `error-${Date.now()}`,
                text: `Error: ${error.message || "Could not connect to the server."}`,
                sender: "other", // Display error as a system/bot message
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isError: true, // Custom flag for styling if needed
            };
            setChatMessages(prevMessages => [...prevMessages, errorMessage]);
        } finally {
            setIsLoading(false); // Reset loading state
        }
    };

    if (!isOpen) return null;
    const portalRoot = document.body;

    return createPortal(
        <div
            className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 lg:p-8 z-50 transition-opacity duration-300 ease-in-out font-inter"
            onClick={onClose}
        >
            <div
                className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg h-[80vh] sm:h-[75vh] md:h-[70vh] flex flex-col overflow-hidden transform transition-all duration-300 ease-in-out scale-95 opacity-0 animate-modalShow"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-4 sm:p-5 border-b border-gray-200 flex justify-between items-center bg-gray-800 rounded-t-xl">
                    <h2 className="text-lg sm:text-xl font-semibold text-white">AI Live Chat</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
                        aria-label="Close chat modal"
                    >
                        <CloseIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                </div>

                <div className="flex-1 p-4 sm:p-6 space-y-4 overflow-y-auto bg-gray-900">
                    {chatMessages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[70%] p-3 rounded-xl shadow ${msg.isError
                                        ? 'bg-red-100 text-red-700 border border-red-300 rounded-bl-none' // Error message style
                                        : msg.sender === 'me'
                                            ? 'bg-blue-500 text-white rounded-br-none'
                                            : 'bg-gray-400 text-gray-700 rounded-bl-none border border-gray-200'
                                    }`}
                            >
                                <p className="text-sm whitespace-pre-wrap text-black">{msg.text}</p> {/* whitespace-pre-wrap to respect newlines from API */}
                                <p className={`text-xs mt-1 ${msg.isError ? 'text-red-400' :
                                        msg.sender === 'me' ? 'text-blue-200' : 'text-gray-900'
                                    } ${msg.sender === 'me' || msg.isError ? 'text-right' : 'text-left'}`}
                                >
                                    {msg.time}
                                </p>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="max-w-[70%] p-3 rounded-xl shadow bg-gray-200 text-gray-500 rounded-bl-none">
                                <p className="text-sm italic">AI is typing...</p>
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} /> {/* Scroll anchor */}
                </div>

                <form onSubmit={handleSendMessage} className="p-4 sm:p-5 border-t border-gray-200 bg-gray-800 rounded-b-xl">
                    <div className="flex items-center space-x-2 sm:space-x-3">
                        <input
                            type="text"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Type your message..."
                            className="flex-1 p-3 border text-white border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow text-sm sm:text-base"
                            aria-label="Chat message input"
                            disabled={isLoading} // Disable input while loading
                        />
                        <button
                            type="submit"
                            className="px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center justify-center shadow hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Send message"
                            disabled={isLoading} // Disable button while loading
                        >
                            {isLoading ? (
                                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                <SendIcon className="w-5 h-5 hidden sm:inline" />
                            )}
                            <span className="sm:hidden">{isLoading ? 'Sending...' : 'Send'}</span>
                            <span className="ml-0 sm:ml-2 hidden sm:inline">{isLoading ? 'Sending...' : 'Send'}</span>
                        </button>
                    </div>
                </form>
            </div>
            <style jsx global>{`
        @keyframes modalShow {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .animate-modalShow {
          animation: modalShow 0.3s ease-out forwards;
        }
        body {
          font-family: 'Inter', sans-serif;
        }
      `}</style>
        </div>,
        portalRoot
    );
};

export default ChatModal;