"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@workspace/ui/components/primitives/button";
import { Textarea } from "@workspace/ui/components/forms/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@workspace/ui/components/overlay/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/forms/select";

import type { CommunityReportReason } from "@/features/community/lib/types";

export function CommunityReportDialog({
  onSubmit,
  open,
  onOpenChange,
  trigger,
}: {
  onSubmit: (reason: CommunityReportReason, description: string) => Promise<void>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
}) {
  const t = useTranslations("public-web");
  const [reason, setReason] = useState<CommunityReportReason>("Spam");
  const [description, setDescription] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("community.report.title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Select value={reason} onValueChange={(value) => setReason(value as CommunityReportReason)}>
            <SelectTrigger>
              <SelectValue placeholder={t("community.report.reason")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Spam">{t("community.report.reasons.spam")}</SelectItem>
              <SelectItem value="Harassment">{t("community.report.reasons.harassment")}</SelectItem>
              <SelectItem value="HateSpeech">{t("community.report.reasons.hateSpeech")}</SelectItem>
              <SelectItem value="Nudity">{t("community.report.reasons.nudity")}</SelectItem>
              <SelectItem value="Violence">{t("community.report.reasons.violence")}</SelectItem>
              <SelectItem value="Scam">{t("community.report.reasons.scam")}</SelectItem>
              <SelectItem value="Other">{t("community.report.reasons.other")}</SelectItem>
            </SelectContent>
          </Select>
          <Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder={t("community.report.description")} />
          <Button type="button" onClick={() => void onSubmit(reason, description).then(() => onOpenChange?.(false))}>{t("community.report.submit")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
