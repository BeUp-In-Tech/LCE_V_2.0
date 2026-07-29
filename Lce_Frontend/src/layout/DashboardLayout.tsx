import { useState } from "react";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import { Outlet } from "react-router-dom";

const DashboardLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
    return (
        <div className="flex min-h-screen bg-slate-50 overflow-hidden">
            <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

            <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
                <Header setSidebarOpen={setSidebarOpen} />
                <main className="flex-1 bg-[#FFFFFF] overflow-y-auto w-full">
                    <div className="p-4 md:p-8 w-full">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;