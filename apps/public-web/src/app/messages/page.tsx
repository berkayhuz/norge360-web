import { Suspense } from "react";

import { MessagingPage } from "@/features/messaging/components/messaging-page";

export default function MessagesPage() {
  return (
    <Suspense fallback={null}>
      <MessagingPage />
    </Suspense>
  );
}
