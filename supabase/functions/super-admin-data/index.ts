import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-super-admin-token',
}

interface DataRequest {
  action: string;
  params?: Record<string, any>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Verify super admin session token
    const token = req.headers.get('x-super-admin-token')
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token de sessão não fornecido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { action, params }: DataRequest = await req.json()

    // Log the action
    await supabase.from('super_admin_audit_log').insert({
      action: `data_access_${action}`,
      details: params || {},
      ip_address: req.headers.get('x-forwarded-for') || 'unknown',
      user_agent: req.headers.get('user-agent') || 'unknown'
    })

    let result: any = null

    switch (action) {
      case 'get_dashboard_stats':
        // Get overall platform statistics
        const [companies, branches, appointments, users] = await Promise.all([
          supabase.from('companies').select('id, name, plan, subscription_status, created_at', { count: 'exact' }),
          supabase.from('branches').select('id', { count: 'exact' }),
          supabase.from('appointments').select('id', { count: 'exact' }),
          supabase.from('profiles').select('id', { count: 'exact' })
        ])

        result = {
          total_companies: companies.count || 0,
          total_branches: branches.count || 0,
          total_appointments: appointments.count || 0,
          total_users: users.count || 0
        }
        break

      case 'get_companies':
        const { data: companiesData } = await supabase
          .from('companies')
          .select(`
            id, name, email, phone, plan, subscription_status, 
            subscription_start_date, subscription_end_date,
            trial_appointments_used, trial_appointments_limit,
            created_at, updated_at
          `)
          .order('created_at', { ascending: false })

        result = companiesData || []
        break

      case 'get_company_details':
        if (!params?.company_id) {
          return new Response(
            JSON.stringify({ error: 'company_id é obrigatório' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const [companyDetail, companyBranches, companyAppointments] = await Promise.all([
          supabase.from('companies').select('*').eq('id', params.company_id).single(),
          supabase.from('branches').select('*').eq('company_id', params.company_id),
          supabase.from('appointments').select('id, status, created_at').eq('company_id', params.company_id)
        ])

        result = {
          company: companyDetail.data,
          branches: companyBranches.data || [],
          appointments_count: companyAppointments.data?.length || 0
        }
        break

      case 'update_company_plan':
        if (!params?.company_id || !params?.plan) {
          return new Response(
            JSON.stringify({ error: 'company_id e plan são obrigatórios' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { error: updateError } = await supabase
          .from('companies')
          .update({ 
            plan: params.plan,
            subscription_status: params.plan === 'trial' ? 'inactive' : 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', params.company_id)

        if (updateError) throw updateError
        result = { success: true, message: 'Plano atualizado com sucesso' }
        break

      case 'block_company':
        if (!params?.company_id) {
          return new Response(
            JSON.stringify({ error: 'company_id é obrigatório' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { error: blockError } = await supabase
          .from('companies')
          .update({ 
            subscription_status: 'blocked',
            updated_at: new Date().toISOString()
          })
          .eq('id', params.company_id)

        if (blockError) throw blockError
        result = { success: true, message: 'Empresa bloqueada com sucesso' }
        break

      case 'unblock_company':
        if (!params?.company_id) {
          return new Response(
            JSON.stringify({ error: 'company_id é obrigatório' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { error: unblockError } = await supabase
          .from('companies')
          .update({ 
            subscription_status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', params.company_id)

        if (unblockError) throw unblockError
        result = { success: true, message: 'Empresa desbloqueada com sucesso' }
        break

      case 'get_audit_log':
        const { data: auditData } = await supabase
          .from('super_admin_audit_log')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(params?.limit || 100)

        result = auditData || []
        break

      case 'get_users':
        const { data: usersData } = await supabase
          .from('profiles')
          .select('id, user_id, full_name, phone, is_first_access, created_at')
          .order('created_at', { ascending: false })

        result = usersData || []
        break

      case 'get_user_roles':
        const { data: rolesData } = await supabase
          .from('user_roles')
          .select('id, user_id, role, created_at')
          .order('created_at', { ascending: false })

        result = rolesData || []
        break

      default:
        return new Response(
          JSON.stringify({ error: 'Ação não reconhecida' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Super admin data error:', error)
    return new Response(
      JSON.stringify({ error: 'Erro ao processar requisição' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
