import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AppointmentRequest {
  clientName: string;
  clientEmail: string;
  appointmentDate: string;
  appointmentTime: string;
  endTime?: string;
  notes?: string;
  serviceName?: string;
  companyName?: string;
  companyAddress?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const appointmentData: AppointmentRequest = await req.json();
    
    console.log("Received appointment data:", appointmentData);

    // Generate ICS content
    const startDateTime = new Date(`${appointmentData.appointmentDate}T${appointmentData.appointmentTime}`);
    const endDateTime = appointmentData.endTime 
      ? new Date(`${appointmentData.appointmentDate}T${appointmentData.endTime}`)
      : new Date(startDateTime.getTime() + 60 * 60 * 1000); // Default 1 hour

    const formatICSDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Corte & Arte//Agendamento//PT
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:${crypto.randomUUID()}@corteearte.site
DTSTART:${formatICSDate(startDateTime)}
DTEND:${formatICSDate(endDateTime)}
SUMMARY:Agendamento Confirmado
DESCRIPTION:Seu agendamento foi confirmado com sucesso.${appointmentData.notes ? `\\n\\nObservações: ${appointmentData.notes}` : ''}${appointmentData.serviceName ? `\\nServiço: ${appointmentData.serviceName}` : ''}
LOCATION:${appointmentData.companyAddress || 'Online'}
ORGANIZER:MAILTO:corteearte.suporte@gmail.com
ATTENDEE:MAILTO:${appointmentData.clientEmail}
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT
END:VCALENDAR`;

    // Format date and time for email
    const formattedDate = startDateTime.toLocaleDateString('pt-BR');
    const formattedTime = startDateTime.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    // Send email with ICS attachment
    const emailResponse = await resend.emails.send({
      from: "Corte & Arte <onboarding@resend.dev>",
      to: [appointmentData.clientEmail],
      subject: "Confirmação de Agendamento",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #8B5CF6;">Agendamento Confirmado!</h2>
          
          <p>Olá <strong>${appointmentData.clientName}</strong>,</p>
          
          <p>Seu agendamento foi confirmado com sucesso para:</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>📅 Data:</strong> ${formattedDate}</p>
            <p><strong>🕐 Horário:</strong> ${formattedTime}</p>
            ${appointmentData.serviceName ? `<p><strong>✨ Serviço:</strong> ${appointmentData.serviceName}</p>` : ''}
            ${appointmentData.companyAddress ? `<p><strong>📍 Local:</strong> ${appointmentData.companyAddress}</p>` : ''}
            ${appointmentData.notes ? `<p><strong>📝 Observações:</strong> ${appointmentData.notes}</p>` : ''}
          </div>
          
          <p>O convite de calendário está anexado a este e-mail. Clique em "Adicionar ao Calendário" para salvar em sua agenda.</p>
          
          <p>Qualquer dúvida, entre em contato conosco.</p>
          
          <p>Atenciosamente,<br>
          <strong>${appointmentData.companyName || 'Corte & Arte'}</strong></p>
        </div>
      `,
      attachments: [
        {
          filename: 'agendamento.ics',
          content: Buffer.from(icsContent).toString('base64'),
          contentType: 'text/calendar; method=REQUEST',
        },
      ],
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      emailId: emailResponse.data?.id 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-appointment-calendar function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);