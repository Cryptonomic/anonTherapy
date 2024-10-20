"use client";

import { useState, useEffect } from 'react';
import axios from 'axios';
import Image from 'next/image';
import Link from 'next/link';

const personas = [
    { id: 1, name: "Eccentric Psychoanalyst" },
    { id: 2, name: "Crypto Degen CBT Therapist" },
    { id: 3, name: "Normie Therapist" },
    { id: 4, name: "Dr. Scoob" }
];

const initialMessage = "All my memecoins went to zero and my dog left me. I am so sad. :(";

export default function Home() {
    const [input, setInput] = useState(initialMessage);
    const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
    const [selectedPersona, setSelectedPersona] = useState(1);
    const [savedBlobIds, setSavedBlobIds] = useState<Record<number, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        // Load saved blobIds from localStorage on component mount
        const loadedBlobIds: Record<number, string> = {};
        personas.forEach(persona => {
            const blobId = localStorage.getItem(`persona_${persona.id}`);
            if (blobId) {
                loadedBlobIds[persona.id] = blobId;
            }
        });
        setSavedBlobIds(loadedBlobIds);
    }, []);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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
        setInput(initialMessage);
    };

    const handlePersonaChange = (newPersona: number) => {
        setSelectedPersona(newPersona);
        handleReset();
    };

    const handleSave = async () => {
        setIsSaving(true);
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
        } finally {
            setIsSaving(false);
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
        <main className="container mx-auto p-4 flex flex-col min-h-screen">
            <div className="flex-grow">
                <div className="flex items-center mb-6">
                    <Image
                        src="/raccoon-logo.png"
                        alt="AnonTherapy Logo"
                        width={80}
                        height={80}
                        className="rounded-full mr-4"
                    />
                    <div>
                        <h1 className="text-3xl font-bold">Anon Therapy</h1>
                        <h2 className="text-xl font-semibold text-gray-600 dark:text-gray-400">Touch grass, degen!</h2>
                    </div>
                </div>
                <div className="mb-4 flex items-center flex-wrap">
                    <label htmlFor="persona-select" className="mr-2">Select Therapist Persona:</label>
                    <select
                        id="persona-select"
                        value={selectedPersona}
                        onChange={(e) => handlePersonaChange(Number(e.target.value))}
                        className="p-2 border rounded mr-2 bg-white dark:bg-gray-700 text-black dark:text-white"
                    >
                        {personas.map(persona => (
                            <option key={persona.id} value={persona.id}>{persona.name}</option>
                        ))}
                    </select>
                    <button
                        onClick={handleReset}
                        className="bg-[#3D2906] text-white p-2 rounded mr-2"
                    >
                        Reset
                    </button>
                    <button
                        onClick={handleSave}
                        className={`${isSaving ? 'bg-gray-500' : 'bg-[#88A700]'} text-white p-2 rounded mr-2`}
                        disabled={isSaving}
                    >
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                    {savedBlobIds[selectedPersona] && (
                        <button
                            onClick={handleLoad}
                            className="bg-[#698101] text-white p-2 rounded"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Loading...' : 'Load Saved Chat'}
                        </button>
                    )}
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
                                    ? 'bg-[#88A700] text-white'
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
                        placeholder={initialMessage}
                    />
                    <button type="submit" className="bg-[#88A700] text-white p-2 rounded-r">Send</button>
                </form>
            </div>
            <footer className="mt-8 text-center text-gray-600 dark:text-gray-400">
                Made with 🥰 by <Link href="https://cryptonomic.tech/" className="text-[#88A700] hover:underline">Cryptonomic</Link>
            </footer>
        </main>
    );
}
