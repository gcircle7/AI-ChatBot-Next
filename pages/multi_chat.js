
import { useState } from 'react';

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  const handleSend = async () => {
    const newMessage = { user: '홍권 또는 영희', text: input };
    setMessages([...messages, newMessage]);
    setInput('');

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt: input }),
    });

    const data = await response.json();
    setMessages([...messages, newMessage, { user: 'AI', text: data.result }]);
  };

  return (
    <div>
      <div style={{ height: '300px', overflowY: 'scroll' }}>
        {messages.map((message, index) => (
          <div key={index}>
            <strong>{message.user}:</strong> {message.text}
          </div>
        ))}
      </div>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSend();
        }}
      />
      <button onClick={handleSend}>Send</button>
    </div>
  );
}