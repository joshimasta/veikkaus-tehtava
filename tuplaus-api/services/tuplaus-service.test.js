import { assertEquals, assertNotEquals, assertExists } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import * as tuplausService from "./tuplaus-service.js";

// Run this test file in an environment, where the database is empty at the start.

//{ getPlayer, addTuplausResults, addPlayerDebug, getEverythingDebug }

Deno.test({
  name: "tuplaus database service",
  fn: async (t) => {
    await t.step(
      "no game events before any tests are run (if this fails, you are likely not in good test environment)",
      async () => {
        assertEquals((await tuplausService.getEvents()).length, 0);
        //TODO: fast fail all tests upon failure
      }
    );

    await t.step("setup: add users", async () => {
      await tuplausService.addPlayerDebug({ full_name: "Tavallinen Tallaaja", balance: 100 });
      await tuplausService.addPlayerDebug({ full_name: "Jaakko Jaakkola", balance: 100 });
      await tuplausService.addPlayerDebug({ full_name: "Rahaton Tallaaja", balance: 0 });
      //TODO: fast fail all tests upon failure
    });

    let tallaajaId, rahatonId;
    await t.step("get player list correctly (most later tests rely on this succeeding)", async () => {
      const pelaajat = await tuplausService.getPlayers();
      assertEquals(pelaajat.length, 3);
      const tallaajaIndex = pelaajat.findIndex((player) => {
        return player.full_name === "Tavallinen Tallaaja";
      });
      const rahatonIndex = pelaajat.findIndex((player) => {
        return player.full_name === "Rahaton Tallaaja";
      });
      assertNotEquals(tallaajaIndex, -1, "Tavallinen Tallaaja ei löydy pelaajalistassa.");
      assertNotEquals(rahatonIndex, -1, "Rahaton Tallaaja ei löydy pelaajalistassa.");
      assertEquals(pelaajat[tallaajaIndex].balance, 100);
      tallaajaId = pelaajat[tallaajaIndex].player_id;
      rahatonId = pelaajat[rahatonIndex].player_id;
    });

    await t.step("get player correctly 1", async () => {
      const pelaaja = await tuplausService.getPlayer(tallaajaId);
      assertEquals(pelaaja, { full_name: "Tavallinen Tallaaja", balance: 100, player_id: tallaajaId });
    });

    await t.step("get player correctly 2", async () => {
      const pelaaja = await tuplausService.getPlayer(rahatonId);
      assertEquals(pelaaja, { full_name: "Rahaton Tallaaja", balance: 0, player_id: rahatonId });
    });

    await t.step("can't play without money", async () => {
      const response = await tuplausService.addTuplausResults(
        Date.now(),
        rahatonId,
        1,
        "pieni",
        "2H",
        2
      );
      assertEquals(response, "error");
      const pelaaja = await tuplausService.getPlayer(rahatonId);
      assertEquals(pelaaja, { full_name: "Rahaton Tallaaja", balance: 0, player_id: rahatonId });
      assertEquals((await tuplausService.getEvents()).length, 0);
    });

    await t.step("winning game works correctly 1", async () => {
      const now = Date.now();
      const response = await tuplausService.addTuplausResults(now, tallaajaId, 1, "pieni", "2H", 2);
      assertEquals(response, "ok");
      const pelaaja = await tuplausService.getPlayer(tallaajaId);
      assertEquals(pelaaja, { full_name: "Tavallinen Tallaaja", balance: 101, player_id: tallaajaId });
      const events = await tuplausService.getEvents();
      assertExists(events[0].game_event_id);
      assertEquals(events.length, 1);
      assertEquals(events[0].player_id, tallaajaId);
      assertEquals(events[0].timestamp, ""+now);
      assertEquals(events[0].bet_amount, 1);
      assertEquals(events[0].player_input, "pieni");
      assertEquals(events[0].card, "2H");
      assertEquals(events[0].winnings, 2);
    });

    await t.step("winning game works correctly 2", async () => {
      const now = Date.now();
      const response = await tuplausService.addTuplausResults(now, tallaajaId, 4, "suuri", "9S", 8);
      assertEquals(response, "ok");
      const pelaaja = await tuplausService.getPlayer(tallaajaId);
      assertEquals(pelaaja, { full_name: "Tavallinen Tallaaja", balance: 105, player_id: tallaajaId });
      assertEquals((await tuplausService.getEvents()).length, 2);
    });

    await t.step("losing game works correctly", async () => {
      const now = Date.now();
      const response = await tuplausService.addTuplausResults(now, tallaajaId, 3, "pieni", "7S", 0);
      assertEquals(response, "ok");
      const pelaaja = await tuplausService.getPlayer(tallaajaId);
      assertEquals(pelaaja, { full_name: "Tavallinen Tallaaja", balance: 102, player_id: tallaajaId });
      assertEquals((await tuplausService.getEvents()).length, 3);
    });

    await t.step("cleanup: clean up the database", async () => {
      await tuplausService.deleteEverythingDebug();
    });
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
