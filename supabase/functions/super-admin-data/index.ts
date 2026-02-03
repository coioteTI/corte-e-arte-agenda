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
          supabase.from('branches').select('id', { count: 'exact' }).eq('is_active', true),
          supabase.from('appointments').select('id', { count: 'exact' }),
          supabase.from('profiles').select('id', { count: 'exact' })
        ])

        // Premium companies
        const { count: premiumCount } = await supabase
          .from('companies')
          .select('*', { count: 'exact', head: true })
          .in('plan', ['premium_mensal', 'premium_anual'])

        // Trial companies
        const { count: trialCount } = await supabase
          .from('companies')
          .select('*', { count: 'exact', head: true })
          .in('plan', ['trial', 'pro', 'free'])

        // Blocked companies
        const { count: blockedCount } = await supabase
          .from('companies')
          .select('*', { count: 'exact', head: true })
          .eq('is_blocked', true)

        // Companies expiring soon (within 7 days)
        const sevenDaysFromNow = new Date()
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)

        const { count: expiringCount } = await supabase
          .from('companies')
          .select('*', { count: 'exact', head: true })
          .in('plan', ['premium_mensal', 'premium_anual'])
          .lte('subscription_end_date', sevenDaysFromNow.toISOString())
          .gte('subscription_end_date', new Date().toISOString())

        // Monthly appointments
        const startOfMonth = new Date()
        startOfMonth.setDate(1)
        startOfMonth.setHours(0, 0, 0, 0)

        const { count: monthlyAppointments } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startOfMonth.toISOString())

        result = {
          total_companies: companies.count || 0,
          total_branches: branches.count || 0,
          total_appointments: appointments.count || 0,
          total_users: users.count || 0,
          premium_companies: premiumCount || 0,
          trial_companies: trialCount || 0,
          blocked_companies: blockedCount || 0,
          expiring_companies: expiringCount || 0,
          monthly_appointments: monthlyAppointments || 0
        }
        break

      case 'get_companies':
        const { data: companiesData } = await supabase
          .from('companies')
          .select(`
            id, name, email, phone, plan, subscription_status, 
            subscription_start_date, subscription_end_date,
            trial_appointments_used, trial_appointments_limit,
            branch_limit, is_blocked, blocked_at, blocked_reason,
            created_at, updated_at
          `)
          .order('created_at', { ascending: false })

        // Get branch counts for each company
        const companiesWithBranches = await Promise.all(
          (companiesData || []).map(async (company) => {
            const { count } = await supabase
              .from('branches')
              .select('*', { count: 'exact', head: true })
              .eq('company_id', company.id)
              .eq('is_active', true)

            return {
              ...company,
              branch_count: count || 0
            }
          })
        )

        result = companiesWithBranches
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

        const updateData: Record<string, any> = { 
          plan: params.plan,
          updated_at: new Date().toISOString()
        }

        // If setting to premium, update subscription dates
        if (params.plan === 'premium_mensal' || params.plan === 'premium_anual') {
          updateData.subscription_status = 'active'
          updateData.subscription_start_date = new Date().toISOString()
          
          const endDate = new Date()
          if (params.plan === 'premium_mensal') {
            endDate.setMonth(endDate.getMonth() + 1)
          } else {
            endDate.setFullYear(endDate.getFullYear() + 1)
          }
          updateData.subscription_end_date = endDate.toISOString()
        } else {
          updateData.subscription_status = 'inactive'
        }

        const { error: updateError } = await supabase
          .from('companies')
          .update(updateData)
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
            is_blocked: true,
            blocked_at: new Date().toISOString(),
            blocked_reason: params.reason || 'Bloqueado pelo administrador',
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
            is_blocked: false,
            blocked_at: null,
            blocked_reason: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', params.company_id)

        if (unblockError) throw unblockError
        result = { success: true, message: 'Empresa desbloqueada com sucesso' }
        break

      case 'update_branch_limit':
        if (!params?.company_id || params?.limit === undefined) {
          return new Response(
            JSON.stringify({ error: 'company_id e limit são obrigatórios' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        if (params.limit < 1 || params.limit > 100) {
          return new Response(
            JSON.stringify({ error: 'Limite deve estar entre 1 e 100' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { error: limitError } = await supabase
          .from('companies')
          .update({ 
            branch_limit: params.limit,
            updated_at: new Date().toISOString()
          })
          .eq('id', params.company_id)

        if (limitError) throw limitError
        result = { success: true, message: 'Limite de filiais atualizado' }
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
