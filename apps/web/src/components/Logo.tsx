import Image from "next/image";

/** Corporate CODEX wordmark (transparent PNG, 1200×342). `light` swaps the navy letters to white for dark backgrounds. */
export function Logo({
  variant = "color",
  className = "h-10 w-auto",
  priority = false,
}: {
  variant?: "color" | "light";
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={variant === "light" ? "/brand/codex-logo-light.png" : "/brand/codex-logo.png"}
      alt="CODEX AI Consulting"
      width={1200}
      height={342}
      priority={priority}
      sizes="240px"
      className={className}
    />
  );
}
