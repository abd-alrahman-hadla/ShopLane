"use client";

import { DropdownMenu } from "radix-ui";
import { CheckIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export type ThemeToggleLabels = {
  toggle: string;
  light: string;
  dark: string;
  system: string;
};

const OPTIONS = [
  { value: "light", icon: SunIcon },
  { value: "dark", icon: MoonIcon },
  { value: "system", icon: MonitorIcon },
] as const;

/**
 * Theme menu. The trigger icon follows the `dark` class via CSS, so the
 * server-rendered markup never depends on the (client-only) theme value.
 */
export function ThemeToggle({ labels }: { labels: ThemeToggleLabels }) {
  const { theme, setTheme } = useTheme();
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="ghost" size="icon" aria-label={labels.toggle} data-testid="theme-toggle">
          <SunIcon className="dark:hidden" aria-hidden />
          <MoonIcon className="hidden dark:block" aria-hidden />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="bg-popover text-popover-foreground z-50 min-w-36 rounded-lg border p-1 shadow-md"
        >
          <DropdownMenu.RadioGroup value={theme ?? "system"} onValueChange={setTheme}>
            {OPTIONS.map(({ value, icon: Icon }) => (
              <DropdownMenu.RadioItem
                key={value}
                value={value}
                className="data-[highlighted]:bg-accent flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none select-none"
              >
                <Icon className="size-4" aria-hidden />
                <span className="flex-1">{labels[value]}</span>
                <DropdownMenu.ItemIndicator>
                  <CheckIcon className="size-4" aria-hidden />
                </DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
