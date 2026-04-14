CREATE TABLE public.battles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  opponent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sigma_path TEXT NOT NULL,

  challenger_check_id UUID REFERENCES public.aura_checks(id) ON DELETE SET NULL,
  opponent_check_id UUID REFERENCES public.aura_checks(id) ON DELETE SET NULL,

  winner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  margin TEXT CHECK (margin IN ('UD','SD','TKO','DRAW','FORFEIT')),
  narrative JSONB,

  status TEXT NOT NULL DEFAULT 'awaiting_opponent' CHECK (status IN (
    'awaiting_opponent', 'completed', 'expired', 'cancelled'
  )),

  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  CONSTRAINT battles_challenger_not_opponent CHECK (challenger_id <> opponent_id)
);

CREATE INDEX idx_battles_challenger ON public.battles(challenger_id, created_at DESC);
CREATE INDEX idx_battles_opponent ON public.battles(opponent_id, created_at DESC);
CREATE INDEX idx_battles_active ON public.battles(opponent_id, status)
  WHERE status = 'awaiting_opponent';

ALTER TABLE public.profiles
  ADD COLUMN battle_wins INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN battle_losses INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN battle_draws INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN battle_streak INTEGER DEFAULT 0 NOT NULL;

ALTER TABLE public.battles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Battles visible to participants"
  ON public.battles FOR SELECT
  USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);
