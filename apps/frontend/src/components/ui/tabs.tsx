import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'

import { cn } from '@/utils/cn'

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'inline-flex h-auto w-full flex-wrap items-center justify-start gap-2 rounded-2xl border border-white/10 bg-black/40 p-2 text-white/70 backdrop-blur-[12px]',
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'inline-flex min-h-10 items-center justify-center rounded-xl px-4 py-2 text-sm font-medium whitespace-nowrap transition-all outline-none cursor-pointer disabled:pointer-events-none disabled:opacity-50',
      'border border-transparent bg-transparent text-white/70 hover:bg-white/5 hover:text-white',
      'focus-visible:ring-2 focus-visible:ring-cyan-300/60 focus-visible:ring-offset-0',
      'data-[state=active]:border-cyan-300/30 data-[state=active]:bg-cyan-300/10 data-[state=active]:text-cyan-100 data-[state=active]:shadow-[0_0_0_1px_rgba(103,232,249,0.25)]',
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-6 outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60 focus-visible:ring-offset-0',
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
