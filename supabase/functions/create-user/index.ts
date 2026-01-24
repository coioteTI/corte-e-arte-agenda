import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUserRequest {
  email: string;
  password?: string; // Optional - if not provided, user will set on first access
  full_name: string;
  role: 'employee' | 'admin' | 'ceo';
  branch_ids: string[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client for user creation
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the requesting user's JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token to verify permissions
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: requestingUser }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !requestingUser) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get requesting user's role
    const { data: roleData, error: roleError } = await supabaseAdmin
      .rpc('get_user_role', { _user_id: requestingUser.id });

    if (roleError) {
      console.error('Role check error:', roleError);
      return new Response(
        JSON.stringify({ error: 'Could not verify permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestingUserRole = roleData as string;

    // Only CEO and Admin can create users
    if (!['ceo', 'admin'].includes(requestingUserRole)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: CreateUserRequest = await req.json();
    const { email, password, full_name, role, branch_ids } = body;

    console.log(`Creating user: ${email} with role: ${role}`);

    // Validation
    if (!email || !full_name || !role) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields (email, full_name, role)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate temporary password if not provided (for first access flow)
    const tempPassword = password || crypto.randomUUID();
    const isFirstAccess = !password;

    // Admins can only create employees
    if (requestingUserRole === 'admin' && role !== 'employee') {
      return new Response(
        JSON.stringify({ error: 'Admins can only create employees' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create the user with admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name,
      },
    });

    if (createError) {
      console.error('User creation error:', createError);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`User created: ${newUser.user.id}`);

    // Create profile with is_first_access flag
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        user_id: newUser.user.id,
        full_name,
        is_first_access: isFirstAccess, // If no password provided, user needs to set on first login
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
    }

    // Assign role
    const { error: roleInsertError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role,
      });

    if (roleInsertError) {
      console.error('Role assignment error:', roleInsertError);
    }

    // Assign branches
    if (branch_ids && branch_ids.length > 0) {
      const branchInserts = branch_ids.map((branchId, index) => ({
        user_id: newUser.user.id,
        branch_id: branchId,
        is_primary: index === 0,
      }));

      const { error: branchError } = await supabaseAdmin
        .from('user_branches')
        .insert(branchInserts);

      if (branchError) {
        console.error('Branch assignment error:', branchError);
      }
    }

    console.log(`User setup complete: ${email}`);

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
          full_name,
          role,
          branches: branch_ids,
          is_first_access: isFirstAccess,
          temp_password: isFirstAccess ? tempPassword : undefined, // Return temp password for admin to share
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
