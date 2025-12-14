"use client";

import { useSidebar } from "@/components/ui/sidebar";
import { useParams } from "next/navigation";
import { Chat } from "@/lib/db/schema";

export type ChatHistory = {
  chats: Chat[];
  hasMore: boolean;
};

export function getChatHistoryPaginationKey(
  pageIndex: number,
  previousPageData: ChatHistory
) {
    return null;
}

export function SidebarHistory() {
  return (
    <div className="flex w-full flex-row items-center justify-center gap-2 px-2 text-sm text-zinc-500">
      History disabled
    </div>
  );
}
