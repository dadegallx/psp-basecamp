CREATE TABLE IF NOT EXISTS "SlackThread" (
	"chatId" uuid PRIMARY KEY NOT NULL,
	"threadTs" varchar(64) NOT NULL,
	"channelId" varchar(64) NOT NULL,
	"createdAt" timestamp NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "SlackThread" ADD CONSTRAINT "SlackThread_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
