import React from "react";
import {AnimatePresence, motion} from "framer-motion";

interface ThinkProps {
    children: React.ReactNode;
    open: boolean;
    onToggle: () => void;
    idx: number;
}

const Think: React.FC<ThinkProps> = ({children, open, onToggle, idx}) => {
    return (
        <div
            className={`inline-block align-middle text-[0.95em] mx-1`}
        >
            <button
                type="button"
                className={`flex items-center gap-1 cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-primary/60 px-1 py-0.5 rounded transition-colors duration-150 w-full`}
                aria-label={open ? "Hide thought" : "Show thought"}
                aria-expanded={open}
                onClick={onToggle}
            >
                <svg
                    className={`w-3 h-3 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <polyline points="5 3 11 8 5 13"/>
                </svg>
                <span className="text-xs font-medium">Think{open ? ':' : '...'}</span>
            </button>
            <AnimatePresence initial={true}>
                {open && (
                    <motion.div
                        key={"think-content-" + idx}
                        initial={{opacity: 0, scaleY: 0.95}}
                        animate={{opacity: 1, scaleY: 1}}
                        exit={{opacity: 0, scaleY: 0.95}}
                        transition={{duration: 0.25, ease: "easeInOut"}}
                        style={{originY: 0}}
                        className="overflow-hidden inline content-start break-normal text-wrap wrap-normal ml-2 rounded px-2 py-1 pb-2 text-muted-foreground text-[0.97em]"
                    >
                        {children}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Think;

