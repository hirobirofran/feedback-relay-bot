import { validateSignature, webhook } from "@line/bot-sdk";
import {
  getAllowedLineUserIds,
  getLineChannelSecret,
} from "@/lib/env";

export const runtime = "nodejs";

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
    console.log(
      `[line-webhook] received authorized event type=${event.type} userId=${userId}`,
    );
  }

  return Response.json({ ok: true });
}
