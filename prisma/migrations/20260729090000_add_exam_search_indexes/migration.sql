-- Trigram indexes make case-insensitive partial and fuzzy matching fast without
-- requiring Prisma's unsupported full-text `search` filter.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "Exam_name_trgm_idx"
ON "Exam" USING GIN ("name" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Exam_description_trgm_idx"
ON "Exam" USING GIN ("description" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "ExamCategory_name_trgm_idx"
ON "ExamCategory" USING GIN ("name" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Tag_name_trgm_idx"
ON "Tag" USING GIN ("name" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "ExamSyllabusEntry_topicPath_trgm_idx"
ON "ExamSyllabusEntry" USING GIN ("topicPath" gin_trgm_ops);
