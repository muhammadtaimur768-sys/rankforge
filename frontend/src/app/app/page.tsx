import type { Metadata } from "next";
import { ChatView } from "@/components/app/chat";

export const metadata: Metadata = { title: "Chat" };

export default function ChatPage() {
  return <ChatView />;
}
