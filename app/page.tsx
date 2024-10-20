"use client";

import { useState, useEffect } from 'react';
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
    const [savedBlobIds, setSavedBlobIds] = useState<{[key: number]: string}>({});
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Load saved blobIds from localStorage on component mount
        const loadedBlobIds: {[key: number]: string} = {};
        personas.forEach(persona => {
            const blobId = localStorage.getItem(`persona_${persona.id}`);
            if (blobId) {
                loadedBlobIds[persona.id] = blobId;
            }
        });
        setSavedBlobIds(loadedBlobIds);
    }, []);

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

    const handleSave = async () => {
        try {
            const response = await axios.post('/api/save', { messages, persona: selectedPersona });
            if (response.data.success) {
                const { blobId, persona } = response.data;
                localStorage.setItem(`persona_${persona}`, blobId);
                setSavedBlobIds(prev => ({ ...prev, [persona]: blobId }));
                alert('Chat saved successfully!');
            } else {
                throw new Error(response.data.message);
            }
        } catch (error) {
            console.error('Error saving chat:', error);
            alert('Failed to save chat. Please try again.');
        }
    };

    const handleLoad = async () => {
        const blobId = savedBlobIds[selectedPersona];
        if (!blobId) {
            alert('No saved chat found for this persona.');
            return;
        }

        setIsLoading(true);
        try {
            const response = await axios.get(`/api/fetchBlob?blobId=${blobId}`);
            setMessages(response.data.messages);
            alert('Chat loaded successfully!');
        } catch (error) {
            console.error('Error loading chat:', error);
            alert('Failed to load chat. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="container mx-auto p-4">
            <h1 className="text-3xl font-bold mb-2">AnonTherapy</h1>
            <h2 className="text-xl font-semibold mb-6 text-gray-600 dark:text-gray-400">Touch grass, degen!</h2>
            <div className="mb-4 flex items-center flex-wrap">
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
                    className="bg-red-500 text-white p-2 rounded mr-2"
                >
                    Reset
                </button>
                <button
                    onClick={handleSave}
                    className="bg-green-500 text-white p-2 rounded mr-2"
                >
                    Save
                </button>
                <button
                    onClick={handleLoad}
                    className="bg-blue-500 text-white p-2 rounded"
                    disabled={isLoading || !savedBlobIds[selectedPersona]}
                >
                    {isLoading ? 'Loading...' : 'Load Saved Chat'}
                </button>
            </div>
            <div className="mb-4">
                {savedBlobIds[selectedPersona] && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Saved chat available for this persona (Blob ID: {savedBlobIds[selectedPersona]})
                    </p>
                )}
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 p-4 h-96 overflow-y-auto mb-4 rounded">
                {messages.map((message, index) => (
                    <div key={index} className={`mb-2 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
            <span className={`inline-block p-2 rounded-lg ${
                message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-300 dark:bg-gray-600 text-black dark:text-white'
            }`}>
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
                    className="flex-grow p-2 border rounded-l dark:bg-gray-700 dark:text-white"
                    placeholder="All my memecoins went to zero and my dog left me. I am so sad. :("
                />
                <button type="submit" className="bg-blue-500 text-white p-2 rounded-r">Send</button>
            </form>
        </main>
    );
}
