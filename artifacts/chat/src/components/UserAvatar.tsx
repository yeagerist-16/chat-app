import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { initialsOf } from "@/lib/format";

interface UserAvatarProps {
  displayName: string;
  color: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function UserAvatar({
  displayName,
  color,
  className,
  size = "md",
}: UserAvatarProps) {
  const sizeClass =
    size === "sm" ? "h-7 w-7 text-xs" : size === "lg" ? "h-12 w-12 text-base" : "h-9 w-9 text-sm";
  return (
    <Avatar className={cn(sizeClass, className)}>
      <AvatarFallback
        style={{ backgroundColor: color, color: "white" }}
        className="font-semibold"
      >
        {initialsOf(displayName)}
      </AvatarFallback>
    </Avatar>
  );
}
