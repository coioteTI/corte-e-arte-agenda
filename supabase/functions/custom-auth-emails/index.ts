import React from 'npm:react@18.3.1';
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0';
import { Resend } from 'npm:resend@4.0.0';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import { ConfirmationEmail } from './_templates/confirmation-email.tsx';
import { RecoveryEmail } from './_templates/recovery-email.tsx';

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string);
const hookSecret = Deno.env.get('SUPABASE_AUTH_WEBHOOK_SECRET') as string;

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
    const payload = await req.text();
    const headers = Object.fromEntries(req.headers);
    
    // Verify webhook signature if secret is provided
    if (hookSecret) {
      const wh = new Webhook(hookSecret);
      try {
        wh.verify(payload, headers);
      } catch (error) {
        console.error('Webhook verification failed:', error);
        return new Response('Unauthorized', { 
          status: 401,
          headers: corsHeaders 
        });
      }
    }

    const {
      user,
      email_data: { 
        token, 
        token_hash, 
        redirect_to, 
        email_action_type,
        site_url 
      },
    } = JSON.parse(payload);

    console.log('Processing auth email:', {
      email: user.email,
      action_type: email_action_type,
      redirect_to: redirect_to,
      site_url: site_url,
    });

    let emailHtml: string;
    let subject: string;

    // Determine email type and render appropriate template
    switch (email_action_type) {
      case 'signup':
      case 'email_change':
        emailHtml = await renderAsync(
          React.createElement(ConfirmationEmail, {
            supabase_url: Deno.env.get('SUPABASE_URL') ?? site_url,
            token_hash,
            email_action_type,
            redirect_to: redirect_to || `${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'sandbox.lovable.dev')}/email-confirmado`,
            email: user.email,
          })
        );
        subject = 'Confirme seu e-mail - Corte & Arte';
        break;

      case 'recovery':
        emailHtml = await renderAsync(
          React.createElement(RecoveryEmail, {
            supabase_url: Deno.env.get('SUPABASE_URL') ?? site_url,
            token_hash,
            email_action_type,
            redirect_to: redirect_to || site_url,
            email: user.email,
          })
        );
        subject = 'Redefinir senha - Corte & Arte';
        break;

      case 'invite':
        // For now, use confirmation template for invites
        emailHtml = await renderAsync(
          React.createElement(ConfirmationEmail, {
            supabase_url: Deno.env.get('SUPABASE_URL') ?? site_url,
            token_hash,
            email_action_type,
            redirect_to: redirect_to || site_url,
            email: user.email,
          })
        );
        subject = 'Convite para Corte & Arte';
        break;

      default:
        console.log('Unknown email action type:', email_action_type);
        return new Response('Unknown email type', { 
          status: 400,
          headers: corsHeaders 
        });
    }

    // Send email using Resend
    const { error: emailError } = await resend.emails.send({
      from: 'Corte & Arte <onboarding@resend.dev>',
      to: [user.email],
      subject,
      html: emailHtml,
    });

    if (emailError) {
      console.error('Failed to send email:', emailError);
      throw emailError;
    }

    console.log('Email sent successfully to:', user.email);

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error('Error in custom-auth-emails function:', error);
    
    return new Response(
      JSON.stringify({
        error: {
          message: error.message,
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