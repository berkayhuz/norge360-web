"use client";

import { useCallback, useMemo, useState } from "react";

import {
  clearPostInterest,
  createCommunityPost,
  deleteCommunityPost,
  createPostComment,
  getCommentAuthors,
  getCommunityFeed,
  getCommunityPost,
  getCommunityUserPosts,
  getPostComments,
  removePostReaction,
  reportComment,
  reportPost,
  replyComment,
  updateCommunityPost,
  setPostInterest,
  setPostReaction,
  togglePostLike,
  togglePostSave,
} from "./client";
import type { CommunityComment, CommunityFeedItem, CommunityPostInterestType, CommunityReportReason } from "./types";

const PAGE_SIZE = 10;

function dedupeById<T extends { id: string }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
}

export function useCommunityFeed() {
  const [items, setItems] = useState<CommunityFeedItem[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(true);

  const loadPage = useCallback(async (targetPage: number, append: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const response = await getCommunityFeed(targetPage, PAGE_SIZE);
      setItems((prev) => {
        const merged = append ? [...prev, ...response.items] : response.items;
        return dedupeById(merged);
      });
      setPage(response.page);
      setHasNextPage(response.hasNextPage ?? response.items.length >= response.pageSize);
    } catch (err) {
      setError(err instanceof Error ? err.message : "community_error");
      setHasNextPage(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadInitial = useCallback(async () => {
    await loadPage(1, false);
  }, [loadPage]);

  const loadMore = useCallback(async () => {
    if (loading || !hasNextPage) return;
    await loadPage(page + 1, true);
  }, [hasNextPage, loadPage, loading, page]);

  const optimisticPatch = useCallback((postId: string, updater: (item: CommunityFeedItem) => CommunityFeedItem) => {
    setItems((prev) => prev.map((item) => (item.id === postId ? updater(item) : item)));
  }, []);

  const requireRefresh = useCallback(async () => {
    await loadPage(1, false);
  }, [loadPage]);

  const actions = useMemo(() => ({
    async createPost(caption: string, city: string, district: string, images: File[]) {
      await createCommunityPost({ caption, city, district, images });
      await requireRefresh();
    },
    async updatePost(
      postId: string,
      payload: { caption: string; city: string; district: string; existingMediaIds: string[]; removeMediaIds: string[]; mediaOrder: string[]; mediaFiles: File[] },
    ) {
      await updateCommunityPost(postId, payload);
      await requireRefresh();
    },
    async deletePost(postId: string) {
      await deleteCommunityPost(postId);
      setItems((prev) => prev.filter((item) => item.id !== postId));
    },
    async toggleLike(postId: string, isLiked: boolean) {
      optimisticPatch(postId, (item) => ({ ...item, isLikedByCurrentUser: !isLiked, likesCount: Math.max(0, (item.likesCount ?? 0) + (isLiked ? -1 : 1)) }));
      try { await togglePostLike(postId, !isLiked); } catch { await requireRefresh(); }
    },
    async toggleSave(postId: string, isSaved: boolean) {
      optimisticPatch(postId, (item) => ({ ...item, isSavedByCurrentUser: !isSaved, savesCount: Math.max(0, (item.savesCount ?? 0) + (isSaved ? -1 : 1)) }));
      try { await togglePostSave(postId, !isSaved); } catch { await requireRefresh(); }
    },
    async setInterest(postId: string, interest: CommunityPostInterestType) {
      const previous = items;
      if (interest === "NotInterested") {
        setItems((prev) => prev.filter((item) => item.id !== postId));
      } else {
        optimisticPatch(postId, (item) => ({ ...item, currentUserInterest: interest }));
      }
      try { await setPostInterest(postId, interest); } catch { setItems(previous); }
    },
    async clearInterest(postId: string) {
      optimisticPatch(postId, (item) => ({ ...item, currentUserInterest: null }));
      try { await clearPostInterest(postId); } catch { await requireRefresh(); }
    },
    async setReaction(postId: string, emoji: string) {
      optimisticPatch(postId, (item) => ({ ...item, currentUserReaction: emoji }));
      try { await setPostReaction(postId, emoji); } catch { await requireRefresh(); }
    },
    async removeReaction(postId: string) {
      optimisticPatch(postId, (item) => ({ ...item, currentUserReaction: null }));
      try { await removePostReaction(postId); } catch { await requireRefresh(); }
    },
    async reportPost(postId: string, reason: CommunityReportReason, description: string) {
      await reportPost(postId, reason, description);
    },
  }), [items, optimisticPatch, requireRefresh]);

  return { actions, error, hasNextPage, items, loadInitial, loadMore, loading, refresh: requireRefresh };
}

export type CommunityFeedActions = ReturnType<typeof useCommunityFeed>["actions"];

export function useCommunityActions() {
  const { actions } = useCommunityFeed();
  return actions;
}

export function useCommunityComments(postId: string) {
  const [items, setItems] = useState<CommunityComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getPostComments(postId);
      const authors = await getCommentAuthors(response.items.map((comment) => comment.userId));
      setItems(response.items.map((comment) => {
        const author = authors.get(comment.userId);
        return {
          author: author
            ? {
              avatarUrl: author.avatarUrl,
              displayName: author.displayName,
              id: author.id,
              isVerified: author.isVerified,
              username: author.username,
            }
            : { id: comment.userId },
          canDelete: comment.canDelete,
          canReport: comment.canReport,
          content: comment.body,
          createdAt: comment.createdAt,
          currentUserReaction: comment.currentUserReaction ?? null,
          id: comment.id,
          isLikedByCurrentUser: comment.isLikedByCurrentUser,
          likesCount: comment.likesCount,
          parentCommentId: comment.parentCommentId ?? null,
          postId: comment.postId,
          reactionsSummary: comment.reactions.map((reaction) => ({ count: reaction.count, emoji: reaction.emoji, emojiCode: reaction.emojiCode })),
          userId: comment.userId,
          updatedAt: comment.updatedAt ?? null,
        };
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "community_comment_error");
    } finally {
      setLoading(false);
    }
  }, [postId]);

  const addComment = useCallback(async (content: string) => {
    await createPostComment(postId, content);
    await load();
  }, [load, postId]);

  const reply = useCallback(async (commentId: string, content: string) => {
    await replyComment(commentId, content);
    await load();
  }, [load]);

  const report = useCallback(async (commentId: string, reason: CommunityReportReason, description: string) => {
    await reportComment(commentId, reason, description);
  }, []);

  return { addComment, error, items, load, loading, reply, report };
}

export function useCommunityPost(postId: string) {
  const [item, setItem] = useState<CommunityFeedItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!postId) {
      setItem(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await getCommunityPost(postId);
      setItem(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "community_post_error");
    } finally {
      setLoading(false);
    }
  }, [postId]);

  return { error, item, load, loading };
}

export function useCommunityUserPosts(userId: string) {
  const [items, setItems] = useState<CommunityFeedItem[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(true);

  const loadPage = useCallback(async (targetPage: number, append: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const response = await getCommunityUserPosts(userId, targetPage, PAGE_SIZE);
      setItems((prev) => {
        const merged = append ? [...prev, ...response.items] : response.items;
        return dedupeById(merged);
      });
      setPage(response.page);
      setHasNextPage(response.hasNextPage ?? response.items.length >= response.pageSize);
    } catch (err) {
      setError(err instanceof Error ? err.message : "community_user_posts_error");
      setHasNextPage(false);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const loadInitial = useCallback(async () => {
    await loadPage(1, false);
  }, [loadPage]);

  const loadMore = useCallback(async () => {
    if (loading || !hasNextPage) return;
    await loadPage(page + 1, true);
  }, [hasNextPage, loadPage, loading, page]);

  return {
    error,
    hasNextPage,
    items,
    loadInitial,
    loadMore,
    loading,
  };
}
