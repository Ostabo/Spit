import {ModeToggle} from "@/components/mode-toggle.tsx";
import {Button} from "@/components/ui/button.tsx";
import {GitHubLogoIcon, OpenInNewWindowIcon} from "@radix-ui/react-icons";
import {Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious} from "@/components/ui/carousel.tsx";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {Badge} from "@/components/ui/badge.tsx";
import {Separator} from "@/components/ui/separator.tsx";

const features = [
    {
        title: "Local Chat",
        description: "Fast, private chat with Ollama models directly on your device.",
        badge: "Chat",
    },
    {
        title: "Model Management",
        description: "Easily manage and download models.",
        badge: "Models",
    },
    {
        title: "Multimodal",
        description: "Supports both text and image input.",
        badge: "Text/Image",
    },
    {
        title: "Dark/Light Mode",
        description: "Switch between dark and light themes.",
        badge: "Theme",
    },
    {
        title: "Open Source",
        description: "Free and open source.",
        badge: "Free",
    },
    {
        title: "Spit",
        description: "Ollama needs to be installed to use this app.",
        badge: "Ollama",
    },
];

export function Landing() {
    return (
        <main className="w-full h-full p-4 flex flex-col items-center bg-background">
            <div className="fixed top-0 left-0 p-8">
                <ModeToggle/>
            </div>
            <div className="flex flex-col items-center mt-8">
                <img
                    src="/spit-logo.png"
                    alt="Spit Logo"
                    className="w-32 h-32 mb-4"
                    draggable={false}
                />
                <h1 className="p-2 text-7xl font-extrabold text-primary drop-shadow-lg">Spit</h1>
                <h2 className="p-2 text-3xl text-secondary-foreground mb-4">Your Ollama companion</h2>
                <div className="mb-8 flex justify-center gap-2 items-center"><a
                    href="https://github.com/Ostabo/Spit/releases"
                    target="_blank"
                >
                    <Button
                        variant={"outline"}
                        className="p-6 cursor-pointer text-2xl flex items-center gap-2">
                        Download
                        <OpenInNewWindowIcon className="w-8 h-8"/>
                    </Button>
                </a>
                    <a
                        href="https://github.com/Ostabo/Spit"
                        target="_blank"
                    >
                        <Button
                            variant={"outline"}
                            className="p-6 cursor-pointer text-2xl">
                            <GitHubLogoIcon className="w-8 h-8"/>
                        </Button>
                    </a>
                </div>
                <Separator className="mb-8"/>
                <div className="mb-8 w-full">
                    <div className="grid gap-4 sm:grid-cols-2">
                        {features.map((f, i) => (
                            <Card key={i} className="flex flex-col h-full">
                                <CardHeader className="flex flex-row items-center gap-2">
                                    <Badge variant="outline" className="m-0">{f.badge}</Badge>
                                    <CardTitle className="text-lg">{f.title}</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <CardDescription className="text-base">{f.description}</CardDescription>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
                <Carousel className="max-w-3xl">
                    <CarouselContent>
                        <CarouselItem>
                            <img
                                src="/spit-example1.png"
                                alt="Chat Screen"
                                className="w-full h-auto rounded-lg shadow-lg"
                            />
                        </CarouselItem>
                        <CarouselItem>
                            <img
                                src="/spit-example2.png"
                                alt="Model Management Screen"
                                className="w-full h-auto rounded-lg shadow-lg"
                            />
                        </CarouselItem>
                    </CarouselContent>
                    <CarouselPrevious/>
                    <CarouselNext/>
                </Carousel>
            </div>
        </main>
    );
}
