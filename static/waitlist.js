'use strict';
(() => {
 const form=document.getElementById('waitlist-form');
 if(!form)return;
 let challenge, submitted=false;
 const status=document.getElementById('waitlist-status');
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(submitted||!form.reportValidity())return;
  const button=form.querySelector('button[type="submit"]');button.disabled=true;status.textContent='Sto salvando la tua richiesta…';
  try{
   if(!challenge){const response=await fetch('/azienda/lista-attesa/token',{credentials:'omit',cache:'no-store'});if(!response.ok)throw Error('Modulo temporaneamente non disponibile. Riprova più tardi.');challenge=await response.json();}
   const fields=form.elements;
   const payload={email:fields.email.value,phone:fields.phone.value,privacy_ack:fields.privacy_ack.checked,event_contact:fields.event_contact.checked,marketing_email:fields.marketing_email.checked,marketing_phone:fields.marketing_phone.checked,website:fields.website.value,token:challenge.token,consent_version:form.dataset.consentVersion};
   const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),15000);
   let response;try{response=await fetch('/azienda/lista-attesa',{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:controller.signal});}finally{clearTimeout(timeout);}
   const result=await response.json();
   if(!response.ok){if(response.status===422)challenge=null;throw Error(typeof result.detail==='string'?result.detail:(result.error||'Controlla email, telefono e consensi. I dati restano nel modulo.'));}
   submitted=true;status.textContent=result.message;button.textContent='Richiesta ricevuta';
   const preferences=document.getElementById('waitlist-preferences');preferences.href=result.preference_url;preferences.hidden=false;
  }catch(error){status.textContent=error.name==='AbortError'?'Risposta non confermata. Premi di nuovo: la richiesta non verrà duplicata.':error.message;button.disabled=false;}
 });
})();
