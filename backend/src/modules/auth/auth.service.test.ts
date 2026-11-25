import assert from "node:assert/strict";
import test from "node:test";
import {
  getAccessTokenFromCookieHeader,
  getRefreshTokenFromCookieHeader,
  hashRefreshToken,
} from "./auth.service.js";

test("reads the refresh token cookie separately from the access token", () => {
  const header = "accessToken=aaa; refreshToken=bbb";
  assert.equal(getAccessTokenFromCookieHeader(header), "aaa");
  assert.equal(getRefreshTokenFromCookieHeader(header), "bbb");
});

test("treats a missing, empty or duplicated refresh cookie as absent", () => {
  assert.equal(getRefreshTokenFromCookieHeader(undefined), undefined);
  assert.equal(getRefreshTokenFromCookieHeader("accessToken=aaa"), undefined);
  assert.equal(getRefreshTokenFromCookieHeader("refreshToken="), undefined);
  assert.equal(
    getRefreshTokenFromCookieHeader("refreshToken=a; refreshToken=b"),
    undefined,
  );
});

test("hashes refresh tokens with SHA-256 hex so the raw token is never stored", () => {
  const hash = hashRefreshToken("token");
  assert.match(hash, /^[0-9a-f]{64}$/);
  assert.notEqual(hash, "token");
  assert.equal(hash, hashRefreshToken("token"));
});
