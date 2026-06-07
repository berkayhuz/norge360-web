export type ProfileSettingsSidebarItem = Readonly<{
  href: string;
  iconKey: "user" | "shield" | "lock" | "messageCircle" | "heart" | "ban" | "bell";
  label: string;
  searchTerms: readonly string[];
}>;

export function buildProfileSettingsSidebarItems(text: {
  editProfile: string;
  accountPrivacy: string;
  blockedUsers: string;
  commentPermissions: string;
  hideLikeCounts: string;
  notifications: string;
  security: string;
}): readonly ProfileSettingsSidebarItem[] {
  return [
    {
      href: "/settings/profile",
      iconKey: "user",
      label: text.editProfile,
      searchTerms: ["profile", "edit profile", "avatar", "cover photo", "bio", "name"],
    },
    {
      href: "/settings/account-privacy",
      iconKey: "shield",
      label: text.accountPrivacy,
      searchTerms: ["privacy", "account", "visibility", "profile visibility", "public", "private", "followers"],
    },
    {
      href: "/settings/comment-permissions",
      iconKey: "messageCircle",
      label: text.commentPermissions,
      searchTerms: ["comments", "comment", "reply", "replies", "who can comment", "permissions"],
    },
    {
      href: "/settings/like-count-visibility",
      iconKey: "heart",
      label: text.hideLikeCounts,
      searchTerms: ["likes", "like counts", "hide likes", "likes visibility", "hearts"],
    },
    {
      href: "/settings/blocked-users",
      iconKey: "ban",
      label: text.blockedUsers,
      searchTerms: ["blocked", "blocked users", "ban", "mute", "restrictions"],
    },
    {
      href: "/settings/notifications",
      iconKey: "bell",
      label: text.notifications,
      searchTerms: ["notifications", "notification settings", "follow requests", "follows", "requests", "alerts"],
    },
    {
      href: "/settings/password-security",
      iconKey: "lock",
      label: text.security,
      searchTerms: ["security", "password", "email", "sessions", "sign in", "login"],
    },
  ] as const;
}
