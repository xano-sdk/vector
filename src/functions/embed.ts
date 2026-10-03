/**
 * `vector/generate_embedding` — calls Google Gemini Multimodal Embedding 2 API to generate a
 * 768-dimensional multimodal vector embedding for text, image, audio, video, or interleaved inputs.
 */
import {
  defineFunction,
  input,
  s,
  setVar,
  c,
  inp,
  ref,
  expr,
  or,
  obj,
  env,
  withFilters,
  fl,
  type FunctionDef,
  type InputDescriptor,
} from "@xano/sdk";
import { type ResolvedOptions, GEMINI_EMBEDDING_DIMENSIONS } from "../options.js";

/** Return type for generateEmbeddingFn. */
export type GenerateEmbeddingFn = FunctionDef<
  Record<string, InputDescriptor>,
  { embedding: number[]; dimensions: number }
>;

const BUILD_PARTS_LAMBDA_JS = `
const parts = [];
const textVal = String($var.raw_text || "").trim();
const mediaVal = String($var.raw_media || "").trim();
const mimeVal = String($var.raw_mime || "image/png").trim();
const modelId = String($var.model_identifier || "models/gemini-embedding-2");
const taskTypeVal = String($var.raw_task_type || "").trim();

if (textVal) {
  parts.push({ text: textVal });
}
if (mediaVal) {
  parts.push({
    inlineData: {
      mimeType: mimeVal,
      data: mediaVal,
    },
  });
}

const req = {
  model: modelId,
  content: { parts },
  outputDimensionality: 768,
};

if (taskTypeVal) {
  req.taskType = taskTypeVal;
}

return req;
`.trim();

/** Build the `generateEmbedding` function definition for the given options. */
export function generateEmbeddingFn(opts: ResolvedOptions): GenerateEmbeddingFn {
  return defineFunction({
    name: opts.names.embedFn,
    description:
      "Generates a 768-dimensional multimodal vector embedding for text, images, audio, or video using Google Gemini Embeddings 2.",
    tags: opts.tags,
    input: {
      text: input.text({
        required: false,
        description: "Text content to generate a vector embedding for.",
      }),
      media_data: input.text({
        required: false,
        description: "Base64-encoded media data (image, audio, or video bytes).",
      }),
      mime_type: input.text({
        default: "text/plain",
        description: "MIME type for media data (e.g. image/png, image/jpeg, audio/mp3, video/mp4).",
      }),
      task_type: input.text({
        required: false,
        description: "Gemini embedding task type (RETRIEVAL_DOCUMENT, RETRIEVAL_QUERY, SEMANTIC_SIMILARITY, etc.).",
      }),
      model: input.text({
        default: opts.model,
        description: "Google Gemini embedding model name (default: gemini-embedding-2).",
      }),
      api_key: input.text({
        required: false,
        description:
          "Optional Google API key override. If omitted, uses the configured environment variable.",
      }),
    },
    stack: [
      setVar("raw_text", inp("text")),
      setVar("raw_media", inp("media_data")),
      setVar("raw_mime", inp("mime_type")),
      setVar("raw_task_type", inp("task_type")),
      s.precondition({
        expr: or(
          expr(ref("raw_text"), "!=", c.text("")),
          expr(ref("raw_media"), "!=", c.text("")),
        ),
        error_type: "badrequest",
        error: c.text("generate_embedding: at least one of `text` or `media_data` must be provided."),
      }),
      setVar(
        "active_key",
        withFilters(inp("api_key"), [fl.first_notempty(env(opts.apiKeyEnv))]),
      ),
      s.precondition({
        expr: expr(ref("active_key"), "!=", c.text("")),
        error_type: "badrequest",
        error: c.text(
          `generate_embedding: missing Gemini API key. Set \`${opts.apiKeyEnv}\` in your environment or pass \`api_key\` explicitly.`,
        ),
      }),
      setVar(
        "endpoint_url",
        withFilters(c.text("https://generativelanguage.googleapis.com/v1beta/models/"), [
          fl.concat(inp("model")),
          fl.concat(c.text(":embedContent?key=")),
          fl.concat(ref("active_key")),
        ]),
      ),
      setVar(
        "model_identifier",
        withFilters(c.text("models/"), [fl.concat(inp("model"))]),
      ),
      s.lambda({
        as: "request_body",
        code: c.text(BUILD_PARTS_LAMBDA_JS),
      }),
      s.api.request({
        url: ref("endpoint_url"),
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        params: ref("request_body"),
        as: "gemini_res",
      }),
      s.precondition({
        expr: expr(ref("gemini_res.response.status"), "=", c.int(200)),
        error_type: "badrequest",
        error: withFilters(c.text("Gemini API error: "), [
          fl.concat(ref("gemini_res.response.status")),
          fl.concat(c.text(" - ")),
          fl.concat(ref("gemini_res.response.result.error.message")),
        ]),
      }),
      setVar(
        "embedding_values",
        ref("gemini_res.response.result.embedding.values"),
      ),
    ],
    response: obj({
      embedding: ref("embedding_values"),
      dimensions: c.int(GEMINI_EMBEDDING_DIMENSIONS),
    }),
    responseShape: {} as { embedding: number[]; dimensions: number },
  }) as unknown as GenerateEmbeddingFn;
}
