
-- =============================================
-- MÓDULO WHATSAPP - SISTEMA MULTI-TENANT
-- =============================================

-- Tabela principal de empresas/tenants do WhatsApp
CREATE TABLE public.whatsapp_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  company_name TEXT NOT NULL,
  address TEXT,
  instagram TEXT,
  email TEXT,
  phone TEXT,
  business_hours JSONB DEFAULT '{
    "monday": {"start": "08:00", "end": "18:00", "isOpen": true},
    "tuesday": {"start": "08:00", "end": "18:00", "isOpen": true},
    "wednesday": {"start": "08:00", "end": "18:00", "isOpen": true},
    "thursday": {"start": "08:00", "end": "18:00", "isOpen": true},
    "friday": {"start": "08:00", "end": "18:00", "isOpen": true},
    "saturday": {"start": "08:00", "end": "13:00", "isOpen": true},
    "sunday": {"start": "08:00", "end": "13:00", "isOpen": false}
  }'::jsonb,
  whatsapp_phone_number_id TEXT,
  whatsapp_access_token TEXT,
  whatsapp_business_account_id TEXT,
  whatsapp_verify_token TEXT DEFAULT encode(gen_random_bytes(16), 'hex'),
  bot_enabled BOOLEAN DEFAULT true,
  birthday_message_enabled BOOLEAN DEFAULT true,
  birthday_message_template TEXT DEFAULT 'Olá {nome}! 🎂🎉 Hoje é seu dia especial! A equipe {empresa} deseja um Feliz Aniversário! Que seu dia seja repleto de alegria!',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Contatos por empresa
CREATE TABLE public.whatsapp_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.whatsapp_tenants(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  name TEXT,
  birth_date DATE,
  notes TEXT,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, phone)
);

-- Conversas
CREATE TABLE public.whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.whatsapp_tenants(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.whatsapp_contacts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  last_message_at TIMESTAMPTZ DEFAULT now(),
  last_message_preview TEXT,
  unread_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Mensagens
CREATE TABLE public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.whatsapp_tenants(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.whatsapp_contacts(id),
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_type TEXT NOT NULL DEFAULT 'text',
  content TEXT,
  media_url TEXT,
  whatsapp_message_id TEXT,
  status TEXT DEFAULT 'sent',
  is_bot_response BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Serviços por empresa (base de conhecimento do bot)
CREATE TABLE public.whatsapp_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.whatsapp_tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  duration INTEGER NOT NULL DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Agendamentos por empresa
CREATE TABLE public.whatsapp_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.whatsapp_tenants(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.whatsapp_contacts(id),
  service_id UUID REFERENCES public.whatsapp_services(id),
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  booked_by TEXT DEFAULT 'bot',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Log de mensagens de aniversário
CREATE TABLE public.whatsapp_birthday_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.whatsapp_tenants(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.whatsapp_contacts(id),
  sent_at TIMESTAMPTZ DEFAULT now(),
  year INTEGER NOT NULL,
  UNIQUE(tenant_id, contact_id, year)
);

-- =============================================
-- RLS POLICIES - ISOLAMENTO TOTAL POR TENANT
-- =============================================

ALTER TABLE public.whatsapp_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_birthday_logs ENABLE ROW LEVEL SECURITY;

-- Tenants: só o dono pode acessar
CREATE POLICY "Users manage own tenants" ON public.whatsapp_tenants
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Função helper para verificar se tenant pertence ao user
CREATE OR REPLACE FUNCTION public.owns_whatsapp_tenant(_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.whatsapp_tenants
    WHERE id = _tenant_id AND user_id = auth.uid()
  )
$$;

-- Contatos
CREATE POLICY "Tenant owners manage contacts" ON public.whatsapp_contacts
  FOR ALL USING (public.owns_whatsapp_tenant(tenant_id))
  WITH CHECK (public.owns_whatsapp_tenant(tenant_id));

-- Conversas
CREATE POLICY "Tenant owners manage conversations" ON public.whatsapp_conversations
  FOR ALL USING (public.owns_whatsapp_tenant(tenant_id))
  WITH CHECK (public.owns_whatsapp_tenant(tenant_id));

-- Mensagens
CREATE POLICY "Tenant owners manage messages" ON public.whatsapp_messages
  FOR ALL USING (public.owns_whatsapp_tenant(tenant_id))
  WITH CHECK (public.owns_whatsapp_tenant(tenant_id));

-- Serviços
CREATE POLICY "Tenant owners manage services" ON public.whatsapp_services
  FOR ALL USING (public.owns_whatsapp_tenant(tenant_id))
  WITH CHECK (public.owns_whatsapp_tenant(tenant_id));

-- Agendamentos
CREATE POLICY "Tenant owners manage appointments" ON public.whatsapp_appointments
  FOR ALL USING (public.owns_whatsapp_tenant(tenant_id))
  WITH CHECK (public.owns_whatsapp_tenant(tenant_id));

-- Birthday logs
CREATE POLICY "Tenant owners manage birthday logs" ON public.whatsapp_birthday_logs
  FOR ALL USING (public.owns_whatsapp_tenant(tenant_id))
  WITH CHECK (public.owns_whatsapp_tenant(tenant_id));

-- Service role policies for edge functions (webhook)
CREATE POLICY "Service role full access tenants" ON public.whatsapp_tenants
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access contacts" ON public.whatsapp_contacts
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access conversations" ON public.whatsapp_conversations
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access messages" ON public.whatsapp_messages
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access services" ON public.whatsapp_services
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access appointments" ON public.whatsapp_appointments
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access birthday" ON public.whatsapp_birthday_logs
  FOR ALL USING (true) WITH CHECK (true);

-- Indexes para performance
CREATE INDEX idx_whatsapp_contacts_tenant ON public.whatsapp_contacts(tenant_id);
CREATE INDEX idx_whatsapp_contacts_phone ON public.whatsapp_contacts(tenant_id, phone);
CREATE INDEX idx_whatsapp_conversations_tenant ON public.whatsapp_conversations(tenant_id);
CREATE INDEX idx_whatsapp_messages_conversation ON public.whatsapp_messages(conversation_id);
CREATE INDEX idx_whatsapp_messages_tenant ON public.whatsapp_messages(tenant_id);
CREATE INDEX idx_whatsapp_appointments_tenant_date ON public.whatsapp_appointments(tenant_id, appointment_date);
CREATE INDEX idx_whatsapp_contacts_birthday ON public.whatsapp_contacts(tenant_id, birth_date);

-- Trigger updated_at
CREATE TRIGGER update_whatsapp_tenants_updated_at BEFORE UPDATE ON public.whatsapp_tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_whatsapp_contacts_updated_at BEFORE UPDATE ON public.whatsapp_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_whatsapp_services_updated_at BEFORE UPDATE ON public.whatsapp_services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_whatsapp_appointments_updated_at BEFORE UPDATE ON public.whatsapp_appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
