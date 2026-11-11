import { Router } from "express";
import {
  getSharedTicket,
  postIssuedTicket,
  postSharedTicketPhotoUploadUrls,
} from "./shared-tickets.controller.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: 공동 티켓
 *   description: 공동 티켓과 사진 업로드
 */

/**
 * @swagger
 * /api/shared-tickets/{sharedTicketId}/photos/upload-urls:
 *   post:
 *     summary: 공동 티켓 사진 업로드 URL 발급
 *     description: 초대자에게 사진별 S3 Presigned POST 업로드 URL과 필드를 발급합니다.
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
 *             $ref: '#/components/schemas/SharedTicketPhotoUploadRequest'
 *     responses:
 *       200:
 *         description: 업로드 URL 발급 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/SharedTicketPhotoUploadUrlsResponse'
 *       400:
 *         description: 입력값 검증 실패 (INVALID_INPUT)
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
 *       403:
 *         description: 공동 티켓 초대자가 아님 (NOT_INVITED)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: 공동 티켓이 없거나 내 그룹의 티켓이 아님 (SHARED_TICKET_NOT_FOUND)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: 개인 티켓을 이미 저장함 (TICKET_ALREADY_COMPLETED)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 서버 오류 또는 S3 설정 누락
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  "/:sharedTicketId/photos/upload-urls",
  postSharedTicketPhotoUploadUrls,
);

/**
 * @swagger
 * /api/shared-tickets/{sharedTicketId}:
 *   get:
 *     summary: 공동 티켓 상세 조회 (일괄 보기)
 *     description: 공동 티켓과 초대자 슬롯 전부를 돌려줍니다. 그 그룹의 현재 멤버면 초대자가 아니어도 볼 수 있습니다. 완성된 개인 티켓만 사진(Presigned URL)·메모·디자인을 담습니다.
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
 *     responses:
 *       200:
 *         description: 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/SharedTicketDetailResponse'
 *       400:
 *         description: 입력값 검증 실패 (INVALID_INPUT)
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
 *         description: 공동 티켓이 없거나 내 그룹의 티켓이 아님 (SHARED_TICKET_NOT_FOUND)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/:sharedTicketId", getSharedTicket);

/**
 * @swagger
 * /api/shared-tickets/{sharedTicketId}/tickets:
 *   post:
 *     summary: 개인 티켓 저장 (발권)
 *     description: 공동 티켓의 내 슬롯에 개인 티켓을 저장합니다. 사진 키는 사진 업로드 URL 발급 API로 받은 내 슬롯의 키만 쓸 수 있고, 첫 번째 사진이 대표 사진입니다. 날짜·이름은 공동 티켓 값을 씁니다.
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
 *             $ref: '#/components/schemas/IssueTicketRequest'
 *     responses:
 *       201:
 *         description: 저장 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/IssuedTicketResponse'
 *       400:
 *         description: 입력값 검증 실패 (INVALID_INPUT), 내 슬롯 사진이 아니거나 S3에 없음 (INVALID_PHOTO_KEY), 디자인이 카탈로그와 맞지 않음 (INVALID_DESIGN)
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
 *       403:
 *         description: 공동 티켓 초대자가 아님 (NOT_INVITED)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: 공동 티켓이 없거나 내 그룹의 티켓이 아님 (SHARED_TICKET_NOT_FOUND)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: 이미 개인 티켓을 저장함 (TICKET_ALREADY_COMPLETED)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/:sharedTicketId/tickets", postIssuedTicket);

export default router;
