import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
import { app, collections } from "./app";
import { seedDemoData } from "./seedDemoData";

const PORT = Number(process.env.PORT ?? 3001);

if (process.env.SEED_DEMO_DATA === "true") {
  seedDemoData(collections);
  console.log("Demo data seeded (Seattle + Manhattan collections).");
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`SpotClip API running on http://0.0.0.0:${PORT}`);
});
