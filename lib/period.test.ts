import { describe, expect, it } from "vitest";
import {
  customPeriod,
  daysBetween,
  presetPeriod,
  resolvePeriodFromParams,
} from "./period";

const MAINTENANT = new Date("2026-08-10T09:00:00Z");

describe("daysBetween", () => {
  it("compte les deux bornes", () => {
    expect(daysBetween("2026-08-01", "2026-08-01")).toBe(1);
    expect(daysBetween("2026-08-01", "2026-08-07")).toBe(7);
  });

  it("franchit un changement de mois", () => {
    expect(daysBetween("2026-07-30", "2026-08-02")).toBe(4);
  });
});

describe("presetPeriod", () => {
  it("se termine aujourd'hui et couvre la durée annoncée", () => {
    const p = presetPeriod("7d", MAINTENANT);
    expect(p.to).toBe("2026-08-10");
    expect(p.from).toBe("2026-08-04");
    expect(daysBetween(p.from, p.to)).toBe(7);
  });

  it("place la période de comparaison juste avant, de même durée", () => {
    const p = presetPeriod("7d", MAINTENANT);
    expect(p.previousTo).toBe("2026-08-03");
    expect(p.previousFrom).toBe("2026-07-28");
    expect(daysBetween(p.previousFrom, p.previousTo)).toBe(7);
  });

  it("porte la chaîne de requête que recopient les liens", () => {
    expect(presetPeriod("90d", MAINTENANT).query).toBe("period=90d");
  });
});

describe("customPeriod", () => {
  it("compare à la même durée, juste avant", () => {
    // Comparer un mois à une semaine ne dirait rien.
    const p = customPeriod("2026-03-01", "2026-03-10");
    expect(daysBetween(p.from, p.to)).toBe(10);
    expect(p.previousTo).toBe("2026-02-28");
    expect(daysBetween(p.previousFrom, p.previousTo)).toBe(10);
  });

  it("porte ses bornes dans la chaîne de requête", () => {
    expect(customPeriod("2026-03-01", "2026-03-10").query).toBe(
      "period=custom&from=2026-03-01&to=2026-03-10",
    );
  });
});

describe("resolvePeriodFromParams", () => {
  it("lit un préréglage depuis l'URL", () => {
    expect(resolvePeriodFromParams({ period: "90d" }, undefined, MAINTENANT).key).toBe(
      "90d",
    );
  });

  it("lit une plage libre depuis l'URL", () => {
    const p = resolvePeriodFromParams(
      { period: "custom", from: "2026-01-05", to: "2026-02-05" },
      undefined,
      MAINTENANT,
    );
    expect(p.key).toBe("custom");
    expect(p.from).toBe("2026-01-05");
    expect(p.to).toBe("2026-02-05");
  });

  it("retombe sur la mémoire quand l'URL est muette", () => {
    // Cas d'usage exact : une application installée se rouvre sur « / », sans
    // paramètre. Sans cette mémoire, le choix était perdu à chaque lancement.
    const p = resolvePeriodFromParams({}, "period=90d", MAINTENANT);
    expect(p.key).toBe("90d");
  });

  it("mémorise aussi une plage libre", () => {
    const p = resolvePeriodFromParams(
      {},
      "period=custom&from=2026-01-05&to=2026-02-05",
      MAINTENANT,
    );
    expect(p.key).toBe("custom");
    expect(p.from).toBe("2026-01-05");
  });

  it("laisse l'URL primer sur la mémoire", () => {
    expect(
      resolvePeriodFromParams({ period: "7d" }, "period=365d", MAINTENANT).key,
    ).toBe("7d");
  });

  it("refuse des bornes inversées", () => {
    const p = resolvePeriodFromParams(
      { period: "custom", from: "2026-05-10", to: "2026-05-01" },
      undefined,
      MAINTENANT,
    );
    expect(p.key).toBe("30d");
  });

  it("refuse une date illisible", () => {
    const p = resolvePeriodFromParams(
      { period: "custom", from: "hier", to: "2026-05-01" },
      undefined,
      MAINTENANT,
    );
    expect(p.key).toBe("30d");
  });

  it("refuse une plage démesurée", () => {
    // Au delà de deux ans, la comparaison perd son sens et l'appel devient
    // inutilement lourd.
    const p = resolvePeriodFromParams(
      { period: "custom", from: "2020-01-01", to: "2026-01-01" },
      undefined,
      MAINTENANT,
    );
    expect(p.key).toBe("30d");
  });

  it("ignore une mémoire corrompue plutôt que de planter", () => {
    expect(resolvePeriodFromParams({}, "n'importe quoi", MAINTENANT).key).toBe("30d");
  });

  it("retombe sur le préréglage par défaut sans rien", () => {
    expect(resolvePeriodFromParams({}, undefined, MAINTENANT).key).toBe("30d");
  });
});
