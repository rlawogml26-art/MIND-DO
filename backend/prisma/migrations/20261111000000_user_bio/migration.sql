-- 마이페이지 소개(Issue #29). 선택 입력이라 NULL 허용, 최대 15자(PROFILE_BIO_MAX).

-- AlterTable
ALTER TABLE `users` ADD COLUMN `bio` VARCHAR(15) NULL;
