import { buildIssueFromFeedback } from "../src/lib/gemini";

async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) return "";
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString("utf-8").trim();
}

async function main(): Promise<void> {
  const argInput = process.argv.slice(2).join(" ").trim();
  const input = argInput || (await readStdin());

  if (!input) {
    console.error(
      "usage: npm run try:gemini -- \"<feedback text>\"\n       or: echo \"<feedback text>\" | npm run try:gemini",
    );
    process.exit(1);
  }

  console.error(`[try-gemini] input (${input.length} chars):`);
  console.error(input);
  console.error("---");

  const draft = await buildIssueFromFeedback(input);
  console.log(JSON.stringify(draft, null, 2));
}

main().catch((error) => {
  console.error("[try-gemini] failed:", error);
  process.exit(1);
});
