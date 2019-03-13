function mailform() {
  document.getElementById("nojs-form").style.display = "none";

  // url for GoogleScripts web app
  const url = "https://script.google.com/macros/s/AKfycbwPzBIvTImGjbWUeZrlYMcuaR4IQFwkwhlvEIJIGZ8EvK14ur80/exec";
  const form = document.forms['email-form'];

  form.addEventListener('submit', e => {
    e.preventDefault();
    fetch(url, { method: 'POST', body: new FormData(form)})
      .then(response => console.log('Success', response), document.getElementById("thanks").style.display = '')
      .catch(error => console.error('Error!', error.message))
  })
}
