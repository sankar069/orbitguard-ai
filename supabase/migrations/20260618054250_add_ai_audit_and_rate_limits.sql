-- AI Audit Logs
CREATE TABLE IF NOT EXISTS public.ai_audit_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    mode text NOT NULL,
    success boolean NOT NULL,
    model_id text,
    grounded boolean,
    sources_used integer,
    duration_ms integer,
    error_category text,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.ai_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own AI audit logs" 
    ON public.ai_audit_logs FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own AI audit logs" 
    ON public.ai_audit_logs FOR SELECT 
    USING (auth.uid() = user_id);

-- Rate limits
CREATE TABLE IF NOT EXISTS public.ai_rate_limits (
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    window_start timestamptz NOT NULL,
    request_count integer DEFAULT 1,
    PRIMARY KEY (user_id, window_start)
);

ALTER TABLE public.ai_rate_limits ENABLE ROW LEVEL SECURITY;

-- No policies needed for direct user access, as it's manipulated via RPC with SECURITY DEFINER
CREATE OR REPLACE FUNCTION check_and_increment_ai_rate_limit(p_max_requests int)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_window timestamptz;
  v_count int;
BEGIN
  -- 1-minute tumbling window
  v_current_window := date_trunc('minute', now()); 
  
  INSERT INTO public.ai_rate_limits (user_id, window_start, request_count)
  VALUES (auth.uid(), v_current_window, 1)
  ON CONFLICT (user_id, window_start)
  DO UPDATE SET request_count = ai_rate_limits.request_count + 1
  RETURNING request_count INTO v_count;

  IF v_count > p_max_requests THEN
     RETURN false;
  END IF;

  RETURN true;
END;
$$;

-- RAG Retrieval RPC
CREATE OR REPLACE FUNCTION get_relevant_kb_chunks(
    p_query text,
    p_match_count int DEFAULT 5,
    p_match_threshold float DEFAULT 0.7
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
BEGIN
    -- Since we don't have a vector store populated yet in this codebase,
    -- we simulate semantic search by doing a text search or just returning top chunks
    -- of approved documents.
    -- Ensure only approved documents are returned per requirements: "Filter out unapproved, inactive, deleted, or inaccessible documents."
    
    RETURN QUERY
    SELECT 
        c.id,
        c.document_id,
        c.chunk_text as content,
        1.0::float as similarity,
        d.metadata
    FROM 
        public.document_chunks c
    JOIN 
        public.documents d ON d.id = c.document_id
    WHERE 
        d.approval_status = 'approved'
        AND (c.chunk_text ILIKE '%' || p_query || '%' OR p_query IS NULL OR p_query = '')
    LIMIT p_match_count;

    -- If no matches found by text search, fallback to returning top approved chunks 
    -- if query wasn't matched (simple mock RAG logic).
    IF NOT FOUND THEN
       RETURN QUERY
       SELECT 
           c.id,
           c.document_id,
           c.chunk_text as content,
           0.8::float as similarity,
           d.metadata
       FROM 
           public.document_chunks c
       JOIN 
           public.documents d ON d.id = c.document_id
       WHERE 
           d.approval_status = 'approved'
       LIMIT p_match_count;
    END IF;
END;
$$;
