// Preserve initialization errors: getUser() alone can hide a failed URL exchange.
export async function completeEmailLogin(client, url = new URL(location.href)) {
 const hash = new URLSearchParams(url.hash.slice(1));
 const returnedError = url.searchParams.get('error_code') || hash.get('error_code') || url.searchParams.get('error') || hash.get('error');
 const code = url.searchParams.get('code');
 const {error: initializationError} = await client.auth.initialize();
 if (returnedError) throw Object.assign(new Error('Email login failed'), {code: returnedError});
 if (initializationError) throw initializationError;
 // The SDK skips PKCE URL detection when this browser has no verifier.
 // Its explicit exchange returns that precise error, without sending a request.
 if (code && new URL(location.href).searchParams.has('code')) {
  const {error} = await client.auth.exchangeCodeForSession(code);
  if (error) throw error;
  const clean = new URL(location.href);
  clean.searchParams.delete('code');
  history.replaceState({}, '', clean.pathname + clean.search + clean.hash);
 }
 const {data, error} = await client.auth.getUser();
 if (error) {
  if (!code && /Auth session missing|session_not_found|refresh_token/.test(`${error.message} ${error.code}`)) return null;
  throw error;
 }
 return data.user;
}
