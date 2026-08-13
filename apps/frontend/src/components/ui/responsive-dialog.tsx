import * as React from "react";

import { DialogContent, DialogHeader } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// Prefixadas com sm: porque no celular o modal ocupa a tela inteira - um
// max-w sem prefixo deixaria a caixa estreita no meio da tela.
const sizeClasses = {
  sm: "sm:max-w-[32rem]",
  md: "sm:max-w-[40rem]",
  lg: "sm:max-w-[48rem]",
  xl: "sm:max-w-[56rem]",
  "2xl": "sm:max-w-[64rem]",
  "3xl": "sm:max-w-[72rem]",
  full: "sm:max-w-[min(96rem,100%)]",
} as const;

export type ResponsiveDialogSize = keyof typeof sizeClasses;

type ResponsiveDialogContentProps = React.ComponentPropsWithoutRef<typeof DialogContent> & {
  size?: ResponsiveDialogSize;
};

export const ResponsiveDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogContent>,
  ResponsiveDialogContentProps
>(({ size = "lg", className, ...props }, ref) => (
  <DialogContent
    ref={ref}
    className={cn(
      // A geometria do celular vem do DialogContent (tela cheia); aqui só o
      // que vale do sm: para cima, senão a caixa flutuante volta no mobile.
      "sm:w-[calc(100vw-2rem)] md:w-[calc(100vw-4rem)] sm:max-h-[calc(100vh-3rem)] sm:overflow-hidden sm:rounded-2xl sm:shadow-2xl",
      sizeClasses[size],
      className
    )}
    {...props}
  />
));

ResponsiveDialogContent.displayName = "ResponsiveDialogContent";

export function ResponsiveDialogHeader({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogHeader>) {
  return (
    <DialogHeader
      className={cn(
        "px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b bg-muted/30 text-left shrink-0",
        className
      )}
      {...props}
    />
  );
}

export function ResponsiveDialogBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6", className)}
      {...props}
    />
  );
}

export function ResponsiveDialogTitleRow({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col gap-3 pr-10 sm:pr-0 sm:flex-row sm:items-start sm:justify-between", className)}
      {...props}
    />
  );
}
