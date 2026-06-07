"use client";

import { useCallback, useMemo, useState } from "react";

import {
  clearPostInterest,
  createCommunityPost,
  deleteCommunityPost,
  deleteCommunityComment,
  createPostComment,
  getCommunityComment,
  getCommunityCommentFromPost,
  getCommunityCommentBySlug,
  getCommentAuthors,
  getCommentReplies,
  getCommentRepliesBySlug,
  getCommentRepliesFromPost,
  getCommunityFeed,
  getCommunitySavedPosts,
  getCommunityPost,
  getCommunityPostBySlug,
  getCommunityUserPosts,
  getPostComments,
  removePostReaction,
  reportComment,
  reportPost,
  replyComment,
  setPostCommentsEnabled,
  setPostHideLikeCount,
  toggleCommentLike,
  updateCommunityPost,
  setPostInterest,
  setPostReaction,
  togglePostLike,
  togglePostSave,
} from "./client";
import type { BackendComment } from "./client";
import { encodePublicIdSlug } from "./client";
import type { CommunityAuthor, CommunityComment, CommunityFeedItem, CommunityPostInterestType, CommunityReportReason } from "./types";

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
    async setCommentsEnabled(postId: string, enabled: boolean) {
      await setPostCommentsEnabled(postId, enabled);
      await requireRefresh();
    },
    async setHideLikeCount(postId: string, hideLikeCount: boolean) {
      await setPostHideLikeCount(postId, hideLikeCount);
      await requireRefresh();
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

export function useCommunitySavedPosts() {
  return useCommunityFeedSource(getCommunitySavedPosts, "community_saved_posts_error");
}

export function useCommunityActions() {
  const { actions } = useCommunityFeed();
  return actions;
}

export function useCommunityComments(postId: string) {
  const [items, setItems] = useState<CommunityComment[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(true);
  const PAGE_SIZE = 20;

  const loadPage = useCallback(async (targetPage: number, append: boolean) => {
    if (!postId) {
      setItems([]);
      setPage(1);
      setHasNextPage(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (!append) {
        setLoadMoreError(null);
      }
      const response = await getPostComments(postId, targetPage, PAGE_SIZE);
      const authors = await getCommentAuthors(collectCommentAuthorIds(response.items));
      const mapped = response.items.map((comment) => mapCommentWithAuthors(comment, authors));
      setItems((prev) => {
        const merged = append ? [...prev, ...mapped] : mapped;
        return dedupeById(merged);
      });
      setPage(response.page);
      setHasNextPage(response.page * response.pageSize < response.totalCount);
      setLoadMoreError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "community_comment_error";
      if (append) {
        setLoadMoreError(message);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }, [postId]);

  const load = useCallback(async () => {
    await loadPage(1, false);
  }, [loadPage]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasNextPage) {
      return;
    }

    setLoadingMore(true);
    try {
      await loadPage(page + 1, true);
    } finally {
      setLoadingMore(false);
    }
  }, [hasNextPage, loadPage, loading, loadingMore, page]);

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

  const deleteComment = useCallback(async (commentId: string) => {
    await deleteCommunityComment(commentId);
    await load();
  }, [load]);

  const toggleLike = useCallback(async (commentId: string, isLiked: boolean) => {
    await toggleCommentLike(commentId, !isLiked);
    await load();
  }, [load]);

  return { addComment, deleteComment, error, hasNextPage, items, load, loadMore, loadMoreError, loading, loadingMore, reply, report, toggleLike };
}

export function useCommunityCommentReplies(
  commentId: string,
  postId?: string,
  slugContext?: { username: string; postSlug: string; commentSlug: string },
) {
  const [items, setItems] = useState<CommunityComment[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(true);
  const PAGE_SIZE = 20;

  const loadPage = useCallback(async (targetPage: number, append: boolean) => {
    if (!commentId) {
      setItems([]);
      setPage(1);
      setHasNextPage(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (!append) {
        setLoadMoreError(null);
      }
      let response;
      try {
        if (slugContext) {
          response = await getCommentRepliesBySlug(slugContext.username, slugContext.postSlug, slugContext.commentSlug, targetPage, PAGE_SIZE);
        } else {
          response = await getCommentReplies(commentId, targetPage, PAGE_SIZE);
        }
      } catch {
        if (!postId) {
          throw new Error("community_comment_error");
        }
        response = await getCommentRepliesFromPost(postId, commentId, targetPage, PAGE_SIZE);
      }
      const authors = await getCommentAuthors(collectCommentAuthorIds(response.items));
      const mapped = response.items.map((comment) => mapCommentWithAuthors(comment, authors));
      setItems((prev) => {
        const merged = append ? [...prev, ...mapped] : mapped;
        return dedupeById(merged);
      });
      setPage(response.page);
      setHasNextPage(response.page * response.pageSize < response.totalCount);
      setLoadMoreError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "community_comment_error";
      if (append) {
        setLoadMoreError(message);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }, [commentId, postId, slugContext]);

  const load = useCallback(async () => {
    await loadPage(1, false);
  }, [loadPage]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasNextPage) {
      return;
    }

    setLoadingMore(true);
    try {
      await loadPage(page + 1, true);
    } finally {
      setLoadingMore(false);
    }
  }, [hasNextPage, loadPage, loading, loadingMore, page]);

  const addReply = useCallback(async (content: string) => {
    await replyComment(commentId, content);
    await load();
  }, [commentId, load]);

  const report = useCallback(async (replyId: string, reason: CommunityReportReason, description: string) => {
    await reportComment(replyId, reason, description);
  }, []);

  const deleteReply = useCallback(async (replyId: string) => {
    await deleteCommunityComment(replyId);
    await load();
  }, [load]);

  const toggleLike = useCallback(async (replyId: string, isLiked: boolean) => {
    await toggleCommentLike(replyId, !isLiked);
    await load();
  }, [load]);

  return { addReply, deleteReply, error, hasNextPage, items, load, loadMore, loadMoreError, loading, loadingMore, report, toggleLike };
}

export function useCommunityComment(commentId: string, postId?: string) {
  const [item, setItem] = useState<CommunityComment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!commentId) {
      setItem(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let comment;
      try {
        comment = await getCommunityComment(commentId);
      } catch {
        if (!postId) {
          throw new Error("community_comment_error");
        }
        comment = await getCommunityCommentFromPost(postId, commentId);
      }
      setItem(comment);
    } catch (err) {
      setError(err instanceof Error ? err.message : "community_comment_error");
    } finally {
      setLoading(false);
    }
  }, [commentId, postId]);

  const toggleLike = useCallback(async (isLiked: boolean) => {
    await toggleCommentLike(commentId, !isLiked);
    await load();
  }, [commentId, load]);

  return { error, item, load, loading, toggleLike };
}

export function useCommunityPostBySlug(username: string, postSlug: string) {
  const [item, setItem] = useState<CommunityFeedItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!username || !postSlug) {
      setItem(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await getCommunityPostBySlug(username, postSlug);
      setItem(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "community_post_error");
    } finally {
      setLoading(false);
    }
  }, [postSlug, username]);

  return { error, item, load, loading };
}

export function useCommunityCommentBySlug(username: string, postSlug: string, commentSlug: string) {
  const [item, setItem] = useState<CommunityComment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!username || !postSlug || !commentSlug) {
      setItem(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const comment = await getCommunityCommentBySlug(username, postSlug, commentSlug);
      setItem(comment);
    } catch (err) {
      setError(err instanceof Error ? err.message : "community_comment_error");
    } finally {
      setLoading(false);
    }
  }, [commentSlug, postSlug, username]);

  const itemId = item?.id;
  const toggleLike = useCallback(async (isLiked: boolean) => {
    if (!itemId) {
      return;
    }

    await toggleCommentLike(itemId, !isLiked);
    await load();
  }, [itemId, load]);

  return { error, item, load, loading, toggleLike };
}

function collectCommentAuthorIds(items: BackendComment[]) {
  const ids = new Set<string>();

  for (const item of items) {
    if (item.userId) {
      ids.add(item.userId);
    }

    if (item.pinnedReply?.userId) {
      ids.add(item.pinnedReply.userId);
    }
  }

  return Array.from(ids);
}

function mapCommentWithAuthors(comment: BackendComment, authors: Map<string, CommunityAuthor>): CommunityComment {
  const author = authors.get(comment.userId);
  const pinnedReply = comment.pinnedReply ? mapCommentWithAuthors(comment.pinnedReply, authors) : null;

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
    slug: comment.slug ?? encodePublicIdSlug(comment.id),
    isLikedByCurrentUser: comment.isLikedByCurrentUser,
    likesCount: comment.likesCount,
    parentCommentId: comment.parentCommentId ?? null,
    pinnedReply,
    postId: comment.postId,
    reactionsSummary: comment.reactions.map((reaction) => ({ count: reaction.count, emoji: reaction.emoji, emojiCode: reaction.emojiCode })),
    replyCount: comment.replyCount ?? 0,
    userId: comment.userId,
    updatedAt: comment.updatedAt ?? null,
  };
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

function useCommunityFeedSource(
  loader: (page: number, pageSize: number) => Promise<{ items: CommunityFeedItem[]; page: number; pageSize: number; hasNextPage?: boolean }>,
  fallbackError: string,
) {
  const [items, setItems] = useState<CommunityFeedItem[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(true);

  const loadPage = useCallback(async (targetPage: number, append: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const response = await loader(targetPage, PAGE_SIZE);
      setItems((prev) => {
        const merged = append ? [...prev, ...response.items] : response.items;
        return dedupeById(merged);
      });
      setPage(response.page);
      setHasNextPage(response.hasNextPage ?? response.items.length >= response.pageSize);
    } catch (err) {
      setError(err instanceof Error ? err.message : fallbackError);
      setHasNextPage(false);
    } finally {
      setLoading(false);
    }
  }, [fallbackError, loader]);

  const loadInitial = useCallback(async () => {
    await loadPage(1, false);
  }, [loadPage]);

  const loadMore = useCallback(async () => {
    if (loading || !hasNextPage) return;
    await loadPage(page + 1, true);
  }, [hasNextPage, loadPage, loading, page]);

  const refresh = useCallback(async () => {
    await loadPage(1, false);
  }, [loadPage]);

  const optimisticPatch = useCallback((postId: string, updater: (item: CommunityFeedItem) => CommunityFeedItem) => {
    setItems((prev) => prev.map((item) => (item.id === postId ? updater(item) : item)));
  }, []);

  const actions = useMemo(() => ({
    async createPost(caption: string, city: string, district: string, images: File[]) {
      await createCommunityPost({ caption, city, district, images });
      await refresh();
    },
    async updatePost(
      postId: string,
      payload: { caption: string; city: string; district: string; existingMediaIds: string[]; removeMediaIds: string[]; mediaOrder: string[]; mediaFiles: File[] },
    ) {
      await updateCommunityPost(postId, payload);
      await refresh();
    },
    async deletePost(postId: string) {
      await deleteCommunityPost(postId);
      setItems((prev) => prev.filter((item) => item.id !== postId));
    },
    async setCommentsEnabled(postId: string, enabled: boolean) {
      await setPostCommentsEnabled(postId, enabled);
      await refresh();
    },
    async setHideLikeCount(postId: string, hideLikeCount: boolean) {
      await setPostHideLikeCount(postId, hideLikeCount);
      await refresh();
    },
    async toggleLike(postId: string, isLiked: boolean) {
      optimisticPatch(postId, (item) => ({ ...item, isLikedByCurrentUser: !isLiked, likesCount: Math.max(0, (item.likesCount ?? 0) + (isLiked ? -1 : 1)) }));
      try { await togglePostLike(postId, !isLiked); } catch { await refresh(); }
    },
    async toggleSave(postId: string, isSaved: boolean) {
      optimisticPatch(postId, (item) => ({ ...item, isSavedByCurrentUser: !isSaved, savesCount: Math.max(0, (item.savesCount ?? 0) + (isSaved ? -1 : 1)) }));
      try { await togglePostSave(postId, !isSaved); } catch { await refresh(); return; }
      if (isSaved) {
        setItems((prev) => prev.filter((item) => item.id !== postId));
      } else {
        void refresh();
      }
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
      try { await clearPostInterest(postId); } catch { await refresh(); }
    },
    async setReaction(postId: string, emoji: string) {
      optimisticPatch(postId, (item) => ({ ...item, currentUserReaction: emoji }));
      try { await setPostReaction(postId, emoji); } catch { await refresh(); }
    },
    async removeReaction(postId: string) {
      optimisticPatch(postId, (item) => ({ ...item, currentUserReaction: null }));
      try { await removePostReaction(postId); } catch { await refresh(); }
    },
    async reportPost(postId: string, reason: CommunityReportReason, description: string) {
      await reportPost(postId, reason, description);
    },
  }), [items, optimisticPatch, refresh]);

  return { actions, error, hasNextPage, items, loadInitial, loadMore, loading, refresh };
}
