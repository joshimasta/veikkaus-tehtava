CREATE TABLE players (
  player_id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  balance NUMERIC(1000, 2) NOT NULL
);

CREATE TABLE tuplausGameEvents (
  game_event_id SERIAL PRIMARY KEY,
  player_id INT NOT NULL,
  timestamp BIGINT NOT NULL,
  bet_amount NUMERIC(1000, 2) NOT NULL,
  player_input TEXT NOT NULL,
  card TEXT NOT NULL,
  winnings NUMERIC(1000, 2) NOT NULL
);