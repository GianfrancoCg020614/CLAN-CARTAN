import fs from 'node:fs';
import assert from 'node:assert/strict';
const html=fs.readFileSync('index.html','utf8');
for(const needed of [
"form.noValidate=true",
"if(registering){void register(event);return;}",
"Escribe tu correo y contraseña para ingresar.",
"void signIn(event);",
"Supabase no respondió en 20 segundos",
"window.CC_V53_SESSION={jwt:jwt",
"gate.style.display='none'",
"cc79AfterLogin()",
"form.addEventListener('submit'",
])assert.ok(html.includes(needed),needed);
assert.ok(html.includes("'/auth/v1/token?grant_type=password'"));
assert.ok(!/const (?:root|key)=['"]undefined/.test(html));
console.log('PASS V161 PARTE1: boton de ingreso, timeout y acceso unico con estado de error.');