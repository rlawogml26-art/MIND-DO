import { Router } from "express";
import {
  getGroupSharedTickets,
  postSharedTicket,
} from "./shared-tickets.controller.js";

// 공동 티켓 생성·목록은 그룹 아래 주소(/api/groups/{groupId}/shared-tickets)라 server.ts에서 /api/groups에 따로 연결한다.
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

/**
 * @swagger
 * /api/groups/{groupId}/shared-tickets:
 *   get:
 *     summary: 공동 티켓 목록 조회
 *     description: 그룹 화면에 보여줄 공동 티켓 목록(날짜 최신순). 초대받지 않은 공동 티켓도 그룹의 현재 멤버면 볼 수 있습니다. myStatus는 내 슬롯 상태(초대자가 아니면 null), coverPhotoUrl은 가장 먼저 저장된 개인 티켓의 대표 사진 링크입니다.
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
 *       - in: query
 *         name: month
 *         required: false
 *         description: 이 달만 (YYYY-MM). 없으면 전체
 *         schema:
 *           type: string
 *           example: "2026-11"
 *     responses:
 *       200:
 *         description: 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/SharedTicketListResponse'
 *       400:
 *         description: groupId 또는 month 형식 오류 (INVALID_INPUT)
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
 */
router.get("/:groupId/shared-tickets", getGroupSharedTickets);

export default router;
