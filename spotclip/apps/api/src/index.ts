import { app } from "./app";

const PORT = process.env.PORT ?? 3001;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`SpotClip API running on http://0.0.0.0:${PORT}`);
});
