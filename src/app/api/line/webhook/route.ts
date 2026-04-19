import { validateSignature, webhook } from "@line/bot-sdk";
import {
  getAllowedLineUserIds,
  getLineChannelSecret,
} from "@/lib/env";
import { buildIssueFromFeedback } from "@/lib/gemini";
import { createIssue } from "@/lib/github";
import { replyText } from "@/lib/line";

export const runtime = "nodejs";

const NON_TEXT_REPLY =
  "ありがとうございます、ただ今は文字のメッセージだけお受けしています。お手数ですが文字で送り直していただけると助かります。";
const ERROR_REPLY =
  "ごめんなさい、うまく受け取れませんでした。少し時間を空けて、もう一度同じメッセージを送っていただけますか。";

export async function GET(): Promise<Response> {
  return Response.json({ ok: true, path: "/api/line/webhook" });
}

export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text();
  const signature = request.headers.get("x-line-signature") ?? "";

  if (!validateSignature(rawBody, getLineChannelSecret(), signature)) {
    console.warn("[line-webhook] invalid signature");
    return Response.json({ ok: true });
  }

  let payload: webhook.CallbackRequest;
  try {
    payload = JSON.parse(rawBody) as webhook.CallbackRequest;
  } catch (error) {
    console.warn("[line-webhook] malformed JSON", error);
    return Response.json({ ok: true });
  }

  const allowed = getAllowedLineUserIds();

  for (const event of payload.events ?? []) {
    const userId = event.source?.userId;
    if (!userId) {
      console.log(`[line-webhook] event without userId type=${event.type}`);
      continue;
    }
    if (!allowed.has(userId)) {
      console.warn(
        `[line-webhook] unauthorized userId=${userId} type=${event.type}`,
      );
      continue;
    }

    try {
      await handleAuthorizedEvent(event);
    } catch (error) {
      console.error("[line-webhook] handler failed", error);
      if (event.type === "message" && event.replyToken) {
        await safeReply(event.replyToken, ERROR_REPLY);
      }
    }
  }

  return Response.json({ ok: true });
}

async function handleAuthorizedEvent(event: webhook.Event): Promise<void> {
  if (event.type !== "message" || !event.replyToken) {
    console.log(`[line-webhook] skip non-message event type=${event.type}`);
    return;
  }

  const { message, replyToken } = event;

  if (message.type !== "text") {
    console.log(
      `[line-webhook] unsupported message type=${message.type}`,
    );
    await safeReply(replyToken, NON_TEXT_REPLY);
    return;
  }

  const text = message.text?.trim() ?? "";
  if (!text) {
    await safeReply(replyToken, NON_TEXT_REPLY);
    return;
  }

  console.log(`[line-webhook] drafting issue chars=${text.length}`);
  const draft = await buildIssueFromFeedback(text);
  console.log(`[line-webhook] issue draft title="${draft.title}"`);

  const issue = await createIssue(draft);
  console.log(
    `[line-webhook] issue created number=${issue.number} url=${issue.url}`,
  );

  await safeReply(
    replyToken,
    `受け取りました、ありがとうございます。\n開発メモに追加しました。順に対応していきます。\n${draft.title}\n${issue.url}`,
  );
}

async function safeReply(replyToken: string, text: string): Promise<void> {
  try {
    await replyText(replyToken, text);
  } catch (error) {
    console.error("[line-webhook] reply failed", error);
  }
}
