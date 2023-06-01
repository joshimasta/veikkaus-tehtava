import { postgres } from "../deps.js";

const sql = postgres({});

const addPlayerDebug = async (player) => {
  return await sql`INSERT INTO players ${sql(player)}`;
};

const deleteEverythingDebug = async () => {
  await sql`DELETE FROM players`;
  await sql`DELETE FROM tuplausGameEvents`;
  return;
};

const getPlayer = async (playerId) => {
  if (typeof playerId !== "number" || playerId !== Math.floor(playerId)) return;
  // TODO: serializable read only?
  const players = await sql`SELECT * FROM players WHERE player_id = ${playerId}`;
  const playersWithFloatBalances = players.map((player) => {
    return { ...player, balance: parseFloat(player.balance) };
  });
  return playersWithFloatBalances[0];
};

const getPlayers = async () => {
  // TODO: serializable read only?
  const players = await sql`SELECT * FROM players`;
  const playersWithFloatBalances = players.map((player) => {
    return { ...player, balance: parseFloat(player.balance) };
  });
  return playersWithFloatBalances;
};

const getEvents = async () => {
  // TODO: serializable read only?
  const events = await sql`SELECT * FROM tuplausGameEvents`;
  const eventsWithFloatBalances = events.map((event) => {
    return { ...event, bet_amount: parseFloat(event.bet_amount), winnings: parseFloat(event.winnings) };
  });
  return eventsWithFloatBalances;
};

const getEverythingDebug = async () => {
  const playersPromise = getPlayers();
  const eventsPromise = getEvents();
  return { players: await playersPromise, events: await eventsPromise };
};

const addTuplausResults = async (timestamp, playerId, bet, choice, card, winnings) => {
  if (bet <= 0) return "error";
  if (choice != "pieni" && choice != "suuri") return "error";
  //TODO: transaction - serializable
  const player = await getPlayer(playerId);
  const balance = player.balance;
  if (balance <= bet) {
    //TODO: transaction rollback
    return "error";
  }
  const newBalance = balance - bet + winnings;
  await sql`UPDATE players SET ${sql({ balance: newBalance }, "balance")} WHERE player_id = ${playerId}`;
  const gameRecord = {
    player_id: playerId,
    timestamp,
    bet_amount: bet,
    player_input: choice,
    card,
    winnings,
  };
  await sql`INSERT INTO tuplausGameEvents ${sql(gameRecord)}`;
  return "ok";
};

export {
  getEvents,
  getPlayers,
  getPlayer,
  addTuplausResults,
  addPlayerDebug,
  getEverythingDebug,
  deleteEverythingDebug,
};
