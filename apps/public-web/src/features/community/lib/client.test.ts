import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createCommunityPost,
  createPostComment,
  getCommunityFeed,
  getCommunityUserPosts,
  reportPost,
  setPostInterest,
  setPostReaction,
  togglePostLike,
  togglePostSave,
  updateCommunityPost,
} from "./client";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("community client contracts", () => {
  it("maps the backend feed DTO and requests profile feeds through the expected route", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        items: [{
          post: {
            id: "post-1",
            userId: "user-1",
            caption: "hello",
            status: "Published",
            createdAt: "2026-06-02T00:00:00Z",
            updatedAt: null,
            commentsEnabled: true,
            hideLikeCountOverride: null,
            commentsCount: 1,
            likesCount: 2,
            savesCount: 3,
            isLikedByCurrentUser: true,
            isSavedByCurrentUser: false,
            currentUserReaction: "love",
            currentUserInterest: "Interested",
            canEdit: true,
            canDelete: true,
            canReport: false,
            author: { userId: "user-1", username: "berka", displayName: "Berka", avatarUrl: null, hideLikeCounts: false },
            media: [{ id: "media-1", publicUrl: "https://cdn.test/1", contentType: "image/png", sizeBytes: 12, width: 10, height: 10, order: 0, status: "Ready" }],
          },
          reactionSummary: [{ emojiCode: "love", emoji: "love", count: 1 }],
        }],
        page: 1,
        pageSize: 10,
        totalCount: 1,
      }))
      .mockResolvedValueOnce(jsonResponse({ items: [], page: 1, pageSize: 10, totalCount: 0 }));
    vi.stubGlobal("fetch", fetchMock);

    const feed = await getCommunityFeed(1, 10);
    await getCommunityUserPosts("user-1", 1, 10);

    expect(feed.items[0]).toMatchObject({ id: "post-1", userId: "user-1", status: "Published", likesCount: 2 });
    expect(feed.items[0]?.media[0]).toMatchObject({ id: "media-1", contentType: "image/png", order: 0 });
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/community/users/user-1/posts?page=1&pageSize=10", { cache: "no-store" });
  });

  it("builds create and update multipart payloads with the backend field names", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}));
    vi.stubGlobal("fetch", fetchMock);
    const image = new File(["image"], "image.png", { type: "image/png" });

    await createCommunityPost({ caption: "hello", city: "oslo", district: "sentrum", images: [image] });
    await updateCommunityPost("post-1", {
      caption: "updated",
      city: "bergen",
      district: "bergenhus",
      existingMediaIds: ["keep-1"],
      removeMediaIds: ["remove-1"],
      mediaOrder: ["keep-1"],
      mediaFiles: [image],
    });

    const createBody = fetchMock.mock.calls[0]?.[1]?.body as FormData;
    const updateBody = fetchMock.mock.calls[1]?.[1]?.body as FormData;
    expect(createBody.get("caption")).toBe("hello");
    expect(createBody.getAll("mediaFiles")).toHaveLength(1);
    expect(updateBody.get("caption")).toBe("updated");
    expect(updateBody.getAll("existingMediaIds")).toEqual(["keep-1"]);
    expect(updateBody.getAll("removeMediaIds")).toEqual(["remove-1"]);
    expect(updateBody.getAll("mediaOrder")).toEqual(["keep-1"]);
    expect(updateBody.getAll("mediaFiles")).toHaveLength(1);
  });

  it("sends interaction, comment and report payloads through their API contracts", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ active: true, count: 1 }))
      .mockResolvedValueOnce(jsonResponse({ active: true, count: 1 }))
      .mockResolvedValueOnce(jsonResponse({ currentUserInterest: "NotInterested" }))
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse({
        id: "comment-1",
        postId: "post-1",
        userId: "user-1",
        body: "comment",
        createdAt: "2026-06-02T00:00:00Z",
        updatedAt: null,
        commentsEnabled: true,
        hideLikeCountOverride: null,
        isLikedByCurrentUser: false,
        currentUserReaction: null,
        likesCount: 0,
        reactions: [],
        canDelete: true,
        canReport: false,
      }))
      .mockResolvedValueOnce(jsonResponse({}));
    vi.stubGlobal("fetch", fetchMock);

    await togglePostLike("post-1", true);
    await togglePostSave("post-1", true);
    await setPostInterest("post-1", "NotInterested");
    await setPostReaction("post-1", "love");
    const comment = await createPostComment("post-1", "comment");
    await reportPost("post-1", "Spam", "reason");

    expect(comment).toMatchObject({ id: "comment-1", author: { id: "user-1" }, canDelete: true });
    expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({ method: "PUT", body: JSON.stringify({ InterestType: "NotInterested" }) });
    expect(fetchMock.mock.calls[3]?.[1]).toMatchObject({ method: "POST", body: JSON.stringify({ Emoji: "love", EmojiCode: "love" }) });
    expect(fetchMock.mock.calls[4]?.[1]).toMatchObject({ method: "POST", body: JSON.stringify({ Body: "comment" }) });
    expect(fetchMock.mock.calls[5]?.[1]).toMatchObject({ method: "POST", body: JSON.stringify({ Description: "reason", Reason: "Spam" }) });
  });
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { headers: { "content-type": "application/json" }, status: 200 });
}
