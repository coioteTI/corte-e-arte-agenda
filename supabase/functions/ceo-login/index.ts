import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CeoLoginRequest {
  email: string;
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

    const { email }: CeoLoginRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email é obrigatório', isCeo: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Find user by email in auth.users
    const { data: users, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (userError) {
      console.error('Error listing users:', userError);
      return new Response(
        JSON.stringify({ error: 'Erro ao verificar usuário', isCeo: false }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const user = users.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      // User not found - don't reveal this for security
      return new Response(
        JSON.stringify({ isCeo: false, requiresPassword: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Check if user has CEO role
    const { data: roleData, error: roleError } = await supabaseAdmin
      .rpc('get_user_role', { _user_id: user.id });

    if (roleError) {
      console.error('Error getting role:', roleError);
      // If no role found, check if user owns a company (legacy CEO)
      const { data: company } = await supabaseAdmin
        .from('companies')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (company) {
        // User owns a company but has no role - they're a legacy CEO
        // Assign CEO role and allow passwordless login
        await supabaseAdmin
          .from('user_roles')
          .upsert({ user_id: user.id, role: 'ceo' }, { onConflict: 'user_id' });
        
        // Generate a session for this CEO
        const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: email,
          options: {
            redirectTo: `${req.headers.get('origin') || 'https://corteearte.lovable.app'}/selecionar-filial`
          }
        });

        if (sessionError) {
          console.error('Error generating session:', sessionError);
          return new Response(
            JSON.stringify({ error: 'Erro ao gerar sessão', isCeo: false }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ 
            isCeo: true, 
            requiresPassword: false,
            message: 'Bem-vindo, CEO. Acesso liberado.',
            magicLink: sessionData.properties?.action_link
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ isCeo: false, requiresPassword: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. If role is CEO, generate passwordless access
    if (roleData === 'ceo') {
      // Generate a magic link for CEO
      const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: email,
        options: {
          redirectTo: `${req.headers.get('origin') || 'https://corteearte.lovable.app'}/selecionar-filial`
        }
      });

      if (sessionError) {
        console.error('Error generating magic link:', sessionError);
        return new Response(
          JSON.stringify({ error: 'Erro ao gerar acesso', isCeo: false }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          isCeo: true, 
          requiresPassword: false,
          message: 'Bem-vindo, CEO. Acesso liberado.',
          magicLink: sessionData.properties?.action_link
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. For non-CEO users, check if they need to create password (first access)
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_first_access')
      .eq('user_id', user.id)
      .single();

    return new Response(
      JSON.stringify({ 
        isCeo: false, 
        requiresPassword: true,
        isFirstAccess: profile?.is_first_access ?? true,
        message: profile?.is_first_access 
          ? 'Crie sua senha para continuar.' 
          : 'Informe sua senha para acessar o sistema.'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('CEO Login error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor', isCeo: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
