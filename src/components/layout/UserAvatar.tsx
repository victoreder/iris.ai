import { cn } from "@/lib/utils";

interface UserAvatarProps {
  name?: string | null;
  email?: string | null;
  photoUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-16 w-16 text-lg",
};

function getInitials(name?: string | null, email?: string | null): string {
  const source = name?.trim() || email?.trim() || "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function UserAvatar({ name, email, photoUrl, size = "md", className }: UserAvatarProps) {
  const initials = getInitials(name, email);

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name ?? "Avatar"}
        className={cn("rounded-full object-cover ring-2 ring-border", sizeClasses[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground ring-2 ring-border",
        sizeClasses[size],
        className
      )}
      aria-hidden
    >
      {initials}
    </div>
  );
}
