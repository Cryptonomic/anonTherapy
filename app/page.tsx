"use client";

import { useState } from 'react';
import axios from 'axios';

const personas = [
    { id: 1, name: "Eccentric German Psychoanalyst" },
    { id: 2, name: "Crypto Degen CBT Therapist" },
    { id: 3, name: "Straight-Laced Judgmental Therapist" },
    { id: 4, name: "Secret Dog Therapist" }
];

export default function Home() {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
    const [selectedPersona, setSelectedPersona] = useState(1);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage = { role: 'user', content: input };
        setMessages((prevMessages) => [...prevMessages, userMessage]);
        setInput('');

        try {
            const response = await axios.post('/api/chat', { message: input, persona: selectedPersona });
            const assistantMessage = { role: 'assistant', content: response.data.message };
            setMessages((prevMessages) => [...prevMessages, assistantMessage]);
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const handleReset = () => {
        setMessages([]);
        setInput('');
    };

    const handlePersonaChange = (newPersona: number) => {
        setSelectedPersona(newPersona);
        handleReset();
    };

    return (
        <main className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">AnonTherapy Chat</h1>
            <div className="mb-4 flex items-center">
                <label htmlFor="persona-select" className="mr-2">Select Therapist Persona:</label>
                <select
                    id="persona-select"
                    value={selectedPersona}
                    onChange={(e) => handlePersonaChange(Number(e.target.value))}
                    className="p-2 border rounded mr-2"
                >
                    {personas.map(persona => (
                        <option key={persona.id} value={persona.id}>{persona.name}</option>
                    ))}
                </select>
                <button
                    onClick={handleReset}
                    className="bg-red-500 text-white p-2 rounded"
                >
                    Reset Chat
                </button>
            </div>
            <div className="bg-gray-100 p-4 h-96 overflow-y-auto mb-4">
                {messages.map((message, index) => (
                    <div key={index} className={`mb-2 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
            <span className={`inline-block p-2 rounded-lg ${message.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-300'}`}>
              {message.content}
            </span>
                    </div>
                ))}
            </div>
            <form onSubmit={handleSubmit} className="flex">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="flex-grow p-2 border rounded-l"
                    placeholder="All my memecoins went to zero and my dog left me. I am so sad. :("
                />
                <button type="submit" className="bg-blue-500 text-white p-2 rounded-r">Send</button>
            </form>
        </main>
    );
}
