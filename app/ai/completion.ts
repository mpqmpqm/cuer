"use server";

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import invariant from "tiny-invariant";
import { calculateAxisJSONSchema, Vec3 } from "../scene/grid";

const keys = [
  "head",
  "chest",
  "rightShoulder",
  "leftShoulder",
  "rightHand",
  "leftHand",
  "sacrum",
  "rightHip",
  "leftHip",
  "rightKnee",
  "leftKnee",
  "leftFoot",
  "rightFoot",
];

const MESSAGE = (query: string, state: Record<string, Vec3>) => `${query}
State: ${JSON.stringify(state, null, 2)}`;

const PLOT = `Plot a point in a 3D grid.
+X = right; -X = left
+Y = up, top, high; -Y = down, bottom, low
+Z = front, forward, deep; -Z = back, backward, shallow
`;

const POSE = `Pose a humanoid figure in 3D space.`;

const openai = (() => {
  const ai = new OpenAI({});
  return async (messages: OpenAI.Responses.ResponseInput) => {
    const response = await ai.responses.create({
      model: "gpt-4o",
      input: messages,
      tools: [
        {
          type: "function",
          strict: true,
          name: "plot",
          description: PLOT,
          parameters: {
            type: "object",
            properties: calculateAxisJSONSchema("openai"),
            required: ["x", "y", "z"],
            additionalProperties: false,
          },
        },
        {
          type: "function",
          name: "pose",
          strict: true,
          description: POSE,
          parameters: {
            type: "object",
            properties: Object.fromEntries(
              keys.map((key) => [
                key,
                {
                  type: "object",
                  properties: calculateAxisJSONSchema("claude"),
                  required: ["x", "y", "z"],
                  additionalProperties: false,
                },
              ])
            ),
            required: keys,
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
      model: "claude-3-7-sonnet-latest",
      max_tokens: 4096,
      messages,
      tools: [
        {
          name: "plot",
          description: PLOT,
          input_schema: {
            type: "object",
            properties: calculateAxisJSONSchema("claude"),
            required: ["x", "y", "z"],
            additionalProperties: false,
          },
        },
        {
          name: "pose",
          description: POSE,
          input_schema: {
            type: "object",
            properties: Object.fromEntries(
              keys.map((key) => [
                key,
                {
                  type: "object",
                  properties: calculateAxisJSONSchema("claude"),
                  required: ["x", "y", "z"],
                  additionalProperties: false,
                },
              ])
            ),
            required: keys,
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
  state,
}: {
  query: string;
  model: "openai" | "claude";
  state: Record<string, Vec3>;
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
