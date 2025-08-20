import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, MessageSquare } from 'lucide-react';
import { Conversation } from '@/util/types';

interface ConversationSidebarProps {
    conversations: Conversation[];
    currentConversationId: string | null;
    onNewConversation: () => void;
    onSelectConversation: (conversationId: string) => void;
    onDeleteConversation: (conversationId: string) => void;
    isCollapsed?: boolean;
}

export function ConversationSidebar({
    conversations,
    currentConversationId,
    onNewConversation,
    onSelectConversation,
    onDeleteConversation,
    isCollapsed = false
}: ConversationSidebarProps) {
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);

    const handleDeleteClick = (conversationId: string, event: React.MouseEvent) => {
        event.stopPropagation();
        setConversationToDelete(conversationId);
        setShowDeleteDialog(true);
    };

    const handleConfirmDelete = () => {
        if (conversationToDelete) {
            onDeleteConversation(conversationToDelete);
        }
        setConversationToDelete(null);
        setShowDeleteDialog(false);
    };

    const handleCancelDelete = () => {
        setConversationToDelete(null);
        setShowDeleteDialog(false);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return date.toLocaleDateString([], { weekday: 'short' });
        } else {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
    };

    if (isCollapsed) {
        return (
            <div className="w-12 border-r bg-background/50 backdrop-blur-sm flex flex-col items-center py-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onNewConversation}
                    className="mb-4"
                    title="New Conversation"
                >
                    <Plus size={18} />
                </Button>
                <Separator className="mb-4" />
                <ScrollArea className="flex-1 w-full">
                    <div className="flex flex-col gap-2 px-2">
                        {conversations.map((conversation) => (
                            <Button
                                key={conversation.id}
                                variant={currentConversationId === conversation.id ? "secondary" : "ghost"}
                                size="icon"
                                onClick={() => onSelectConversation(conversation.id)}
                                className="w-8 h-8"
                                title={conversation.name}
                            >
                                <MessageSquare size={16} />
                            </Button>
                        ))}
                    </div>
                </ScrollArea>
            </div>
        );
    }

    return (
        <>
            <div className="w-80 border-r bg-background/50 backdrop-blur-sm flex flex-col">
                {/* Header */}
                <div className="p-4 border-b">
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold text-lg">Conversations</h2>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onNewConversation}
                            className="h-8 w-8 p-0"
                        >
                            <Plus size={16} />
                        </Button>
                    </div>
                </div>

                {/* Conversation List */}
                <ScrollArea className="flex-1">
                    <div className="p-2">
                        {conversations.length === 0 ? (
                            <div className="text-center text-muted-foreground py-8">
                                <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
                                <p>No conversations yet</p>
                                <p className="text-sm">Create your first conversation</p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {conversations.map((conversation) => (
                                    <div
                                        key={conversation.id}
                                        className={`group relative rounded-md p-3 cursor-pointer transition-colors hover:bg-accent/50 ${
                                            currentConversationId === conversation.id
                                                ? 'bg-accent'
                                                : ''
                                        }`}
                                        onClick={() => onSelectConversation(conversation.id)}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-medium text-sm truncate pr-2">
                                                    {conversation.name}
                                                </h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs text-muted-foreground">
                                                        {conversation.messages.length} messages
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {formatDate(conversation.updated_at)}
                                                    </span>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                                onClick={(e) => handleDeleteClick(conversation.id, e)}
                                            >
                                                <Trash2 size={12} />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Conversation</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        Are you sure you want to delete this conversation? This action cannot be undone.
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={handleCancelDelete}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleConfirmDelete}>
                            Delete
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}