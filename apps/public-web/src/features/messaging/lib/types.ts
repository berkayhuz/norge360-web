export type ConversationKind = "Direct" | "Group" | "Broadcast" | number;
export type MessageKind = "Text" | "Emoji" | "Media" | "Voice" | "File" | "PostShare" | "ProfileShare" | "Location" | "System" | number;

export type EncryptedTextEnvelopeResponse = {
  cipherText: string;
  cipherNonce: string;
  cipherKeyId: string;
  encryptionAlgorithm: string;
};

export type MessageReactionResponse = {
  userId: string;
  emoji: string;
  createdAtUtc: string;
};

export type MessageReceiptResponse = {
  userId: string;
  deliveredAtUtc: string | null;
  readAtUtc: string | null;
};

export type MessageAttachmentResponse = {
  id: string;
  kind: number | string;
  storageKey: string;
  contentType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  waveformJson: string | null;
  encryptedFileKey: string;
  keyNonce: string;
  keyId: string;
  viewOnce: boolean;
};

export type MessageResponse = {
  id: string;
  conversationId: string;
  senderUserId: string;
  senderDeviceId: string;
  clientMessageId: string;
  kind: MessageKind;
  state: number | string;
  body: EncryptedTextEnvelopeResponse;
  attachments: MessageAttachmentResponse[];
  reactions: MessageReactionResponse[];
  receipts: MessageReceiptResponse[];
  replyToMessageId: string | null;
  replyPreview: MessageResponse | null;
  isForwarded: boolean;
  isEdited: boolean;
  isPinned: boolean;
  viewOnce: boolean;
  expiresAtUtc: string | null;
  createdAtUtc: string;
  sentAtUtc: string;
  editedAtUtc: string | null;
  recalledAtUtc: string | null;
  editUntilUtc: string;
  recallUntilUtc: string;
  associatedDataJson: string | null;
};

export type ConversationParticipantResponse = {
  userId: string;
  role: number | string;
  joinedAtUtc: string;
  lastReadAtUtc: string | null;
  lastDeliveredAtUtc: string | null;
  nickname: EncryptedTextEnvelopeResponse | null;
  themeKey: string | null;
  backgroundKey: string | null;
  notificationSoundEnabled?: boolean;
};

export type ConversationSummaryResponse = {
  id: string;
  kind: ConversationKind;
  requestStatus: number | string;
  createdAtUtc: string;
  updatedAtUtc: string;
  lastMessageId: string | null;
  lastMessageSenderUserId: string | null;
  lastMessageAtUtc: string | null;
  unreadCount: number;
  isArchived: boolean;
  isMuted: boolean;
  isPinned: boolean;
  isMarkedUnread: boolean;
  participants: ConversationParticipantResponse[];
};

export type ConversationPageResponse = {
  items: ConversationSummaryResponse[];
  pageSize: number;
  nextBeforeUtc: string | null;
};

export type MessagePageResponse = {
  items: MessageResponse[];
  pageSize: number;
  nextBeforeUtc: string | null;
};

export type MessagingDeviceKeyBundleResponse = {
  userId: string;
  deviceId: string;
  publicIdentityKey: string;
  signedPreKey: string;
  signedPreKeySignature: string;
  oneTimePreKeysJson: string | null;
  supportedAlgorithms: string;
  createdAtUtc: string;
};

export type MessagingTypingEvent = {
  conversationId: string;
  userId: string;
  isTyping: boolean;
};

export type MessagingReadReceiptEvent = {
  conversationId: string;
  userId: string;
  messageId: string | null;
  readAtUtc: string;
};

export type MessagingPresenceEvent = {
  conversationId: string;
  userId: string;
  isOnline: boolean;
};
