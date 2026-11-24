import { Router } from "express";
import { login, logout, refresh, signup } from "./auth.controller.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: 인증
 *   description: 회원가입, 로그인, 토큰 갱신, 로그아웃
 */

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: 회원가입
 *     tags: [인증]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SignupRequest'
 *           example:
 *             email: user@example.com
 *             password: password123
 *             name: 홍길동
 *     responses:
 *       201:
 *         description: 회원가입 성공. accessToken과 refreshToken은 HttpOnly 쿠키로 설정됩니다.
 *         headers:
 *           Set-Cookie:
 *             description: accessToken, refreshToken HttpOnly 쿠키
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/SignupResponse'
 *       400:
 *         description: 입력값 검증 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: 이미 가입된 이메일
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
router.post("/signup", signup);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: 로그인
 *     tags: [인증]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           example:
 *             email: user@example.com
 *             password: password123
 *     responses:
 *       200:
 *         description: 로그인 성공. accessToken과 refreshToken은 HttpOnly 쿠키로 설정됩니다.
 *         headers:
 *           Set-Cookie:
 *             description: accessToken (Path=/), refreshToken (Path=/api/auth) HttpOnly 쿠키
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: 입력값 검증 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: 이메일 또는 비밀번호 불일치
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
router.post("/login", login);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: 토큰 갱신
 *     description: 요청 body 없이 refreshToken 쿠키로 새 accessToken·refreshToken을 발급합니다. 쓴 refreshToken은 무효가 되고, 이미 무효가 된 refreshToken이 다시 오면 그 사용자의 refreshToken을 모두 무효로 만듭니다.
 *     tags: [인증]
 *     responses:
 *       200:
 *         description: 갱신 성공. 새 accessToken과 refreshToken은 HttpOnly 쿠키로 설정됩니다.
 *         headers:
 *           Set-Cookie:
 *             description: accessToken, refreshToken HttpOnly 쿠키
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *       401:
 *         description: refreshToken이 없거나 만료·무효 (INVALID_REFRESH_TOKEN, 다시 로그인)
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
router.post("/refresh", refresh);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: 로그아웃
 *     description: refreshToken 쿠키의 토큰을 무효로 만들고 두 쿠키를 지웁니다. 쿠키가 없거나 이미 무효여도 성공으로 응답합니다.
 *     tags: [인증]
 *     responses:
 *       200:
 *         description: 로그아웃 성공 (data는 빈 객체)
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/logout", logout);

export default router;
