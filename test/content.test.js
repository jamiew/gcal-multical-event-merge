import assert from "node:assert/strict"
import { test } from "node:test"
import { loadPage } from "./helpers.js"

const { get } = loadPage()
const eventKey = get("eventKey")
const findMatchingKey = get("findMatchingKey")
const fillOptions = get("fillOptions")

test("eventKey ignores whitespace differences in titles", () => {
    assert.equal(eventKey(2, "Team  sync\n10am", "40px"), eventKey(2, "Team sync 10am", "40px"))
})

test("findMatchingKey merges a wildcard event with another event on the same day", () => {
    const keys = [eventKey(0, "Busy10am", "40px")]
    assert.equal(findMatchingKey(keys, eventKey(0, "Teamsync10am", "40px"), "busy"), keys[0])
})

test("findMatchingKey works whichever event has the wildcard word", () => {
    const keys = [eventKey(0, "Teamsync10am", "40px")]
    assert.equal(findMatchingKey(keys, eventKey(0, "Busy10am", "40px"), "busy"), keys[0])
})

test("findMatchingKey does not merge across days", () => {
    // Day 3 must not match day 13, which an unanchored pattern would allow.
    const keys = [eventKey(13, "Teamsync", "40px")]
    assert.equal(findMatchingKey(keys, eventKey(3, "Busy", "40px"), "busy"), null)
})

test("findMatchingKey does not merge events of different lengths", () => {
    const keys = [eventKey(0, "Teamsync", "80px")]
    assert.equal(findMatchingKey(keys, eventKey(0, "Busy", "40px"), "busy"), null)
})

test("findMatchingKey supports several wildcard words and regex characters", () => {
    const keys = [eventKey(0, "Lunch(1:1)", "")]
    assert.equal(findMatchingKey(keys, eventKey(0, "OOO(1:1)", ""), "busy|ooo"), keys[0])
    assert.equal(findMatchingKey(keys, eventKey(0, "Gym(1:1)", ""), "busy|ooo|"), null)
})

test("findMatchingKey is off when the wildcard is blank", () => {
    assert.equal(findMatchingKey([eventKey(0, "Busy", "")], eventKey(0, "Teamsync", ""), ""), null)
})

test("vertical_bands splits the event into equal bands", () => {
    const gradient = fillOptions.vertical_bands([{ bg: "red" }, { bg: "blue" }])
    assert.equal(gradient, "linear-gradient(90deg, red 0% 50%, blue 0% 100%)")
})

test("vertical_bands stripes outline-only events", () => {
    const gradient = fillOptions.vertical_bands([{ bg: "red" }, { bc: "rgb(0, 0, 255)" }])
    assert.match(gradient, /^linear-gradient\(90deg, red 0% 50%, rgb\(0, 0, 255\) 0% 60%, .+ 0% 70%, .+ 0% 100%\)$/)
})

test("candy_cane darkens repeated colors so each event stays visible", () => {
    const gradient = fillOptions.candy_cane([{ bg: "#ff0000" }, { bg: "#ff0000" }])
    const [first, second] = gradient.match(/rgb\([^)]+\)/g).filter((_, i) => i % 2 === 0)
    assert.notEqual(first, second)
})
