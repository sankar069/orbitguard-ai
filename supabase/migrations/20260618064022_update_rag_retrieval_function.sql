CREATE OR REPLACE FUNCTION get_relevant_kb_chunks(
    p_query text,
    p_match_count int DEFAULT 5,
    p_match_threshold float DEFAULT 0.01
)
RETURNS TABLE (
    id uuid,
    document_id uuid,
    content text,
    similarity float,
    metadata jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_query tsquery;
BEGIN
    -- Only process if query is not empty
    IF trim(p_query) = '' OR p_query IS NULL THEN
        RETURN;
    END IF;

    -- Use PostgreSQL text search instead of semantic embeddings since pgvector is not populated
    v_query := websearch_to_tsquery('english', p_query);

    RETURN QUERY
    SELECT 
        c.id,
        c.document_id,
        c.chunk_text as content,
        ts_rank(c.tsv, v_query)::float as similarity,
        d.metadata
    FROM 
        public.document_chunks c
    JOIN 
        public.documents d ON d.id = c.document_id
    WHERE 
        d.approval_status = 'approved'
        AND c.tsv @@ v_query
        AND ts_rank(c.tsv, v_query) > p_match_threshold
    ORDER BY 
        similarity DESC
    LIMIT p_match_count;
END;
$$;
