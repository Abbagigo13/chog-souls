// src/pages/Talk.jsx
import { useState } from "react";
import Avatar from "../components/Avatar";
import ChatPanel from "../components/ChatPanel";
import { playSound } from "../lib/sound";

export default function Talk({ soul, onChat, isThinking }) {
  const [localMessages, setLocalMessages] = useState([
    {
      from: "soul",
      text: "You're finally here. I was wondering what kind of human would wake me up.",
    },
  ]);
  const [pulse, setPulse] = useState(0);

  const handleSend = async (text) => {
    setLocalMessages((prev) => [...prev, { from: "user", text }]);

    const replyText = await onChat(text);

    if (replyText) {
      setLocalMessages((prev) => [...prev, { from: "soul", text: replyText }]);
      playSound("chatReply");
      setPulse((p) => p + 1); // triggers Avatar pulse
    }
  };

  return (
    <div className="page">
      <div className="page-title">
        <div>
          <p className="eyebrow">SOUL INTERFACE</p>
          <h1>Talk to {soul.name}</h1>
          <p>Your conversations can become memories.</p>
        </div>
        <Avatar size="medium" imageUrl={soul.imageUrl} pulse={pulse} />
      </div>

      <div className="memory-banner">
        <span className="pulse" />
        <div>
          <b>MEMORY IS ON</b>
          <p>Important interactions become part of the Soul.</p>
        </div>
      </div>

      <ChatPanel
        messages={localMessages}
        onSend={handleSend}
        disabled={isThinking}
      />
    </div>
  );
}