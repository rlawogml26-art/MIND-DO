import { Router } from "express";
import { postSharedTicket } from "./shared-tickets.controller.js";

// 공동 티켓 생성은 그룹 아래 주소(/api/groups/{groupId}/shared-tickets)라 server.ts에서 /api/groups에 따로 연결한다.
const router = Router();

/**
 * @swagger
 * /api/groups/{groupId}/shared-tickets:
 *   post:
 *     summary: 공동 티켓 생성
 *     description: 그룹의 하루(공동 티켓)를 만들고 초대자를 고릅니다. 그룹 멤버 누구나 만들 수 있고 생성자는 자동으로 초대자에 들어갑니다. 날짜는 한국시간 기준 오늘 또는 과거만 됩니다. 응답은 공동 티켓 상세 조회와 같은 형식입니다.
 *     tags: [공동 티켓]
 *     security:
 *       - AccessTokenCookie: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateSharedTicketRequest'
 *     responses:
 *       201:
 *         description: 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/SharedTicketDetailResponse'
 *       400:
 *         description: 입력값 검증 실패 (INVALID_INPUT), 미래 날짜 (INVALID_TICKET_DATE), 현재 멤버가 아닌 초대자 (INVALID_INVITEE)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: 인증 실패 (UNAUTHORIZED 또는 ACCESS_TOKEN_EXPIRED)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: 그룹이 없거나 내가 멤버가 아님 (GROUP_NOT_FOUND)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: 그 날짜의 공동 티켓이 이미 있음 (SHARED_TICKET_DATE_TAKEN)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/:groupId/shared-tickets", postSharedTicket);

export default router;
