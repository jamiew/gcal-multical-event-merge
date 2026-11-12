import assert from "node:assert/strict"
import { test } from "node:test"
import { chip, day, loadPage, monthWeek, moreLink, tops, weekAllDay } from "./helpers.js"

const PINK = "rgb(216, 27, 96)"

test("month view: merged duplicates leave no empty rows", () => {
    // Two pairs of duplicates from two calendars, like the bug report.
    const { document, get } = loadPage(
        monthWeek([
            day([
                chip({ id: "holiday", title: "Holiday", top: 0 }),
                chip({ id: "standup-a", title: "Standup", top: 1 }),
                chip({ id: "standup-b", title: "Standup", color: PINK, top: 2 }),
                chip({ id: "review-a", title: "Review", top: 3 }),
                chip({ id: "review-b", title: "Review", color: PINK, top: 4 }),
                chip({ id: "planning", title: "Planning", top: 5 }),
                moreLink({ count: 2, top: 6 })
            ])
        ])
    )
    get("merge")(document.querySelector('[role="main"]'))

    assert.deepEqual(tops(document, 0), {
        holiday: "0em",
        "standup-a": "1em",
        "standup-b": "1em", // hidden, under the merged event
        "review-a": "2em",
        "review-b": "2em",
        planning: "3em",
        more: "4em"
    })
})

test("month view: rows stay compact after Google re-renders", () => {
    const { document, get } = loadPage(
        monthWeek([
            day([
                chip({ id: "a", title: "Standup", top: 0 }),
                chip({ id: "b", title: "Standup", color: PINK, top: 1 }),
                chip({ id: "c", title: "Lunch", top: 2 })
            ])
        ])
    )
    const merge = get("merge")
    merge(document.querySelector('[role="main"]'))
    // Google puts its own positions back on re-render.
    document.querySelectorAll("[data-eventid]").forEach((row, i) => {
        row.style.top = `${i}em`
    })
    merge(document.querySelector('[role="main"]'))

    assert.deepEqual(tops(document, 0), { a: "0em", b: "0em", c: "1em" })
})

test("month view: multi-day events keep their row across the week", () => {
    // "trip" covers both days. On day 2 its row 1 is fixed, so other events fill around it.
    const { document, get } = loadPage(
        monthWeek([
            day([chip({ id: "solo", title: "Dentist", top: 0 }), chip({ id: "trip", title: "Trip", top: 1 })]),
            day([
                chip({ id: "trip", title: "Trip", top: 1 }),
                chip({ id: "a", title: "Standup", top: 2 }),
                chip({ id: "b", title: "Standup", color: PINK, top: 3 }),
                chip({ id: "c", title: "Lunch", top: 4 })
            ])
        ])
    )
    get("merge")(document.querySelector('[role="main"]'))

    assert.deepEqual(tops(document, 0), { solo: "0em", trip: "1em" })
    assert.deepEqual(tops(document, 1), { trip: "1em", a: "0em", b: "0em", c: "2em" })
})

test("week view: the all-day section shrinks to the rows it still needs", () => {
    const { document, get } = loadPage(
        weekAllDay([day([chip({ id: "a", title: "Holiday", top: 0 }), chip({ id: "b", title: "Holiday", color: PINK, top: 1 })])], 2)
    )
    get("merge")(document.querySelector('[role="main"]'))

    assert.equal(document.querySelector('[role="row"] > [role="presentation"]').style.height, "1em")
})

test("merges events Google adds after the page loads", async () => {
    const { document, window } = loadPage("", { disabled: false })
    await new Promise(resolve => setTimeout(resolve, 50))

    document.body.insertAdjacentHTML(
        "beforeend",
        monthWeek([day([chip({ id: "a", title: "Standup", top: 0 }), chip({ id: "b", title: "Standup", color: PINK, top: 1 })])])
    )
    await new Promise(resolve => window.requestAnimationFrame(() => setTimeout(resolve, 50)))

    const hidden = document.querySelector('[data-eventid="b"] [role="button"]')
    assert.equal(hidden.style.opacity, "0")
    assert.deepEqual(tops(document, 0), { a: "0em", b: "0em" })
})
