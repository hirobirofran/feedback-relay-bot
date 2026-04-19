function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getLineChannelSecret(): string {
  return required("LINE_CHANNEL_SECRET");
}

export function getLineChannelAccessToken(): string {
  return required("LINE_CHANNEL_ACCESS_TOKEN");
}

export function getAllowedLineUserIds(): Set<string> {
  const raw = process.env.ALLOWED_LINE_USER_IDS ?? "";
  return new Set(
    raw
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id.length > 0),
  );
}
