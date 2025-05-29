export type LocalModel = {
    name: string;
    modified_at: string;
    size: number;
    temporary?: boolean;
}

export type PullModelStatus = {
    message: string;
    digest: string | undefined;
    total: number | undefined;
    completed: number | undefined;
}

export enum MessageRole {
    user = "user",
    assistant = "assistant",
    system = "system"
}

export type ChatMessage = {
    role: MessageRole;
    content: string;
    image?: string;
    chatModeChange?: boolean; // Optional field to indicate mode change
}
