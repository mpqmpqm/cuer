import Anthropic from "@anthropic-ai/sdk";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { config as dotenv } from "dotenv";
import { z } from "zod";

dotenv({ path: "../.env.local" });

const anthropic = new Anthropic();
export const server = new McpServer({
  name: "mcp",
  version: "1.0.0",
});

server.tool(
  "sensei",
  "Query the best coding model in the world for advice",
  { query: z.string() },
  async ({ query }) => {
    try {
      const stream = await anthropic.messages.create({
        model: "claude-opus-4-20250514",
        max_tokens: 20480,
        messages: [{ role: "user", content: query }],
        thinking: {
          type: "enabled",
          budget_tokens: 4096,
        },
        stream: true,
      });

      let aggregatedText = "";
      for await (const chunk of stream) {
        if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
          aggregatedText += chunk.delta.text;
        }
      }

      return {
        content: [
          {
            type: "text",
            text: aggregatedText || "No text response",
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
      };
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
