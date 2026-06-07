import type { ReactNode } from "react";

import { ProfileSettingsSidebar } from "@/features/profile/components/profile-settings-sidebar";
import type { ProfileSettingsSidebarItem } from "@/features/profile/components/profile-settings-sidebar-data";

type SettingsPageLayoutProps = {
  children: ReactNode;
  description: string;
  items: readonly ProfileSettingsSidebarItem[];
  title: string;
  actions?: ReactNode;
  headingDescription: string;
  headingTitle: string;
};

export function SettingsPageLayout({
  actions,
  children,
  description,
  headingDescription,
  headingTitle,
  items,
  title,
}: SettingsPageLayoutProps) {
  return (
    <main className="mx-auto grid w-full max-w-6xl flex-1 gap-4 px-4 py-8 sm:px-6 lg:grid-cols-4 lg:px-2">
      <ProfileSettingsSidebar description={description} items={items} title={title} />

      <div className="relative col-span-4 block w-full space-y-5 lg:col-span-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal text-foreground">{headingTitle}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{headingDescription}</p>
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>

        {children}
      </div>
    </main>
  );
}
