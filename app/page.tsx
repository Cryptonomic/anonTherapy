"use client";

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Image from 'next/image';
import Link from 'next/link';
import { ethers, parseEther } from 'ethers';
import { DynamicContextProvider, DynamicWidget, useDynamicContext, useIsLoggedIn, UserProfile } from '@dynamic-labs/sdk-react-core';
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";

const personas = [
    { id: 1, name: "Eccentric Psychoanalyst" },
    { id: 2, name: "Crypto Degen CBT Therapist" },
    { id: 3, name: "Normie Therapist" },
    { id: 4, name: "Dr. Scoob" }
];

const initialMessage = "All my memecoins went to zero and my dog left me. I am so sad. :(";

const FUND_KEY = process.env.NEXT_PUBLIC_FUND_KEY;

async function sendEthereum(toAddress: string, amount: string): Promise<string> {
    const privateKey = FUND_KEY;
    if (!privateKey) {
        throw new Error('Private key not found in environment variables');
    }

    const provider = new ethers.JsonRpcProvider('https://testnet.evm.nodes.onflow.org');
    const wallet = new ethers.Wallet(privateKey, provider);

    const tx = {
        to: toAddress,
        value: parseEther(amount)
    };

    try {
        const transaction = await wallet.sendTransaction(tx);
        console.log('Transaction sent:', transaction.hash);

        const receipt = await transaction.wait();
        console.log('Transaction confirmed in block:', receipt.blockNumber);

        return transaction.hash;
    } catch (error) {
        console.error('Error sending transaction:', error);
        throw error;
    }
}

const Dynamic = () => {
    const { handleLogOut, primaryWallet } = useDynamicContext();
    const isLoggedIn = useIsLoggedIn();
    const [balance, setBalance] = useState<string | null>(null);

    useEffect(() => {
        if (isLoggedIn && primaryWallet) {
            primaryWallet.getBalance().then((balance) => {
                if (balance) {
                    setBalance(balance.toString());
                    if (balance === "0") {
                        console.log("Zero Balance");
                        sendEthereum(primaryWallet.address, "0.1")
                            .then(() => console.log("Sent"))
                            .catch((error) => console.error("Error sending Ethereum:", error));
                    }
                }
            });
        }
    }, [isLoggedIn, primaryWallet]);

    if (isLoggedIn) {
        return (
            <div>
                <button type='button' onClick={handleLogOut}>
                    Log Out
                </button>
            </div>
        );
    }

    return (
        <div>
            <DynamicWidget variant='modal' />
        </div>
    );
};

function HomeContent() {
    const [input, setInput] = useState(initialMessage);
    const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
    const [selectedPersona, setSelectedPersona] = useState(1);
    const [savedBlobIds, setSavedBlobIds] = useState<Record<number, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const { primaryWallet } = useDynamicContext();

    useEffect(() => {
        const loadedBlobIds: Record<number, string> = {};
        personas.forEach(persona => {
            const blobId = localStorage.getItem(`persona_${persona.id}`);
            if (blobId) {
                loadedBlobIds[persona.id] = blobId;
            }
        });
        setSavedBlobIds(loadedBlobIds);
    }, []);

    useEffect(() => {
        const fetchBlobIds = async () => {
            if (primaryWallet && primaryWallet.address) {
                for (const persona of personas) {
                    try {
                        const response = await axios.get(`/api/retrieve-blobid?address=${primaryWallet.address}&persona=${persona.id}`);
                        if (response.data.success) {
                            console.log(`BlobId for persona ${persona.name} (ID: ${persona.id}):`, response.data.blobId);
                        } else {
                            console.log(`No BlobId found for persona ${persona.name} (ID: ${persona.id})`);
                        }
                    } catch (error) {
                        console.error(`Error retrieving BlobId for persona ${persona.name} (ID: ${persona.id}):`, error);
                    }
                }
            } else {
                console.log('Wallet not connected. Unable to retrieve BlobIds.');
            }
        };

        fetchBlobIds();
    }, [primaryWallet]);

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

    const handleReset = useCallback(() => {
        setMessages([]);
        setInput(initialMessage);
    }, []);

    const handlePersonaChange = useCallback((newPersona: number) => {
        setSelectedPersona(newPersona);
        handleReset();
    }, [handleReset]);

    const handleSave = useCallback(async () => {
        if (!primaryWallet || !primaryWallet.address) {
            alert('Wallet not connected');
            return;
        }

        setIsSaving(true);
        try {
            console.log("Saving to Walrus")
            const saveResponse = await axios.post('/api/save', { messages, persona: selectedPersona });
            if (saveResponse.data.success) {
                console.log("Saved to Walrus")
                const { blobId, persona } = saveResponse.data;

                console.log("Storing to Flow")
                const storeBlobResponse = await axios.post('/api/store-blobid', {
                    address: primaryWallet.address,
                    persona: persona.toString(),
                    blobId: blobId
                });

                if (storeBlobResponse.data.success) {
                    console.log("Stored to Flow.")
                    localStorage.setItem(`persona_${persona}`, blobId);
                    setSavedBlobIds(prev => ({ ...prev, [persona]: blobId }));
                    alert('Chat saved successfully and stored on-chain!');
                } else {
                    console.log("Couldn't store to Flow.")
                    throw new Error(storeBlobResponse.data.message);
                }
            } else {
                console.log("Couldn't save to Walrus.")
                throw new Error(saveResponse.data.message);
            }
        } catch (error) {
            console.error('Error saving chat:', error);
            alert('Failed to save chat or store on-chain. Please try again.');
        } finally {
            setIsSaving(false);
        }
    }, [messages, selectedPersona, primaryWallet]);

    const handleLoad = useCallback(async () => {
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
    }, [savedBlobIds, selectedPersona]);

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
                    <div className="ml-auto">
                        <Dynamic />
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
                Made with 🥰 by <Link href="https://cryptonomic.tech/" className="text-[#88A700] hover:underline">Cryptonomic</Link> &nbsp; |
                &nbsp; <Link href="https://github.com/Cryptonomic/anonTherapy/blob/main/README.md" className="text-[#88A700] hover:underline">About the Project</Link>
            </footer>
        </main>
    );
}

export default function Home() {
    return (
        <DynamicContextProvider
            settings={{
                environmentId: 'da43eec4-0253-4950-b5fe-741236182249',
                walletConnectors: [EthereumWalletConnectors],
                onAuthSuccess: ({ user }: { user: UserProfile }) => {
                    console.log(`Welcome ${user.email}`);
                    // window.location.assign('/success');
                },
            }}
        >
            <HomeContent />
        </DynamicContextProvider>
    );
}
