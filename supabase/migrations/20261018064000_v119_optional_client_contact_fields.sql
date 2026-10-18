-- CLAN CARTAN V119 · Datos opcionales de contacto para clientes de COBRA YA.
-- Las identidades existentes, prestamos, abonos y documentos no se modifican.
ALTER TABLE public.cy_clients
 ADD COLUMN IF NOT EXISTS address text,
 ADD COLUMN IF NOT EXISTS district text,
 ADD COLUMN IF NOT EXISTS address_reference text;
-- El campo notes ya existe; se conserva su contenido.
-- RLS de cy_clients permanece exactamente como estaba.
