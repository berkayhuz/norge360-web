import type { CommunityAuthor, CommunityComment, CommunityPostInterestType, CommunityReportReason, PagedCommunityFeedResponse, ToggleActionResponse } from "./types";

async function readJson<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => null)) as T | null;
  if (!response.ok) {
    throw new Error((data as { title?: string } | null)?.title ?? "community_request_failed");
  }
  return (data ?? ({} as T)) as T;
}

export async function getCommunityFeed(page: number, pageSize: number) {
  const response = await fetch(`/api/community/feed?page=${page}&pageSize=${pageSize}`, { cache: "no-store" });
  const data = await readJson<BackendPagedFeedResponse>(response);
  return mapPagedFeed(data);
}

export async function getCommunityPost(postId: string) {
  const response = await fetch(`/api/community/posts/${postId}`, { cache: "no-store" });
  const data = await readJson<BackendPost>(response);
  return mapPost(data);
}

export async function getCommunityUserPosts(userId: string, page: number, pageSize: number) {
  const response = await fetch(`/api/community/users/${userId}/posts?page=${page}&pageSize=${pageSize}`, { cache: "no-store" });
  const data = await readJson<BackendPagedFeedResponse>(response);
  return mapPagedFeed(data);
}

export async function createCommunityPost(payload: { caption: string; city: string; district: string; images: File[] }) {
  const formData = new FormData();
  formData.set("caption", payload.caption);
  formData.set("city", payload.city);
  formData.set("district", payload.district);
  for (const image of payload.images) {
    formData.append("mediaFiles", image);
  }

  const response = await fetch("/api/community/posts", { body: formData, method: "POST" });
  return readJson<unknown>(response);
}

export async function updateCommunityPost(
  postId: string,
  payload: {
    caption: string;
    city: string;
    district: string;
    existingMediaIds: string[];
    removeMediaIds: string[];
    mediaOrder: string[];
    mediaFiles: File[];
  },
) {
  const formData = new FormData();
  formData.set("caption", payload.caption);
  formData.set("city", payload.city);
  formData.set("district", payload.district);
  for (const value of payload.existingMediaIds) formData.append("existingMediaIds", value);
  for (const value of payload.removeMediaIds) formData.append("removeMediaIds", value);
  for (const value of payload.mediaOrder) formData.append("mediaOrder", value);
  for (const file of payload.mediaFiles) formData.append("mediaFiles", file);
  const response = await fetch(`/api/community/posts/${postId}`, { body: formData, method: "PUT" });
  return readJson<unknown>(response);
}

export async function deleteCommunityPost(postId: string) {
  const response = await fetch(`/api/community/posts/${postId}`, { method: "DELETE" });
  if (!response.ok) throw new Error("community_delete_failed");
}

export async function togglePostLike(postId: string, shouldLike: boolean) {
  const response = await fetch(`/api/community/posts/${postId}/like`, { method: shouldLike ? "POST" : "DELETE" });
  return readJson<ToggleActionResponse>(response);
}

export async function togglePostSave(postId: string, shouldSave: boolean) {
  const response = await fetch(`/api/community/posts/${postId}/save`, { method: shouldSave ? "POST" : "DELETE" });
  return readJson<ToggleActionResponse>(response);
}

export async function setPostInterest(postId: string, interest: CommunityPostInterestType) {
  const response = await fetch(`/api/community/posts/${postId}/interest`, {
    body: JSON.stringify({ InterestType: interest }),
    headers: { "content-type": "application/json" },
    method: "PUT",
  });
  return readJson<ToggleActionResponse>(response);
}

export async function clearPostInterest(postId: string) {
  const response = await fetch(`/api/community/posts/${postId}/interest`, { method: "DELETE" });
  return readJson<ToggleActionResponse>(response);
}

export async function setPostReaction(postId: string, emoji: string) {
  const response = await fetch(`/api/community/posts/${postId}/reactions`, {
    body: JSON.stringify({ Emoji: emoji, EmojiCode: emoji }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  return readJson<ToggleActionResponse>(response);
}

export async function removePostReaction(postId: string) {
  const response = await fetch(`/api/community/posts/${postId}/reactions`, { method: "DELETE" });
  return readJson<ToggleActionResponse>(response);
}

export async function getPostComments(postId: string) {
  const response = await fetch(`/api/community/posts/${postId}/comments`, { cache: "no-store" });
  const data = await readJson<BackendPagedCommentsResponse>(response);
  return { items: data.items };
}

export async function getAccountBatchSummary(userIds: string[]) {
  if (userIds.length === 0) {
    return new Map<string, CommunityAuthor>();
  }

  const response = await fetch("/api/accounts/internal/users/batch-summary", {
    body: JSON.stringify({ userIds }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });

  const data = await readJson<BackendBatchSummaryResponse>(response);
  return new Map(
    data.items.map((item) => [
      item.userId,
      {
        avatarUrl: item.avatarUrl ?? null,
        displayName: item.displayName ?? undefined,
        id: item.userId,
        isVerified: item.isVerified,
        username: item.username ?? undefined,
      } satisfies CommunityAuthor,
    ]),
  );
}

export async function getCommentAuthors(userIds: string[]): Promise<Map<string, CommunityAuthor>> {
  const distinctUserIds = Array.from(new Set(userIds.filter(Boolean)));
  if (distinctUserIds.length === 0) {
    return new Map<string, CommunityAuthor>();
  }

  const entries = await Promise.all(
    distinctUserIds.map(async (userId) => {
      try {
        const identityResponse = await fetch(`/api/accounts/internal/users/${encodeURIComponent(userId)}/identity`, { cache: "no-store" });
        const identity = await readJson<BackendInternalIdentityResponse>(identityResponse);
        const username = identity.userName?.trim();

        if (!username) {
          return [userId, { id: userId } satisfies CommunityAuthor] as const;
        }

        const profileResponse = await fetch(`/api/accounts/profiles/${encodeURIComponent(username)}`, { cache: "no-store" });
        if (profileResponse.ok) {
          const profile = await readJson<BackendPublicProfileResponse>(profileResponse);
          return [
            userId,
            {
              avatarUrl: profile.avatarUrl ?? null,
              displayName: profile.displayName ?? username,
              id: userId,
              isVerified: profile.isVerified,
              username,
            } satisfies CommunityAuthor,
          ] as const;
        }

        return [
          userId,
          {
            displayName: username,
            id: userId,
            username,
          } satisfies CommunityAuthor,
        ] as const;
      } catch {
        return [userId, { id: userId } satisfies CommunityAuthor] as const;
      }
    }),
  );

  return new Map(entries as Array<readonly [string, CommunityAuthor]>);
}

export async function createPostComment(postId: string, content: string) {
  const response = await fetch(`/api/community/posts/${postId}/comments`, {
    body: JSON.stringify({ Body: content }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  const data = await readJson<BackendComment>(response);
  return mapComment(data);
}

export async function replyComment(commentId: string, content: string) {
  const response = await fetch(`/api/community/comments/${commentId}/replies`, {
    body: JSON.stringify({ Body: content }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  const data = await readJson<BackendComment>(response);
  return mapComment(data);
}

export async function reportPost(postId: string, reason: CommunityReportReason, description: string) {
  const response = await fetch(`/api/community/posts/${postId}/reports`, {
    body: JSON.stringify({ Description: description, Reason: reason }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  await readJson<unknown>(response);
  return { reported: true };
}

export async function reportComment(commentId: string, reason: CommunityReportReason, description: string) {
  const response = await fetch(`/api/community/comments/${commentId}/reports`, {
    body: JSON.stringify({ Description: description, Reason: reason }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  await readJson<unknown>(response);
  return { reported: true };
}

type BackendAuthor = {
  userId: string;
  username?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  isVerified?: boolean;
};

type BackendPostMedia = {
  id: string;
  publicUrl: string;
  contentType: string;
  sizeBytes: number;
  width: number;
  height: number;
  order: number;
  status: string;
};

type BackendPost = {
  id: string;
  userId: string;
  caption?: string | null;
  city?: string | null;
  district?: string | null;
  status: string;
  createdAt: string;
  updatedAt?: string | null;
  commentsCount: number;
  likesCount: number;
  savesCount: number;
  isLikedByCurrentUser: boolean;
  isSavedByCurrentUser: boolean;
  currentUserReaction?: string | null;
  currentUserInterest?: CommunityPostInterestType | null;
  canEdit: boolean;
  canDelete: boolean;
  canReport: boolean;
  author?: BackendAuthor | null;
  media: BackendPostMedia[];
};

type BackendReactionSummary = { emojiCode: string; emoji: string; count: number };
type BackendFeedItem = { post: BackendPost; reactionSummary: BackendReactionSummary[] };
type BackendPagedFeedResponse = { items: BackendFeedItem[]; page: number; pageSize: number; totalCount: number };
type BackendBatchSummaryResponse = {
  items: Array<{
    userId: string;
    username?: string | null;
    displayName?: string | null;
    avatarUrl?: string | null;
    isVerified?: boolean;
    canViewPosts?: boolean;
    profileVisibility?: string | null;
  }>;
};
type BackendInternalIdentityResponse = { userName?: string | null };
type BackendPublicProfileResponse = {
  id: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  isVerified: boolean;
};

type BackendComment = {
  id: string;
  postId: string;
  userId: string;
  parentCommentId?: string | null;
  body: string;
  createdAt: string;
  updatedAt?: string | null;
  isLikedByCurrentUser: boolean;
  currentUserReaction?: string | null;
  likesCount: number;
  reactions: BackendReactionSummary[];
  canDelete: boolean;
  canReport: boolean;
};

type BackendPagedCommentsResponse = { items: BackendComment[] };

function mapPagedFeed(data: BackendPagedFeedResponse): PagedCommunityFeedResponse {
  const hasNextPage = data.page * data.pageSize < data.totalCount;
  return {
    hasNextPage,
    items: data.items.map((item) => ({
      author: item.post.author
        ? {
          avatarUrl: item.post.author.avatarUrl ?? null,
          displayName: item.post.author.displayName ?? undefined,
          id: item.post.author.userId,
          username: item.post.author.username ?? undefined,
        }
        : undefined,
      canDelete: item.post.canDelete,
      canEdit: item.post.canEdit,
      canReport: item.post.canReport,
      caption: item.post.caption ?? null,
      city: item.post.city ?? null,
      commentsCount: item.post.commentsCount,
      createdAt: item.post.createdAt,
      currentUserInterest: item.post.currentUserInterest ?? null,
      currentUserReaction: item.post.currentUserReaction ?? null,
      district: item.post.district ?? null,
      id: item.post.id,
      isLikedByCurrentUser: item.post.isLikedByCurrentUser,
      isSavedByCurrentUser: item.post.isSavedByCurrentUser,
      likesCount: item.post.likesCount,
      media: item.post.media.map((media) => ({
        contentType: media.contentType,
        height: media.height,
        id: media.id,
        order: media.order,
        sizeBytes: media.sizeBytes,
        status: media.status,
        url: media.publicUrl,
        width: media.width,
      })),
      reactionsSummary: item.reactionSummary.map((reaction) => ({ count: reaction.count, emoji: reaction.emoji, emojiCode: reaction.emojiCode })),
      savesCount: item.post.savesCount,
      status: item.post.status,
      updatedAt: item.post.updatedAt ?? null,
      userId: item.post.userId,
    })),
    page: data.page,
    pageSize: data.pageSize,
    totalCount: data.totalCount,
  };
}

function mapPost(post: BackendPost) {
  return {
    author: post.author
      ? {
        avatarUrl: post.author.avatarUrl ?? null,
        displayName: post.author.displayName ?? undefined,
        id: post.author.userId,
        isVerified: post.author.isVerified,
        username: post.author.username ?? undefined,
      }
      : undefined,
    canDelete: post.canDelete,
    canEdit: post.canEdit,
    canReport: post.canReport,
    caption: post.caption ?? null,
    city: post.city ?? null,
    commentsCount: post.commentsCount,
    createdAt: post.createdAt,
    currentUserInterest: post.currentUserInterest ?? null,
    currentUserReaction: post.currentUserReaction ?? null,
    district: post.district ?? null,
    id: post.id,
    isLikedByCurrentUser: post.isLikedByCurrentUser,
    isSavedByCurrentUser: post.isSavedByCurrentUser,
    likesCount: post.likesCount,
    media: post.media.map((media) => ({
      contentType: media.contentType,
      height: media.height,
      id: media.id,
      order: media.order,
      sizeBytes: media.sizeBytes,
      status: media.status,
      url: media.publicUrl,
      width: media.width,
    })),
    savesCount: post.savesCount,
    status: post.status,
    updatedAt: post.updatedAt ?? null,
    userId: post.userId,
  };
}

function mapComment(comment: BackendComment, author?: CommunityAuthor): CommunityComment {
  return {
    content: comment.body,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt ?? null,
    author: author ?? { id: comment.userId },
    canDelete: comment.canDelete,
    canReport: comment.canReport,
    currentUserReaction: comment.currentUserReaction ?? null,
    id: comment.id,
    isLikedByCurrentUser: comment.isLikedByCurrentUser,
    likesCount: comment.likesCount,
    parentCommentId: comment.parentCommentId ?? null,
    postId: comment.postId,
    reactionsSummary: comment.reactions.map((reaction) => ({ count: reaction.count, emoji: reaction.emoji, emojiCode: reaction.emojiCode })),
  };
}
