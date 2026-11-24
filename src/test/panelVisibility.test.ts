import { describe, expect, it } from "vitest";
import { CURRENT_PANEL_AGENT_IDS, isAgentVisible, isUnitVisible } from "@/lib/panelVisibility";

const now = new Date("2026-11-24T12:00:00");
const november = { from: "2026-11-01", to: "2026-11-30" };
const october = { from: "2026-10-01", to: "2026-10-31" };
const inactive = "a2a01e43-6a43-4a11-b6c3-a5490fe37934";
const unit = { id: "patrocinio", nome: "Patrocínio" };

describe("panel visibility without changing source records", () => {
  it("keeps exactly Leonardo, Taina, Maylla, Junior and Aux Sup visible now", () => {
    expect([...CURRENT_PANEL_AGENT_IDS]).toEqual([
      "3c0802d2-4c9e-4ca2-b191-5c93a3960640",
      "3f3308ec-6596-48e2-a779-674431bfb4e1",
      "9d80b227-f5b1-4b24-ac94-b23c14ec64f0",
      "fc88fff8-3e5b-4504-b17d-090be0b50147",
      "ab9f6961-245b-47f2-9fbb-0591f1f7581d",
    ]);
    for (const id of CURRENT_PANEL_AGENT_IDS) expect(isAgentVisible(id, [], november, now)).toBe(true);
  });
  it("hides inactive agents now even if residual records exist", () => {
    expect(isAgentVisible(inactive, [{ id_agente: inactive, data_entrada: "2026-11-02" }], november, now)).toBe(false);
  });
  it("shows historical agents only in months with entry, scheduling or check-in records", () => {
    for (const field of ["data_entrada", "data_agendamento", "checkin"]) {
      const rows = [{ id_agente: inactive, [field]: "2026-10-15T12:00:00" }];
      expect(isAgentVisible(inactive, rows, october, now)).toBe(true);
      expect(isAgentVisible(inactive, rows, { from: "2026-09-01", to: "2026-09-30" }, now)).toBe(false);
    }
    expect(isAgentVisible(inactive, [], october, now)).toBe(false);
  });
  it("hides Patrocínio now and restores it only in historical months with records", () => {
    const rows = [{ id_unidade: unit.id, checkin: "2026-10-25T14:00:00Z" }];
    expect(isUnitVisible(unit, rows, november, now)).toBe(false);
    expect(isUnitVisible(unit, rows, october, now)).toBe(true);
    expect(isUnitVisible(unit, [], october, now)).toBe(false);
    expect(isUnitVisible({ ...unit, nome: "Patrocinio" }, rows, november, now)).toBe(false);
    expect(isUnitVisible({ id: "serrana", nome: "Serrana" }, [], november, now)).toBe(true);
  });
  it("restores Patrocínio in September for a July entry scheduled on September 5", () => {
    const rows = [{ id_unidade: unit.id, data_entrada: "2026-07-27", data_agendamento: "2026-09-05", checkin: null }];
    expect(isUnitVisible(unit, rows, { from: "2026-09-01", to: "2026-09-30" }, now)).toBe(true);
    expect(isUnitVisible(unit, rows, october, now)).toBe(false);
  });
  it("does not change hidden records, visit counts or overall metric source data", () => {
    const rows = Object.freeze([
      Object.freeze({ id_agente: inactive, id_unidade: unit.id, data_entrada: "2026-11-02", checkin: "2026-11-04T12:00:00Z", visitas_loja: 2 }),
      Object.freeze({ id_agente: "3c0802d2-4c9e-4ca2-b191-5c93a3960640", id_unidade: "serrana", data_entrada: "2026-11-03", checkin: "2026-11-05T12:00:00Z", visitas_loja: 1 }),
    ]);
    const before = JSON.stringify(rows);
    expect(rows.filter((row) => isAgentVisible(row.id_agente, rows, november, now))).toHaveLength(1);
    expect(isUnitVisible(unit, rows, november, now)).toBe(false);
    expect(rows).toHaveLength(2);
    expect(rows.filter((row) => row.checkin.slice(0, 7) === "2026-11")).toHaveLength(2);
    expect(JSON.stringify(rows)).toBe(before);
  });
});