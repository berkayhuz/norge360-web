import { Ban, Bell, Heart, Shield, MessageCircle, User, type LucideIcon } from "lucide-react";

export type ProfileSettingsSidebarItem = Readonly<{
  href: string;
  icon: LucideIcon;
  label: string;
}>;

export function buildProfileSettingsSidebarItems(text: {
  editProfile: string;
  accountPrivacy: string;
  blockedUsers: string;
  commentPermissions: string;
  hideLikeCounts: string;
  notifications: string;
}): readonly ProfileSettingsSidebarItem[] {
  return [
    { href: "/settings/profile", icon: User, label: text.editProfile },
    { href: "/settings/account-privacy", icon: Shield, label: text.accountPrivacy },
    { href: "/settings/comment-permissions", icon: MessageCircle, label: text.commentPermissions },
    { href: "/settings/like-count-visibility", icon: Heart, label: text.hideLikeCounts },
    { href: "/settings/blocked-users", icon: Ban, label: text.blockedUsers },
    { href: "/settings/notifications", icon: Bell, label: text.notifications },
  ] as const;
}
