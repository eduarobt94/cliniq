import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_EMAIL     = Deno.env.get('FROM_EMAIL') ?? 'invitaciones@cliniq.uy';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ROLE_LABEL: Record<string, string> = {
  staff:  'Staff',
  viewer: 'Observador',
  owner:  'Dueño',
};

function buildHtml(clinicName: string, role: string, inviteUrl: string): string {
  const roleLabel = ROLE_LABEL[role] ?? role;
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invitación al equipo — Cliniq</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

          <!-- Logo -->
          <tr>
            <td style="padding-bottom:32px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right:8px;vertical-align:middle;">
                    <div style="width:28px;height:28px;background-color:#16a34a;border-radius:6px;display:inline-block;"></div>
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="color:#09090b;font-size:18px;font-weight:600;letter-spacing:-0.02em;">Cliniq</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#ffffff;border:1px solid #e4e4e7;border-radius:16px;padding:40px 36px;">

              <!-- Tag -->
              <p style="margin:0 0 20px 0;font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#a1a1aa;">
                [ Invitación al equipo ]
              </p>

              <!-- Heading -->
              <h1 style="margin:0 0 12px 0;color:#09090b;font-size:26px;font-weight:600;letter-spacing:-0.02em;line-height:1.2;">
                Te invitaron a unirte
              </h1>

              <!-- Body -->
              <p style="margin:0 0 8px 0;color:#52525b;font-size:15px;line-height:1.6;">
                Te invitaron a unirte al equipo de <strong style="color:#09090b;">${clinicName}</strong> en Cliniq como <strong style="color:#09090b;">${roleLabel}</strong>.
              </p>
              <p style="margin:0 0 32px 0;color:#52525b;font-size:15px;line-height:1.6;">
                Hacé clic en el botón para crear tu cuenta y acceder al panel.
              </p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <a href="${inviteUrl}"
                       style="display:block;background-color:#16a34a;color:#ffffff;text-decoration:none;text-align:center;padding:14px 28px;border-radius:10px;font-size:15px;font-weight:600;letter-spacing:-0.01em;">
                      Aceptar invitación →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <hr style="border:none;border-top:1px solid #e4e4e7;margin:32px 0;" />

              <!-- Info -->
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px 16px;">
                    <p style="margin:0;color:#52525b;font-size:12px;line-height:1.5;">
                      Esta invitación es personal y solo válida para este correo. Si no esperabas este mensaje, podés ignorarlo.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Fallback -->
              <p style="margin:24px 0 8px 0;color:#a1a1aa;font-size:12px;">
                Si el botón no funciona, copiá este link en tu navegador:
              </p>
              <p style="margin:0;word-break:break-all;">
                <a href="${inviteUrl}" style="color:#16a34a;font-size:12px;text-decoration:none;">${inviteUrl}</a>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:28px;padding-bottom:8px;">
              <p style="margin:0;color:#a1a1aa;font-size:12px;line-height:1.5;text-align:center;">
                Cliniq · Montevideo, Uruguay
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    // Verificar que el llamador esté autenticado
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Sesión inválida' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const { email, clinicName, role, inviteUrl, clinicId } = await req.json();

    if (!email || !clinicName || !role || !inviteUrl || !clinicId) {
      return new Response(JSON.stringify({ error: 'Faltan parámetros requeridos' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // Verificar que el usuario es owner de la clínica
    const { data: membership } = await supabase
      .from('clinic_members')
      .select('role')
      .eq('clinic_id', clinicId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .in('role', ['owner'])
      .maybeSingle();

    if (!membership) {
      return new Response(JSON.stringify({ error: 'Solo los dueños pueden enviar invitaciones' }), {
        status: 403, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // Enviar email via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:    `Cliniq <${FROM_EMAIL}>`,
        to:      [email],
        subject: `Te invitaron a unirte a ${clinicName} en Cliniq`,
        html:    buildHtml(clinicName, role, inviteUrl),
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('Resend error:', resendData);
      return new Response(JSON.stringify({ error: 'No se pudo enviar el correo', details: resendData }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, id: resendData.id }), {
      status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Edge function error:', err);
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
