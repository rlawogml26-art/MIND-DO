-- 요구사항 정의서 v2.2 반영: 그룹명 8자, 기본 1인 그룹, 공동 티켓 제목 12자·장소 삭제,
-- 생성 당시 그룹명·참여자 닉네임 기록, AI 초안 생성·재생성 횟수, 그룹 삭제 시각 (AGENTS.md v1.16)
-- 아직 실제 서비스 데이터가 없는 시점이라 NOT NULL 칸을 기본값 없이 추가한다.

-- AlterTable
ALTER TABLE `groups` MODIFY `name` VARCHAR(8) NOT NULL,
    ADD COLUMN `is_personal` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `deleted_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `shared_tickets` DROP COLUMN `location`,
    MODIFY `title` VARCHAR(12) NULL,
    ADD COLUMN `group_name` VARCHAR(8) NOT NULL;

-- AlterTable
ALTER TABLE `tickets` ADD COLUMN `ai_draft_count` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `shared_ticket_invitees` ADD COLUMN `nickname` VARCHAR(15) NOT NULL;

-- CreateTable
CREATE TABLE `ai_regeneration_usages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `group_id` INTEGER NOT NULL,
    `usage_date` DATE NOT NULL,
    `count` INTEGER NOT NULL DEFAULT 0,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ai_regeneration_usages_user_id_group_id_usage_date_key`(`user_id`, `group_id`, `usage_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ai_regeneration_usages` ADD CONSTRAINT `ai_regeneration_usages_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_regeneration_usages` ADD CONSTRAINT `ai_regeneration_usages_group_id_fkey` FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
