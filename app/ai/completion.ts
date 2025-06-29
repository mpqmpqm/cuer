"use server";

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import invariant from "tiny-invariant";
import { calculateAxisJSONSchema, Vec3 } from "../scene/grid";

const MESSAGE = (query: string, state: Array<Vec3>) => `${query}
State: ${JSON.stringify(state, null, 2)}`;

const DESCRIPTION = `Plot a point in a 3D grid.
+X = right; -X = left
+Y = up, top, high; -Y = down, bottom, low
+Z = front, forward, deep; -Z = back, backward, shallow
`;

const openai = (() => {
  const ai = new OpenAI({});
  return async (messages: OpenAI.Responses.ResponseInput) => {
    const response = await ai.responses.create({
      model: "gpt-4.1-nano",
      input: messages,
      tools: [
        {
          type: "function",
          strict: true,
          name: "plot",
          description: DESCRIPTION,
          parameters: {
            type: "object",
            properties: calculateAxisJSONSchema("openai"),
            required: ["x", "y", "z"],
            additionalProperties: false,
          },
        },
      ],
      tool_choice: "auto",
    });

    const toolCalls = response.output.filter((m) => m.type === "function_call");
    console.log(toolCalls);
    invariant(toolCalls.length > 0, "Tool call is required");

    return toolCalls;
  };
})();

const claude = (() => {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  return async (messages: Anthropic.Messages.MessageParam[]) => {
    const response = await anthropic.messages.create({
      model: "claude-3-5-haiku-latest",
      max_tokens: 2048,
      messages,
      tools: [
        {
          name: "plot",
          description: DESCRIPTION,
          input_schema: {
            type: "object",
            properties: calculateAxisJSONSchema("claude"),
            required: ["x", "y", "z"],
            additionalProperties: false,
          },
        },
      ],
    });

    const toolUses = response.content.filter((c) => c.type === "tool_use");
    invariant(toolUses.length > 0, "Tool use is required");

    return toolUses;
  };
})();

export async function completion({
  query,
  model,
  state = [],
}: {
  query: string;
  model: "openai" | "claude";
  state: Array<Vec3>;
}) {
  const messages = [{ role: "user" as const, content: MESSAGE(query, state) }];

  switch (model) {
    case "openai":
      return openai(messages);
    case "claude":
      return claude(messages);
    default:
      throw new Error("Invalid model selected");
  }
}
