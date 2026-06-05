export type DiscoverUser = {
  userId?: string | null;
  profileId: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  isVerified: boolean;
  viewerFollowsThisUser: boolean;
  reasonLabel: string;
};

export type DiscoveryHub = {
  popularUsers: DiscoverUser[];
  trendingUsers: DiscoverUser[];
  suggestedUsers: DiscoverUser[];
};
