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

export function getGeminiApiKey(): string {
  return required("GEMINI_API_KEY");
}

export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
}

export function getGithubToken(): string {
  return required("GITHUB_TOKEN");
}

export function getGithubOwner(): string {
  return required("GITHUB_OWNER");
}

export function getGithubRepo(): string {
  return required("GITHUB_REPO");
}

export type FeedbackBotMode = "test" | "production";

export function getFeedbackBotMode(): FeedbackBotMode {
  return process.env.FEEDBACK_BOT_MODE === "production" ? "production" : "test";
}
