import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import DashboardLayout from "../layout/DashboardLayout";
import ProtectedRoute from "../components/ProtectedRoute";
import { Loader2 } from "lucide-react";


const Home = lazy(() => import("../pages/home/Home"));
const SignIn = lazy(() => import("../pages/auth/SignIn"));
const SignUp = lazy(() => import("../pages/auth/signup/SignUp"));
const AccountType = lazy(() => import("../pages/auth/signup/AccountType"));
const Services = lazy(() => import("../pages/services/Services"));
const Address = lazy(() => import("../pages/auth/Address"));
const SignupDone = lazy(() => import("../pages/auth/signup/SignupDone"));
const Dashboard = lazy(() => import("../pages/dashboard/preferences/Preference"));
const Dashboards = lazy(() => import("../pages/dashboard/home/Dashboards"));
const PaymentForm = lazy(() => import("../pages/dashboard/payment/Payment"));
const BillingHistory = lazy(() => import("../pages/dashboard/Billing/BillingHistory"));
const Coupon = lazy(() => import("../pages/dashboard/coupon/Coupon"));
const Gift = lazy(() => import("../pages/dashboard/gift/Gift"));
const Setting = lazy(() => import("../pages/dashboard/setting/Setting"));
const Subscriptions = lazy(() => import("../pages/dashboard/subscriptions/Subscriptions"));
const App = lazy(() => import("../pages/Testing"));
const ForgottPassword = lazy(() => import("../pages/auth/ForgottPassword"));
const ResetPassword = lazy(() => import("../pages/auth/ResetPassword"));
const RedeemPage = lazy(() => import("../pages/RedeemPage/RedeemPage"));


const PageLoader = () => (
    <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="animate-spin text-sky-500" size={40} />
    </div>
);

const withSuspense = (component: React.ReactNode) => (
    <Suspense fallback={<PageLoader />}>
        {component}
    </Suspense>
);

export const router = createBrowserRouter([
    {
        path: '/',
        element: <MainLayout />,
        children: [
            {
                path: '/',
                element: withSuspense(<Home />)
            },
            {
                path: '/signin',
                element: withSuspense(<SignIn />)
            },
            {
                path: '/signup',
                element: withSuspense(<SignUp />)
            },
            {
                path: '/accoutntype',
                element: withSuspense(<AccountType />)
            },
            {
                path: '/service',
                element: <ProtectedRoute>{withSuspense(<Services />)}</ProtectedRoute>
            },
            {
                path: '/address',
                element: <ProtectedRoute>{withSuspense(<Address />)}</ProtectedRoute>
            },
            {
                path: '/signupdone',
                element: <ProtectedRoute>{withSuspense(<SignupDone />)}</ProtectedRoute>
            },
            {
                path: '/testing',
                element: withSuspense(<App />)
            },
            {
                path: '/forgotPassword',
                element: withSuspense(<ForgottPassword />)
            },
            {
                path: '/reset-password',
                element: withSuspense(<ResetPassword />)
            },
        ]
    }, {
        path: "/gift-cards",
        element: <ProtectedRoute>{withSuspense(<RedeemPage />)}</ProtectedRoute>
    }
    ,
    {
        path: 'dashboard',
        element: <ProtectedRoute><DashboardLayout /></ProtectedRoute>,
        children: [
            {
                path: 'dashboardHome',
                element: withSuspense(<Dashboards />)
            },
            {
                path: 'preference',
                element: withSuspense(<Dashboard />)
            },
            {
                path: 'payment',
                element: withSuspense(<PaymentForm />)
            },
            {
                path: 'billing',
                element: withSuspense(<BillingHistory />)
            },
            {
                path: 'coupon',
                element: withSuspense(<Coupon />)
            },
            {
                path: 'redeem-gift',
                element: withSuspense(<Gift />)
            },
            {
                path: 'setting',
                element: withSuspense(<Setting />)
            },
            {
                path: 'subscriptions',
                element: withSuspense(<Subscriptions />)
            },
        ]
    }
])