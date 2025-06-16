import React, {memo, useRef, useState} from "react";
import {motion} from "framer-motion";
import ReactMarkdown from "react-markdown";
import rehypeThink from "@/lib/rehype-think";
import Think from "@/components/think";
import {ChatMessage} from "@/util/types";
import Prism from "prismjs";
import "prismjs/themes/prism.css";
import "prismjs/components/prism-python";
import {Check, Copy} from "lucide-react";
import {toast} from "@/components/ui/use-toast.ts";

interface ChatMessageProps {
    msg: ChatMessage;
    idx: number;
    thinkOpen: Record<number, boolean>;
    setThinkOpen: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
}

const ChatMessageItem: React.FC<ChatMessageProps> = memo(({msg, idx, thinkOpen, setThinkOpen}) => {
    // For copy feedback
    const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
    const markdownRef = useRef<HTMLDivElement>(null);

    // Copy handler
    const handleCopy = async (code: string, codeIdx: number) => {
        try {
            await navigator.clipboard.writeText(code);
            setCopiedIdx(codeIdx);
            setTimeout(() => setCopiedIdx(null), 1500);
        } catch (e) {
            toast({
                title: "Failed to copy",
                description: "Code could not be copied: " + e,
                variant: "destructive"
            });
        }
    };

    let codeBlockIdx = 0; // For unique indices with multiple code blocks

    return (
        <motion.div
            initial={{opacity: 0, y: 10}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.2}}
            className={`markdown-content m-2 p-2 rounded-xl whitespace-pre-wrap break-normal min-w-auto max-w-[90%] outline ${
                msg.role === "user"
                    ? "justify-self-end"
                    : "outline-muted-foreground justify-self-start"
            } ${
                msg.chatModeChange && "w-full text-xs text-center border-t border-secondary outline-none rounded-none!"
            }`}
            ref={markdownRef}
        >
            <ReactMarkdown
                rehypePlugins={[rehypeThink]}
                components={{
                    // @ts-expect-error
                    think: (props) => (
                        <Think open={thinkOpen[idx]}
                               idx={idx}
                               onToggle={() => setThinkOpen(prev => ({
                                   ...prev,
                                   [idx]: !prev[idx]
                               }))}
                        >
                            {props.children}
                        </Think>
                    ),
                    code: ({node, className, children, ...props}) => {
                        const match = /language-(\w+)/.exec(className || "");
                        const codeStr = String(children).replace(/\n$/, "");
                        const lang = match ? match[1] : undefined;
                        const thisIdx = codeBlockIdx++;
                        // Prism Highlighting
                        let highlighted = codeStr;
                        if (lang && Prism.languages[lang]) {
                            highlighted = Prism.highlight(codeStr, Prism.languages[lang], lang);
                        }
                        return (
                            <div className="relative group my-2">
                                {lang && (
                                    <span
                                        className="absolute top-2 left-2 text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded z-10 select-none opacity-0 group-hover:opacity-80 transition-opacity">
                                        {lang}
                                    </span>
                                )}
                                <button
                                    className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-0.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
                                    onClick={() => handleCopy(codeStr, thisIdx)}
                                    type="button"
                                >
                                    {copiedIdx === thisIdx ?
                                        <span className="flex gap-1 items-center">Copied <Check size={12}/></span> :
                                        <Copy size={12}/>}
                                </button>
                                <pre
                                    className={className + " rounded-lg bg-gray-50 dark:bg-gray-900 p-3 overflow-x-auto"}>
                                    <code
                                        {...props}
                                        className={className ? className + " text-sm" : "language-none text-sm"}
                                        dangerouslySetInnerHTML={{__html: highlighted}}
                                    />
                                </pre>
                            </div>
                        );
                    },
                    p: ({children}) => (<div>{children}</div>),
                }}
            >
                {msg.content}
            </ReactMarkdown>
            {msg.image && (
                <img
                    src={`data:image/png;base64,${msg.image}`}
                    alt="User uploaded content"
                    className="max-w-full h-auto mb-2 rounded-lg"
                />
            )}
        </motion.div>
    );
});

export default ChatMessageItem;
