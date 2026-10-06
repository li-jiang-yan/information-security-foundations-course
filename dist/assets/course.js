'use strict';
const $ = id => document.getElementById(id);
const show = (id, message) => { $(id).textContent = message; return message; };
const encode = value => new TextEncoder().encode(value);
const base64 = buffer => btoa(String.fromCharCode(...new Uint8Array(buffer)));
const hasCrypto = () => Boolean(globalThis.crypto?.subtle && globalThis.isSecureContext);
const unavailable = 'Web Crypto unavailable. Use a current browser on HTTPS or localhost.';
function analyseIncident(goal) {
  if (!['Confidentiality', 'Integrity', 'Availability'].includes(goal)) return show('incident-result', 'Choose a security goal first.');
  return show('incident-result', goal === 'Confidentiality'
    ? 'Correct. An unauthorised export exposes information. The admin grant also raises integrity concerns. The log suggests an incident but does not prove the attacker’s identity or motive.'
    : 'Try again. Focus on someone obtaining a copy of private records. Other goals may also be at risk, but the export primarily affects confidentiality.');
}
function requestRecord(record, policy) {
  if (!['101','102'].includes(record) || !['login','owner'].includes(policy)) throw new Error('Invalid record or permission rule.');
  $('record').value = record; $('policy').value = policy;
  if (policy === 'owner' && record !== '101') return show('access-result', 'ACCESS DENIED\nAlex is authenticated but does not own record 102.');
  return show('access-result', record === '101'
    ? 'ACCESS ALLOWED\nAlex · Record 101 · Fictional class: Introduction to Painting'
    : 'ACCESS ALLOWED — SECURITY FLAW\nSam · Record 102 · Fictional class: Beginner Guitar\nA login-only rule exposes another learner’s record.');
}
let cipherKey, nonce, ciphertext, signingKeys, signature;
async function encryptMessage() {
  if (!hasCrypto()) return show('crypto-result', unavailable);
  if (!cipherKey) cipherKey = await crypto.subtle.generateKey({name:'AES-GCM',length:256}, false, ['encrypt','decrypt']);
  nonce = crypto.getRandomValues(new Uint8Array(12));
  ciphertext = new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:nonce,tagLength:128},cipherKey,encode($('plaintext').value)));
  return show('crypto-result', `Encrypted with AES-256-GCM\nNonce (Base64): ${base64(nonce)}\nCiphertext + tag (Base64): ${base64(ciphertext)}\nNext: Decrypt, then Tamper and Decrypt again.`);
}
async function decryptMessage() {
  if (!ciphertext) return show('crypto-result','Encrypt a message first.');
  try {
    const result = await crypto.subtle.decrypt({name:'AES-GCM',iv:nonce,tagLength:128},cipherKey,ciphertext);
    return show('crypto-result', `Authentication passed. Recovered message:\n${new TextDecoder().decode(result)}`);
  } catch { return show('crypto-result','Authentication failed. The altered message was rejected.\nClick Encrypt to create a new valid message.'); }
}
function tamperMessage() {
  if (!ciphertext) return show('crypto-result','Encrypt a message first.');
  ciphertext[0] ^= 1;
  return show('crypto-result',`One byte was changed. Click Decrypt to test authentication.\nAltered ciphertext + tag (Base64): ${base64(ciphertext)}`);
}
async function signMessage() {
  if (!hasCrypto()) return show('signature-result',unavailable);
  if (!signingKeys) signingKeys = await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},false,['sign','verify']);
  signature = await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},signingKeys.privateKey,encode($('announcement').value));
  return show('signature-result',`Announcement signed with a temporary ECDSA P-256 key.\nSignature (Base64): ${base64(signature)}\nClick Verify, edit the announcement, and Verify again.`);
}
async function verifyMessage() {
  if (!signature) return show('signature-result','Sign an announcement first.');
  const valid = await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},signingKeys.publicKey,signature,encode($('announcement').value));
  return show('signature-result',valid ? 'VALID SIGNATURE\nThe message matches the signature under this public key. This does not prove its factual accuracy or a real person’s identity.' : 'INVALID SIGNATURE\nThe edited message does not match. Restore the original text to test again.');
}
function reviewPlan() {
  const treatment=$('treatment').value.trim(), owner=$('owner').value.trim(), evidence=$('evidence').value.trim();
  const deadline=Number($('deadline').value);
  if (!treatment || !owner || !evidence || !Number.isInteger(deadline) || deadline<1 || deadline>90) return show('plan-result','Complete the treatment, owner, and evidence. Set a whole-number deadline from 1 to 90 days.');
  const score=Number($('likelihood').value)*Number($('impact').value);
  return show('plan-result',`Plan entry complete — ready for human review.\nRisk: ${$('risk').selectedOptions[0].textContent}\nTeaching risk score: ${score}/9 (not a measured probability)\nTreatment: ${treatment}\nOwner: ${owner}\nDeadline: day ${deadline}\nEvidence: ${evidence}\nNext: assess feasibility, residual risk, and review timing. Copy this entry to your notes; it is not saved.`);
}
// Serialize each lab's asynchronous actions so that keys and messages stay consistent.
function bind(id, output, action) {
  const button=$(id); if (!button) return;
  button.addEventListener('click',async()=>{
    const buttons=[...button.closest('.workspace').querySelectorAll('button')];
    buttons.forEach(b=>{b.disabled=true;});
    try { await action(); } catch { show(output,'The operation could not complete. Refresh and try again in a current browser on HTTPS or localhost.'); }
    finally { buttons.forEach(b=>{b.disabled=false;}); }
  });
}
bind('incident-check','incident-result',()=>analyseIncident($('goal').value));
bind('request-record','access-result',()=>requestRecord($('record').value,$('policy').value));
bind('encrypt','crypto-result',encryptMessage); bind('decrypt','crypto-result',decryptMessage); bind('tamper','crypto-result',tamperMessage);
bind('sign','signature-result',signMessage); bind('verify','signature-result',verifyMessage); bind('review-plan','plan-result',reviewPlan);
// Optional browser agent interface reuses the visible, fictional access simulator.
if (document.modelContext?.registerTool && $('request-record')) {
  const lifecycle=new AbortController();
  const tool={name:'test_simulated_record_access',title:'Test simulated record access',description:'Request fictional learner record 101 or 102 under the selected simulated permission rule; updates the visible lab menus and result. This does not access a real system.',inputSchema:{type:'object',properties:{record:{type:'string',enum:['101','102']},policy:{type:'string',enum:['login','owner']}},required:['record','policy'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){
    if (!input || typeof input!=='object' || Object.keys(input).some(k=>!['record','policy'].includes(k)) || !['101','102'].includes(input.record) || !['login','owner'].includes(input.policy)) throw new Error('Use record 101 or 102 and policy login or owner.');
    return {result:requestRecord(input.record,input.policy)};
  }};
  try { Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{}); } catch { /* Visible lab remains available. */ }
  window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}
