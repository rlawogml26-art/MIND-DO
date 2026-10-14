import express from "express";
import ticketRouter from "./routes/ticket.routes.js";

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ data: { status: "ok" } });
});

app.use("/api/tickets", ticketRouter);

// console.log를 완전히 제거하여 린트 경고 해결
app.listen(port);