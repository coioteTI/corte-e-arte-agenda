import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting auto-complete appointments check...')

    // Get all confirmed appointments for today
    const today = new Date().toISOString().split('T')[0]
    
    const { data: appointments, error: fetchError } = await supabaseClient
      .from('appointments')
      .select(`
        *,
        services(duration)
      `)
      .eq('status', 'confirmed')
      .eq('appointment_date', today)

    if (fetchError) {
      throw fetchError
    }

    console.log(`Found ${appointments?.length || 0} confirmed appointments for today`)

    const now = new Date()
    const currentTime = now.toTimeString().slice(0, 8) // HH:MM:SS format
    
    const appointmentsToComplete = []

    for (const appointment of appointments || []) {
      // Parse appointment time and add service duration
      const [hours, minutes] = appointment.appointment_time.split(':').map(Number)
      const appointmentStart = new Date()
      appointmentStart.setHours(hours, minutes, 0, 0)
      
      // Add service duration (default 30 minutes if not specified)
      const serviceDuration = appointment.services?.duration || 30
      const appointmentEnd = new Date(appointmentStart.getTime() + (serviceDuration * 60 * 1000))
      
      // Check if current time is past the appointment end time
      if (now >= appointmentEnd) {
        appointmentsToComplete.push(appointment.id)
        console.log(`Appointment ${appointment.id} should be completed - started at ${appointment.appointment_time}, duration ${serviceDuration}min`)
      }
    }

    // Update appointments to completed status
    if (appointmentsToComplete.length > 0) {
      const { error: updateError } = await supabaseClient
        .from('appointments')
        .update({ status: 'completed' })
        .in('id', appointmentsToComplete)

      if (updateError) {
        throw updateError
      }

      console.log(`Successfully completed ${appointmentsToComplete.length} appointments`)
    } else {
      console.log('No appointments need to be completed at this time')
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${appointments?.length || 0} appointments, completed ${appointmentsToComplete.length}`,
        completedAppointments: appointmentsToComplete.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error in auto-complete-appointments:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})