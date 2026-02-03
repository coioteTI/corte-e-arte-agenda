import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'npm:resend@4.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Generate a secure random password
function generateSecurePassword(length: number = 16): string {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*'
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => charset[byte % charset.length]).join('')
}

// Generate SHA-256 hash
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const resendApiKey = Deno.env.get('REENVIAR_CHAVE_API')

    if (!resendApiKey) {
      console.error('REENVIAR_CHAVE_API not configured')
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const resend = new Resend(resendApiKey)

    // Generate new password
    const plainPassword = generateSecurePassword(16)
    const hashedPassword = await hashPassword(plainPassword)

    // Set validity period (24 hours from now, starting at midnight BRT)
    const now = new Date()
    const validFrom = new Date(now)
    validFrom.setHours(0, 0, 0, 0) // Midnight today
    
    const validUntil = new Date(validFrom)
    validUntil.setDate(validUntil.getDate() + 1) // Midnight tomorrow

    // Delete passwords older than 2 days for security and storage optimization
    const twoDaysAgo = new Date()
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
    
    const { error: deleteError } = await supabase
      .from('super_admin_passwords')
      .delete()
      .lt('valid_until', twoDaysAgo.toISOString())
    
    if (deleteError) {
      console.log('Warning: Could not delete old passwords:', deleteError.message)
    } else {
      console.log('Old passwords (2+ days) cleaned up successfully')
    }

    // Insert new password
    const { error: insertError } = await supabase
      .from('super_admin_passwords')
      .insert({
        password_hash: hashedPassword,
        valid_from: validFrom.toISOString(),
        valid_until: validUntil.toISOString(),
      })

    if (insertError) {
      console.error('Error inserting password:', insertError)
      throw insertError
    }

    // Format date for email
    const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'full',
      timeZone: 'America/Sao_Paulo'
    })
    const formattedDate = dateFormatter.format(now)

    // Send email with the password
    // Using Resend's default domain for testing - replace with verified domain in production
    const { error: emailError } = await resend.emails.send({
      from: 'Corte & Arte <onboarding@resend.dev>',
      to: ['corteearte.suporte@gmail.com'],
      subject: `🔐 Senha de Acesso Super Admin - ${formattedDate}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #8B5CF6, #7C3AED); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🔐 Acesso Super Admin</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Corte & Arte - Plataforma</p>
            </div>
            
            <div style="padding: 40px 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Olá, Administrador!
              </p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Sua senha de acesso ao painel Super Admin para hoje foi gerada automaticamente:
              </p>
              
              <div style="background: #f3f4f6; border: 2px dashed #8B5CF6; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
                <p style="color: #6b7280; font-size: 12px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">Sua Senha do Dia</p>
                <code style="font-size: 24px; font-weight: bold; color: #1f2937; letter-spacing: 2px; font-family: 'Courier New', monospace;">${plainPassword}</code>
              </div>
              
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px; margin: 20px 0;">
                <p style="color: #92400e; font-size: 14px; margin: 0; font-weight: 500;">
                  ⚠️ Esta senha é válida apenas por 24 horas e será substituída automaticamente à meia-noite.
                </p>
              </div>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 14px; margin: 0;">
                  <strong>Data:</strong> ${formattedDate}<br>
                  <strong>Válida até:</strong> ${dateFormatter.format(validUntil)}
                </p>
              </div>
            </div>
            
            <div style="background: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                Este é um e-mail automático do sistema Corte & Arte.<br>
                Não responda a este e-mail.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    })

    if (emailError) {
      console.error('Error sending email:', emailError)
      // Don't throw - password was created, just email failed
    }

    // Log the action
    await supabase
      .from('super_admin_audit_log')
      .insert({
        action: 'password_generated',
        details: {
          valid_from: validFrom.toISOString(),
          valid_until: validUntil.toISOString(),
          email_sent: !emailError
        }
      })

    console.log('Super admin password generated and sent successfully')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Password generated and sent',
        email_sent: !emailError
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error generating super admin password:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to generate password' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
