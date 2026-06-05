import type { MyProfile, PublicProfile } from "@/lib/api/accounts-types";

export type ProfileCompletionItem = {
  completed: boolean;
  key:
    | "avatar"
    | "bio"
    | "location"
    | "occupation"
    | "company"
    | "website"
    | "coverPhotoBonus";
};

export type ProfileCompletionResult = {
  completed: number;
  items: ProfileCompletionItem[];
  percentage: number;
  total: number;
};

export function calculateProfileCompletion(
  profile: Pick<
    MyProfile | PublicProfile,
    | "avatarUrl"
    | "bio"
    | "country"
    | "city"
    | "occupation"
    | "company"
    | "website"
    | "coverPhotoUrl"
  >,
): ProfileCompletionResult {
  const items: ProfileCompletionItem[] = [
    { key: "avatar", completed: hasValue(profile.avatarUrl) },
    { key: "bio", completed: hasValue(profile.bio) },
    { key: "location", completed: hasValue(profile.country) || hasValue(profile.city) },
    { key: "occupation", completed: hasValue(profile.occupation) },
    { key: "company", completed: hasValue(profile.company) },
    { key: "website", completed: hasValue(profile.website) },
    // Cover photo upload is out of scope for now; keep as a bonus signal.
    { key: "coverPhotoBonus", completed: hasValue(profile.coverPhotoUrl) },
  ];

  const coreItems = items.filter((item) => item.key !== "coverPhotoBonus");
  const completed = coreItems.filter((item) => item.completed).length;
  const total = coreItems.length;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  return {
    completed,
    items,
    percentage,
    total,
  };
}

function hasValue(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}
