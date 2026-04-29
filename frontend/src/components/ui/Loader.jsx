import * as React from "react";
import { cn } from "../../lib/utils";
import { Loader2 } from "lucide-react";

export function Loader({ className, size = 24, ...props }) {
  return (
    <Loader2
      className={cn("animate-spin text-blue-600", className)}
      size={size}
      {...props}
    />
  );
}
