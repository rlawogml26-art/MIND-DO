// API 서버 시작 파일. 배포 시 `npm run start`가 이 파일(dist/server.js)을 실행한다.
// 실제 서버 코드는 백엔드 뼈대 PR에서 채운다.

import express from "express";
import ticketRouter from "./routes/ticket.routes.ts";

const app = express();
const port = Number(process.env.PORT ?? 3000);

// JSON 요청 Body를 읽기 위한 미들웨어 추가
app.use(express.json());

// ALB와 배포 확인용. DB에 의존하지 않아야 DB가 잠깐 느려도 서버가 "죽은 것"으로 판단되지 않는다.
app.get("/health", (_req, res) => {
  res.status(200).json({ data: { status: "ok" } });
});

// 티켓 API 라우트 연결
app.use("/api/tickets", ticketRouter);

app.listen(port, () => {
  console.log(`server listening on ${port}`);
});