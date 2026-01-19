import { jsx as _jsx } from "react/jsx-runtime";
const LoadingSpinner = ({ size = 'md', className = '' }) => {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-8 h-8',
        lg: 'w-12 h-12'
    };
    return (_jsx("div", { className: `flex items-center justify-center ${className}`, children: _jsx("div", { className: `${sizeClasses[size]} animate-spin rounded-full border-2 border-gray-300 border-t-primary-500` }) }));
};
export default LoadingSpinner;
