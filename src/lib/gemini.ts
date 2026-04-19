import {
  GoogleGenerativeAI,
  SchemaType,
  type ResponseSchema,
} from "@google/generative-ai";
import { getGeminiApiKey, getGeminiModel } from "@/lib/env";

export type IssueDraft = {
  title: string;
  body: string;
};

const SYSTEM_INSTRUCTION = `あなたは食材管理アプリ「food-inventory-app」のフィードバック窓口です。
家族ユーザーから LINE 経由で届いたカジュアルな意見・要望・不具合報告を、
開発者が読んで即対応できる GitHub Issue の下書きに整形することが役割です。

# 整形方針
- タイトルは簡潔・動詞始まり・50 文字以内の日本語
- 本文は Markdown、以下のセクション構成を基本とする:
  ## 背景
  ## 期待する動作 / 要望
  ## 補足（任意: 再現手順、関連機能など元メッセージから拾える範囲）
- 元メッセージが短くても、推測で内容を膨らませない。わからない箇所は「補足」で「元メッセージからは不明」と書く
- 技術用語を家族が使っていない場合は、本文でも噛み砕いた表現のままにする
- 元メッセージの原文を本文末尾に「## 元メッセージ」セクションとして引用する

# 対象アプリの概要
食材管理アプリ food-inventory-app は Next.js + Vercel + Google Sheets + Gemini で動く家庭内ツール。
UI は食材一覧、買い物リスト、レシピ提案、食材登録などを持つ。
ユーザーはオートクッカービストロ、ビストロレンジ、グルラボなどの調理家電を使っており、
レシピ提案系のフィードバックはこれらを考慮した整形をしてよい。

# 出力形式
JSON で title と body のみを返す。ラベル・優先度・状態などは含めない。`;

const RESPONSE_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    title: { type: SchemaType.STRING },
    body: { type: SchemaType.STRING },
  },
  required: ["title", "body"],
};

export async function buildIssueFromFeedback(
  feedbackText: string,
): Promise<IssueDraft> {
  const client = new GoogleGenerativeAI(getGeminiApiKey());
  const model = client.getGenerativeModel({
    model: getGeminiModel(),
    systemInstruction: SYSTEM_INSTRUCTION,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.3,
    },
  });

  const result = await model.generateContent(feedbackText);
  const raw = result.response.text();
  const parsed = JSON.parse(raw) as IssueDraft;

  if (typeof parsed.title !== "string" || typeof parsed.body !== "string") {
    throw new Error(
      `[gemini] unexpected response shape: ${raw.slice(0, 200)}`,
    );
  }

  return {
    title: parsed.title.trim(),
    body: parsed.body.trim(),
  };
}
