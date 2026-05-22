function truncateForRetrieval(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, maxChars)}\n...[truncated ${text.length - maxChars} chars]`;
}

export function buildAgentRetrievalQuery(input: {
  role: string;
  rawInput: string;
  artifactSummaries?: string[];
}): string {
  const artifactContext =
    input.artifactSummaries && input.artifactSummaries.length > 0
      ? `\nPrevious artifact summaries:\n${input.artifactSummaries.join("\n")}`
      : "";

  return `Role: ${input.role}
Project input:
${truncateForRetrieval(input.rawInput, 4_000)}${artifactContext}`;
}
