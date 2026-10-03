/**
 * `vector/chunk_text` — chunks raw text into structured segments using configurable
 * strategies (fixed, paragraph, sentence, markdown, or custom).
 */
import {
  defineFunction,
  input,
  s,
  setVar,
  c,
  inp,
  ref,
  obj,
  withFilters,
  fl,
} from "@xano/sdk";
import {
  type ResolvedOptions,
  CHUNK_STRATEGIES,
} from "../options.js";

/** A single structured chunk item produced by chunking text. */
export interface ChunkItem {
  index: number;
  content: string;
  char_count: number;
  metadata: Record<string, unknown>;
}

const CHUNKER_LAMBDA_JS = `
const rawContent = String($var.raw_text || "").trim();
const strat = String($var.active_strategy || "paragraph");
const sizeLimit = Math.max(20, Number($var.target_size) || 500);
const overlapSize = Math.max(0, Math.min(sizeLimit - 1, Number($var.target_overlap) || 50));

if (!rawContent) {
  return [];
}

const chunkList = [];

const buildChunk = (chunkIndex, textSegment, extraMeta = {}) => ({
  index: chunkIndex,
  content: textSegment.trim(),
  char_count: textSegment.trim().length,
  metadata: { strategy: strat, ...extraMeta },
});

if (strat === "fixed") {
  const stepSize = Math.max(1, sizeLimit - overlapSize);
  let currentIdx = 0;
  for (let charPos = 0; charPos < rawContent.length; charPos += stepSize) {
    const segment = rawContent.slice(charPos, charPos + sizeLimit);
    if (segment.trim().length > 0) {
      chunkList.push(buildChunk(currentIdx++, segment, { start_char: charPos, end_char: charPos + segment.length }));
    }
  }
} else if (strat === "sentence") {
  const sentenceList = rawContent.split(/(?<=[.?!])\\s+/);
  let currentAccumulator = "";
  let currentIdx = 0;
  for (const singleSentence of sentenceList) {
    const trimmedSentence = singleSentence.trim();
    if (!trimmedSentence) continue;
    if (currentAccumulator && (currentAccumulator.length + 1 + trimmedSentence.length > sizeLimit)) {
      chunkList.push(buildChunk(currentIdx++, currentAccumulator));
      if (overlapSize > 0 && currentAccumulator.length > overlapSize) {
        currentAccumulator = currentAccumulator.slice(currentAccumulator.length - overlapSize).trim() + " " + trimmedSentence;
      } else {
        currentAccumulator = trimmedSentence;
      }
    } else {
      currentAccumulator = currentAccumulator ? currentAccumulator + " " + trimmedSentence : trimmedSentence;
    }
  }
  if (currentAccumulator.trim().length > 0) {
    chunkList.push(buildChunk(currentIdx++, currentAccumulator));
  }
} else if (strat === "markdown") {
  const sectionList = rawContent.split(/(?=(?:^|\\n)#{1,6}\\s+)/);
  let currentIdx = 0;
  for (const singleSection of sectionList) {
    const trimmedSection = singleSection.trim();
    if (!trimmedSection) continue;
    const headerMatch = trimmedSection.match(/^#{1,6}\\s+(.+)$/m);
    const headerTitle = headerMatch ? headerMatch[1] : "";
    if (trimmedSection.length <= sizeLimit) {
      chunkList.push(buildChunk(currentIdx++, trimmedSection, { header: headerTitle }));
    } else {
      const stepSize = Math.max(1, sizeLimit - overlapSize);
      for (let charPos = 0; charPos < trimmedSection.length; charPos += stepSize) {
        const segment = trimmedSection.slice(charPos, charPos + sizeLimit);
        if (segment.trim().length > 0) {
          chunkList.push(buildChunk(currentIdx++, segment, { header: headerTitle, start_char: charPos }));
        }
      }
    }
  }
} else if (strat === "custom") {
  const customBlocks = rawContent.split(/\\n\\n+/);
  let currentIdx = 0;
  for (const customBlock of customBlocks) {
    const trimmedBlock = customBlock.trim();
    if (trimmedBlock.length > 0) {
      chunkList.push(buildChunk(currentIdx++, trimmedBlock));
    }
  }
} else {
  const paragraphList = rawContent.split(/\\n\\s*\\n+/);
  let currentAccumulator = "";
  let currentIdx = 0;
  for (const singleParagraph of paragraphList) {
    const trimmedParagraph = singleParagraph.trim();
    if (!trimmedParagraph) continue;
    if (currentAccumulator && (currentAccumulator.length + 2 + trimmedParagraph.length > sizeLimit)) {
      chunkList.push(buildChunk(currentIdx++, currentAccumulator));
      if (overlapSize > 0 && currentAccumulator.length > overlapSize) {
        currentAccumulator = currentAccumulator.slice(currentAccumulator.length - overlapSize).trim() + "\\n\\n" + trimmedParagraph;
      } else {
        currentAccumulator = trimmedParagraph;
      }
    } else {
      currentAccumulator = currentAccumulator ? currentAccumulator + "\\n\\n" + trimmedParagraph : trimmedParagraph;
    }
  }
  if (currentAccumulator.trim().length > 0) {
    chunkList.push(buildChunk(currentIdx++, currentAccumulator));
  }
}

return chunkList;
`.trim();

/** Build the `chunkText` function definition for the given options. */
export function chunkTextFn(opts: ResolvedOptions) {
  return defineFunction({
    name: opts.names.chunkFn,
    description:
      "Segments input text into structured chunks based on the chosen strategy (fixed, paragraph, sentence, markdown, custom).",
    tags: opts.tags,
    input: {
      content: input.text({
        required: false,
        description: "The raw text content to segment into chunks.",
      }),
      strategy: input.enum(CHUNK_STRATEGIES, {
        default: opts.defaultStrategy,
        description: "Chunking algorithm: fixed, paragraph, sentence, markdown, or custom.",
      }),
      chunk_size: input.int({
        default: opts.defaultChunkSize,
        description: "Target maximum character count per chunk.",
      }),
      chunk_overlap: input.int({
        default: opts.defaultChunkOverlap,
        description: "Character overlap preserved between consecutive chunks.",
      }),
    },
    stack: [
      setVar("target_size", inp("chunk_size")),
      setVar("target_overlap", inp("chunk_overlap")),
      setVar("active_strategy", inp("strategy")),
      setVar("raw_text", inp("content")),
      s.lambda({
        as: "chunks",
        code: c.text(CHUNKER_LAMBDA_JS),
      }),
    ],
    response: obj({
      chunks: ref("chunks"),
      count: withFilters(ref("chunks"), [fl.count()]),
    }),
    responseShape: {} as {
      chunks: ChunkItem[];
      count: number;
    },
  });
}

/** The `chunkText` function def type. */
export type ChunkTextFn = ReturnType<typeof chunkTextFn>;
