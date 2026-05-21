"use client";

import * as React from "react";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  DatabaseIcon,
  FileTextIcon,
  Loader2Icon,
  PlayIcon,
  RefreshCwIcon,
  SearchIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";
import { toast } from "sonner";

import type {
  DeliveryWorkflowResult,
  ProjectDocument,
  SearchProjectContextResponse,
  SourceType,
} from "@/lib/demo-types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type WorkflowRunStartResponse = {
  runId: string;
  status: string;
};

type WorkflowRunStateResponse = {
  state: {
    runId: string;
    workflowName: string;
    status: string;
    result?: DeliveryWorkflowResult;
    error?: unknown;
  };
};

type WorkflowStatus = "idle" | "running" | "success" | "failed" | "tripwire" | "canceled" | "bailed" | "waiting" | "suspended" | "paused" | "pending";

const terminalWorkflowStatuses = new Set<WorkflowStatus>(["success", "failed", "tripwire", "canceled", "bailed"]);

type DocumentsResponse = {
  documents: ProjectDocument[];
};

type DocumentResponse = {
  document: ProjectDocument;
};

type WorkflowForm = {
  projectName: string;
  projectDescription: string;
  planTitle: string;
  rawInput: string;
  useRag: boolean;
};

const sourceTypes: Array<{ value: SourceType; label: string }> = [
  { value: "prd", label: "PRD" },
  { value: "meeting_notes", label: "Meeting notes" },
  { value: "technical_notes", label: "Technical notes" },
  { value: "other", label: "Other" },
];

const sampleBrief = `# QueueLite

Build a lightweight queue management product for small restaurants.

The MVP needs:
- guest QR check-in
- wait-time estimates
- host stand controls
- SMS notifications
- basic analytics for wait times and no-shows

Primary constraints:
- launchable in four weeks
- simple operations workflow
- clear mobile-first guest experience`;

const initialWorkflowForm: WorkflowForm = {
  projectName: "QueueLite",
  projectDescription: "Queue management for small restaurants.",
  planTitle: "QueueLite demo delivery plan",
  rawInput: sampleBrief,
  useRag: false,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isWorkflowStatus(value: string): value is WorkflowStatus {
  return [
    "idle",
    "running",
    "success",
    "failed",
    "tripwire",
    "canceled",
    "bailed",
    "waiting",
    "suspended",
    "paused",
    "pending",
  ].includes(value);
}

function extractErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "string") return error;
  if (isRecord(error) && typeof error.message === "string") return error.message;
  return fallback;
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const text = await response.text();
  const contentType = response.headers.get("content-type") ?? "";
  const data =
    text.length > 0 && contentType.includes("application/json") ? JSON.parse(text) : undefined;

  if (!response.ok) {
    const message =
      isRecord(data) && typeof data.error === "string"
        ? data.error
        : text || `Request failed with ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}

function formatScore(score: number): string {
  return Number.isFinite(score) ? score.toFixed(3) : "n/a";
}

export function DemoShell() {
  const [workflowForm, setWorkflowForm] = React.useState<WorkflowForm>(initialWorkflowForm);
  const [result, setResult] = React.useState<DeliveryWorkflowResult | null>(null);
  const [workflowError, setWorkflowError] = React.useState<string | null>(null);
  const [isRunning, setIsRunning] = React.useState(false);
  const [workflowRunId, setWorkflowRunId] = React.useState<string | null>(null);
  const [workflowStatus, setWorkflowStatus] = React.useState<WorkflowStatus>("idle");
  const pollFailureCountRef = React.useRef(0);

  const [documents, setDocuments] = React.useState<ProjectDocument[]>([]);
  const [documentsError, setDocumentsError] = React.useState<string | null>(null);
  const [isLoadingDocuments, setIsLoadingDocuments] = React.useState(false);
  const [isUploadingDocument, setIsUploadingDocument] = React.useState(false);
  const [documentForm, setDocumentForm] = React.useState({
    sourceName: "QueueLite PRD notes",
    sourceType: "prd" as SourceType,
    content: sampleBrief,
  });

  const [searchQuery, setSearchQuery] = React.useState("guest check-in and notifications");
  const [searchResult, setSearchResult] = React.useState<SearchProjectContextResponse | null>(null);
  const [searchError, setSearchError] = React.useState<string | null>(null);
  const [isSearching, setIsSearching] = React.useState(false);

  const projectId = result?.projectId;
  const runBadgeLabel = workflowRunId ? `Run ${workflowRunId.slice(0, 8)}` : "No run";
  const statusBadgeLabel = workflowStatus;

  const loadDocuments = React.useCallback(async (activeProjectId: string) => {
    setIsLoadingDocuments(true);
    setDocumentsError(null);
    try {
      const data = await requestJson<DocumentsResponse>(
        `/api/projects/${encodeURIComponent(activeProjectId)}/documents`,
      );
      setDocuments(data.documents);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load documents";
      setDocumentsError(message);
    } finally {
      setIsLoadingDocuments(false);
    }
  }, []);

  async function runWorkflow(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsRunning(true);
    setWorkflowError(null);
    setSearchResult(null);
    setResult(null);
    setWorkflowRunId(null);
    setWorkflowStatus("idle");
    pollFailureCountRef.current = 0;

    try {
      const data = await requestJson<WorkflowRunStartResponse>("/api/workflow/run", {
        method: "POST",
        body: JSON.stringify({
          projectName: workflowForm.projectName,
          projectDescription: workflowForm.projectDescription || undefined,
          planTitle: workflowForm.planTitle || undefined,
          rawInput: workflowForm.rawInput,
          useRag: workflowForm.useRag,
        }),
      });
      setWorkflowRunId(data.runId);
      setWorkflowStatus(isWorkflowStatus(data.status) ? data.status : "running");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Workflow failed";
      setWorkflowError(message);
      toast.error(message);
      setIsRunning(false);
    }
  }

  React.useEffect(() => {
    if (!workflowRunId) return;

    const activeRunId = workflowRunId;
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    async function pollWorkflowRun() {
      try {
        const data = await requestJson<WorkflowRunStateResponse>(
          `/api/workflow/run/${encodeURIComponent(activeRunId)}`,
        );

        if (cancelled) return;

        pollFailureCountRef.current = 0;

        const nextStatus = isWorkflowStatus(data.state.status) ? data.state.status : "running";
        setWorkflowStatus(nextStatus);

        if (nextStatus === "success") {
          const completedResult = data.state.result;
          if (!completedResult) {
            throw new Error("Workflow completed without a result");
          }

          setResult(completedResult);
          setIsRunning(false);
          toast.success("Workflow completed");
          await loadDocuments(completedResult.projectId);
          return;
        }

        if (terminalWorkflowStatuses.has(nextStatus)) {
          const message =
            nextStatus === "failed" || nextStatus === "tripwire"
              ? extractErrorMessage(data.state.error, `Workflow ended with status ${nextStatus}`)
              : `Workflow ended with status ${nextStatus}`;
          setWorkflowError(message);
          setIsRunning(false);
          toast.error(message);
          return;
        }

        timeoutId = setTimeout(() => {
          void pollWorkflowRun();
        }, 1500);
      } catch (error) {
        if (cancelled) return;

        pollFailureCountRef.current += 1;
        const message =
          error instanceof Error ? error.message : "Unable to fetch workflow state";

        if (pollFailureCountRef.current >= 3) {
          setWorkflowError(message);
          setIsRunning(false);
          toast.error(message);
          return;
        }

        timeoutId = setTimeout(() => {
          void pollWorkflowRun();
        }, 1000 * pollFailureCountRef.current);
      }
    }

    void pollWorkflowRun();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [loadDocuments, workflowRunId]);

  async function uploadDocument(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectId) return;

    setIsUploadingDocument(true);
    setDocumentsError(null);
    try {
      const data = await requestJson<DocumentResponse>(
        `/api/projects/${encodeURIComponent(projectId)}/documents`,
        {
          method: "POST",
          body: JSON.stringify(documentForm),
        },
      );
      setDocuments((current) => [data.document, ...current.filter((doc) => doc.id !== data.document.id)]);
      toast.success("Document indexed");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Document upload failed";
      setDocumentsError(message);
      toast.error(message);
    } finally {
      setIsUploadingDocument(false);
    }
  }

  async function deleteDocument(documentId: string) {
    if (!projectId) return;

    try {
      await requestJson<void>(
        `/api/projects/${encodeURIComponent(projectId)}/documents/${encodeURIComponent(documentId)}`,
        { method: "DELETE" },
      );
      setDocuments((current) => current.filter((document) => document.id !== documentId));
      toast.success("Document removed");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Document delete failed";
      setDocumentsError(message);
      toast.error(message);
    }
  }

  async function searchContext(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectId) return;

    setIsSearching(true);
    setSearchError(null);
    try {
      const data = await requestJson<SearchProjectContextResponse>(
        `/api/projects/${encodeURIComponent(projectId)}/context/search`,
        {
          method: "POST",
          body: JSON.stringify({ query: searchQuery, topK: 5 }),
        },
      );
      setSearchResult(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Context search failed";
      setSearchError(message);
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b pb-5 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Demo</Badge>
              <Badge variant={workflowForm.useRag ? "default" : "outline"}>
                {workflowForm.useRag ? "RAG on" : "Ollama only"}
              </Badge>
            </div>
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-medium tracking-normal sm:text-3xl">
                Delivery Copilot
              </h1>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Demo workbench for the Mastra delivery planning workflow.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline">{projectId ? `Project ${projectId.slice(0, 8)}` : "No project"}</Badge>
            <Badge variant="secondary">{runBadgeLabel}</Badge>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(320px,420px)_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Workflow input</CardTitle>
              <CardDescription>Ollama-backed run configuration</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="flex flex-col gap-5" onSubmit={runWorkflow}>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="project-name">Project name</FieldLabel>
                    <Input
                      id="project-name"
                      value={workflowForm.projectName}
                      onChange={(event) =>
                        setWorkflowForm((current) => ({
                          ...current,
                          projectName: event.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="project-description">Project description</FieldLabel>
                    <Input
                      id="project-description"
                      value={workflowForm.projectDescription}
                      onChange={(event) =>
                        setWorkflowForm((current) => ({
                          ...current,
                          projectDescription: event.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="plan-title">Plan title</FieldLabel>
                    <Input
                      id="plan-title"
                      value={workflowForm.planTitle}
                      onChange={(event) =>
                        setWorkflowForm((current) => ({
                          ...current,
                          planTitle: event.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="raw-input">Input brief</FieldLabel>
                    <Textarea
                      id="raw-input"
                      className="min-h-72 resize-y"
                      value={workflowForm.rawInput}
                      onChange={(event) =>
                        setWorkflowForm((current) => ({
                          ...current,
                          rawInput: event.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field orientation="horizontal" className="items-center justify-between rounded-lg border p-3">
                    <FieldContent>
                      <FieldLabel htmlFor="use-rag">Use project context</FieldLabel>
                      <FieldDescription>Off by default for Ollama-only local runs.</FieldDescription>
                    </FieldContent>
                    <Switch
                      id="use-rag"
                      checked={workflowForm.useRag}
                      onCheckedChange={(checked) =>
                        setWorkflowForm((current) => ({ ...current, useRag: checked }))
                      }
                    />
                  </Field>
                </FieldGroup>
                <Button type="submit" disabled={isRunning || workflowForm.rawInput.trim().length === 0}>
                  {isRunning ? (
                    <Loader2Icon data-icon="inline-start" className="animate-spin" />
                  ) : (
                    <PlayIcon data-icon="inline-start" />
                  )}
                  {isRunning ? "Running" : "Run workflow"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Delivery plan</CardTitle>
              <CardDescription>
                {result ? result.planTitle : "Workflow output"}
              </CardDescription>
              <CardAction>
                <Badge variant={isRunning ? "secondary" : result ? "default" : "outline"}>
                  {isRunning ? "Running" : result ? "Complete" : statusBadgeLabel}
                </Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {workflowError ? (
                <Alert variant="destructive">
                  <AlertTriangleIcon />
                  <AlertTitle>Workflow error</AlertTitle>
                  <AlertDescription>{workflowError}</AlertDescription>
                </Alert>
              ) : null}

              {isRunning ? (
                <div className="flex flex-col gap-3">
                  <Skeleton className="h-8 w-2/3" />
                  <Skeleton className="h-64 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : null}

              {!isRunning && !result ? (
                <Empty className="min-h-96">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <FileTextIcon />
                    </EmptyMedia>
                    <EmptyTitle>No delivery plan yet</EmptyTitle>
                    <EmptyDescription>Workflow output will appear here.</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : null}

              {!isRunning && result ? (
                <Tabs defaultValue="final" className="gap-4">
                  <TabsList>
                    <TabsTrigger value="final">Final</TabsTrigger>
                    <TabsTrigger value="artifacts">Artifacts</TabsTrigger>
                    <TabsTrigger value="raw">Raw</TabsTrigger>
                  </TabsList>
                  <TabsContent value="final">
                    <ScrollArea className="h-[520px] rounded-lg border bg-muted/30">
                      <div className="whitespace-pre-wrap p-4 text-sm leading-6">
                        {result.finalMarkdown}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                  <TabsContent value="artifacts">
                    <div className="flex flex-col gap-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Agent</TableHead>
                            <TableHead>Artifact</TableHead>
                            <TableHead>Risks</TableHead>
                            <TableHead>Questions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {result.artifacts.map((artifact) => (
                            <TableRow key={`${artifact.agentName}-${artifact.artifactType}`}>
                              <TableCell className="font-medium">{artifact.agentName}</TableCell>
                              <TableCell>{artifact.artifactType}</TableCell>
                              <TableCell>{artifact.risks.length}</TableCell>
                              <TableCell>{artifact.openQuestions.length}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <Separator />
                      <ScrollArea className="h-80 rounded-lg border bg-muted/30">
                        <div className="flex flex-col gap-5 p-4">
                          {result.artifacts.map((artifact) => (
                            <article className="flex flex-col gap-2" key={artifact.agentName}>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="secondary">{artifact.agentName}</Badge>
                                <span className="text-sm font-medium">{artifact.summary}</span>
                              </div>
                              <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                                {artifact.markdown}
                              </p>
                            </article>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </TabsContent>
                  <TabsContent value="raw">
                    <ScrollArea className="h-[520px] rounded-lg border bg-muted/30">
                      <pre className="p-4 text-xs leading-5">
                        {JSON.stringify(result, null, 2)}
                      </pre>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              ) : null}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Project documents</CardTitle>
              <CardDescription>
                {projectId ? `${documents.length} indexed sources` : "Workflow project required"}
              </CardDescription>
              <CardAction>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!projectId || isLoadingDocuments}
                  onClick={() => projectId && loadDocuments(projectId)}
                >
                  <RefreshCwIcon data-icon="inline-start" />
                  Refresh
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {documentsError ? (
                <Alert variant="destructive">
                  <AlertTriangleIcon />
                  <AlertTitle>Document error</AlertTitle>
                  <AlertDescription>{documentsError}</AlertDescription>
                </Alert>
              ) : null}

              {!projectId ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <DatabaseIcon />
                    </EmptyMedia>
                    <EmptyTitle>No active project</EmptyTitle>
                    <EmptyDescription>Project documents attach to a completed workflow run.</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <>
                  <form className="flex flex-col gap-4" onSubmit={uploadDocument}>
                    <FieldGroup>
                      <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
                        <Field>
                          <FieldLabel htmlFor="source-name">Source name</FieldLabel>
                          <Input
                            id="source-name"
                            value={documentForm.sourceName}
                            onChange={(event) =>
                              setDocumentForm((current) => ({
                                ...current,
                                sourceName: event.target.value,
                              }))
                            }
                          />
                        </Field>
                        <Field>
                          <FieldLabel>Source type</FieldLabel>
                          <Select
                            value={documentForm.sourceType}
                            onValueChange={(value) =>
                              setDocumentForm((current) => ({
                                ...current,
                                sourceType: value as SourceType,
                              }))
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                {sourceTypes.map((sourceType) => (
                                  <SelectItem key={sourceType.value} value={sourceType.value}>
                                    {sourceType.label}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </Field>
                      </div>
                      <Field>
                        <FieldLabel htmlFor="document-content">Document content</FieldLabel>
                        <Textarea
                          id="document-content"
                          className="min-h-40 resize-y"
                          value={documentForm.content}
                          onChange={(event) =>
                            setDocumentForm((current) => ({
                              ...current,
                              content: event.target.value,
                            }))
                          }
                        />
                      </Field>
                    </FieldGroup>
                    <Button
                      type="submit"
                      variant="outline"
                      disabled={isUploadingDocument || documentForm.content.trim().length === 0}
                    >
                      {isUploadingDocument ? (
                        <Loader2Icon data-icon="inline-start" className="animate-spin" />
                      ) : (
                        <UploadIcon data-icon="inline-start" />
                      )}
                      {isUploadingDocument ? "Indexing" : "Index document"}
                    </Button>
                  </form>

                  {isLoadingDocuments ? (
                    <div className="flex flex-col gap-2">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : documents.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Chunks</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {documents.map((document) => (
                          <TableRow key={document.id}>
                            <TableCell className="max-w-64 truncate font-medium">
                              {document.sourceName}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={document.status === "indexed" ? "secondary" : "outline"}
                              >
                                {document.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{document.chunkCount}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Delete ${document.sourceName}`}
                                onClick={() => deleteDocument(document.id)}
                              >
                                <Trash2Icon />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <Empty>
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <FileTextIcon />
                        </EmptyMedia>
                        <EmptyTitle>No documents</EmptyTitle>
                        <EmptyDescription>No indexed project sources.</EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Context search</CardTitle>
              <CardDescription>
                {searchResult ? `${searchResult.chunks.length} matching chunks` : "Retrieved project context"}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {searchError ? (
                <Alert variant="destructive">
                  <AlertTriangleIcon />
                  <AlertTitle>Search error</AlertTitle>
                  <AlertDescription>{searchError}</AlertDescription>
                </Alert>
              ) : null}

              {!projectId ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <SearchIcon />
                    </EmptyMedia>
                    <EmptyTitle>No searchable project</EmptyTitle>
                    <EmptyDescription>Context search attaches to a completed workflow run.</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <>
                  <form className="flex flex-col gap-4 sm:flex-row" onSubmit={searchContext}>
                    <Field className="flex-1">
                      <FieldLabel htmlFor="context-query">Query</FieldLabel>
                      <Input
                        id="context-query"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                      />
                    </Field>
                    <Button
                      type="submit"
                      className="self-end"
                      disabled={isSearching || searchQuery.trim().length === 0}
                    >
                      {isSearching ? (
                        <Loader2Icon data-icon="inline-start" className="animate-spin" />
                      ) : (
                        <SearchIcon data-icon="inline-start" />
                      )}
                      {isSearching ? "Searching" : "Search"}
                    </Button>
                  </form>

                  {isSearching ? (
                    <div className="flex flex-col gap-3">
                      <Skeleton className="h-24 w-full" />
                      <Skeleton className="h-24 w-full" />
                    </div>
                  ) : searchResult ? (
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={searchResult.config.enabled ? "secondary" : "outline"}>
                          {searchResult.config.enabled ? "RAG enabled" : "RAG disabled"}
                        </Badge>
                        <Badge variant="outline">{searchResult.config.indexName}</Badge>
                      </div>
                      <ScrollArea className="h-96 rounded-lg border bg-muted/30">
                        <div className="flex flex-col gap-4 p-4">
                          {searchResult.chunks.length > 0 ? (
                            searchResult.chunks.map((chunk, index) => (
                              <article className="flex flex-col gap-2" key={`${chunk.documentId}-${index}`}>
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge variant="secondary">{chunk.sourceName}</Badge>
                                  <Badge variant="outline">Score {formatScore(chunk.score)}</Badge>
                                </div>
                                <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                                  {chunk.text}
                                </p>
                              </article>
                            ))
                          ) : (
                            <Empty>
                              <EmptyHeader>
                                <EmptyMedia variant="icon">
                                  <CheckCircle2Icon />
                                </EmptyMedia>
                                <EmptyTitle>No matches</EmptyTitle>
                                <EmptyDescription>{searchResult.context}</EmptyDescription>
                              </EmptyHeader>
                            </Empty>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  ) : (
                    <Empty>
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <SearchIcon />
                        </EmptyMedia>
                        <EmptyTitle>No search results</EmptyTitle>
                        <EmptyDescription>Retrieved context will appear here.</EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
