import * as tuplausService from "./services/tuplaus-service.js";
import * as randomService from "./services/secure-random.js";
import { handleTuplaus } from "./tuplaus.js";

const addPlayerDebug = async (request) => {
  let data;
  try {
    data = await request.json();
    console.log(data);
    tuplausService.addPlayerDebug(data.player);
  } catch (e) {
    return new Response("Bad request", { status: 400 });
  }
  return new Response("OK", { status: 200 });
};

const getEverythingDebug = async (request) => {
  const everything = await tuplausService.getEverythingDebug();
  const responseData = { everything };
  return Response.json(responseData);
};

const urlMapping = [
  {
    method: "GET",
    pattern: new URLPattern({ pathname: "/api/debug/everything" }),
    fn: getEverythingDebug,
  },
  {
    method: "POST",
    pattern: new URLPattern({ pathname: "/api/debug/addPlayer" }),
    fn: addPlayerDebug,
  },
  {
    method: "POST",
    pattern: new URLPattern({ pathname: "/api/tuplaus" }),
    fn: handleTuplaus,
  },
];
const handleRequest = async (request) => {
  const mapping = urlMapping.find((um) => um.method === request.method && um.pattern.test(request.url));

  if (!mapping) {
    return new Response("Not found", { status: 404 });
  }

  const mappingResult = mapping.pattern.exec(request.url);
  try {
    return await mapping.fn(request, mappingResult);
  } catch (e) {
    console.log(e);
    return new Response(e.stack, { status: 500 });
  }
};

const portConfig = { port: 7777, hostname: "0.0.0.0" };
Deno.serve(portConfig, handleRequest);
