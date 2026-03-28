-- Chat Messages table for Oraion Chat Tunnel
-- Stores messages between Tina (via Healthy Me app) and Oraion

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  direction text CHECK (direction IN ('user', 'oraion')),
  content text,
  photo_urls text[],
  analysis jsonb,
  message_type text DEFAULT 'chat' CHECK (message_type IN ('chat', 'food_analysis', 'skin_analysis', 'supplement_check', 'lab_analysis', 'menu_analysis', 'fridge_analysis')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'complete', 'error')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own messages" ON chat_messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own messages" ON chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role manages all" ON chat_messages
  FOR ALL USING (auth.role() = 'service_role');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_status ON chat_messages(user_id, status);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at DESC);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER chat_messages_updated_at
  BEFORE UPDATE ON chat_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
