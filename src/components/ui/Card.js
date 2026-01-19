import { jsx as _jsx } from "react/jsx-runtime";
export const Card = ({ children, className = '', padding = 'md', }) => {
    const paddingClasses = {
        none: '',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8'
    };
    return (_jsx("div", { className: `
      bg-white rounded-xl shadow-sm border border-gray-200
      ${paddingClasses[padding]}
      ${className}
    `, children: children }));
};
