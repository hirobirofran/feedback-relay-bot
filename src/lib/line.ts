import { messagingApi } from "@line/bot-sdk";
import { getLineChannelAccessToken } from "@/lib/env";

let cachedClient: messagingApi.MessagingApiClient | null = null;

function getClient(): messagingApi.MessagingApiClient {
  if (!cachedClient) {
    cachedClient = new messagingApi.MessagingApiClient({
      channelAccessToken: getLineChannelAccessToken(),
    });
  }
  return cachedClient;
}

export async function replyText(
  replyToken: string,
  text: string,
): Promise<void> {
  await getClient().replyMessage({
    replyToken,
    messages: [{ type: "text", text }],
  });
}
