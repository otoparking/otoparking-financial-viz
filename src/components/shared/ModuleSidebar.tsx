"use client";

import { motion, AnimatePresence } from "framer-motion";
import { MODULES } from "@/lib/modules";
import type { ModuleId } from "@/types/modules";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Blocks, PanelLeftClose, PanelLeftOpen } from "lucide-react";

interface ModuleSidebarProps {
  activeModule: ModuleId;
  onSelectModule: (id: ModuleId) => void;
  collapsed: boolean;
  onToggle: () => void;
}

export default function ModuleSidebar({
  activeModule,
  onSelectModule,
  collapsed,
  onToggle,
}: ModuleSidebarProps) {
  return (
    <motion.aside
      className="flex flex-col shrink-0 border-r border-border bg-sidebar overflow-hidden"
      animate={{ width: collapsed ? 48 : 230 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      {/* Brand header */}
      <div
        className={cn(
          "flex items-center shrink-0 border-b border-sidebar-border",
          collapsed
            ? "flex-col justify-center gap-1.5 px-1.5 py-2"
            : "gap-2.5 px-2",
        )}
        style={{ height: 56 }}
      >
        {collapsed ? (
          <>
            {/* Collapsed: small logo + toggle */}
            <div
              className="rounded-md overflow-hidden shrink-0"
              style={{ width: 24, height: 24 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/otoparking-green.png"
                alt="OtoParking"
                width={24}
                height={24}
                style={{ width: 24, height: 24, display: "block" }}
              />
            </div>
            <button
              onClick={onToggle}
              className="p-1 rounded-md hover:bg-sidebar-accent text-muted-foreground hover:text-sidebar-foreground transition-colors shrink-0"
              title="Expand sidebar"
            >
              <PanelLeftOpen className="size-3.5" />
            </button>
          </>
        ) : (
          <>
            <AnimatePresence>
              <motion.div
                key="logo"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="shrink-0 rounded-md overflow-hidden"
                style={{ width: 28, height: 28 }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/otoparking-green.png"
                  alt="OtoParking"
                  width={28}
                  height={28}
                  style={{ width: 28, height: 28, display: "block" }}
                />
              </motion.div>
            </AnimatePresence>
            <AnimatePresence>
              <motion.div
                key="text"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="min-w-0 overflow-hidden"
              >
                <p className="text-xs font-semibold tracking-wide text-sidebar-foreground truncate">
                  Test Center
                </p>
                <p className="text-[9px] text-muted-foreground font-mono">
                  v0.1
                </p>
              </motion.div>
            </AnimatePresence>
            <button
              onClick={onToggle}
              className="p-1 rounded-md hover:bg-sidebar-accent text-muted-foreground hover:text-sidebar-foreground transition-colors shrink-0 ml-auto"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="size-3.5" />
            </button>
          </>
        )}
      </div>

      {/* Module list */}
      <ScrollArea className="flex-1">
        <div className={cn("py-2", collapsed ? "px-1" : "px-2")}>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 px-2 mb-1.5"
              >
                <Blocks className="size-3 text-muted-foreground" />
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Modules
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <nav className="space-y-0.5">
            {MODULES.map((mod) => {
              const isActive = mod.id === activeModule;
              return (
                <motion.button
                  key={mod.id}
                  onClick={() => onSelectModule(mod.id)}
                  whileTap={{ scale: 0.97 }}
                  className={cn(
                    "w-full flex items-center gap-2.5 rounded-md text-left transition-colors duration-150",
                    collapsed ? "px-1.5 py-2 justify-center" : "px-2.5 py-2",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                  )}
                  title={
                    collapsed ? `${mod.label}: ${mod.subtitle}` : mod.subtitle
                  }
                >
                  <span
                    className={cn(
                      "shrink-0",
                      isActive ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {mod.icon}
                  </span>
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.div
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        className="min-w-0 flex-1 overflow-hidden"
                      >
                        <p className="text-xs font-medium truncate">
                          {mod.label}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate leading-tight">
                          {mod.subtitle}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {isActive && !collapsed && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="ml-auto w-1 h-5 rounded-full bg-primary shrink-0"
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 30,
                      }}
                    />
                  )}
                </motion.button>
              );
            })}
          </nav>
        </div>
      </ScrollArea>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Separator />
            <div className="px-3 py-2.5 shrink-0">
              <p className="text-[9px] text-muted-foreground font-mono text-center">
                OtoParking Test Center
              </p>
              <p className="text-[9px] text-muted-foreground/50 font-mono text-center">
                10 modules
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}
