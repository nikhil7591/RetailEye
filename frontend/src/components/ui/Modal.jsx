import * as React from "react";
import { cn } from "../../lib/utils";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export function Modal({ isOpen, onClose, title, children, className }) {
  // Prevent scrolling when modal is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", duration: 0.3, bounce: 0 }}
            className={cn(
              "relative w-full max-w-lg overflow-hidden rounded-xl bg-white p-6 text-left align-middle shadow-xl",
              className
            )}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold leading-none tracking-tight text-slate-900">
                {title}
              </h3>
              <button
                onClick={onClose}
                className="rounded-full p-1.5 hover:bg-slate-100 transition-colors"
              >
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>
            <div className="relative">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
