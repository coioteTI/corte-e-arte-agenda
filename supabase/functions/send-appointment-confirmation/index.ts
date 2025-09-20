import React from 'npm:react@18.3.1';
import { Resend } from 'npm:resend@4.0.0';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import { AppointmentConfirmationEmail } from './_templates/appointment-confirmation-email.tsx';

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string);

interface AppointmentData {
  clientName: string;
  clientEmail: string;
  companyName: string;
  serviceName: string;
  professionalName: string;
  appointmentDate: string;
  appointmentTime: string;
  totalPrice?: number;
  paymentMethod: string;
  companyPhone?: string;
  notes?: string;
}

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
    const appointmentData: AppointmentData = await req.json();
    
    console.log('Sending appointment confirmation email to:', appointmentData.clientEmail);
    console.log('Appointment details:', {
      company: appointmentData.companyName,
      service: appointmentData.serviceName,
      date: appointmentData.appointmentDate,
      time: appointmentData.appointmentTime,
    });

    // Validate required fields
    if (!appointmentData.clientEmail || !appointmentData.clientName) {
      return new Response(
        JSON.stringify({ error: 'Email e nome do cliente são obrigatórios' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Render email template
    const emailHtml = await renderAsync(
      React.createElement(AppointmentConfirmationEmail, {
        clientName: appointmentData.clientName,
        companyName: appointmentData.companyName,
        serviceName: appointmentData.serviceName,
        professionalName: appointmentData.professionalName,
        appointmentDate: appointmentData.appointmentDate,
        appointmentTime: appointmentData.appointmentTime,
        totalPrice: appointmentData.totalPrice,
        paymentMethod: appointmentData.paymentMethod,
        companyPhone: appointmentData.companyPhone,
        notes: appointmentData.notes,
      })
    );

    // Send email using Resend
    const { error: emailError } = await resend.emails.send({
      from: 'Corte & Arte <onboarding@resend.dev>',
      to: [appointmentData.clientEmail],
      subject: `Agendamento Confirmado - ${appointmentData.companyName}`,
      html: emailHtml,
    });

    if (emailError) {
      console.error('Failed to send appointment confirmation email:', emailError);
      throw emailError;
    }

    console.log('Appointment confirmation email sent successfully to:', appointmentData.clientEmail);

    return new Response(
      JSON.stringify({ success: true, message: 'Email de confirmação enviado com sucesso' }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error('Error in send-appointment-confirmation function:', error);
    
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