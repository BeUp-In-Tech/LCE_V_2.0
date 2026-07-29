import { Link } from "react-router-dom";

const Home = () => {
    return (
        <div className="h-screen flex flex-col justify-center items-center">
            <div className="space-x-5">
                <Link to='dashboard/dashboardHome'>
                    <button className="border p-2 rounded-md">Dashboard</button>
                </Link>
                <Link to='/signup'>
                    <button className="border p-2 rounded-md">SignUp</button>
                </Link>
            </div>
        </div>
    );
};

export default Home;
