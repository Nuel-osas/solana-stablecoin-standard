import { Connection, PublicKey } from "@solana/web3.js";

const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const PROGRAM_ID = process.env.PROGRAM_ID;

const connection = new Connection(RPC_URL, "confirmed");

interface IndexedEvent {
  type: string;
  data: any;
  signature: string;
  slot: number;
  timestamp: number;
}

const events: IndexedEvent[] = [];

async function startIndexer() {
  if (!PROGRAM_ID) {
    console.error("PROGRAM_ID environment variable required");
    process.exit(1);
  }

  const programId = new PublicKey(PROGRAM_ID);
  console.log(`Starting event indexer for program: ${programId.toBase58()}`);
  console.log(`RPC: ${RPC_URL}`);

  // Subscribe to program logs
  const subscriptionId = connection.onLogs(
    programId,
    (logs) => {
      const { signature, logs: logMessages } = logs;

      for (const log of logMessages) {
        // Anchor events are base64-encoded in Program data logs
        if (log.startsWith("Program data: ")) {
          try {
            const data = log.replace("Program data: ", "");
            console.log(`Event in tx ${signature}: ${data.substring(0, 50)}...`);

            events.push({
              type: "raw",
              data,
              signature,
              slot: 0,
              timestamp: Date.now(),
            });
          } catch (e) {
            // Skip unparseable logs
          }
        }
      }
    },
    "confirmed"
  );

  console.log(`Subscribed to program logs (subscription: ${subscriptionId})`);
  console.log("Indexer running... Press Ctrl+C to stop.");

  // Keep alive
  process.on("SIGINT", () => {
    console.log(`\nStopping indexer. Indexed ${events.length} events.`);
    connection.removeOnLogsListener(subscriptionId);
    process.exit(0);
  });
}

startIndexer().catch(console.error);
