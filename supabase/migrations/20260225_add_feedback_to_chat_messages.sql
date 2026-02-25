-- Migration: Přidání sloupců pro feedback (smiley + text) do tabulky chat_messages
-- Datum: 2026-02-25

ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS smiley INTEGER CHECK (smiley BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS feedback_text TEXT;

COMMENT ON COLUMN chat_messages.smiley IS 'Hodnocení konverzace: 1=velmi nespokojený, 2=nespokojený, 3=neutrální, 4=spokojený, 5=velmi spokojený';
COMMENT ON COLUMN chat_messages.feedback_text IS 'Volitelný textový komentář k feedbacku';
