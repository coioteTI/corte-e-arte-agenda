import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// This function is called by a database trigger when a new appointment is created
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { record, type } = await req.json();

    console.log('Trigger received:', { type, record });

    if (type !== 'INSERT' || !record) {
      return new Response(
        JSON.stringify({ message: 'Not a new appointment' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get appointment details with client, service, and professional info
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        *,
        clients(name),
        services(name),
        professionals(name)
      `)
      .eq('id', record.id)
      .single();

    if (appointmentError || !appointment) {
      console.error('Error fetching appointment:', appointmentError);
      return new Response(
        JSON.stringify({ error: 'Appointment not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const clientName = appointment.clients?.name || 'Cliente';
    const serviceName = appointment.services?.name || 'Serviço';
    const appointmentTime = appointment.appointment_time?.slice(0, 5) || '';
    const appointmentDate = appointment.appointment_date;

    // Format date in Portuguese
    const dateObj = new Date(appointmentDate + 'T00:00:00');
    const formattedDate = dateObj.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit'
    });

    // Build notification message
    const notificationTitle = '🔔 Novo Agendamento';
    const notificationBody = `${clientName} agendou ${serviceName} para ${formattedDate} às ${appointmentTime}`;

    // Call the send-push-notification function
    const pushResponse = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        companyId: appointment.company_id,
        branchId: appointment.branch_id,
        message: {
          title: notificationTitle,
          body: notificationBody,
          url: '/dashboard/agenda',
          tag: `appointment-${record.id}`,
          data: {
            appointmentId: record.id,
            clientName,
            serviceName,
            date: appointmentDate,
            time: appointmentTime,
          }
        }
      }),
    });

    const pushResult = await pushResponse.json();
    console.log('Push notification result:', pushResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Push notification triggered',
        pushResult 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Trigger function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
