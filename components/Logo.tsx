import Link from "next/link";
import { Sparkles } from "lucide-react";

interface LogoProps {
  className?: string;
  showTagline?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function Logo({ className = "", showTagline = false, size = "md" }: LogoProps) {
  const textSizes = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-3xl sm:text-4xl",
  };

  const tamilSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <Link href="/" className={`inline-flex items-center gap-2.5 group ${className}`}>
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-800 flex items-center justify-center text-accent-100 shadow-subtle group-hover:shadow-card transition-all duration-300">
        <Sparkles className="w-5 h-5 text-accent" />
      </div>
      <div className="flex flex-col">
        <div className="flex items-baseline gap-1.5 leading-none">
          <span className={`font-display font-bold tracking-tight text-primary ${textSizes[size]}`}>
            THIGAZH
          </span>
          <span className={`font-serif text-accent font-medium ${tamilSizes[size]}`}>
            திகழ்
          </span>
        </div>
        {showTagline && (
          <span className="text-[11px] font-sans text-neutral-500 tracking-wide mt-0.5">
            Events That Make You Shine
          </span>
        )}
      </div>
    </Link>
  );
}
