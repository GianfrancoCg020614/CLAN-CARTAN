// V108: endpoint deshabilitado. La consulta de DNI está permitida solo en el módulo COBRA YA autenticado.
// La implementación anterior queda respaldada en resguardo/v107-antes-reversion-formulario-2026-10-18.
Deno.serve((_request: Request) => new Response(
 JSON.stringify({ status: "disabled", reason: "dni_only_in_cobra_ya" }),
 { status: 410, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "Access-Control-Allow-Origin": "https://www.clancartan.com", "Vary": "Origin" } }
));
