CREATE TABLE `comments` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`report_type` enum('daily','weekly','monthly') NOT NULL,
	`report_id` bigint NOT NULL,
	`commenter_id` bigint NOT NULL,
	`content` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `daily_reports` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`employee_id` bigint NOT NULL,
	`report_date` date NOT NULL,
	`tomorrow_plan` text,
	`status` tinyint NOT NULL DEFAULT 0,
	`submitted_at` datetime,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `daily_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `daily_work_items` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`daily_report_id` bigint,
	`employee_id` bigint NOT NULL,
	`project_id` bigint,
	`description` text NOT NULL,
	`hours` decimal(5,2) DEFAULT '0',
	`completion_rate` int DEFAULT 0,
	`item_type` tinyint DEFAULT 1,
	`is_fragment` boolean DEFAULT false,
	`sort_order` int DEFAULT 0,
	`record_date` date,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `daily_work_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `departments` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`parent_id` bigint,
	`sort_order` int DEFAULT 0,
	`status` tinyint NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `departments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `employee_sessions` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`employee_id` bigint NOT NULL,
	`token` varchar(256) NOT NULL,
	`expires_at` datetime NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `employee_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `employee_sessions_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `employees` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`employee_no` varchar(50) NOT NULL,
	`name` varchar(100) NOT NULL,
	`email` varchar(200),
	`phone` varchar(50),
	`password_md5` varchar(32) NOT NULL,
	`department_id` bigint,
	`supervisor_id` bigint,
	`role` enum('member','team_leader','manager','director','admin') NOT NULL DEFAULT 'member',
	`status` tinyint NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `employees_id` PRIMARY KEY(`id`),
	CONSTRAINT `employees_employee_no_unique` UNIQUE(`employee_no`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`recipient_id` bigint NOT NULL,
	`sender_id` bigint,
	`type` enum('reminder','overdue','urge','comment','ai_warning','system') NOT NULL,
	`title` varchar(200) NOT NULL,
	`content` text,
	`is_read` boolean NOT NULL DEFAULT false,
	`related_type` varchar(50),
	`related_id` bigint,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`contact_person` varchar(100),
	`contact_phone` varchar(50),
	`contact_email` varchar(200),
	`status` tinyint NOT NULL DEFAULT 1,
	`remark` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organizations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_members` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`project_id` bigint NOT NULL,
	`employee_id` bigint NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `project_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_tasks` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`project_id` bigint NOT NULL,
	`name` varchar(300) NOT NULL,
	`description` text,
	`assignee_id` bigint,
	`estimated_hours` decimal(8,2),
	`status` enum('pending','in_progress','completed') DEFAULT 'pending',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`project_no` varchar(100),
	`name` varchar(300) NOT NULL,
	`manager_id` bigint,
	`organization_id` bigint,
	`status` enum('discussion','evaluation','development','testing','integration','launch','completed','ended','closed') NOT NULL DEFAULT 'discussion',
	`business_type` enum('prepaid_card','equity'),
	`project_type` enum('stock_support','stock_new','new_project','new_merchant','event_support','product_optimization'),
	`start_date` date,
	`end_date` date,
	`estimated_hours` decimal(8,2),
	`description` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `weekly_monthly_reports` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`employee_id` bigint NOT NULL,
	`report_type` enum('weekly','monthly') NOT NULL,
	`period_start` date NOT NULL,
	`period_end` date NOT NULL,
	`period_label` varchar(50),
	`current_summary` text,
	`next_plan` text,
	`related_projects` text,
	`coordination_needs` text,
	`key_outputs` text,
	`next_month_goals` text,
	`key_issue_analysis` text,
	`project_progress` text,
	`ai_draft_content` text,
	`status` tinyint NOT NULL DEFAULT 0,
	`submitted_at` datetime,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `weekly_monthly_reports_id` PRIMARY KEY(`id`)
);
