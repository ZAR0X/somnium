// ---------------------------- //
// - github.com/ZAR0X/Somnium - //
// ---------------------------- //


const ERROR_404 = { 'action':'error', 'status': 404, 'text': 'GET /generate/?prompt=<text>&style=<style>'};
const ERROR_403 = { 'action':'error', 'status': 403, 'text': 'Process failed or contains NSFW.'}
const ERROR_402 = { 'action':'error', 'status': 402, 'text': 'Current style id does not exist.'};

const HEAD_JSON = { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*'};
const HEAD_HTML = { 'content-type': 'text/html', 'Access-Control-Allow-Origin': '*'};
const HEAD_IMAG = {'Content-Type': 'image/png','Cache-Control': 'max-age=3600'};


// ---------- Event Listener ---------- //

addEventListener('fetch', event => { 
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  let url = new URL(request.url);
  let prompt = url.searchParams.get('prompt');
  let style = url.searchParams.get('style');

  if (url.pathname == "/") {
    let response = "<div>Coming soon...</div>";
    return new Response(response, {headers: HEAD_HTML});
  }

  if (prompt && style && url.pathname == "/generate/") {
    let response = await generate(prompt, style);
    return new Response(JSON.stringify(response), {headers: HEAD_JSON});
  } 
  else if (url.pathname == "/styles/") {
    let response = await Styles();
    return new Response(JSON.stringify(response), {headers: HEAD_JSON});
  } else {
    let response = ERROR_404;
    return new Response(JSON.stringify(response), {headers: HEAD_JSON});
  }
}


// ---------- Get Somnium Header ---------- //

async function GetHeader() {
  let r1 = await fetch('https://dream.ai/create');
  let r1Data = await r1.text();
  const jsfile = (r1Data.match(/_app-(\w+)/) || [])[1];
  let r2 = await fetch(`https://dream.ai/_next/static/chunks/pages/_app-${jsfile}.js`);
  let r2Data = await r2.text();
  let googlekey = (r2Data.match(/"(AI\w+)"/) || [])[1];
  
  let headers = {
    "authority": "identitytoolkit.googleapis.com",
    "accept": "*/*",
    "accept-language": "ru,en;q=0.9",
    "content-type": "application/json",
    "origin": "https://dream.ai",
    "sec-ch-ua": '"Chromium";v="110", "Not A(Brand";v="24", "YaBrowser";v="23"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "cross-site",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
    "x-client-version": "Chrome/JsCore/9.1.2/FirebaseCore-web",
  };
  
  let params = { key: googlekey };
  let data = { returnSecureToken: true };
  
  let url = new URL("https://identitytoolkit.googleapis.com/v1/accounts:signUp");
  url.search = new URLSearchParams(params).toString();

  let response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(data),
  });
  let responseData = await response.json();
  let TOKEN = responseData.idToken
  
  return {
      "authority": "paint.api.wombo.ai",
      "accept": "*/*",
      "accept-language": "ru,en;q=0.9",
      "authorization": `bearer ${TOKEN}`,
      "content-type": "text/plain;charset=UTF-8",
      "origin": "https://dream.ai",
      "referer": "https://dream.ai/",
      "sec-ch-ua": '"Chromium";v="110", "Not A(Brand";v="24", "YaBrowser";v="23"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 YaBrowser/23.3.1.895 Yowser/2.5 Safari/537.36",
      "x-app-version": "WEB-2.0.0",
  }
}


// ---------- Generate  ---------- //

async function generate(prompt, style) {
  if (!(await Styles()).styles.hasOwnProperty(style)) {return ERROR_402}

  let headers = await GetHeader();
  let styles = await CustomStyles();

  let CustomIds = Object.fromEntries(Object.entries(styles).map(([key, value]) => [parseInt(value['id']), key]));

  let textQ;
  let styleQ;

  if (Object.keys(CustomIds).includes(style.toString())) {
      textQ = styles[CustomIds[style]]['prompt'].replace('{PROMPT}', prompt);
      styleQ = parseInt(styles[CustomIds[style]]['style']);
  }
  else {
      textQ = prompt;
      styleQ = style;
  }
  
  let data = {
      "is_premium": false,
      "input_spec": {
          "prompt": textQ,
          "style": styleQ,
          "display_freq": 10
      }
  }
  
  let genResponse = await fetch('https://paint.api.wombo.ai/api/v2/tasks', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(data),
  });

  genResponse = await genResponse.json()
  try {
      let image_id = genResponse['id']
      for (let i = 0; i<10; i++) {
          let response = await fetch(`https://paint.api.wombo.ai/api/v2/tasks/${image_id}`, {
              method: 'GET',
              headers: headers,
          });
          response = await response.json()
          if (response['state'] == 'failed') {return ERROR_403};
          await new Promise(r => setTimeout(r, 3000));
          try {
              let img = await response['result']
              if (img != null) {
                  return {"action":"success", "status": 200, "image": img['final']}
              }
              else {
                continue
              }
          }
          catch {
              continue
          }
      }
  }
  catch (error){
      return error
  }
}

// ---------- Custom Styles ---------- //

async function CustomStyles() {
  let styles = await fetch('https://raw.githubusercontent.com/Vauth/custom/main/styles.json')
  return await styles.json()

}

// ---------- Default Styles ---------- //

async function DefaultStyles() {
  let styles = await fetch("https://paint.api.wombo.ai/api/styles")
  return await styles.json()
}

// ---------- List Styles ---------- //

async function Styles() {
  let Dstyles = await DefaultStyles()
  let Cstyles = await CustomStyles()
  let alls = Object.fromEntries(Object.entries(Cstyles).map(([key, value]) => [value['id'], {"name": key, "image": value['image']}]))
  Dstyles.forEach((style) => {if (!style.is_premium) {alls[style.id] = {"name": style['name'], "image": style['photo_url']}}})
  return {"action":"success", "status": 200, "styles": alls}
}
