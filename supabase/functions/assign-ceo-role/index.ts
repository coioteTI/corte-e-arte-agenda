import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user from the JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user owns a company (must be a CEO)
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('id, name, address, city, state, zip_code, phone, email, can_create_branches, branch_limit')
      .eq('user_id', user.id)
      .single();

    if (companyError || !company) {
      return new Response(
        JSON.stringify({ error: 'Empresa não encontrada. Apenas donos de empresa podem usar esta função.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if CEO role already exists
    const { data: existingRole } = await supabaseAdmin
      .from('user_roles')
      .select('id')
      .eq('user_id', user.id)
      .eq('role', 'ceo')
      .single();

    if (!existingRole) {
      // Assign CEO role using service role (bypasses RLS)
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({ user_id: user.id, role: 'ceo' });

      if (roleError) {
        console.error('Error assigning CEO role:', roleError);
        return new Response(
          JSON.stringify({ error: 'Erro ao atribuir role CEO' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check if branch already exists for this company
    const { data: existingBranches } = await supabaseAdmin
      .from('branches')
      .select('id')
      .limit(1);

    // Check if user already has a branch assigned
    const { data: userBranches } = await supabaseAdmin
      .from('user_branches')
      .select('id, branch_id')
      .eq('user_id', user.id);

    if (userBranches && userBranches.length > 0) {
      // User already has branches, return success
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'CEO role atribuída e filial já existe',
          branchId: userBranches[0].branch_id,
          hasMultipleBranches: userBranches.length > 1
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already has a branch assigned (existing branch scenario)
    const { data: existingUserBranchesCount } = await supabaseAdmin
      .from('branches')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', company.id);

    const currentBranchCount = existingUserBranchesCount || 0;

    // If this is NOT the first branch (Matriz), check permissions
    if (currentBranchCount > 0) {
      // Check if company is allowed to create more branches
      if (!company.can_create_branches) {
        return new Response(
          JSON.stringify({ 
            error: 'Sua empresa não tem permissão para criar novas filiais. Entre em contato com o suporte para liberar essa funcionalidade.',
            requiresApproval: true 
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check branch limit
      const branchLimit = company.branch_limit || 5;
      if (currentBranchCount >= branchLimit) {
        return new Response(
          JSON.stringify({ 
            error: `Limite de filiais atingido (${currentBranchCount}/${branchLimit}). Solicite aumento de limite ao suporte.`,
            limitReached: true 
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Create first branch from company data
    const { data: newBranch, error: branchError } = await supabaseAdmin
      .from('branches')
      .insert({
        name: currentBranchCount === 0 ? company.name + " - Matriz" : company.name + " - Filial " + (currentBranchCount + 1),
        address: company.address,
        city: company.city,
        state: company.state,
        zip_code: company.zip_code,
        phone: company.phone,
        email: company.email,
        company_id: company.id,
      })
      .select()
      .single();

    if (branchError) {
      console.error('Error creating branch:', branchError);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar filial: ' + branchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Assign user to this branch
    await supabaseAdmin
      .from('user_branches')
      .insert({
        user_id: user.id,
        branch_id: newBranch.id,
        is_primary: true,
      });

    // Update existing data with branch_id
    await Promise.all([
      supabaseAdmin.from('professionals').update({ branch_id: newBranch.id }).eq('company_id', company.id),
      supabaseAdmin.from('services').update({ branch_id: newBranch.id }).eq('company_id', company.id),
      supabaseAdmin.from('appointments').update({ branch_id: newBranch.id }).eq('company_id', company.id),
    ]);

    // Set current branch in user session
    await supabaseAdmin
      .from('user_sessions')
      .upsert({
        user_id: user.id,
        current_branch_id: newBranch.id,
        session_started_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Filial criada com sucesso',
        branchId: newBranch.id,
        hasMultipleBranches: false
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Assign CEO Role error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
