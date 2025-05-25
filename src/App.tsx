import "./App.css";
import React, {useState} from "react";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
import {ScrollArea} from "@/components/ui/scroll-area";
import {Separator} from "@/components/ui/separator";
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from "@/components/ui/dialog";
import {motion} from "framer-motion";
import {invoke} from "@tauri-apps/api/core";

function App() {
    const [messages, setMessages] = useState([
        {role: "assistant", content: "Hello! How can I help you today?"},
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [models, setModels] = useState<string>("");

    const handleSend = async () => {
        if (!input.trim()) return;

        const newMessages = [...messages, {role: "user", content: input}];
        setMessages(newMessages);
        setInput("");
        setLoading(true);

        try {
            const response = await invoke<string>("call_ollama_api", {prompt: input});
            setMessages([...newMessages, {role: "assistant", content: response}]);
        } catch (error) {
            setMessages([...newMessages, {role: "assistant", content: "Sorry, something went wrong."}]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            await handleSend();
        }
    };

    const fetchModels = async () => {
        try {
            const result = await invoke<string>("ollama_list");
            setModels(result);
        } catch (error) {
            setModels("Failed to load models.");
        }
    };

    return (
        <main className="container mx-auto max-w-lg p-4 flex flex-col h-screen">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-xl font-bold">AI Chat</h1>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button onClick={fetchModels} variant="outline">View Models</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Available Models</DialogTitle>
                        </DialogHeader>
                        <p>{models}</p>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="flex-1 overflow-hidden">
                <CardContent className="p-0 h-full">
                    <ScrollArea className="h-full p-4 space-y-4">
                        {messages.map((msg, idx) => (
                            <motion.div
                                key={idx}
                                initial={{opacity: 0, y: 10}}
                                animate={{opacity: 1, y: 0}}
                                transition={{duration: 0.2}}
                                className={`p-3 rounded-2xl max-w-[80%] ${
                                    msg.role === "user"
                                        ? "bg-blue-500 text-white self-end"
                                        : "bg-gray-200 text-black self-start"
                                }`}
                            >
                                {msg.content}
                            </motion.div>
                        ))}
                    </ScrollArea>
                </CardContent>
            </Card>

            <Separator className="my-4"/>

            <div className="flex gap-2 items-center">
                <Input
                    placeholder="Type your message..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e)}
                    aria-label="Chat input"
                />
                <Button onClick={handleSend} disabled={loading} aria-label="Send message">
                    {loading ? "..." : "Send"}
                </Button>
            </div>
        </main>
    );
}

export default App;
