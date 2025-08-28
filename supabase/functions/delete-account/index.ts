import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Create regular client for user operations
    const supabaseClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Não autorizado - token de acesso necessário')
    }

    // Get user from token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (userError || !user) {
      console.error('Erro ao obter usuário:', userError)
      throw new Error('Usuário não encontrado ou token inválido')
    }

    console.log('Iniciando exclusão completa da conta para usuário:', user.id)

    // Get user's company
    const { data: companies, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('id')
      .eq('user_id', user.id)

    if (companyError) {
      console.error('Erro ao buscar empresa:', companyError)
      throw new Error('Erro ao buscar dados da empresa')
    }

    if (!companies || companies.length === 0) {
      throw new Error('Nenhuma empresa encontrada para este usuário')
    }

    const companyId = companies[0].id
    console.log('Empresa encontrada:', companyId)

    // Delete in correct order to avoid foreign key constraints
    console.log('1. Deletando likes da empresa...')
    await supabaseAdmin.from('likes').delete().eq('target_id', companyId).eq('target_type', 'company')

    console.log('2. Deletando favoritos da empresa...')
    await supabaseAdmin.from('favorites').delete().eq('company_id', companyId)

    console.log('3. Deletando agendamentos da empresa...')
    const { data: appointments } = await supabaseAdmin
      .from('appointments')
      .select('client_id')
      .eq('company_id', companyId)

    await supabaseAdmin.from('appointments').delete().eq('company_id', companyId)

    console.log('4. Deletando clientes criados pela empresa...')
    if (appointments && appointments.length > 0) {
      const clientIds = [...new Set(appointments.map(a => a.client_id))]
      await supabaseAdmin.from('clients').delete().in('id', clientIds)
    }

    console.log('5. Deletando serviços da empresa...')
    await supabaseAdmin.from('services').delete().eq('company_id', companyId)

    console.log('6. Deletando profissionais da empresa...')
    await supabaseAdmin.from('professionals').delete().eq('company_id', companyId)

    console.log('7. Deletando templates de notificação...')
    await supabaseAdmin.from('notification_templates').delete().eq('company_id', companyId)

    console.log('8. Deletando configurações da empresa...')
    await supabaseAdmin.from('company_settings').delete().eq('company_id', companyId)

    console.log('9. Deletando assinaturas...')
    await supabaseAdmin.from('subscriptions').delete().eq('company_id', companyId)

    console.log('10. Deletando empresa...')
    await supabaseAdmin.from('companies').delete().eq('id', companyId)

    console.log('11. Deletando perfil do usuário...')
    await supabaseAdmin.from('profiles').delete().eq('user_id', user.id)

    console.log('12. Deletando usuário da autenticação...')
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(user.id)
    
    if (deleteUserError) {
      console.error('Erro ao deletar usuário da auth:', deleteUserError)
      throw new Error('Erro ao remover usuário do sistema de autenticação')
    }

    console.log('✅ Conta completamente excluída com sucesso!')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Conta excluída com sucesso. Todos os dados foram removidos permanentemente.' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('❌ Erro na exclusão da conta:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Erro interno do servidor' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})