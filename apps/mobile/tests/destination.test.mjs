import test from "node:test";
import assert from "node:assert/strict";
import {
  parseDestination,
  directDistance,
  mapUrl,
} from "../maps/destination.ts";
test("coordinates require explicit decimal values in geographic bounds", () => {
  for (const [a, b] of [
    ["", "0"],
    ["91", "0"],
    ["0", "181"],
    ["NaN", "0"],
    ["0x10", "0"],
    ["1e2", "0"],
    ["1,2", "0"],
  ])
    assert.equal(parseDestination("", a, b), null);
  assert.deepEqual(parseDestination(" Beach ", " 13.08 ", "80.27"), {
    label: "Beach",
    latitude: 13.08,
    longitude: 80.27,
  });
  assert.ok(parseDestination("", "0", "0"));
});
test("direct distance handles identical points and date-line crossing", () => {
  assert.equal(
    directDistance(
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 0 },
    ),
    0,
  );
  assert.ok(
    Math.abs(
      directDistance(
        { latitude: 0, longitude: 179.9 },
        { latitude: 0, longitude: -179.9 },
      ) - 22238.985,
    ) < 1,
  );
});
test("map URL includes only destination coordinates, not label or GPS origin", () => {
  assert.equal(
    mapUrl({ latitude: 13, longitude: 80, label: "private" }),
    "https://www.openstreetmap.org/?mlat=13&mlon=80#map=16/13/80",
  );
});
