// Every /api/* request (reads, actions and live-update WebSockets) goes
// straight to the Squadup Worker through a service binding: no public hop.
export const onRequest = ({ request, env }) => env.API.fetch(request);
