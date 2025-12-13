import { cookies } from "next/headers";
import { Suspense } from "react";
import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { DataStreamProvider } from "@/components/data-stream-provider";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { generateUUID } from "@/lib/utils";
import { auth } from "../(auth)/auth";
import { SidebarProvider } from "@/components/ui/sidebar";

export default function Page() {
    return (
        <DataStreamProvider>
            <Suspense fallback={<div className="flex h-dvh" />}>
                <WidgetChatPage />
            </Suspense>
        </DataStreamProvider>
    );
}

async function WidgetChatPage() {
    // const session = await auth();

    // For widget, if no session, we might want to force guest login or just show it (if it handles no user).
    // The original page redirects to /api/auth/guest.
    // In an iframe, we want to avoid complex redirects if possible, but let's try to mimic the main page behavior.
    // If we receive a user query param, we could technically use it, but for now let's rely on the cookie-based auth of Basecamp.

    // NOTE: If testing in iframe, ensure third-party cookies are allowed or use top-level redirect first.
    // if (!session) {
    //     // For simplicity in MVP, we can't easily do the redirect dance inside iframe if it's cross-origin, 
    //     // but since it's same-domain (likely masked) or localhost, it might work.
    //     // Let's just render the Chat even if not logged in? 
    //     // The Chat component might depend on user ID.
    //     // Let's assume there is a session or we let them be anonymous.
    //     // Basecamp seems to require auth.
    // }

    const cookieStore = await cookies();
    const modelIdFromCookie = cookieStore.get("chat-model");

    const id = generateUUID();

    return (
        <SidebarProvider defaultOpen={false}>
            <main className="relative flex w-full flex-1 flex-col bg-background">
                <Chat
                    autoResume={false}
                    id={id}
                    initialChatModel={modelIdFromCookie?.value || DEFAULT_CHAT_MODEL}
                    initialMessages={[]}
                    initialVisibilityType="private"
                    isReadonly={false}
                    isWidget={true}
                    key={id}
                />
                <DataStreamHandler />
            </main>
        </SidebarProvider>
    );
}
