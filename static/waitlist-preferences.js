'use strict';
(() => {
 const token=location.hash.slice(1);history.replaceState(null,'',location.pathname);
 const status=document.getElementById('preference-status');
 const buttons=[...document.querySelectorAll('[data-preference]')];
 if(token.length<32){buttons.forEach(button=>button.disabled=true);status.textContent='Apri il link personale ricevuto al momento dell’iscrizione, oppure contatta il titolare.';return;}
 buttons.forEach(button=>button.addEventListener('click',async()=>{
  buttons.forEach(item=>item.disabled=true);
  try{const response=await fetch('/azienda/preferenze',{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,action:button.dataset.preference})});const result=await response.json();if(!response.ok)throw Error(result.detail||result.error||'Riprova più tardi.');status.textContent=result.message;}
  catch(error){status.textContent=error.message;}
  finally{buttons.forEach(item=>item.disabled=false);}
 }));
})();
