import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { GlobalPlayer } from "@/components/GlobalPlayer";

export default function DashboardLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="flex h-screen bg-background overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0 relative">
                <Header />
                <main className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-12 md:pb-30">
                    <div className="max-w-4xl mx-auto w-full">
                        {children}
                    </div>
                </main>
                {/* Player spans the content area but sits at the bottom */}
                <div className="absolute bottom-0 left-0 right-0 z-50">
                    <GlobalPlayer />
                </div>
            </div>
        </div>
    );
}
