import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Generate SHA-256 hash
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Generate secure session token
function generateSessionToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

interface LoginRequest {
  email: string;
  password: string;
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

    const { email, password }: LoginRequest = await req.json()

    // Validate email - ONLY corteearte.suporte@gmail.com can access
    const SUPER_ADMIN_EMAIL = 'corteearte.suporte@gmail.com'
    
    if (!email || email.toLowerCase() !== SUPER_ADMIN_EMAIL) {
      // Log failed attempt
      await supabase.from('super_admin_audit_log').insert({
        action: 'login_failed',
        details: { 
          reason: 'invalid_email',
          attempted_email: email || 'not_provided'
        },
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown'
      })

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'E-mail não autorizado para acesso administrativo.' 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!password) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Senha é obrigatória.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Hash the provided password
    const hashedPassword = await hashPassword(password)

    // Check if password is valid - look for any valid password (not expired)
    const now = new Date().toISOString()
    const { data: passwordData, error: passwordError } = await supabase
      .from('super_admin_passwords')
      .select('id, password_hash, valid_from, valid_until')
      .lte('valid_from', now)
      .gte('valid_until', now)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (passwordError || !passwordData) {
      // Log failed attempt
      await supabase.from('super_admin_audit_log').insert({
        action: 'login_failed',
        details: { reason: 'no_valid_password_found' },
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown'
      })

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Nenhuma senha válida encontrada. Aguarde a próxima geração à meia-noite.' 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate password
    if (passwordData.password_hash !== hashedPassword) {
      // Log failed attempt
      await supabase.from('super_admin_audit_log').insert({
        action: 'login_failed',
        details: { reason: 'invalid_password' },
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown'
      })

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Senha incorreta. Verifique o e-mail enviado hoje.' 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Mark password as used
    await supabase
      .from('super_admin_passwords')
      .update({ is_used: true, used_at: new Date().toISOString() })
      .eq('id', passwordData.id)

    // Generate session token
    const sessionToken = generateSessionToken()
    const sessionExpiry = new Date(passwordData.valid_until)

    // Log successful login
    await supabase.from('super_admin_audit_log').insert({
      action: 'login_success',
      details: { 
        session_expires: sessionExpiry.toISOString()
      },
      ip_address: req.headers.get('x-forwarded-for') || 'unknown',
      user_agent: req.headers.get('user-agent') || 'unknown'
    })

    console.log('Super admin login successful')

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Login realizado com sucesso!',
        session: {
          token: sessionToken,
          expires_at: sessionExpiry.toISOString(),
          email: SUPER_ADMIN_EMAIL
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Super admin login error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Erro interno do servidor.' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
