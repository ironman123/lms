-- Search now uses indexed case-insensitive matching. This legacy trigger was
-- left behind by the earlier full-text implementation and references the
-- removed Exam.search_vector column, causing every Exam INSERT/UPDATE to fail.
DROP TRIGGER IF EXISTS "exam_search_update" ON "Exam";
DROP FUNCTION IF EXISTS "exam_search_vector_update"();
