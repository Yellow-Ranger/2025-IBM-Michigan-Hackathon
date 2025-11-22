import {
  LayoutAction,
  LayoutItem,
  LayoutPlan,
  buildHeuristicPlan,
} from "./layoutPlanner";

const DEFAULT_MODEL_ID = "ibm/granite-13b-chat-v2";
const DEFAULT_VERSION = "2024-05-31";
const DEFAULT_BASE_URL = "https://us-south.ml.cloud.ibm.com";

type WatsonxResponse = {
  result?: { output_text?: string };
  results?: Array<{ generated_text?: string; output_text?: string }>;
  output?: Array<{ content?: Array<{ text?: string }> }>;
  choices?: Array<{ message?: { content?: Array<{ text?: string }> } }>;
};

export async function runWatsonxLayoutPlan(
  userPrompt: string,
  items: LayoutItem[]
): Promise<LayoutPlan> {
  const apiKey = process.env.EXPO_PUBLIC_WATSONX_API_KEY;
  const projectId = process.env.EXPO_PUBLIC_WATSONX_PROJECT_ID;
  const modelId =
    process.env.EXPO_PUBLIC_WATSONX_MODEL_ID ?? DEFAULT_MODEL_ID;
  const baseUrl =
    process.env.EXPO_PUBLIC_WATSONX_API_URL ?? DEFAULT_BASE_URL;
  const version =
    process.env.EXPO_PUBLIC_WATSONX_VERSION ?? DEFAULT_VERSION;

  if (!apiKey || !projectId) {
    throw new Error("Missing Watsonx credentials");
  }

  const accessToken = await fetchIamToken(apiKey);
  const response = await fetch(
    `${baseUrl}/ml/v1/text/chat?version=${version}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        model_id: modelId,
        messages: buildChatMessages(userPrompt, items),
        project_id: projectId,
        parameters: {
          decoding_method: "greedy",
          max_new_tokens: 380,
          temperature: 0.25,
          repetition_penalty: 1.02,
        },
      }),
    }
  );

  if (!response.ok) {
    const failureBody = await response.text();
    throw new Error(
      `Watsonx request failed (${response.status}): ${failureBody}`
    );
  }

  const payload = (await response.json()) as WatsonxResponse;
  const rawText = extractText(payload);
  const parsedPlan = rawText ? parsePlanFromText(rawText) : null;

  if (!parsedPlan) {
    throw new Error("Watsonx returned no structured plan");
  }

  return {
    ...parsedPlan,
    raw: rawText,
    source: "watsonx",
  };
}

function buildChatMessages(userPrompt: string, items: LayoutItem[]) {
  const compactLayout = items.map((item) => ({
    id: item.id,
    name: item.name,
    type: item.type,
    x: item.x,
    y: item.y,
    width: item.width,
    height: item.height,
    rotation: item.rotation ?? 0,
    zone: item.zone,
  }));

  const guidance =
    'Return JSON only with the shape {"actions":[{"kind":"move","id":"cnc-1","dx":4,"dy":-2}],"summary":"Short reason"}. Allowed kinds: move (dx,dy feet), rotate (rotation degrees absolute), resize (width,height feet), add (provide full item with id,name,type,x,y,width,height,rotation,zone,color), delete (id only). Keep coordinates within 120x72 feet and avoid overlaps when possible.';

  return [
    {
      role: "system",
      content: [
        {
          type: "text",
          text:
            "You are an expert industrial layout planner for factory floors. Optimize for OSHA safety spacing, forklift turning, and material flow.",
        },
      ],
    },
    {
      role: "user",
      content: [
        {
          type: "text",
          text: `Current layout (feet): ${JSON.stringify(
            compactLayout
          )}\nInstruction: ${userPrompt}\n${guidance}`,
        },
      ],
    },
  ];
}

async function fetchIamToken(apiKey: string): Promise<string> {
  const res = await fetch("https://iam.cloud.ibm.com/identity/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: `grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=${apiKey}`,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`IAM token request failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error("IAM token response missing access_token");
  }
  return data.access_token;
}

function extractText(payload: WatsonxResponse): string | null {
  if (payload.result?.output_text) return payload.result.output_text;
  const fromResults = payload.results?.find(
    (entry) => entry.generated_text || entry.output_text
  );
  if (fromResults?.generated_text) return fromResults.generated_text;
  if (fromResults?.output_text) return fromResults.output_text;

  const fromChoices = payload.choices?.[0]?.message?.content?.[0]?.text;
  if (fromChoices) return fromChoices;

  const fromOutput = payload.output?.[0]?.content?.[0]?.text;
  if (fromOutput) return fromOutput;

  return null;
}

function parsePlanFromText(text: string): LayoutPlan | null {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const candidate = jsonMatch ? jsonMatch[0] : text;

  try {
    const parsed = JSON.parse(candidate) as LayoutPlan;
    if (Array.isArray(parsed.actions)) {
      return {
        actions: parsed.actions as LayoutAction[],
        summary: parsed.summary ?? "Watsonx applied a layout change",
        raw: text,
        source: "watsonx",
      };
    }
  } catch {
    // fall through
  }

  return null;
}

export async function planWithFallback(
  prompt: string,
  items: LayoutItem[]
): Promise<LayoutPlan> {
  try {
    return await runWatsonxLayoutPlan(prompt, items);
  } catch (err) {
    console.warn("Watsonx integration unavailable, using heuristic plan:", err);
    return buildHeuristicPlan(prompt, items);
  }
}
