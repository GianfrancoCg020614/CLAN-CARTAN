import fs from 'node:fs';
import assert from 'node:assert/strict';

// V163.1 · logo oficial sin modificar el comportamiento de autenticación ni finanzas.
const js=fs.readFileSync('scripts/v161-1-mi-alquiler.js','utf8');
const css=fs.readFileSync('styles/v161-1-mi-alquiler.css','utf8');
const svg=fs.readFileSync('assets/mi-alquiler-logo.svg','utf8');
const matches=js.match(/assets\/mi-alquiler-logo\.svg/g)||[];
assert.equal(matches.length,2,'La tarjeta y la cabecera deben usar el logo oficial.');
assert.ok(js.includes('id="ma1611card"') || js.includes("card.id = 'ma1611card'"),'La tarjeta debe permanecer.');
assert.ok(js.includes('session()?.jwt'),'La puerta por sesion de CLAN CARTAN debe continuar.');
assert.ok(js.includes("window.cc77Auth(false)"),'Debe mantener el login del portal.');
assert.ok(js.includes("third.insertAdjacentElement('afterend', card)"),'La cuarta tarjeta sigue despues de MI COCHERA.');
assert.ok(css.includes('.ma1611-card-icon img') && css.includes('.ma1611-brand-logo'),'El CSS debe adaptar el logo.');
const b64=svg.match(/data:image\/webp;base64,([A-Za-z0-9+/=]+)/)?.[1];
assert.ok(b64,'SVG debe contener el emblema rasterizado original como WebP.');
const raw=Buffer.from(b64,'base64');
assert.equal(raw.toString('ascii',0,4),'RIFF');
assert.equal(raw.toString('ascii',8,12),'WEBP');
assert.ok(raw.length>1000);
assert.ok(!/localStorage|sessionStorage|service_role|\bfetch\s*\(/.test(js),'Logo no debe introducir peticiones o secretos.');
console.log('PASS V163.1 MI ALQUILER: emblem on card/header, authorization intact, WebP valid.');
