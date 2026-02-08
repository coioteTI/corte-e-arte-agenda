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
          supabase.from('companies').select('id, name, plan, subscription_status, subscription_end_date, can_create_branches, created_at', { count: 'exact' }),
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

        // Stock sales this month
        const { count: monthlyStockSales } = await supabase
          .from('stock_sales')
          .select('*', { count: 'exact', head: true })
          .gte('sold_at', startOfMonth.toISOString())

        // Companies with branch creation enabled
        const { count: branchCreationEnabledCount } = await supabase
          .from('companies')
          .select('*', { count: 'exact', head: true })
          .eq('can_create_branches', true)

        result = {
          total_companies: companies.count || 0,
          total_branches: branches.count || 0,
          total_appointments: appointments.count || 0,
          total_users: users.count || 0,
          premium_companies: premiumCount || 0,
          trial_companies: trialCount || 0,
          blocked_companies: blockedCount || 0,
          expiring_companies: expiringCount || 0,
          monthly_appointments: monthlyAppointments || 0,
          monthly_stock_sales: monthlyStockSales || 0,
          branch_creation_enabled_count: branchCreationEnabledCount || 0
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
            can_create_branches, created_at, updated_at
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

            // Get appointments count for this company
            const { count: appointmentsCount } = await supabase
              .from('appointments')
              .select('*', { count: 'exact', head: true })
              .eq('company_id', company.id)

            return {
              ...company,
              branch_count: count || 0,
              appointments_count: appointmentsCount || 0
            }
          })
        )

        result = companiesWithBranches
        break

      // Get only companies (matrices) - for dedicated company management tab
      case 'get_companies_only':
        const { data: companiesOnlyData } = await supabase
          .from('companies')
          .select('id, name, email, plan, is_blocked, created_at')
          .order('created_at', { ascending: false })

        const companiesWithCounts = await Promise.all(
          (companiesOnlyData || []).map(async (company) => {
            const { count: branchCount } = await supabase
              .from('branches')
              .select('*', { count: 'exact', head: true })
              .eq('company_id', company.id)

            const { count: appointmentsCount } = await supabase
              .from('appointments')
              .select('*', { count: 'exact', head: true })
              .eq('company_id', company.id)

            return {
              ...company,
              branch_count: branchCount || 0,
              appointments_count: appointmentsCount || 0
            }
          })
        )

        result = companiesWithCounts
        break

      // Simple list of companies for dropdowns
      case 'get_companies_list':
        const { data: companiesList } = await supabase
          .from('companies')
          .select('id, name')
          .order('name', { ascending: true })

        result = companiesList || []
        break

      case 'get_all_branches':
        const { data: allBranches } = await supabase
          .from('branches')
          .select(`
            id, name, company_id, address, city, state, is_active, created_at,
            companies:company_id (name)
          `)
          .order('created_at', { ascending: false })

        result = (allBranches || []).map(branch => ({
          ...branch,
          company_name: (branch as any).companies?.name || 'Desconhecida'
        }))
        break

      // ========== USER ACCESS MANAGEMENT ==========
      case 'get_all_user_access':
        // Get all users with their roles and company info
        const { data: allRoles } = await supabase
          .from('user_roles')
          .select('user_id, role, created_at')
          .order('created_at', { ascending: false })

        // Get profiles
        const { data: allProfiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, phone')

        // Get user branches for company association
        const { data: allUserBranches } = await supabase
          .from('user_branches')
          .select(`
            user_id, branch_id, is_primary,
            branches:branch_id (id, name, company_id)
          `)

        // Get all branches to map company info
        const { data: allBranchesForUsers } = await supabase
          .from('branches')
          .select('id, name, company_id')

        // Get all companies
        const { data: allCompaniesForUsers } = await supabase
          .from('companies')
          .select('id, name, user_id, email')

        // Build user access list
        const userAccessList: any[] = []

        for (const role of (allRoles || [])) {
          const profile = (allProfiles || []).find(p => p.user_id === role.user_id)
          const userBranch = (allUserBranches || []).find(ub => ub.user_id === role.user_id)
          
          // Find company - either owned by user or through branch
          let company = (allCompaniesForUsers || []).find(c => c.user_id === role.user_id)
          let branch = null

          if (!company && userBranch) {
            const branchData = (userBranch as any).branches
            if (branchData) {
              branch = branchData
              company = (allCompaniesForUsers || []).find(c => c.id === branchData.company_id)
            }
          }

          userAccessList.push({
            id: role.user_id,
            user_id: role.user_id,
            email: company?.email || 'N/A',
            full_name: profile?.full_name,
            phone: profile?.phone,
            role: role.role,
            company_id: company?.id,
            company_name: company?.name,
            branch_id: branch?.id,
            branch_name: branch?.name,
            is_blocked: false, // We'd need a separate blocked users table for this
            created_at: role.created_at
          })
        }

        result = userAccessList
        break

      case 'update_user_access':
        if (!params?.user_id) {
          return new Response(
            JSON.stringify({ error: 'user_id é obrigatório' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Update profile
        if (params.full_name || params.phone) {
          await supabase
            .from('profiles')
            .update({
              full_name: params.full_name,
              phone: params.phone
            })
            .eq('user_id', params.user_id)
        }

        // Update role
        if (params.role) {
          await supabase
            .from('user_roles')
            .update({ role: params.role })
            .eq('user_id', params.user_id)
        }

        // Update password if provided
        if (params.new_password) {
          const { error: passwordError } = await supabase.auth.admin.updateUserById(
            params.user_id,
            { password: params.new_password }
          )
          if (passwordError) {
            console.error('Error updating password:', passwordError)
          }
        }

        // Update email if provided
        if (params.email) {
          const { error: emailError } = await supabase.auth.admin.updateUserById(
            params.user_id,
            { email: params.email }
          )
          if (emailError) {
            console.error('Error updating email:', emailError)
          }
        }

        result = { success: true, message: 'Usuário atualizado com sucesso' }
        break

      case 'toggle_user_block':
        if (!params?.user_id) {
          return new Response(
            JSON.stringify({ error: 'user_id é obrigatório' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Ban or unban user
        if (params.is_blocked) {
          await supabase.auth.admin.updateUserById(params.user_id, { ban_duration: '876000h' }) // ~100 years
        } else {
          await supabase.auth.admin.updateUserById(params.user_id, { ban_duration: 'none' })
        }

        result = { success: true, message: params.is_blocked ? 'Usuário bloqueado' : 'Usuário desbloqueado' }
        break

      case 'delete_users':
        if (!params?.user_ids || !Array.isArray(params.user_ids)) {
          return new Response(
            JSON.stringify({ error: 'user_ids array é obrigatório' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        for (const userId of params.user_ids) {
          // Delete related data
          await supabase.from('user_roles').delete().eq('user_id', userId)
          await supabase.from('user_branches').delete().eq('user_id', userId)
          await supabase.from('user_sessions').delete().eq('user_id', userId)
          await supabase.from('profiles').delete().eq('user_id', userId)
          
          // Delete auth user
          await supabase.auth.admin.deleteUser(userId)
        }

        result = { success: true, message: `${params.user_ids.length} usuário(s) removido(s)` }
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
          
          // Use custom dates if provided, otherwise use defaults
          if (params.start_date) {
            updateData.subscription_start_date = new Date(params.start_date).toISOString()
          } else {
            updateData.subscription_start_date = new Date().toISOString()
          }
          
          if (params.end_date) {
            updateData.subscription_end_date = new Date(params.end_date).toISOString()
          } else {
            const endDate = new Date()
            if (params.plan === 'premium_mensal') {
              endDate.setMonth(endDate.getMonth() + 1)
            } else {
              endDate.setFullYear(endDate.getFullYear() + 1)
            }
            updateData.subscription_end_date = endDate.toISOString()
          }
        } else if (params.plan === 'cancelled' || params.plan === 'inactive') {
          // Cancel plan
          updateData.plan = 'trial'
          updateData.subscription_status = 'cancelled'
          updateData.subscription_end_date = new Date().toISOString()
        } else {
          updateData.subscription_status = 'inactive'
          // Reset trial if switching to trial
          if (params.plan === 'trial') {
            if (params.reset_trial) {
              updateData.trial_appointments_used = 0
            }
            updateData.trial_appointments_limit = params.trial_limit || 50
          }
        }

        const { error: updateError } = await supabase
          .from('companies')
          .update(updateData)
          .eq('id', params.company_id)

        if (updateError) throw updateError
        result = { success: true, message: 'Plano atualizado com sucesso' }
        break

      // Toggle branch creation permission
      case 'toggle_branch_creation':
        if (!params?.company_id) {
          return new Response(
            JSON.stringify({ error: 'company_id é obrigatório' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data: currentCompany } = await supabase
          .from('companies')
          .select('can_create_branches')
          .eq('id', params.company_id)
          .single()

        const newValue = params.enabled !== undefined ? params.enabled : !(currentCompany?.can_create_branches)

        const { error: toggleError } = await supabase
          .from('companies')
          .update({ 
            can_create_branches: newValue,
            updated_at: new Date().toISOString()
          })
          .eq('id', params.company_id)

        if (toggleError) throw toggleError
        result = { 
          success: true, 
          message: newValue ? 'Criação de filiais liberada' : 'Criação de filiais bloqueada',
          can_create_branches: newValue
        }
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

      // ========== DELETE OPERATIONS ==========
      case 'delete_branches':
        if (!params?.ids || !Array.isArray(params.ids) || params.ids.length === 0) {
          return new Response(
            JSON.stringify({ error: 'ids array é obrigatório' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Delete branches
        const { error: deleteBranchesError } = await supabase
          .from('branches')
          .delete()
          .in('id', params.ids)

        if (deleteBranchesError) throw deleteBranchesError
        result = { success: true, message: `${params.ids.length} filial(is) excluída(s)` }
        break

      case 'delete_companies':
        if (!params?.ids || !Array.isArray(params.ids) || params.ids.length === 0) {
          return new Response(
            JSON.stringify({ error: 'ids array é obrigatório' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Delete in order to avoid FK constraints
        for (const companyId of params.ids) {
          // Delete all related data
          await supabase.from('appointments').delete().eq('company_id', companyId)
          await supabase.from('services').delete().eq('company_id', companyId)
          await supabase.from('professionals').delete().eq('company_id', companyId)
          await supabase.from('branches').delete().eq('company_id', companyId)
          await supabase.from('company_settings').delete().eq('company_id', companyId)
          await supabase.from('subscriptions').delete().eq('company_id', companyId)
          await supabase.from('notifications').delete().eq('company_id', companyId)
          await supabase.from('notification_templates').delete().eq('company_id', companyId)
          await supabase.from('module_settings').delete().eq('company_id', companyId)
          await supabase.from('gallery').delete().eq('company_id', companyId)
          await supabase.from('stock_categories').delete().eq('company_id', companyId)
          await supabase.from('stock_products').delete().eq('company_id', companyId)
          await supabase.from('stock_sales').delete().eq('company_id', companyId)
          await supabase.from('suppliers').delete().eq('company_id', companyId)
          await supabase.from('supplier_products').delete().eq('company_id', companyId)
          await supabase.from('expenses').delete().eq('company_id', companyId)
          await supabase.from('professional_payments').delete().eq('company_id', companyId)
          await supabase.from('support_tickets').delete().eq('company_id', companyId)
          await supabase.from('reviews').delete().eq('company_id', companyId)
          await supabase.from('favorites').delete().eq('company_id', companyId)
          
          // Finally delete the company
          await supabase.from('companies').delete().eq('id', companyId)
        }

        result = { success: true, message: `${params.ids.length} empresa(s) excluída(s)` }
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

      // ========== SUPPORT TICKET ACTIONS ==========
      case 'get_tickets':
        const ticketsQuery = supabase
          .from('support_tickets')
          .select(`
            *,
            companies:company_id (name, email, phone, address, city, state)
          `)
          .order('created_at', { ascending: false })

        if (params?.status) {
          ticketsQuery.eq('status', params.status)
        }
        if (params?.priority) {
          ticketsQuery.eq('priority', params.priority)
        }

        const { data: ticketsData, error: ticketsError } = await ticketsQuery

        if (ticketsError) throw ticketsError

        // Get unread message counts for each ticket
        const ticketsWithCounts = await Promise.all(
          (ticketsData || []).map(async (ticket) => {
            const { count } = await supabase
              .from('support_messages')
              .select('*', { count: 'exact', head: true })
              .eq('ticket_id', ticket.id)
              .eq('sender_type', 'company')
              .eq('is_read', false)

            return {
              ...ticket,
              unread_count: count || 0
            }
          })
        )

        result = ticketsWithCounts
        break

      case 'get_ticket_details':
        if (!params?.ticket_id) {
          return new Response(
            JSON.stringify({ error: 'ticket_id é obrigatório' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const [ticketDetail, ticketMessages] = await Promise.all([
          supabase
            .from('support_tickets')
            .select(`*, companies:company_id (name, email, phone, address, city, state)`)
            .eq('id', params.ticket_id)
            .single(),
          supabase
            .from('support_messages')
            .select('*')
            .eq('ticket_id', params.ticket_id)
            .order('created_at', { ascending: true })
        ])

        // Mark company messages as read
        await supabase
          .from('support_messages')
          .update({ is_read: true })
          .eq('ticket_id', params.ticket_id)
          .eq('sender_type', 'company')

        result = {
          ticket: ticketDetail.data,
          messages: ticketMessages.data || []
        }
        break

      case 'send_ticket_message':
        if (!params?.ticket_id || !params?.message) {
          return new Response(
            JSON.stringify({ error: 'ticket_id e message são obrigatórios' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { error: messageError } = await supabase
          .from('support_messages')
          .insert({
            ticket_id: params.ticket_id,
            sender_type: 'admin',
            message: params.message
          })

        if (messageError) throw messageError

        // Update ticket status if it was open
        await supabase
          .from('support_tickets')
          .update({ status: 'in_progress', updated_at: new Date().toISOString() })
          .eq('id', params.ticket_id)
          .eq('status', 'open')

        result = { success: true, message: 'Mensagem enviada com sucesso' }
        break

      case 'update_ticket_status':
        if (!params?.ticket_id || !params?.status) {
          return new Response(
            JSON.stringify({ error: 'ticket_id e status são obrigatórios' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const ticketUpdateData: Record<string, any> = { 
          status: params.status,
          updated_at: new Date().toISOString()
        }

        if (params.status === 'resolved') {
          ticketUpdateData.resolved_at = new Date().toISOString()
        }

        if (params.assigned_to) {
          ticketUpdateData.assigned_to = params.assigned_to
        }

        const { error: statusError } = await supabase
          .from('support_tickets')
          .update(ticketUpdateData)
          .eq('id', params.ticket_id)

        if (statusError) throw statusError
        result = { success: true, message: 'Status atualizado com sucesso' }
        break

      case 'get_ticket_stats':
        const [openTickets, inProgressTickets, resolvedTickets, totalTickets] = await Promise.all([
          supabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'open'),
          supabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
          supabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'resolved'),
          supabase.from('support_tickets').select('*', { count: 'exact', head: true })
        ])

        result = {
          open: openTickets.count || 0,
          in_progress: inProgressTickets.count || 0,
          resolved: resolvedTickets.count || 0,
          total: totalTickets.count || 0
        }
        break

       // ========== GLOBAL REPORTS ACTIONS ==========
       case 'get_global_reports':
         // Get date range from params (default: last 12 months)
         const monthsBack = params?.months || 12
         const reportStartDate = new Date()
         reportStartDate.setMonth(reportStartDate.getMonth() - monthsBack)
 
         // Get all appointments with company and payment info
         const { data: allAppointments } = await supabase
           .from('appointments')
           .select('id, total_price, payment_status, appointment_date, created_at, company_id, status')
           .gte('created_at', reportStartDate.toISOString())
 
         // Get all stock sales
         const { data: allStockSales } = await supabase
           .from('stock_sales')
           .select('id, total_price, payment_status, sold_at, company_id')
           .gte('sold_at', reportStartDate.toISOString())
 
         // Get all subscriptions
         const { data: allSubscriptions } = await supabase
           .from('subscriptions')
           .select('id, amount, plan, status, created_at, company_id')
 
         // Get companies by creation month for growth tracking
         const { data: allCompaniesForGrowth } = await supabase
           .from('companies')
           .select('id, name, plan, created_at, subscription_status')
           .order('created_at', { ascending: true })
 
         // Calculate monthly revenue from appointments (confirmed/completed with paid status)
         const monthlyAppointmentRevenue: Record<string, number> = {}
         const monthlyStockRevenue: Record<string, number> = {}
         const monthlyNewCompanies: Record<string, number> = {}
         const monthlyAppointmentCount: Record<string, number> = {}
 
         // Process appointments
         (allAppointments || []).forEach(apt => {
           if (apt.payment_status === 'paid' && apt.total_price && ['confirmed', 'completed'].includes(apt.status)) {
             const month = apt.appointment_date.substring(0, 7) // YYYY-MM
             monthlyAppointmentRevenue[month] = (monthlyAppointmentRevenue[month] || 0) + Number(apt.total_price)
           }
           const month = apt.created_at.substring(0, 7)
           monthlyAppointmentCount[month] = (monthlyAppointmentCount[month] || 0) + 1
         })
 
         // Process stock sales
         (allStockSales || []).forEach(sale => {
           if (sale.payment_status === 'paid' && sale.total_price) {
             const month = sale.sold_at.substring(0, 7)
             monthlyStockRevenue[month] = (monthlyStockRevenue[month] || 0) + Number(sale.total_price)
           }
         })
 
         // Process company growth
         (allCompaniesForGrowth || []).forEach(company => {
           const month = company.created_at.substring(0, 7)
           monthlyNewCompanies[month] = (monthlyNewCompanies[month] || 0) + 1
         })
 
         // Calculate totals
         const totalAppointmentRevenue = Object.values(monthlyAppointmentRevenue).reduce((a, b) => a + b, 0)
         const totalStockRevenue = Object.values(monthlyStockRevenue).reduce((a, b) => a + b, 0)
         const totalRevenue = totalAppointmentRevenue + totalStockRevenue
 
         // Plan distribution
         const planDistribution: Record<string, number> = {}
         ;(allCompaniesForGrowth || []).forEach(company => {
           planDistribution[company.plan] = (planDistribution[company.plan] || 0) + 1
         })
 
         // Prepare monthly data for charts
         const months: string[] = []
         for (let i = monthsBack - 1; i >= 0; i--) {
           const d = new Date()
           d.setMonth(d.getMonth() - i)
           months.push(d.toISOString().substring(0, 7))
         }
 
         const chartData = months.map(month => ({
           month,
           label: new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
           appointmentRevenue: monthlyAppointmentRevenue[month] || 0,
           stockRevenue: monthlyStockRevenue[month] || 0,
           totalRevenue: (monthlyAppointmentRevenue[month] || 0) + (monthlyStockRevenue[month] || 0),
           newCompanies: monthlyNewCompanies[month] || 0,
           appointments: monthlyAppointmentCount[month] || 0,
         }))
 
         // Top companies by revenue
         const companyRevenue: Record<string, { name: string; revenue: number; appointments: number }> = {}
         ;(allAppointments || []).forEach(apt => {
           if (apt.payment_status === 'paid' && apt.total_price && ['confirmed', 'completed'].includes(apt.status)) {
             if (!companyRevenue[apt.company_id]) {
               const company = (allCompaniesForGrowth || []).find(c => c.id === apt.company_id)
               companyRevenue[apt.company_id] = { 
                 name: company?.name || 'Desconhecida', 
                 revenue: 0, 
                 appointments: 0 
               }
             }
             companyRevenue[apt.company_id].revenue += Number(apt.total_price)
             companyRevenue[apt.company_id].appointments += 1
           }
         })
 
         const topCompanies = Object.entries(companyRevenue)
           .map(([id, data]) => ({ id, ...data }))
           .sort((a, b) => b.revenue - a.revenue)
           .slice(0, 10)
 
         result = {
           totals: {
             totalRevenue,
             totalAppointmentRevenue,
             totalStockRevenue,
             totalCompanies: (allCompaniesForGrowth || []).length,
             totalAppointments: (allAppointments || []).length,
             totalStockSales: (allStockSales || []).length,
           },
           planDistribution,
           chartData,
           topCompanies,
         }
         break
 
      // ========== CONTACT MESSAGES ACTIONS ==========
      case 'get_contact_messages':
        const { data: contactMessages } = await supabase
          .from('contact_messages')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(params?.limit || 100)

        result = { messages: contactMessages || [] }
        break

      case 'mark_contact_read':
        if (!params?.message_id) {
          return new Response(
            JSON.stringify({ error: 'message_id é obrigatório' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { error: readError } = await supabase
          .from('contact_messages')
          .update({ 
            is_read: true, 
            read_at: new Date().toISOString() 
          })
          .eq('id', params.message_id)

        if (readError) throw readError
        result = { success: true }
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
