import { Router } from "express";
import {
  getGroup,
  getGroups,
  postGroup,
  postGroupInvite,
} from "./groups.controller.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: 그룹
 *   description: 그룹 생성 및 관리
 */

/**
 * @swagger
 * /api/groups:
 *   post:
 *     summary: 그룹 생성
 *     tags: [그룹]
 *     security:
 *       - AccessTokenCookie: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateGroupRequest'
 *     responses:
 *       201:
 *         description: 그룹 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/GroupResponse'
 *       400:
 *         description: 입력값 검증 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: 로그인 또는 유효한 액세스 토큰 필요
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: 가입 가능한 그룹 수 초과
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/", postGroup);

/**
 * @swagger
 * /api/groups:
 *   get:
 *     summary: 참여 그룹 목록 조회
 *     description: 내가 참여 중인 그룹 목록. 기본 1인 그룹이 맨 앞이고, 나머지는 들어온 순서입니다. joinableCount는 더 만들거나 들어갈 수 있는 그룹 수입니다.
 *     tags: [그룹]
 *     security:
 *       - AccessTokenCookie: []
 *     responses:
 *       200:
 *         description: 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/GroupListResponse'
 *       401:
 *         description: 로그인 또는 유효한 액세스 토큰 필요
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/", getGroups);

/**
 * @swagger
 * /api/groups/{groupId}:
 *   get:
 *     summary: 그룹 상세 조회
 *     description: 그룹 정보와 현재 멤버 목록. 그룹장이 맨 앞이고, 나머지는 들어온 순서입니다. 공동 티켓을 만들 때 초대자를 고르는 화면도 이 응답을 씁니다.
 *     tags: [그룹]
 *     security:
 *       - AccessTokenCookie: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/GroupDetailResponse'
 *       400:
 *         description: groupId가 숫자가 아님
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: 로그인 또는 유효한 액세스 토큰 필요
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: 그룹이 없거나 현재 멤버가 아님 (GROUP_NOT_FOUND)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/:groupId", getGroup);

/**
 * @swagger
 * /api/groups/{groupId}/invites:
 *   post:
 *     summary: 그룹 초대 링크 발급
 *     description: 그룹 멤버가 초대 링크를 발급합니다. 원본 토큰은 응답에만 포함되고 DB에는 해시로 저장됩니다.
 *     tags: [그룹]
 *     security:
 *       - AccessTokenCookie: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       201:
 *         description: 초대 링크 발급 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/CreateGroupInviteResponse'
 *       400:
 *         description: 그룹 ID 검증 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: 인증 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: 기본 1인 그룹은 초대할 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: 그룹이 없거나 요청자가 멤버가 아님
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: 그룹 정원이 가득 참
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 서버 오류 또는 초대 링크 설정 누락
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/:groupId/invites", postGroupInvite);

export default router;
