import { useState, useEffect, useRef } from "react";
import { cn } from "../utils/cn";

export interface AvatarProps {
  photoURL?: string | null;
  name?: string | null;
  email?: string | null;
  className?: string;
}

function getInitials(name?: string | null, email?: string | null): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    if (parts.length === 1 && parts[0].length > 0) {
      return parts[0][0].toUpperCase();
    }
  }
  if (email && email.trim()) {
    return email.trim()[0].toUpperCase();
  }
  return "U";
}

export function Avatar({ photoURL, name, email, className }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    setFailed(false);
  }, [photoURL]);

  useEffect(() => {
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth === 0) {
      setFailed(true);
    }
  }, [photoURL]);

  const initials = getInitials(name, email);

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold select-none",
        "bg-[#7C3AED] text-white dark:bg-[#6D28D9]",
        className,
      )}
    >
      <span className="text-xs leading-none font-semibold tracking-wider">
        {initials}
      </span>
      {photoURL && !failed && (
        <img
          ref={(node) => {
            imgRef.current = node;
            if (node && node.complete && node.naturalWidth === 0) {
              setFailed(true);
            }
          }}
          src={photoURL}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </div>
  );
}
