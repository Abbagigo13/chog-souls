// src/components/ChatPanel.jsx
import { useState, useEffect, useRef } from "react";

export default function ChatPanel({ messages, onSend, disabled }) {
  const [value, setValue] = useState("");
  const messagesEndRef = useRef(null);

  // Auto-scroll to the newest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = () => {
    const message = value.trim();
    if (!message || disabled) return;
    onSend(message);
    setValue("");
  };

  return (
    <section className="chat-panel">
      <div className="chat-messages">
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.from}`}>
            <span className="message-label">
              {message.from === "soul" ? "GIGA" : "YOU"}
            </span>
            <p>{message.text}</p>
          </div>
        ))}
        {disabled && (
          <div className="message soul thinking">
            <span className="message-label">GIGA</span>
            <p>
              <span className="typing-dots">
                <span>.</span>
                <span>.</span>
                <span>.</span>
              </span>
            </p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Talk to your Soul..."
          disabled={disabled}
        />
        <button onClick={send} disabled={disabled}>
          SEND
        </button>
      </div>
    </section>
  );
}