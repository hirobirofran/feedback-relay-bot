import { Octokit } from "@octokit/rest";
import {
  getFeedbackBotMode,
  getGithubOwner,
  getGithubRepo,
  getGithubToken,
} from "@/lib/env";
import type { IssueDraft } from "@/lib/gemini";

export type CreatedIssue = {
  url: string;
  number: number;
};

export async function createIssue(draft: IssueDraft): Promise<CreatedIssue> {
  const mode = getFeedbackBotMode();
  const title = mode === "test" ? `[TEST] ${draft.title}` : draft.title;

  const octokit = new Octokit({ auth: getGithubToken() });
  const response = await octokit.issues.create({
    owner: getGithubOwner(),
    repo: getGithubRepo(),
    title,
    body: draft.body,
  });

  return {
    url: response.data.html_url,
    number: response.data.number,
  };
}
