import "./App.css";
import {Suspense} from "react";
import {ThemeProvider} from "@/components/theme-provider.tsx";
import {Toaster} from "@/components/ui/toaster.tsx";
import {TooltipProvider} from "@/components/ui/tooltip.tsx";
import {Landing} from "./pages/Landing";
import {Chat} from "@/pages/Chat.tsx";


function App() {
    const isTauri = '__TAURI_INTERNALS__' in window;

    return (
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
            <TooltipProvider>
                <Suspense>
                    {
                        isTauri ? (
                            <Chat></Chat>) : (
                            <Landing></Landing>
                        )
                    }
                </Suspense>
                <Toaster/>
            </TooltipProvider>
        </ThemeProvider>
    );
}

export default App;
