import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const DialogRoot = Dialog.Root;
export const DialogTrigger = Dialog.Trigger;

export function DialogContent({
  className,
  children,
  title,
  description,
}: {
  className?: string;
  children: React.ReactNode;
  title?: string;
  description?: string;
}) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
      <Dialog.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-border bg-card p-6 shadow-lg",
          className
        )}
        {...(!description ? { "aria-describedby": undefined } : {})}
      >
        {title && (
          <Dialog.Title className="text-lg font-semibold">{title}</Dialog.Title>
        )}
        {description ? (
          <Dialog.Description className="mt-1 text-sm text-muted-foreground">
            {description}
          </Dialog.Description>
        ) : (
          <Dialog.Description className="sr-only">Detalhes</Dialog.Description>
        )}
        <div className={title || description ? "mt-4" : ""}>{children}</div>
        <Dialog.Close className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100">
          <X className="h-4 w-4" />
          <span className="sr-only">Fechar</span>
        </Dialog.Close>
      </Dialog.Content>
    </Dialog.Portal>
  );
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-6 flex justify-end gap-2", className)} {...props} />;
}
