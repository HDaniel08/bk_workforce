-- CreateTable
CREATE TABLE "HandoverPost" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "handoverDate" DATE NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HandoverPost_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HandoverReply" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HandoverReply_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HandoverTag" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HandoverTag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HandoverPostMention" (
    "postId" TEXT NOT NULL,
    "mentionedUserId" TEXT NOT NULL,
    CONSTRAINT "HandoverPostMention_pkey" PRIMARY KEY ("postId", "mentionedUserId")
);

CREATE TABLE "HandoverReplyMention" (
    "replyId" TEXT NOT NULL,
    "mentionedUserId" TEXT NOT NULL,
    CONSTRAINT "HandoverReplyMention_pkey" PRIMARY KEY ("replyId", "mentionedUserId")
);

CREATE TABLE "HandoverPostTag" (
    "postId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    CONSTRAINT "HandoverPostTag_pkey" PRIMARY KEY ("postId", "tagId")
);

CREATE TABLE "HandoverReplyTag" (
    "replyId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    CONSTRAINT "HandoverReplyTag_pkey" PRIMARY KEY ("replyId", "tagId")
);

CREATE INDEX "HandoverPost_tenantId_handoverDate_createdAt_idx" ON "HandoverPost"("tenantId", "handoverDate", "createdAt");
CREATE INDEX "HandoverPost_authorUserId_idx" ON "HandoverPost"("authorUserId");
CREATE INDEX "HandoverReply_postId_createdAt_idx" ON "HandoverReply"("postId", "createdAt");
CREATE INDEX "HandoverReply_authorUserId_idx" ON "HandoverReply"("authorUserId");
CREATE UNIQUE INDEX "HandoverTag_tenantId_name_key" ON "HandoverTag"("tenantId", "name");
CREATE INDEX "HandoverTag_tenantId_idx" ON "HandoverTag"("tenantId");
CREATE INDEX "HandoverPostMention_mentionedUserId_idx" ON "HandoverPostMention"("mentionedUserId");
CREATE INDEX "HandoverReplyMention_mentionedUserId_idx" ON "HandoverReplyMention"("mentionedUserId");
CREATE INDEX "HandoverPostTag_tagId_idx" ON "HandoverPostTag"("tagId");
CREATE INDEX "HandoverReplyTag_tagId_idx" ON "HandoverReplyTag"("tagId");

ALTER TABLE "HandoverPost" ADD CONSTRAINT "HandoverPost_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HandoverPost" ADD CONSTRAINT "HandoverPost_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HandoverReply" ADD CONSTRAINT "HandoverReply_postId_fkey" FOREIGN KEY ("postId") REFERENCES "HandoverPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HandoverReply" ADD CONSTRAINT "HandoverReply_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HandoverTag" ADD CONSTRAINT "HandoverTag_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HandoverPostMention" ADD CONSTRAINT "HandoverPostMention_postId_fkey" FOREIGN KEY ("postId") REFERENCES "HandoverPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HandoverPostMention" ADD CONSTRAINT "HandoverPostMention_mentionedUserId_fkey" FOREIGN KEY ("mentionedUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HandoverReplyMention" ADD CONSTRAINT "HandoverReplyMention_replyId_fkey" FOREIGN KEY ("replyId") REFERENCES "HandoverReply"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HandoverReplyMention" ADD CONSTRAINT "HandoverReplyMention_mentionedUserId_fkey" FOREIGN KEY ("mentionedUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HandoverPostTag" ADD CONSTRAINT "HandoverPostTag_postId_fkey" FOREIGN KEY ("postId") REFERENCES "HandoverPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HandoverPostTag" ADD CONSTRAINT "HandoverPostTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "HandoverTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HandoverReplyTag" ADD CONSTRAINT "HandoverReplyTag_replyId_fkey" FOREIGN KEY ("replyId") REFERENCES "HandoverReply"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HandoverReplyTag" ADD CONSTRAINT "HandoverReplyTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "HandoverTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
