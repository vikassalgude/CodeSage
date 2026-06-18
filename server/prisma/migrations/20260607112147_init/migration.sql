-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "githubToken" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Repo" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "githubUrl" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "language" TEXT,
    "status" TEXT NOT NULL DEFAULT 'indexing',
    "chunkCount" INTEGER NOT NULL DEFAULT 0,
    "commitSha" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Repo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chunk" (
    "id" TEXT NOT NULL,
    "repoId" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "startLine" INTEGER NOT NULL,
    "endLine" INTEGER NOT NULL,
    "language" TEXT NOT NULL,
    "qdrantId" TEXT NOT NULL,

    CONSTRAINT "Chunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "repoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "citations" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Chunk_qdrantId_key" ON "Chunk"("qdrantId");

-- AddForeignKey
ALTER TABLE "Repo" ADD CONSTRAINT "Repo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chunk" ADD CONSTRAINT "Chunk_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "Repo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "Repo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
