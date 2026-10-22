CREATE TABLE `attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`transactionId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`storageKey` varchar(500) NOT NULL,
	`mimeType` varchar(120) NOT NULL,
	`size` int NOT NULL,
	`deletedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`transactionId` int,
	`accountId` int,
	`action` varchar(80) NOT NULL,
	`details` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `backup_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kind` enum('manual','scheduled') NOT NULL DEFAULT 'manual',
	`fileName` varchar(255) NOT NULL,
	`storageKey` varchar(500),
	`transactionCount` int NOT NULL DEFAULT 0,
	`sizeBytes` int NOT NULL DEFAULT 0,
	`status` enum('ready','failed') NOT NULL DEFAULT 'ready',
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `backup_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`number` varchar(80) NOT NULL,
	`type` varchar(32) NOT NULL,
	`subject` varchar(500) NOT NULL,
	`party` varchar(300) NOT NULL,
	`received` varchar(32) NOT NULL,
	`due` varchar(32) NOT NULL,
	`priority` varchar(32) NOT NULL,
	`status` varchar(32) NOT NULL,
	`department` varchar(160) NOT NULL,
	`assignee` varchar(160) NOT NULL,
	`notes` text NOT NULL,
	`attachment` varchar(500) NOT NULL,
	`archived` int NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `transactions_number_unique` UNIQUE(`number`)
);
