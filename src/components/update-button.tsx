import {useEffect, useState} from "react";
import {check} from '@tauri-apps/plugin-updater';
import {relaunch} from '@tauri-apps/plugin-process';
import {Button} from "@/components/ui/button";
import {toast} from "@/components/ui/use-toast.ts";

// This component checks for updates and shows an update button if available
export function UpdateButton() {
    const [update, setUpdate] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState<number | null>(null);

    useEffect(() => {
        // Only check for updates in Tauri
        if (!('__TAURI_INTERNALS__' in window)) return;
        check().then(setUpdate);
    }, []);

    const handleUpdate = async () => {
        if (!update) return;
        setLoading(true);
        let downloaded = 0;
        let contentLength = 0;
        try {
            await update.downloadAndInstall((event: any) => {
                switch (event.event) {
                    case 'Started':
                        contentLength = event.data.contentLength;
                        setProgress(0);
                        break;
                    case 'Progress':
                        downloaded += event.data.chunkLength;
                        setProgress(Math.round((downloaded / contentLength) * 100));
                        break;
                    case 'Finished':
                        setProgress(100);
                        break;
                }
            });
            await relaunch();
        } catch (e: any) {
            toast({
                title: "Update Failed",
                description: `An error occurred while updating: ${e.message}`,
            })
        } finally {
            setLoading(false);
        }
    };

    if (!update) return null;

    return (
        <div
            className="flex items-center justify-evenly px-2 grow bg-primary-foreground outline rounded-lg">
             <span>
                New Version: {update.version}
            </span>
            <Button variant="ghost" className={"cursor-pointer"} onClick={handleUpdate} disabled={loading}>
                {loading ? (progress !== null ? `Updating... ${progress}%` : 'Updating...') : 'Install Update'}
            </Button>
        </div>
    );
}

