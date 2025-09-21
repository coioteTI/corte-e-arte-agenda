import { Resend } from 'npm:resend@4.0.0';

const resendApiKey = Deno.env.get('REENVIAR_CHAVE_API') as string;
console.log('🔑 REENVIAR_CHAVE_API exists:', !!resendApiKey);
console.log('🔑 REENVIAR_CHAVE_API starts with re_:', resendApiKey?.startsWith('re_'));

const resend = new Resend(resendApiKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405,
      headers: corsHeaders 
    });
  }

  try {
    console.log('🧪 Test email function called');
    console.log('📧 REENVIAR_CHAVE_API configured:', !!Deno.env.get('REENVIAR_CHAVE_API'));

    const { email = 'test@example.com' } = await req.json();
    
    console.log('📧 Sending test email to:', email);
    console.log('📧 Using simple from address: onboarding@resend.dev');

    // Send simple test email using Resend
    const { data, error: emailError } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: [email],
      subject: 'Teste de Email - Corte & Arte',
      html: `
        <h1>🧪 Email de Teste</h1>
        <p>Este é um email de teste do sistema Corte & Arte.</p>
        <p>Se você recebeu este email, a configuração está funcionando corretamente!</p>
        <p>Timestamp: ${new Date().toISOString()}</p>
        <p>API Key válida: ${!!Deno.env.get('REENVIAR_CHAVE_API')}</p>
      `,
    });

    if (emailError) {
      console.error('❌ Failed to send test email:', emailError);
      throw emailError;
    }

    console.log('✅ Test email sent successfully:', data);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email de teste enviado com sucesso',
        data: data
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error('❌ Error in test-email function:', error);
    
    return new Response(
      JSON.stringify({
        error: {
          message: error.message || 'Erro interno do servidor',
          details: error.toString(),
        },
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});