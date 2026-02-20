import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
import { app } from "./app";

const PORT = Number(process.env.PORT ?? 3001);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`SpotClip API running on http://0.0.0.0:${PORT}`);
});
