import Anthropic from "@anthropic-ai/sdk";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const anthropic = new Anthropic();
const server = new McpServer({
  name: "mcp",
  version: "1.0.0",
});

server.tool(
  "sensei",
  "Query the best coding model in the world for advice",
  { query: z.string() },
  async ({ query }) => {
    try {
      const msg = await anthropic.messages.create({
        model: "claude-opus-4-20250514",
        max_tokens: 20_000,
        messages: [{ role: "user", content: query }],
        thinking: {
          type: "enabled",
          budget_tokens: 5_000,
        },
      });

      return {
        content: [
          {
            type: "text",
            text:
              msg.content[0].type === "text" ? msg.content[0].text : "No text response",
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
