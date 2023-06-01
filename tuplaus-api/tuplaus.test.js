import {
  assertEquals,
  assertNotEquals,
  assertThrows,
  assertExists,
  assert,
} from "https://deno.land/std@0.190.0/testing/asserts.ts";
import * as tuplausService from "./services/tuplaus-service.js";
import { handleTuplaus, numberSuitToCardCode } from "./tuplaus.js";

const jsonToMockRequest = (json) => {
  return {
    json: () => {
      return json;
    },
  };
};

Deno.test({
  name: "card codes",
  fn: async (t) => {
    await t.step("generates card codes correctly", async () => {
      assertEquals(numberSuitToCardCode(1, 1), "AS");
      assertEquals(numberSuitToCardCode(3, 2), "3C");
      assertEquals(numberSuitToCardCode(9, 3), "9H");
      assertEquals(numberSuitToCardCode(10, 4), "TD");
      assertEquals(numberSuitToCardCode(11, 1), "JS");
      assertEquals(numberSuitToCardCode(12, 2), "QC");
      assertEquals(numberSuitToCardCode(13, 3), "KH");
    });
    await t.step("throws errors on invalid input", async (t) => {
      await t.step("number out of range", async () => {
        assertThrows(() => numberSuitToCardCode(0, 0));
        assertThrows(() => numberSuitToCardCode(0, 1));
        assertThrows(() => numberSuitToCardCode(15, 3));
        assertThrows(() => numberSuitToCardCode(16, 3));
        assertThrows(() => numberSuitToCardCode(200, 2));
      });
      await t.step("suit out of range", async () => {
        assertThrows(() => numberSuitToCardCode(3, 0));
        assertThrows(() => numberSuitToCardCode(11, 0));
        assertThrows(() => numberSuitToCardCode(7, 5));
        assertThrows(() => numberSuitToCardCode(6, 11));
        assertThrows(() => numberSuitToCardCode(5, 200));
      });
      await t.step("non-integer inputs", async () => {
        assertThrows(() => numberSuitToCardCode("1", 2));
        assertThrows(() => numberSuitToCardCode(3, "4"));
        assertThrows(() => numberSuitToCardCode(5.1, 2));
        assertThrows(() => numberSuitToCardCode(11, 3.2));
        assertThrows(() => numberSuitToCardCode(5, [1]));
      });
    });
  },
});
Deno.test({
  name: "tuplaus API",
  fn: async (t) => {
    let tallaajaId, rahatonId;
    await t.step("setup", async (t) => {
      await t.step("setup: no events before tests are run", async () => {
        assertEquals((await tuplausService.getEvents()).length, 0);
        //TODO: fast fail all tests upon failure
      });
      await t.step("setup: create some players for the tests", async () => {
        await tuplausService.addPlayerDebug({ full_name: "Tavallinen Tallaaja", balance: 1000 });
        await tuplausService.addPlayerDebug({ full_name: "Jaakko Jaakkola", balance: 1000 });
        await tuplausService.addPlayerDebug({ full_name: "Rahaton Tallaaja", balance: 0 });
        //TODO: fast fail all tests upon failure
      });
      await t.step("setup: get players' ids", async () => {
        const pelaajat = await tuplausService.getPlayers();
        console.log(pelaajat);
        assertEquals(pelaajat.length, 3);
        const tallaajaIndex = pelaajat.findIndex((player) => {
          return player.full_name === "Tavallinen Tallaaja";
        });
        const rahatonIndex = pelaajat.findIndex((player) => {
          return player.full_name === "Rahaton Tallaaja";
        });
        assertNotEquals(tallaajaIndex, -1, "Tavallinen Tallaaja ei löydy pelaajalistassa.");
        assertNotEquals(rahatonIndex, -1, "Rahaton Tallaaja ei löydy pelaajalistassa.");
        tallaajaId = pelaajat[tallaajaIndex].player_id;
        rahatonId = pelaajat[rahatonIndex].player_id;
      });
    });
    await t.step("invalid requests rejected correctly", async (t) => {
      await t.step("403 on invalid player id", async (t) => {
        await t.step("string", async () => {
          const request = jsonToMockRequest({ playerId: "Hakurei", bet: 1, choice: "pieni" });
          const response = await handleTuplaus(request);
          assertEquals(response.status, 403);
          assertEquals(await response.text(), "Forbidden");
        });
        await t.step("empty string", async () => {
          const request = jsonToMockRequest({ playerId: "", bet: 1, choice: "pieni" });
          const response = await handleTuplaus(request);
          assertEquals(response.status, 403);
          assertEquals(await response.text(), "Forbidden");
        });
        await t.step("number as string", async () => {
          const request = jsonToMockRequest({ playerId: "" + tallaajaId, bet: 1, choice: "pieni" });
          const response = await handleTuplaus(request);
          assertEquals(response.status, 403);
          assertEquals(await response.text(), "Forbidden");
        });
        await t.step("value not in the database (probably)", async () => {
          // random negative value is likely to fail (-2147483648 is smallest value postgres allows for an integer)
          const playerId = Math.floor(Math.random() * -2147483648);
          const request = jsonToMockRequest({ playerId, bet: 1, choice: "pieni" });
          const response = await handleTuplaus(request);
          assertEquals(response.status, 403);
          assertEquals(await response.text(), "Forbidden");
        });
      });
      await t.step("403 on missing player id", async () => {
        {
          const request = jsonToMockRequest({ bet: 1, choice: "pieni" });
          const response = await handleTuplaus(request);
          assertEquals(response.status, 403);
          assertEquals(await response.text(), "Forbidden");
        }
      });
      await t.step("400 on invalid or non-positive bet", async (t) => {
        await t.step("string", async () => {
          const request = jsonToMockRequest({ playerId: tallaajaId, bet: "my soul", choice: "pieni" });
          const response = await handleTuplaus(request);
          assertEquals(response.status, 400);
          assertEquals(await response.text(), "Bad request");
        });
        await t.step("number as string", async () => {
          const request = jsonToMockRequest({ playerId: tallaajaId, bet: "1", choice: "suuri" });
          const response = await handleTuplaus(request);
          assertEquals(response.status, 400);
          assertEquals(await response.text(), "Bad request");
        });
        await t.step("0 bet", async () => {
          const request = jsonToMockRequest({ playerId: tallaajaId, bet: 0, choice: "suuri" });
          const response = await handleTuplaus(request);
          assertEquals(response.status, 400);
          assertEquals(await response.text(), "Bad request");
        });
        await t.step("negative bet", async () => {
          const request = jsonToMockRequest({ playerId: tallaajaId, bet: -5, choice: "suuri" });
          const response = await handleTuplaus(request);
          assertEquals(response.status, 400);
          assertEquals(await response.text(), "Bad request");
        });
      });
      await t.step("400 on missing bet", async () => {
        const request = jsonToMockRequest({ playerId: tallaajaId, choice: "pieni" });
        const response = await handleTuplaus(request);
        assertEquals(response.status, 400);
        assertEquals(await response.text(), "Bad request");
      });
      await t.step("400 on insufficient balance", async () => {
        const request = jsonToMockRequest({ playerId: rahatonId, bet: 1, choice: "suuri" });
        const response = await handleTuplaus(request);
        assertEquals(response.status, 400);
        assertEquals(await response.text(), "Bad request");
      });
      await t.step("400 on invalid choice", async () => {
        {
          const request = jsonToMockRequest({ playerId: tallaajaId, bet: 1, choice: "seiska" });
          const response = await handleTuplaus(request);
          assertEquals(response.status, 400);
          assertEquals(await response.text(), "Bad request");
        }
        {
          const request = jsonToMockRequest({ playerId: tallaajaId, bet: 1, choice: "määrä" });
          const response = await handleTuplaus(request);
          assertEquals(response.status, 400);
          assertEquals(await response.text(), "Bad request");
        }
        {
          const request = jsonToMockRequest({ playerId: tallaajaId, bet: 1, choice: 1 });
          const response = await handleTuplaus(request);
          assertEquals(response.status, 400);
          assertEquals(await response.text(), "Bad request");
        }
        {
          const request = jsonToMockRequest({ playerId: tallaajaId, bet: 1, choice: 0 });
          const response = await handleTuplaus(request);
          assertEquals(response.status, 400);
          assertEquals(await response.text(), "Bad request");
        }
      });
      await t.step("400 on missing choice", async () => {
        const request = jsonToMockRequest({ playerId: tallaajaId, bet: 1 });
        const response = await handleTuplaus(request);
        assertEquals(response.status, 400);
        assertEquals(await response.text(), "Bad request");
      });
    });
    await t.step("game seems to work", async (t) => {
      let balance = 1000;
      let lastBalance; // last balance, according to the server. We compare this to the balance we keep track of in the end.
      await t.step("responses have all required fields", async () => {
        const bet = 1;
        const request = jsonToMockRequest({ playerId: tallaajaId, bet, choice: "pieni" });
        const response = await handleTuplaus(request);
        assertEquals(response.status, 200);
        const json = await response.json();
        // const responseData = { victory: winnings > 0, cardCode, winnings, balance: balance - bet + winnings };
        assertExists(json.cardCode);
        assertExists(json.victory);
        assertExists(json.winnings);
        assertExists(json.balance);
        assertEquals(typeof json.cardCode, "string");
        assertEquals(typeof json.victory, "boolean");
        assertEquals(typeof json.winnings, "number");
        assertEquals(typeof json.balance, "number");
        balance = balance - bet + json.winnings;
      });
      await t.step("game reports wins and losses correctly", async () => {
        for (let i = 0; i < 50; i++) {
          const bet = 1;
          const request = jsonToMockRequest({ playerId: tallaajaId, bet, choice: "pieni" });
          const response = await handleTuplaus(request);
          assertEquals(response.status, 200);
          const json = await response.json();
          if (json.winnings > 0) {
            assertEquals(json.winnings, 2);
            assertExists(
              ["A", "2", "3", "4", "5", "6"].find((letter) => {
                return letter === json.cardCode[0];
              })
            );
          }
          balance = balance - bet + json.winnings;
          lastBalance = json.balance;
        }
        for (let i = 0; i < 50; i++) {
          const bet = 1;
          const request = jsonToMockRequest({ playerId: tallaajaId, bet, choice: "suuri" });
          const response = await handleTuplaus(request);
          assertEquals(response.status, 200);
          const json = await response.json();
          if (json.winnings > 0) {
            assertEquals(json.winnings, 2);
            assertExists(
              ["8", "9", "T", "J", "Q", "K"].find((letter) => {
                return letter === json.cardCode[0];
              })
            );
          }
          balance = balance - bet + json.winnings;
          lastBalance = json.balance;
        }
      });
      await t.step("end balance corresponds with sum of wins and losses", async () => {
        assertEquals(lastBalance, balance);
      });
      await t.step("some wins and some losses on large set of games (probabilistic)", async () => {
        assert(balance > 950 && balance < 1050);
      });
    });
    await t.step("cleanup: clean up the database", async () => {
      await tuplausService.deleteEverythingDebug();
    });
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
