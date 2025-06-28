"use server";

import OpenAI from "openai";
import invariant from "tiny-invariant";
import { z } from "zod";
import { X_POSITIONS, Y_POSITIONS, Z_POSITIONS } from "../scene/grid";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const SYSTEM = `Plot points in a 3D grid.
+X = right; -X = left
+Y = up, top, high; -Y = down, bottom, low
+Z = front, forward, deep; -Z = back, backward, shallow
`;

export async function completion(formData: FormData) {
  const { query } = z
    .object({ query: z.string().min(1, "Query is required") })
    .parse(Object.fromEntries(formData.entries()));

  const response = await openai.chat.completions.create({
    model: "gpt-4.1-nano",
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: query },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "plot",
          parameters: {
            type: "object",
            properties: {
              x: {
                type: "number",
                enum: X_POSITIONS,
              },
              y: {
                type: "number",
                enum: Y_POSITIONS,
              },
              z: {
                type: "number",
                enum: Z_POSITIONS,
              },
            },
            required: ["x", "y", "z"],
          },
        },
      },
    ],
    tool_choice: "required",
  });

  const toolCall = response.choices[0].message.tool_calls?.[0];
  invariant(toolCall, "Tool call is required");

  return toolCall;
}
