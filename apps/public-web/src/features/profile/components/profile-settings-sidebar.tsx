import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Settings2, ShieldCheck } from "lucide-react";

import { Button } from "@workspace/ui/components/primitives/button";
import { cn } from "@workspace/ui/lib/utils";
import { Heading } from "@workspace/ui/components/typography/heading";

type ProfileSettingsSidebarProps = {
  title: string;
  description: string;
  items: ReadonlyArray<{
    href: string;
    icon: LucideIcon;
    label: string;
  }>;
};

const sidebarButtonClassName =
  "flex h-10 text-[15px] w-full items-center justify-start gap-2 border-none px-4 hover:bg-muted";
const sidebarIconToneClasses = [
  "text-sky-500",
  "text-cyan-500",
  "text-teal-500",
  "text-emerald-500",
  "text-lime-500",
  "text-amber-500",
  "text-indigo-500",
  "text-slate-500",
  "text-cyan-400",
] as const;

export function ProfileSettingsSidebar({ description, items, title }: ProfileSettingsSidebarProps) {
  return (
    <div className="hidden lg:block sticky top-18 h-fit w-full self-start col-span-1">
      <div className="space-y-4 pt-4">
        <div className="">
          <Heading level={4} className="truncate">{title}</Heading>
        </div>

        <div className="flex flex-col space-y-2">
          {items.map((item, index) => (
            <Button
              key={item.href}
              asChild
              variant="outline"
              rounded="2xl"
              className={sidebarButtonClassName}
            >
              <Link href={item.href}>
                <item.icon className={cn("size-5 shrink-0", sidebarIconToneClasses[index % sidebarIconToneClasses.length])} />
                {item.label}
              </Link>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
