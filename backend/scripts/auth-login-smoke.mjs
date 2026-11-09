import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import process from "node:process";

const baseUrl =
  process.argv.find((argument) => argument.startsWith("http")) ??
  "http://127.0.0.1:3000";
const validationOnly = process.argv.includes("--validation-only");

const invalidInputResponse = await globalThis.fetch(
  `${baseUrl}/api/auth/login`,
  {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "not-an-email", password: "example" }),
  },
);
assert.equal(invalidInputResponse.status, 400);
assert.deepEqual(await invalidInputResponse.json(), {
  error: {
    code: "INVALID_INPUT",
    message: "입력값을 확인해주세요.",
  },
});

if (!validationOnly) {
  const invalidCredentialsResponse = await globalThis.fetch(
    `${baseUrl}/api/auth/login`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: `missing-${randomUUID()}@example.invalid`,
        password: randomUUID(),
      }),
    },
  );
  assert.equal(invalidCredentialsResponse.status, 401);
  assert.deepEqual(await invalidCredentialsResponse.json(), {
    error: {
      code: "INVALID_CREDENTIALS",
      message: "이메일 또는 비밀번호가 일치하지 않습니다.",
    },
  });
}

process.stdout.write("Login API smoke test passed.\n");
