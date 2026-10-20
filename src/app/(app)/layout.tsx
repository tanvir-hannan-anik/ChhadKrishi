import { ChatFab } from "@/components/ai/chat-fab";
import { AppSidebar } from "@/components/app-header";

/** Shell for every signed-in section: persistent left navigation beside the page. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-1">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        {children}
        <ChatFab />
      </div>
    </div>
  );
}
