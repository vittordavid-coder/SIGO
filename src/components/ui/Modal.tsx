import React, { ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./dialog";
import { Button } from "./button";
import { cn } from "../../lib/utils";

export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  description, 
  children, 
  onConfirm, 
  confirmText = "Confirm",
  confirmVariant = "default",
  cancelText = "Cancel",
  hideCancel = false,
  maxWidth,
  className,
  headerClassName,
  footer
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  title?: string, 
  description?: ReactNode, 
  children?: ReactNode, 
  onConfirm?: () => void, 
  confirmText?: string,
  confirmVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link",
  cancelText?: string,
  hideCancel?: boolean,
  maxWidth?: string,
  className?: string,
  headerClassName?: string,
  footer?: ReactNode
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(className, maxWidth === "custom" ? "" : maxWidth === "sm" ? "max-w-sm" : maxWidth === "md" ? "max-w-md" : maxWidth === "lg" ? "max-w-lg" : maxWidth === "xl" ? "max-w-xl" : maxWidth === "2xl" ? "max-w-2xl" : maxWidth === "3xl" ? "max-w-3xl" : maxWidth === "4xl" ? "max-w-4xl" : maxWidth === "5xl" ? "max-w-5xl" : maxWidth === "7xl" ? "max-w-7xl" : "max-w-lg")}>
        {!title && <DialogTitle className="sr-only">Modal</DialogTitle>}
        {title && <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription className="whitespace-pre-wrap">{description}</DialogDescription>}
        </DialogHeader>}
        {children}
        {footer ? (
          footer
        ) : (
          (onConfirm || !hideCancel) && (
            <DialogFooter>
              {!hideCancel && <Button variant="outline" onClick={onClose}>{cancelText}</Button>}
              {onConfirm && <Button variant={confirmVariant} onClick={onConfirm}>{confirmText}</Button>}
            </DialogFooter>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}
