import { Router } from "express";
import { postAiDrafts } from "./ai-drafts.controller.js";

const router = Router();

/**
 * @swagger
 * /api/shared-tickets/{sharedTicketId}/ai-drafts:
 *   post:
 *     summary: 개인 티켓 AI 초안 생성
 *     description: 사진과 선택한 분위기 프롬프트로 개인 티켓 초안 세 개를 생성합니다.
 *     tags: [공동 티켓]
 *     security:
 *       - AccessTokenCookie: []
 *     parameters:
 *       - in: path
 *         name: sharedTicketId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AiDraftsRequest'
 *     responses:
 *       200:
 *         description: 초안 생성 성공 (AI 실패 시 기본 디자인)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/AiDraftsResponse'
 *       400:
 *         description: 입력값 또는 사진 키 검증 실패
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 공동 티켓 초대자가 아님
 *       404:
 *         description: 공동 티켓이 없거나 내 그룹의 티켓이 아님
 *       409:
 *         description: 개인 티켓 저장 완료 또는 초안 생성 완료
 *       500:
 *         description: 서버 오류
 */
router.post("/:sharedTicketId/ai-drafts", postAiDrafts);

export default router;
