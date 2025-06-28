import { Client } from "@modelcontextprotocol/sdk/client/index";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory";
import { config as dotenv } from "dotenv";
import { server } from ".";

const client = new Client({ name: "test-runner", version: "0.0.1" });

// Make two linked, in-memory pipes
const [clientTx, serverTx] = InMemoryTransport.createLinkedPair();

// Attach each end
await Promise.all([server.connect(serverTx), client.connect(clientTx)]);

// Call the tool!
const result = await client.callTool({
  name: "sensei",
  arguments: { query: "yada" },
});

console.log(result.content);
