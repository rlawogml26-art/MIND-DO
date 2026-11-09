import { Router } from "express";
import { postSharedTicketPhotoUploadUrls } from "./shared-tickets.controller.js";

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

export default router;
