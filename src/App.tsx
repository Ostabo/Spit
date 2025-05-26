import "./App.css";
import React, {useEffect, useRef, useState} from "react";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
import {ScrollArea} from "@/components/ui/scroll-area";
import {Separator} from "@/components/ui/separator";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from "@/components/ui/dialog";
import {Plus, Settings, Trash} from "lucide-react";
import {motion} from "framer-motion";
import {invoke} from "@tauri-apps/api/core";
import ReactMarkdown from "react-markdown";
import {Badge} from "@/components/ui/badge.tsx";
import {ThemeProvider} from "@/components/theme-provider.tsx";
import {ModeToggle} from "@/components/mode-toggle.tsx";

type LocalModel = {
    name: string;
    modified_at: string;
    size: number;
}


function App() {
    const [messages, setMessages] = useState<{ role: string, content: string, image?: string }[]>([{
        role: "assistant",
        content: "Send a message to start..."
    }]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [models, setModels] = useState<LocalModel[]>([]);
    const [selectedModel, setSelectedModel] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [modelToDelete, setModelToDelete] = useState<string | null>(null);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [newModelName, setNewModelName] = useState("");

    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        scrollRef.current?.scrollTo({top: scrollRef.current.scrollHeight, behavior: "smooth"});
    }, [messages]);

    const handleButtonClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedFile(file);
        }
    };

    const handleSend = async () => {
        if (!input.trim() && !selectedFile) return; // Don't send if both input and file are empty
        setLoading(true);
        let newMessages = [...messages, {role: "user", content: input}];
        setMessages(newMessages);
        setInput("");

        try {
            let response: string;
            if (selectedFile) {
                const reader = new FileReader();
                reader.onloadend = async () => {
                    const base64String = reader.result as string;
                    // Remove the data URL prefix if present
                    const base64Data = base64String.split(',')[1] || base64String;
                    setMessages([...messages, {
                        role: "user",
                        image: base64Data,
                        content: input + "  \n " + selectedFile.name
                    }]);
                    response = await invoke<string>("call_ollama_api_with_image", {
                        prompt: input,
                        model: selectedModel,
                        imageDataBase64: base64Data,
                    });
                    setMessages((currentMessages) => [...currentMessages, {role: "assistant", content: response}]);
                };
                reader.onerror = (error) => {
                    console.error("File reading error:", error);
                    setMessages((currentMessages) => [...currentMessages, {
                        role: "assistant",
                        content: "Sorry, failed to read the image file."
                    },]);
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                };
                reader.readAsDataURL(selectedFile);

            } else {
                // Existing logic for text-only messages
                response = await invoke<string>("call_ollama_api", {prompt: input, model: selectedModel});
                newMessages = [...newMessages, {role: "assistant", content: response}];
                setMessages(newMessages);
            }

        } catch (error) {
            // This catch block handles errors from the initial invoke call for text-only messages
            // Image processing errors are handled within reader.onloadend/onerror
            if (!selectedFile) {
                newMessages = [...newMessages, {
                    role: "assistant",
                    content: `Sorry, something went wrong:  \n ${error}`
                }];
                setMessages(newMessages);
            }
        } finally {
            setLoading(false);
            setSelectedFile(null); // Clear the selected file after sending
            if (fileInputRef.current) fileInputRef.current.value = ""; // Clear the file input
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
            const result = await invoke<LocalModel[]>("ollama_list");
            setModels(result);
            if (result.length > 0) setSelectedModel(result[0].name);
        } catch (error) {
            setModels([]);
        }
    };

    const addModel = async (name: string) => {
        if (!name) return;
        await invoke("ollama_add_model", {name});
        await fetchModels();
    };

    const deleteModel = async (name: string) => {
        await invoke("ollama_delete_model", {name});
        await fetchModels();
    };

    const handleDeleteClick = (modelName: string) => {
        setModelToDelete(modelName);
        setShowDeleteDialog(true);
    };

    const handleConfirmDelete = async () => {
        if (modelToDelete) {
            await deleteModel(modelToDelete);
            setModelToDelete(null);
            setShowDeleteDialog(false);
        }
    };

    const handleCancelDelete = () => {
        setModelToDelete(null);
        setShowDeleteDialog(false);
    };

    const handleConfirmAdd = async () => {
        if (newModelName) {
            await addModel(newModelName);
            setNewModelName("");
            setShowAddDialog(false);
        }
    };

    const handleCancelAdd = () => {
        setNewModelName("");
        setShowAddDialog(false);
    };

    fetchModels()

    return (
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
            <main className="container mx-auto max-w-4xl p-4 flex flex-col h-screen">
                <div className="flex gap-2 justify-between items-center mb-4">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline"><Settings size={18}/></Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Manage Models</DialogTitle>
                            </DialogHeader>
                            <div className="flex flex-col gap-2">
                                {models.map((model) => (
                                    <div key={model.name} className="flex justify-between items-center">
                                        <span>{model.name}</span>
                                        <div className="flex gap-1">
                                            <Button onClick={() => handleDeleteClick(model.name)} size="sm"
                                                    variant="destructive">
                                                <Trash size={16} className={'text-white'}/>
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                <Button onClick={() => setShowAddDialog(true)} className="mt-2" variant="outline">
                                    <Plus size={16} className="mr-1"/>Add Model
                                </Button>
                                <small className={'text-xs'}>Available Models <a
                                    className="text-gray-500 underline hover:cursor-pointer hover:text-blue-900"
                                    href={'https://ollama.com/library'}
                                    target="_blank" rel="noopener noreferrer">
                                    here
                                </a></small>
                            </div>
                        </DialogContent>
                    </Dialog>

                    {/* Delete Confirmation Dialog */}
                    <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Confirm Deletion</DialogTitle>
                            </DialogHeader>
                            <div>
                                Are you sure you want to delete the model "{modelToDelete}"? This action cannot be
                                undone.
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={handleCancelDelete}>
                                    Cancel
                                </Button>
                                <Button variant="destructive" className={'text-white'} onClick={handleConfirmDelete}>
                                    Delete
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>

                    {/* Add Model Dialog */}
                    <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New Model</DialogTitle>
                            </DialogHeader>
                            <div className="flex flex-col gap-2">
                                <Input
                                    placeholder="Enter model name"
                                    value={newModelName}
                                    onChange={(e) => setNewModelName(e.target.value)}
                                />
                                <div className="flex justify-end gap-2">
                                    <Button variant="outline" onClick={handleCancelAdd}>
                                        Cancel
                                    </Button>
                                    <Button onClick={handleConfirmAdd} disabled={!newModelName}>
                                        Add
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>

                    <div className="flex gap-2">
                        <Select value={selectedModel} onValueChange={setSelectedModel}>
                            <SelectTrigger className="w-48">
                                <SelectValue placeholder="Select Model"/>
                            </SelectTrigger>
                            <SelectContent>
                                {models.map((model) => (
                                    <SelectItem key={model.name} value={model.name}>
                                        {model.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <ModeToggle/>
                    </div>
                </div>

                <Card className="flex-1 overflow-hidden">
                    <CardContent className="p-0 h-full">
                        <ScrollArea className="h-full p-4 flex flex-col gap-2" ref={scrollRef}>
                            {messages.map((msg, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{opacity: 0, y: 10}}
                                    animate={{opacity: 1, y: 0}}
                                    transition={{duration: 0.2}}
                                    className={`markdown-content m-2 p-2 rounded-xl whitespace-pre-wrap break-all min-w-auto max-w-[90%] outline ${
                                        msg.role === "user"
                                            ? "justify-self-end"
                                            : "outline-sidebar-primary justify-self-start"
                                    }`}
                                >
                                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                                    {msg.image && (
                                        <img
                                            src={`data:image/png;base64,${msg.image}`}
                                            alt="User uploaded content"
                                            className="max-w-full h-auto mb-2 rounded-lg"
                                        />
                                    )}
                                </motion.div>
                            ))}
                        </ScrollArea>
                    </CardContent>
                </Card>

                <Separator className="my-4"/>

                <div className="flex gap-2 items-center">
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{display: 'none'}}
                        onChange={handleFileSelect}
                        accept="image/png,image/jpeg,image/jpg"
                    />
                    <Button onClick={handleButtonClick} variant={'outline'}><Plus size={16}/></Button>
                    {
                        selectedFile ? (
                            <Badge className={'h-10'} variant={'secondary'}>
                                {selectedFile.name}
                                <Trash size={16} onClick={() => setSelectedFile(null)}/>
                            </Badge>
                        ) : (<></>)
                    }
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
        </ThemeProvider>
    );
}

export default App;
