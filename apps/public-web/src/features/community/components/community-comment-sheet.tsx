"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MessageCircle, Send } from "lucide-react";

import { Button } from "@workspace/ui/components/primitives/button";
import { Input } from "@workspace/ui/components/forms/input";
import { Textarea } from "@workspace/ui/components/forms/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@workspace/ui/components/overlay/sheet";

import { useCommunityComments } from "@/features/community/lib/hooks";

export function CommunityCommentSheet({ postId }: { postId: string }) {
  const t = useTranslations("public-web");
  const { addComment, error, items, load, loading, reply } = useCommunityComments(postId);
  const [newComment, setNewComment] = useState("");

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline" onClick={() => void load()}><MessageCircle className="size-4" />{t("community.post.comment")}</Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{t("community.comment.title")}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-3">
          {loading ? <p>{t("community.comment.loading")}</p> : null}
          {error ? <p className="text-sm text-destructive">{t("community.comment.error")}</p> : null}
          {!loading && items.length === 0 ? <p className="text-sm text-muted-foreground">{t("community.comment.empty")}</p> : null}
          {items.map((item) => (
            <div key={item.id} className="rounded-md border p-2">
              <p className="text-xs text-muted-foreground">{item.author?.displayName ?? item.author?.username ?? t("community.post.authorFallback")}</p>
              <p className="text-sm">{item.content}</p>
              <ReplyForm onSubmit={(content) => reply(item.id, content)} />
              {item.replies?.slice(0, 5).map((replyItem) => (
                <p key={replyItem.id} className="mt-1 text-xs text-muted-foreground">{replyItem.content}</p>
              ))}
            </div>
          ))}
          <Textarea value={newComment} onChange={(event) => setNewComment(event.target.value)} placeholder={t("community.comment.placeholder")} />
          <Button type="button" onClick={() => void addComment(newComment).then(() => setNewComment(""))}><Send className="size-4" />{t("community.comment.send")}</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ReplyForm({ onSubmit }: { onSubmit: (content: string) => Promise<void> }) {
  const t = useTranslations("public-web");
  const [value, setValue] = useState("");
  return (
    <div className="mt-2 flex gap-2">
      <Input value={value} onChange={(event) => setValue(event.target.value)} placeholder={t("community.comment.reply")} />
      <Button type="button" size="sm" variant="outline" onClick={() => void onSubmit(value).then(() => setValue(""))}>{t("community.comment.send")}</Button>
    </div>
  );
}
