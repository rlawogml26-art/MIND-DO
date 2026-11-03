-- 스토어: 프레임·스티커·폰트 판매, 구매 내역, VIP 구독

-- CreateTable
CREATE TABLE `assets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` ENUM('FRAME', 'STICKER', 'FONT') NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `s3_key` VARCHAR(255) NOT NULL,
    `price` INTEGER NOT NULL,
    `vip_included` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `assets_s3_key_key`(`s3_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchases` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `asset_id` INTEGER NOT NULL,
    `paid_price` INTEGER NOT NULL,
    `purchased_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `refunded_at` DATETIME(3) NULL,

    UNIQUE INDEX `purchases_user_id_asset_id_key`(`user_id`, `asset_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subscriptions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `plan` ENUM('MONTHLY', 'YEARLY') NOT NULL,
    `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expires_at` DATETIME(3) NOT NULL,
    `canceled_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `purchases` ADD CONSTRAINT `purchases_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchases` ADD CONSTRAINT `purchases_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
