 import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
 import { Resend } from 'npm:resend@4.0.0'
 
 const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
 }
 
 interface ContactRequest {
   name: string;
   email: string;
   phone?: string;
   message: string;
   source?: string;
 }
 
 Deno.serve(async (req) => {
   if (req.method === 'OPTIONS') {
     return new Response(null, { headers: corsHeaders })
   }
 
   try {
     const supabaseUrl = Deno.env.get('SUPABASE_URL')!
     const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
     const resendApiKey = Deno.env.get('REENVIAR_CHAVE_API')
 
     const supabase = createClient(supabaseUrl, supabaseServiceKey, {
       auth: { autoRefreshToken: false, persistSession: false }
     })
 
     const { name, email, phone, message, source }: ContactRequest = await req.json()
 
     if (!name || !email || !message) {
       return new Response(
         JSON.stringify({ error: 'Nome, email e mensagem são obrigatórios' }),
         { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       )
     }
 
     // Log the contact message
     const { error: logError } = await supabase
       .from('contact_messages')
       .insert({
         name,
         email,
         phone: phone || null,
         message,
         source: source || 'chat_widget'
       })
 
     if (logError) {
       console.error('Error logging contact message:', logError)
       // Continue even if logging fails
     }
 
     // Try to send email notification to admin
     if (resendApiKey) {
       try {
         const resend = new Resend(resendApiKey)
         
         const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
           dateStyle: 'full',
           timeStyle: 'short',
           timeZone: 'America/Sao_Paulo'
         })
 
         await resend.emails.send({
           from: 'Corte & Arte <onboarding@resend.dev>',
           to: ['corteearte.suporte@gmail.com'],
           subject: `📬 Nova mensagem de contato - ${name}`,
           html: `
             <!DOCTYPE html>
             <html>
             <head>
               <meta charset="utf-8">
               <meta name="viewport" content="width=device-width, initial-scale=1.0">
             </head>
             <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
               <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                 <div style="background: linear-gradient(135deg, #8B5CF6, #7C3AED); padding: 30px; text-align: center;">
                   <h1 style="color: #ffffff; margin: 0; font-size: 24px;">📬 Nova Mensagem de Contato</h1>
                 </div>
                 
                 <div style="padding: 30px;">
                   <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                     <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Informações do Contato</p>
                     <p style="margin: 5px 0; color: #374151;"><strong>Nome:</strong> ${name}</p>
                     <p style="margin: 5px 0; color: #374151;"><strong>E-mail:</strong> ${email}</p>
                     ${phone ? `<p style="margin: 5px 0; color: #374151;"><strong>Telefone:</strong> ${phone}</p>` : ''}
                     <p style="margin: 5px 0; color: #374151;"><strong>Origem:</strong> ${source || 'Chat Widget'}</p>
                     <p style="margin: 5px 0; color: #374151;"><strong>Data:</strong> ${dateFormatter.format(new Date())}</p>
                   </div>
                   
                   <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px;">
                     <p style="margin: 0 0 10px 0; color: #92400e; font-size: 12px; text-transform: uppercase; font-weight: 600;">Mensagem</p>
                     <p style="margin: 0; color: #374151; white-space: pre-wrap;">${message}</p>
                   </div>
                   
                   <div style="margin-top: 20px; text-align: center;">
                     <a href="mailto:${email}" style="display: inline-block; background: #8B5CF6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
                       Responder por E-mail
                     </a>
                   </div>
                 </div>
                 
                 <div style="background: #f9fafb; padding: 15px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                   <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                     Corte & Arte - Plataforma de Agendamentos
                   </p>
                 </div>
               </div>
             </body>
             </html>
           `,
         })
 
         console.log('Contact notification email sent successfully')
       } catch (emailError) {
         console.error('Error sending contact email:', emailError)
         // Continue - email is not critical
       }
     }
 
     // Log in audit
     await supabase
       .from('super_admin_audit_log')
       .insert({
         action: 'contact_message_received',
         details: {
           name,
           email,
           phone: phone || null,
           source: source || 'chat_widget',
           message_preview: message.substring(0, 100)
         }
       })
 
     console.log('Contact message received:', { name, email, source })
 
     return new Response(
       JSON.stringify({ 
         success: true, 
         message: 'Mensagem recebida com sucesso!' 
       }),
       { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     )
 
   } catch (error) {
     console.error('Error processing contact message:', error)
     return new Response(
       JSON.stringify({ error: 'Erro ao processar mensagem' }),
       { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     )
   }
 })