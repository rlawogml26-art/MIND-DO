// API 서버 시작 파일. 배포 시 `npm run start`가 이 파일(dist/server.js)을 실행한다.
// 실제 서버 코드는 백엔드 뼈대 PR에서 채운다.
import express from "express";

const app = express();
const port = Number(process.env.PORT ?? 3000);

// ALB와 배포 확인용. DB에 의존하지 않아야 DB가 잠깐 느려도 서버가 "죽은 것"으로 판단되지 않는다.
app.get("/health", (_req, res) => {
  res.status(200).json({ data: { status: "ok" } });
});

app.listen(port, () => {
  console.log(`server listening on ${port}`);
});
