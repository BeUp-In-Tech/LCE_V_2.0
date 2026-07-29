import { Outlet } from "react-router-dom";

const MainLayout = () => {
    return (
        <div>
            {}
            <main className='min-h-[calc(100vh-290px)]'>
                <Outlet />
            </main>
            {}
        </div>
    );
};

export default MainLayout;