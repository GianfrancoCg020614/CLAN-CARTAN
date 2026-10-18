-- V112: migracion ejecutada en Supabase; índices aditivos sin alterar datos.
CREATE INDEX IF NOT EXISTS cc_invitation_attributions_business_id_idx
  ON public.cc_invitation_attributions (business_id);
CREATE INDEX IF NOT EXISTS cc_invitation_attributions_code_id_idx
  ON public.cc_invitation_attributions (code_id);
