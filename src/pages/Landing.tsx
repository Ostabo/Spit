import {ModeToggle} from "@/components/mode-toggle.tsx";
import {Button} from "@/components/ui/button.tsx";
import {OpenInNewWindowIcon} from "@radix-ui/react-icons";

export function Landing() {
    return (
        <main className="container mx-auto max-w-4xl p-4 flex flex-col h-screen">
            <div className={"absolute bottom-16 left-1/2 transform -translate-x-1/2"}>
                <ModeToggle/>
            </div>
            <div className="flex flex-col text-center items-center justify-center h-full">
                <h1 className="p-4 text-8xl font-bold text-primary">Spit</h1>
                <h2 className="p-4 text-4xl text-secondary-foreground">Your Ollama companion</h2>
                <a
                    href="https://github.com/Ostabo/Spit/releases"
                    className="p-8"
                    target="_blank"
                >
                    <Button
                        variant={"outline"}
                        className="p-8 cursor-pointer text-2xl">
                        Download here
                        <OpenInNewWindowIcon className="w-10 h-10 p-2"/>
                    </Button>
                </a>
            </div>
        </main>
    )
}
