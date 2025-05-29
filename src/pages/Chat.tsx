import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from "@/components/ui/dialog.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Clock4, LoaderIcon, Plus, RefreshCcw, Send, Settings, Trash} from "lucide-react";
import {Separator} from "@/components/ui/separator.tsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {Badge} from "@/components/ui/badge.tsx";
import {formatModelSize} from "@/util/utils.ts";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip.tsx";
import {Input} from "@/components/ui/input.tsx";
import {ModeToggle} from "@/components/mode-toggle.tsx";
import {Card, CardContent} from "@/components/ui/card.tsx";
import {ScrollArea} from "@/components/ui/scroll-area.tsx";
import {motion} from "framer-motion";
import ReactMarkdown from "react-markdown";
import React, {useEffect, useRef, useState} from "react";
import {ChatMessage, LocalModel, MessageRole, PullModelStatus} from "@/util/types.ts";
import {useToast} from "@/components/ui/use-toast.ts";
import {invoke} from "@tauri-apps/api/core";

export function Chat() {
    const [messages, setMessages] = useState<ChatMessage[]>([{
        role: MessageRole.assistant,
        content: "Send a message to start...",
        chatModeChange: true
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
    const [chatMode, setChatMode] = useState<"call_ollama_api" | "call_ollama_chat">("call_ollama_api");

    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const {toast} = useToast()

    useEffect(() => {
        // scrollRef.current?.children[1] is the ScrollArea's content div
        scrollRef.current?.children[1].scrollTo({
            top: scrollRef.current?.children[1].scrollHeight,
            behavior: "instant"
        });
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
        let newMessages = [...messages, {role: MessageRole.user, content: input}];
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
                        role: MessageRole.user,
                        image: base64Data,
                        content: input + "  \n " + selectedFile.name
                    }]);
                    response = await invoke<string>("call_ollama_api_with_image", {
                        prompt: input,
                        model: selectedModel,
                        imageDataBase64: base64Data,
                    });
                    setMessages((currentMessages) => [...currentMessages, {
                        role: MessageRole.assistant,
                        content: response
                    }]);
                };
                reader.onerror = (error) => {
                    console.error("File reading error:", error);
                    setMessages((currentMessages) => [...currentMessages, {
                        role: MessageRole.assistant,
                        content: "Sorry, failed to read the image file."
                    },]);
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                };
                reader.readAsDataURL(selectedFile);

            } else {
                // Existing logic for text-only messages
                response = await invoke<string>(chatMode, {prompt: input, model: selectedModel});
                newMessages = [...newMessages, {role: MessageRole.assistant, content: response}];
                setMessages(newMessages);
            }

        } catch (error) {
            // This catch block handles errors from the initial invoke call for text-only messages
            // Image processing errors are handled within reader.onloadend/onerror
            if (!selectedFile) {
                newMessages = [...newMessages, {
                    role: MessageRole.assistant,
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
            if (result.length > 0 && (!selectedModel || selectedModel.length <= 0)) setSelectedModel(result[0].name);
        } catch (error) {
            setModels([]);
            toast({
                title: "Error",
                description: `Failed to fetch models: ${error}`,
                variant: "destructive"
            })
        }
    };

    const addModel = async (name: string) => {
        if (!name) return;
        try {
            const modelStatus = await invoke<PullModelStatus>("ollama_add_model", {name});
            toast({
                title: "Model Added",
                description: name + " is installed now." + (modelStatus.message?.length > 0 ? ` - ${modelStatus.message}` : ""),
            })
        } catch (error) {
            toast({
                title: "Error",
                description: `Failed to add model: ${error}`,
                variant: "destructive"
            });
        } finally {
            await fetchModels();
        }
    };

    const handleDeleteClick = (modelName: string) => {
        setModelToDelete(modelName);
        setShowDeleteDialog(true);
    };

    const handleConfirmDelete = async () => {
        if (modelToDelete) {
            try {
                await invoke("ollama_delete_model", {name: modelToDelete});
                await fetchModels();
                toast({
                    title: "Model Deleted",
                    description: `Model "${modelToDelete}" has been deleted.`,
                });
            } catch (error) {
                toast({
                    title: "Error",
                    description: `Failed to delete model: ${error}`,
                    variant: "destructive"
                })
            }
            setModelToDelete(null);
            setShowDeleteDialog(false);
        }
    };

    const handleCancelDelete = () => {
        setModelToDelete(null);
        setShowDeleteDialog(false);
    };

    const handleConfirmAdd = () => {
        if (newModelName) {
            addModel(newModelName); // purposely not awaiting to allow the dialog to close immediately
            setNewModelName("");
            setShowAddDialog(false);
            setTimeout(() =>
                fetchModels(), 250); // Refresh models after a short delay - this ensures the model download is in progress
        }
    };

    const handleCancelAdd = () => {
        setNewModelName("");
        setShowAddDialog(false);
    };

    const updateChatMode = (value: "call_ollama_api" | "call_ollama_chat") => {
        setChatMode(value);
        setMessages([...messages, {
            role: MessageRole.system,
            content: `Chat mode changed to ${value === "call_ollama_api" ? "Generate Mode" : "Chat Mode"}`,
            chatModeChange: true
        }])
    }

    useEffect(() => {
        fetchModels();
    }, []);

    return (
        <main className="container mx-auto max-w-4xl p-4 flex flex-col h-screen">
            <div className="flex gap-2 justify-between items-center mb-4">
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline"><Settings size={18}/></Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle className="font-bold text-xl">Settings</DialogTitle>
                        </DialogHeader>
                        <div className="p-2">
                            <h4 className="text-lg">General</h4>
                            <Separator className="my-2"></Separator>
                            <div className="flex flex-col gap-2">
                                <ul>
                                    <li className="flex justify-between items-center gap-2">
                                        <span>Chat Mode: </span>
                                        <Select value={chatMode}
                                                onValueChange={updateChatMode}>
                                            <SelectTrigger className="w-48">
                                                <SelectValue placeholder="Select Chat Mode"/>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="call_ollama_api">Generate
                                                    Mode</SelectItem>
                                                <SelectItem value="call_ollama_chat">Chat
                                                    Mode</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </li>
                                </ul>
                            </div>
                        </div>
                        <div className="p-2">
                            <h4 className="text-lg flex justify-between items-center">Manage Models
                                <Button variant="ghost" onClick={async (event) => {
                                    const el = event.currentTarget.children[0];
                                    el.classList.add("animate-spin")
                                    await fetchModels()
                                    setTimeout(() => {
                                        el.classList.remove("animate-spin")
                                    }, 500)
                                }}>
                                    <RefreshCcw size={16}></RefreshCcw></Button></h4>
                            <Separator className="my-2"></Separator>
                            <div className="flex flex-col gap-2">
                                {models.map((model) => (
                                    <div key={model.name} className="flex justify-between items-center">
                                                    <span className="flex items-center gap-2">{model.name}
                                                        <Badge variant="secondary">{formatModelSize(model.size)}</Badge></span>
                                        {
                                            model.temporary ? (
                                                <Tooltip delayDuration={0}>
                                                    <TooltipContent>Installing, this might take some
                                                        time...</TooltipContent>
                                                    <TooltipTrigger><Clock4
                                                        className="me-2"></Clock4></TooltipTrigger>
                                                </Tooltip>
                                            ) : (
                                                <Button onClick={() => handleDeleteClick(model.name)}
                                                        size="sm"
                                                        variant="destructive">
                                                    <Trash size={16} className={'text-white'}/>
                                                </Button>)
                                        }
                                    </div>
                                ))}
                                <Button onClick={() => setShowAddDialog(true)} className="mt-2"
                                        variant="outline">
                                    <Plus size={16} className="mr-1"/>Add Model
                                </Button>
                                <small className={'text-xs'}>Available Models <a
                                    className="text-gray-500 underline hover:cursor-pointer hover:text-blue-900"
                                    href={'https://ollama.com/library'}
                                    target="_blank" rel="noopener noreferrer">
                                    here
                                </a></small>
                            </div>
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
                            Are you sure you want to delete the model "{modelToDelete}"?<br/>
                            This action cannot be undone.
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={handleCancelDelete}>
                                Cancel
                            </Button>
                            <Button variant="destructive" className={'text-white'}
                                    onClick={handleConfirmDelete}>
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
                                placeholder="Enter model name - e.g. 'gemma3:1b'"
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
                    <Select value={selectedModel} onValueChange={(value => {
                        setSelectedModel(value)
                        setMessages([...messages, {
                            role: MessageRole.system,
                            content: `Model changed to ${value}`,
                            chatModeChange: true
                        }])
                    })}>
                        <SelectTrigger className="w-48">
                            <SelectValue placeholder="Select Model"/>
                        </SelectTrigger>
                        <SelectContent>
                            {models.filter(model => !model.temporary).map((model) => (
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
                                } ${
                                    msg.chatModeChange && "w-full text-xs text-center border-t border-secondary outline-none rounded-none!"
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
                    {loading ? "..." : "Send"}{loading ?
                    <LoaderIcon size="16px" className="ms-2 animate-spin"/> :
                    <Send size="16px" className="ms-2"/>}
                </Button>
            </div>
        </main>
    )
}
