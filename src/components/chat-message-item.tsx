import React, {memo} from "react";
import {motion} from "framer-motion";
import ReactMarkdown from "react-markdown";
import rehypeThink from "@/lib/rehype-think";
import Think from "@/components/think";
import {ChatMessage} from "@/util/types";

interface ChatMessageProps {
    msg: ChatMessage;
    idx: number;
    thinkOpen: Record<number, boolean>;
    setThinkOpen: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
}

const ChatMessageItem: React.FC<ChatMessageProps> = memo(({msg, idx, thinkOpen, setThinkOpen}) => {
    return (
        <motion.div
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
