import * as tuplausService from "./services/tuplaus-service.js";
import * as randomService from "./services/secure-random.js";

const numberSuitToCardCode = (number, suit) => {
  if (!(typeof number == "number")) throw Error();
  if (!(typeof suit == "number")) throw Error();
  if (!(number === Math.floor(number))) throw Error();
  if (!(suit === Math.floor(suit))) throw Error();
  if (number <= 0 || number >= 14) throw Error();
  if (suit <= 0 || suit >= 5) throw Error();
  const numbers = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"];
  const suits = ["S", "C", "H", "D"];
  return "" + numbers[number - 1] + suits[suit - 1];
};

const handleTuplaus = async (request) => {
  try {
    const requestData = await request.json();
    const playerId = requestData["playerId"];
    const bet = requestData["bet"];
    const choice = requestData["choice"];
    const timestamp = Date.now();
    // validate data
    if (typeof playerId !== "number") return new Response("Forbidden", { status: 403 });
    if (typeof bet !== "number") return new Response("Bad request", { status: 400 });
    if (typeof choice !== "string") return new Response("Bad request", { status: 400 });
    if (bet <= 0) return new Response("Bad request", { status: 400 });
    if (choice != "pieni" && choice != "suuri") return new Response("Bad request", { status: 400 });

    const player = await tuplausService.getPlayer(playerId);
    if (!player)  return new Response("Forbidden", { status: 403 });
    const balance = player.balance;

    const number = randomService.randInt(1, 14);
    const suit = randomService.randInt(1, 5);
    const cardCode = numberSuitToCardCode(number, suit);
    const correct = number <= 6 ? "pieni" : number >= 8 ? "suuri" : "väärin";
    const winnings = correct === choice ? 2 * bet : 0;
    const serviceRequestStatus = await tuplausService.addTuplausResults(timestamp, playerId, bet, choice, cardCode, winnings);
    if (serviceRequestStatus === "error") return new Response("Bad request", { status: 400 });
    const responseData = { victory: winnings > 0, cardCode, winnings, balance: balance - bet + winnings };
    return Response.json(responseData);
  } catch {
    return new Response("Bad request", { status: 400 });
  }
};

export { handleTuplaus, numberSuitToCardCode };
