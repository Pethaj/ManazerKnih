-- Migration: Add show_sources column to chatbot_settings table
-- Created: 2026-02-17
-- Description: Adds a boolean column to control whether sources are displayed in chatbot responses

-- Add show_sources column with default value true (sources visible by default)
ALTER TABLE chatbot_settings 
ADD COLUMN IF NOT EXISTS show_sources BOOLEAN DEFAULT true;

-- Add comment to column for documentation
COMMENT ON COLUMN chatbot_settings.show_sources IS 
'Určuje, zda chatbot zobrazuje zdroje informací pod odpověďmi. Default: true (zdroje jsou zobrazeny).';
