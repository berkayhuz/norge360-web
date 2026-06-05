export type CommunityPostInterestType = "Interested" | "NotInterested";
export type CommunityReportReason = "Spam" | "Harassment" | "HateSpeech" | "Nudity" | "Violence" | "Scam" | "Other";

export type CommunityAuthor = {
  id?: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string | null;
  isVerified?: boolean;
};

export type CommunityPostMedia = {
  id?: string;
  url: string;
  contentType?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  order?: number;
  status?: string;
  altText?: string | null;
};

export type CommunityReactionSummary = {
  emojiCode?: string;
  emoji: string;
  count: number;
  reactedByCurrentUser?: boolean;
};

export type CommunityComment = {
  id: string;
  postId?: string;
  userId?: string;
  parentCommentId?: string | null;
  content: string;
  createdAt: string;
  updatedAt?: string | null;
  author?: CommunityAuthor;
  replies?: CommunityComment[];
  likesCount?: number;
  isLikedByCurrentUser?: boolean;
  currentUserReaction?: string | null;
  reactionsSummary?: CommunityReactionSummary[];
  canDelete?: boolean;
  canReport?: boolean;
};

export type CommunityPost = {
  id: string;
  userId?: string;
  caption?: string | null;
  city?: string | null;
  district?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  status?: string;
  author?: CommunityAuthor;
  media: CommunityPostMedia[];
  isLikedByCurrentUser?: boolean;
  isSavedByCurrentUser?: boolean;
  currentUserReaction?: string | null;
  currentUserInterest?: CommunityPostInterestType | null;
  commentsCount?: number;
  likesCount?: number;
  savesCount?: number;
  reactionsSummary?: CommunityReactionSummary[];
  canEdit?: boolean;
  canDelete?: boolean;
  canReport?: boolean;
};

export type CommunityFeedItem = CommunityPost;

export type PagedCommunityFeedResponse = {
  items: CommunityFeedItem[];
  page: number;
  pageSize: number;
  totalCount?: number;
  hasNextPage?: boolean;
};

export type ToggleActionResponse = {
  active: boolean;
  count: number;
};
