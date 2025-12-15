import { cookies } from "next/headers";
import { Suspense } from "react";
import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { DataStreamProvider } from "@/components/data-stream-provider";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { createGuestUser } from "@/lib/db/queries";
import { generateUUID } from "@/lib/utils";
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
    const cookieStore = await cookies();
    const [user] = await createGuestUser();

    const id = generateUUID();
    const modelIdFromCookie = cookieStore.get("chat-model");

    return (
        <SidebarProvider defaultOpen={false}>
            <main className="relative flex w-full flex-1 flex-col bg-background">
                <Chat
                    userId={user.id}
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
