import type { MessageResponse } from "@/features/messaging/lib/types";

const PLAIN_TEXT_ALGORITHM = "plain/text; charset=utf-8";
const PLAIN_TEXT_DEVICE_ID = "web-plain";

type AssociatedData = {
  share?: {
    kind: "post";
    postId: string;
    postHref: string;
    caption?: string | null;
  };
  attachmentPreview?: {
    fileName: string;
    contentType: string;
    sizeBytes: number;
  };
};

export type EncryptedMessageDraft = {
  body: {
    cipherText: string;
    cipherNonce: string;
    cipherKeyId: string;
    encryptionAlgorithm: string;
  };
  associatedDataJson: string;
  clientSearchTokenHash: string | null;
  senderDeviceId: string;
};

export async function encryptTextForParticipants(
  text: string,
  _participantUserIds: string[],
  associatedData?: AssociatedData,
  _currentUserId?: string | null,
): Promise<EncryptedMessageDraft> {
  void _participantUserIds;
  void _currentUserId;

  return {
    associatedDataJson: associatedData ? JSON.stringify(associatedData) : "",
    body: {
      cipherText: toBase64(new TextEncoder().encode(text)),
      cipherNonce: toBase64(new TextEncoder().encode("plain")),
      cipherKeyId: "plain",
      encryptionAlgorithm: PLAIN_TEXT_ALGORITHM,
    },
    clientSearchTokenHash: normalizeSearchableText(text),
    senderDeviceId: PLAIN_TEXT_DEVICE_ID,
  };
}

export async function decryptMessageText(message: MessageResponse, _currentUserId: string | null): Promise<string | null> {
  void _currentUserId;
  return readPlainMessageText(message);
}

export function readPlainMessageText(message: MessageResponse): string | null {
  if (message.recalledAtUtc || !message.body?.cipherText) {
    return null;
  }

  try {
    return new TextDecoder().decode(fromBase64(message.body.cipherText));
  } catch {
    return null;
  }
}

export function readAssociatedData(value: string | null): AssociatedData | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as AssociatedData;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export async function sha256Base64(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return toBase64(new Uint8Array(digest));
}

export async function ensureMessagingDeviceRegistered(_currentUserId?: string | null) {
  void _currentUserId;
  return {
    deviceId: PLAIN_TEXT_DEVICE_ID,
    publicIdentityKey: "plain",
  };
}

export function normalizeSearchableText(value: string) {
  const normalized = value
    .trim()
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");

  return normalized ? normalized.slice(0, 128) : null;
}

function toBase64(value: Uint8Array) {
  let binary = "";
  value.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function fromBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}
