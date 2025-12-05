import React from "react";
import { Loader2 } from "lucide-react";

/*
 * FINAL PHASE-2 ACTION BUTTON
 * - Adds premium + secondary variants
 * - Prevents form submission issues (type="button")
 * - Mobile-first: larger touch targets
 * - Spinner + icon spacing stable
 * - Full accessibility support
 */

const ActionButton = ({
  type = "button",
  variant = "primary",
  icon: Icon,
  children,
  onClick,
  loading = false,
  disabled = false,
  size = "md",
  fullWidth = false,
  className = "",
  ariaLabel = null,
}) => {
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white",
    success: "bg-green-600 hover:bg-green-700 text-white",
    danger: "bg-red-600 hover:bg-red-700 text-white",
    warning: "bg-orange-600 hover:bg-orange-700 text-white",
    outline: "bg-white border border-gray-300 hover:bg-gray-50 text-gray-700",
    ghost: "bg-transparent hover:bg-gray-100 text-gray-600",

    // ⭐ New: Premium theme
    premium: "bg-purple-600 hover:bg-purple-700 text-white",

    // ⭐ New: neutral button for secondary interactions
    secondary: "bg-gray-200 hover:bg-gray-300 text-gray-800",

    // ⭐ New: inline text button
    link: "bg-transparent text-blue-600 hover:underline p-0",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs min-h-[36px]",
    md: "px-4 py-2 text-sm min-h-[42px]",
    lg: "px-6 py-3 text-base min-h-[48px]",
  };

  return (
    <button
      type={type}
      aria-label={ariaLabel || (typeof children === "string" ? children : null)}
      aria-busy={loading ? "true" : "false"}
      disabled={disabled || loading}
      onClick={onClick}
      className={`
        flex items-center justify-center gap-2 rounded-lg font-medium
        transition-all duration-200 active:scale-[0.97]
        disabled:opacity-50 disabled:cursor-not-allowed
        ${fullWidth ? "w-full" : ""}
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
    >
      {/* Spinner (fixed size region — prevents UI shift) */}
      <div className="w-5 flex justify-center">
        {loading ? (
          <Loader2 size={18} className="animate-spin" />
        ) : Icon ? (
          <Icon size={18} />
        ) : null}
      </div>

      {/* Label */}
      <span className={loading ? "opacity-80" : ""}>{children}</span>
    </button>
  );
};

export default ActionButton;
