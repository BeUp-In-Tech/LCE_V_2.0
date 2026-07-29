import { Link } from 'react-router-dom';

const AuthHeader = () => {
    return (
        <nav className='mt-5 sm:mt-8 ml-2 md:ml-20'>
            <div className='max-w-40'>
                <Link to='/'>
                    <img 
                        className='w-full h-auto' 
                        src="/assets/authpage/logo.png" 
                        alt="Laundry Care Express Logo" 
                        width="160" 
                        height="40"
                        fetchPriority="high"
                    />
                </Link>
            </div>
        </nav>
    );
};

export default AuthHeader;